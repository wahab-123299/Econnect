import { prisma } from '../config/prisma';
import { generateQrSignature } from '../utils/qr-ticket';
import crypto from 'crypto';
import type { OrderStatus } from '@prisma/client';

export const orderRepository = {
  findTierById(id: string) {
    return prisma.ticketTier.findUnique({
      where: { id },
      include: { event: { select: { id: true, status: true, title: true } } },
    });
  },

  // Atomically reserves `quantity` units of a tier in a single UPDATE with a
  // guard clause in the WHERE — NOT a SELECT-then-UPDATE. Two concurrent
  // requests racing for the last ticket will both issue this UPDATE; Postgres
  // serializes them at the row level, so only the one(s) that still fit
  // within quantity_total succeed. The other gets 0 rows affected → null →
  // SOLD_OUT. This is safe under real concurrency without needing an
  // explicit SELECT ... FOR UPDATE lock.
  async reserveCapacity(tierId: string, quantity: number) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE ticket_tiers
      SET quantity_sold = quantity_sold + ${quantity}
      WHERE id = ${tierId}
        AND quantity_sold + ${quantity} <= quantity_total
      RETURNING id
    `;
    return rows.length > 0;
  },

  // Rolls back a reservation — used when payment intent creation fails after
  // capacity was already reserved, so a failed checkout doesn't permanently
  // lock out inventory nobody actually bought.
  async releaseCapacity(tierId: string, quantity: number) {
    await prisma.$queryRaw`
      UPDATE ticket_tiers
      SET quantity_sold = GREATEST(quantity_sold - ${quantity}, 0)
      WHERE id = ${tierId}
    `;
  },

  create(data: { userId: string; totalKobo: bigint; paymentReference: string }) {
    return prisma.order.create({ data: { ...data, status: 'pending' } });
  },

  findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: { tickets: true } });
  },

  findByPaymentReference(reference: string) {
    return prisma.order.findUnique({ where: { paymentReference: reference } });
  },

  setStatus(id: string, status: OrderStatus, paidAt?: Date) {
    return prisma.order.update({ where: { id }, data: { status, paidAt } });
  },

  // The single most important transaction in the whole app: issuing tickets
  // and marking the order paid MUST happen atomically. If these were two
  // separate writes and the process died in between, you'd either have a
  // "paid" order with no tickets (customer charged, nothing to show at the
  // door) or tickets that exist but an order still shown as pending
  // (customer sees "payment failed" while holding valid tickets). Neither
  // failure mode is acceptable when real money is involved.
  markPaidAndIssueTickets(orderId: string, ticketTierId: string, ownerUserId: string, quantity: number) {
    return prisma.$transaction(async (tx) => {
      const ticketsData = Array.from({ length: quantity }, () => {
        const id = crypto.randomUUID();
        return { id, orderId, ticketTierId, ownerUserId, qrSignature: generateQrSignature(id) };
      });
      await tx.ticket.createMany({ data: ticketsData });
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: 'paid', paidAt: new Date() },
      });
      return { order, ticketIds: ticketsData.map((t) => t.id) };
    });
  },
};
