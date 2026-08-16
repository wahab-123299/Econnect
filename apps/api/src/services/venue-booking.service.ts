import { venueBookingRepository } from '../repositories/venue-booking.repository';
import { venueRepository } from '../repositories/venue.repository';
import { userRepository } from '../repositories/user.repository';
import { organizerService } from './organizer.service';
import { paystackClient } from './paystack.client';
import { generateVenueBookingPaymentReference } from '../utils/payment-reference';
import { calculateVenueSplit } from '../utils/venue-commission';
import { AppError } from '../middleware/error-handler';
import type { EventVenueBooking } from '@prisma/client';

function toBookingDTO(booking: EventVenueBooking & { venue?: { id: string; name: string } }) {
  return {
    id: booking.id,
    status: booking.status,
    proposedDate: booking.proposedDate,
    proposedBudgetKobo: booking.proposedBudgetKobo?.toString() ?? null,
    depositAmountKobo: booking.depositAmountKobo?.toString() ?? null,
    venue: booking.venue ?? { id: booking.venueId, name: '' },
  };
}

export const venueBookingService = {
  async createBooking(
    userId: string,
    input: { venueId: string; proposedDate: Date; proposedBudgetKobo?: bigint; eventId?: string },
  ) {
    const organizerProfile = await organizerService.requireVerifiedOrganizer(userId);

    const venue = await venueRepository.findById(input.venueId);
    if (!venue || venue.status !== 'active') {
      throw new AppError(404, 'VENUE_NOT_FOUND', 'Venue not found.');
    }

    const booking = await venueBookingRepository.create({
      organizerId: organizerProfile.id,
      venueId: input.venueId,
      proposedDate: input.proposedDate,
      proposedBudgetKobo: input.proposedBudgetKobo,
      eventId: input.eventId,
    });

    return toBookingDTO(booking);
  },

  async listMyBookings(userId: string) {
    const organizerProfile = await organizerService.requireVerifiedOrganizer(userId);
    const bookings = await venueBookingRepository.listByOrganizer(organizerProfile.id);
    return bookings.map(toBookingDTO);
  },

  async listForAdmin(status?: EventVenueBooking['status']) {
    const bookings = await venueBookingRepository.listForAdmin(status);
    return bookings.map((b) => ({
      id: b.id,
      status: b.status,
      proposedDate: b.proposedDate,
      proposedBudgetKobo: b.proposedBudgetKobo?.toString() ?? null,
      depositAmountKobo: b.depositAmountKobo?.toString() ?? null,
      venue: b.venue,
      organizerBusinessName: b.organizer.businessName,
    }));
  },

  async review(bookingId: string, action: 'accept' | 'decline', depositAmountKobo?: bigint) {
    const booking = await venueBookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking request not found.');
    }
    if (booking.status !== 'pending') {
      throw new AppError(409, 'ALREADY_REVIEWED', `This booking was already ${booking.status}.`);
    }

    if (action === 'accept') {
      // Schema validation already guarantees depositAmountKobo is present
      // when action is 'accept' — this is just satisfying TypeScript.
      const updated = await venueBookingRepository.setAccepted(bookingId, depositAmountKobo!);
      return toBookingDTO(updated);
    }

    const updated = await venueBookingRepository.setDeclined(bookingId);
    return toBookingDTO(updated);
  },

  // Deliberate v1 simplification: this charges the FULL deposit to
  // Econnect's own Paystack account. platformFeeKobo/venuePayoutKobo are
  // computed and recorded on the payment row for bookkeeping, but the
  // venue owner's share is NOT auto-split via a Paystack subaccount — that
  // would require onboarding every owner through Paystack's KYC for bank
  // verification, which doesn't exist yet (owners are admin-created profiles
  // with no payout infrastructure). Payout to the owner happens manually
  // (bank transfer) off-platform, using this recorded split as the source
  // of truth. Automating the split is a clean follow-up once subaccount
  // onboarding exists — the split math is already isolated in
  // utils/venue-commission.ts specifically so that swap is contained.
  async payDeposit(bookingId: string, userId: string) {
    const organizerProfile = await organizerService.requireVerifiedOrganizer(userId);

    const booking = await venueBookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking request not found.');
    }
    if (booking.organizerId !== organizerProfile.id) {
      throw new AppError(403, 'NOT_BOOKING_OWNER', 'You do not own this booking request.');
    }
    if (booking.status !== 'accepted') {
      throw new AppError(
        409,
        'DEPOSIT_NOT_PAYABLE',
        `This booking is ${booking.status} and cannot be paid for right now.`,
      );
    }
    if (!booking.depositAmountKobo) {
      // Should be impossible given the accept flow always sets this, but a
      // clear 500 here beats a confusing crash if that invariant ever breaks.
      throw new AppError(500, 'MISSING_DEPOSIT_AMOUNT', 'This booking has no deposit amount set.');
    }

    const user = await userRepository.findById(userId);
    if (!user?.email) {
      throw new AppError(
        422,
        'EMAIL_REQUIRED_FOR_PAYMENT',
        'An email address is required to complete payment. Please add one to your account.',
      );
    }

    const { platformFeeKobo, venuePayoutKobo } = calculateVenueSplit(booking.depositAmountKobo);
    const reference = generateVenueBookingPaymentReference();

    const { authorizationUrl } = await paystackClient.initializeTransaction({
      email: user.email,
      amountKobo: booking.depositAmountKobo,
      reference,
      metadata: { bookingId, organizerId: organizerProfile.id },
    });

    await venueBookingRepository.createPayment({
      bookingId,
      paymentReference: reference,
      amountKobo: booking.depositAmountKobo,
      platformFeeKobo,
      venuePayoutKobo,
    });

    return { paymentAuthorizationUrl: authorizationUrl };
  },
};
