import { prisma } from '../config/prisma';

export const ticketRepository = {
  findByOrderId(orderId: string) {
    return prisma.ticket.findMany({ where: { orderId } });
  },

  findByQrSignature(qrSignature: string) {
    return prisma.ticket.findUnique({ where: { qrSignature } });
  },

  findByOwnerUserId(ownerUserId: string) {
    return prisma.ticket.findMany({
      where: { ownerUserId },
      include: {
        ticketTier: { select: { name: true, priceKobo: true, event: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Everything the scan flow needs to validate ownership and event match
  // before attempting check-in, in one query.
  findForScan(ticketId: string) {
    return prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        owner: { select: { fullName: true } },
        ticketTier: {
          select: {
            id: true,
            name: true,
            event: { select: { id: true, organizerId: true, title: true } },
          },
        },
      },
    });
  },

  // Atomic conditional check-in — same compare-and-swap pattern as the
  // ticket-tier reservation in order.repository.ts. Two door staff scanning
  // the same physical ticket at the same instant will race on this UPDATE;
  // Postgres serializes it, so only one can ever transition unused -> used.
  // The loser gets 0 rows affected (not an error) and the caller re-reads
  // the ticket to report "already used" with the real check-in time.
  async checkIn(ticketId: string, checkedInBy: string) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE tickets
      SET status = 'used', checked_in_at = now(), checked_in_by = ${checkedInBy}
      WHERE id = ${ticketId} AND status = 'unused'
      RETURNING id
    `;
    return rows.length > 0;
  },
};
