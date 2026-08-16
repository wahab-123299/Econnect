import { prisma } from '../config/prisma';
import type { BookingStatus } from '@prisma/client';

export const venueBookingRepository = {
  create(data: {
    organizerId: string;
    venueId: string;
    proposedDate: Date;
    proposedBudgetKobo?: bigint;
    eventId?: string;
  }) {
    return prisma.eventVenueBooking.create({ data });
  },

  findById(id: string) {
    return prisma.eventVenueBooking.findUnique({
      where: { id },
      include: { venue: { select: { id: true, name: true } } },
    });
  },

  listByOrganizer(organizerId: string) {
    return prisma.eventVenueBooking.findMany({
      where: { organizerId },
      include: { venue: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  listForAdmin(status?: BookingStatus) {
    return prisma.eventVenueBooking.findMany({
      where: status ? { status } : undefined,
      include: {
        venue: { select: { id: true, name: true } },
        organizer: { select: { businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  setAccepted(id: string, depositAmountKobo: bigint) {
    return prisma.eventVenueBooking.update({
      where: { id },
      data: { status: 'accepted', depositAmountKobo },
    });
  },

  setDeclined(id: string) {
    return prisma.eventVenueBooking.update({ where: { id }, data: { status: 'declined' } });
  },

  createPayment(data: {
    bookingId: string;
    paymentReference: string;
    amountKobo: bigint;
    platformFeeKobo: bigint;
    venuePayoutKobo: bigint;
  }) {
    return prisma.venueBookingPayment.create({ data });
  },

  findPaymentByReference(paymentReference: string) {
    return prisma.venueBookingPayment.findUnique({ where: { paymentReference } });
  },

  // Atomic, same reasoning as order.repository.markPaidAndIssueTickets: the
  // payment record and the booking's status must transition together, or a
  // crash mid-way leaves either a "confirmed" payment on a booking still
  // shown as awaiting deposit, or vice versa.
  confirmPayment(paymentId: string, bookingId: string, commissionKobo: bigint) {
    return prisma.$transaction([
      prisma.venueBookingPayment.update({
        where: { id: paymentId },
        data: { status: 'confirmed', confirmedAt: new Date() },
      }),
      prisma.eventVenueBooking.update({
        where: { id: bookingId },
        data: { status: 'deposit_paid', depositPaidAt: new Date(), commissionKobo },
      }),
    ]);
  },
};
