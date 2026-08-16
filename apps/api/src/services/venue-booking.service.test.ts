import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/venue-booking.repository', () => ({
  venueBookingRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    listByOrganizer: vi.fn(),
    listForAdmin: vi.fn(),
    setAccepted: vi.fn(),
    setDeclined: vi.fn(),
    createPayment: vi.fn(),
  },
}));
vi.mock('../repositories/venue.repository', () => ({
  venueRepository: { findById: vi.fn() },
}));
vi.mock('../repositories/user.repository', () => ({
  userRepository: { findById: vi.fn() },
}));
vi.mock('./organizer.service', () => ({
  organizerService: { requireVerifiedOrganizer: vi.fn() },
}));
vi.mock('./paystack.client', () => ({
  paystackClient: { initializeTransaction: vi.fn() },
}));

import { venueBookingService } from './venue-booking.service';
import { venueBookingRepository } from '../repositories/venue-booking.repository';
import { venueRepository } from '../repositories/venue.repository';
import { userRepository } from '../repositories/user.repository';
import { organizerService } from './organizer.service';
import { paystackClient } from './paystack.client';

const mockedBookings = vi.mocked(venueBookingRepository);
const mockedVenues = vi.mocked(venueRepository);
const mockedUsers = vi.mocked(userRepository);
const mockedOrganizers = vi.mocked(organizerService);
const mockedPaystack = vi.mocked(paystackClient);

const ORGANIZER_PROFILE = {
  id: 'org-1',
  businessName: 'Co',
  verificationStatus: 'verified' as const,
  verifiedAt: new Date(),
};

const PENDING_BOOKING = {
  id: 'booking-1',
  eventId: null,
  venueId: 'venue-1',
  organizerId: 'org-1',
  proposedDate: new Date(),
  proposedBudgetKobo: 500000n,
  status: 'pending' as const,
  depositAmountKobo: null,
  depositPaidAt: null,
  commissionKobo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  venue: { id: 'venue-1', name: 'Hall' },
};

describe('venueBookingService.createBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires a verified organizer', async () => {
    mockedOrganizers.requireVerifiedOrganizer.mockRejectedValue(
      Object.assign(new Error('not verified'), { code: 'ORGANIZER_NOT_VERIFIED' }),
    );

    await expect(
      venueBookingService.createBooking('user-1', { venueId: 'venue-1', proposedDate: new Date() }),
    ).rejects.toMatchObject({ code: 'ORGANIZER_NOT_VERIFIED' });
    expect(mockedBookings.create).not.toHaveBeenCalled();
  });

  it('404s when the venue does not exist or is inactive', async () => {
    mockedOrganizers.requireVerifiedOrganizer.mockResolvedValue(ORGANIZER_PROFILE);
    mockedVenues.findById.mockResolvedValue(null);

    await expect(
      venueBookingService.createBooking('user-1', { venueId: 'missing', proposedDate: new Date() }),
    ).rejects.toMatchObject({ code: 'VENUE_NOT_FOUND' });
  });

  it('creates a pending booking for an active venue', async () => {
    mockedOrganizers.requireVerifiedOrganizer.mockResolvedValue(ORGANIZER_PROFILE);
    mockedVenues.findById.mockResolvedValue({ id: 'venue-1', status: 'active' } as never);
    mockedBookings.create.mockResolvedValue(PENDING_BOOKING as never);

    const result = await venueBookingService.createBooking('user-1', {
      venueId: 'venue-1',
      proposedDate: new Date(),
    });

    expect(result.status).toBe('pending');
    expect(mockedBookings.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizerId: 'org-1', venueId: 'venue-1' }),
    );
  });
});

describe('venueBookingService.review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404s on an unknown booking', async () => {
    mockedBookings.findById.mockResolvedValue(null);

    await expect(venueBookingService.review('missing', 'accept', 100000n)).rejects.toMatchObject({
      code: 'BOOKING_NOT_FOUND',
    });
  });

  it('refuses to re-review an already-accepted booking', async () => {
    mockedBookings.findById.mockResolvedValue({ ...PENDING_BOOKING, status: 'accepted' } as never);

    await expect(venueBookingService.review('booking-1', 'decline')).rejects.toMatchObject({
      code: 'ALREADY_REVIEWED',
    });
    expect(mockedBookings.setDeclined).not.toHaveBeenCalled();
  });

  it('accepts a pending booking and records the deposit amount', async () => {
    mockedBookings.findById.mockResolvedValue(PENDING_BOOKING as never);
    mockedBookings.setAccepted.mockResolvedValue({
      ...PENDING_BOOKING,
      status: 'accepted',
      depositAmountKobo: 100000n,
    } as never);

    const result = await venueBookingService.review('booking-1', 'accept', 100000n);

    expect(result.status).toBe('accepted');
    expect(result.depositAmountKobo).toBe('100000');
    expect(mockedBookings.setAccepted).toHaveBeenCalledWith('booking-1', 100000n);
  });

  it('declines a pending booking', async () => {
    mockedBookings.findById.mockResolvedValue(PENDING_BOOKING as never);
    mockedBookings.setDeclined.mockResolvedValue({ ...PENDING_BOOKING, status: 'declined' } as never);

    const result = await venueBookingService.review('booking-1', 'decline');
    expect(result.status).toBe('declined');
    expect(mockedBookings.setAccepted).not.toHaveBeenCalled();
  });
});

const ACCEPTED_BOOKING = {
  ...PENDING_BOOKING,
  status: 'accepted' as const,
  depositAmountKobo: 1000000n,
};

describe('venueBookingService.payDeposit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404s on an unknown booking', async () => {
    mockedOrganizers.requireVerifiedOrganizer.mockResolvedValue(ORGANIZER_PROFILE);
    mockedBookings.findById.mockResolvedValue(null);

    await expect(venueBookingService.payDeposit('missing', 'user-1')).rejects.toMatchObject({
      code: 'BOOKING_NOT_FOUND',
    });
  });

  it('403s when the booking belongs to a different organizer', async () => {
    mockedOrganizers.requireVerifiedOrganizer.mockResolvedValue(ORGANIZER_PROFILE);
    mockedBookings.findById.mockResolvedValue({ ...ACCEPTED_BOOKING, organizerId: 'org-OTHER' } as never);

    await expect(venueBookingService.payDeposit('booking-1', 'user-1')).rejects.toMatchObject({
      code: 'NOT_BOOKING_OWNER',
    });
  });

  it('refuses to pay a booking that is not in accepted status', async () => {
    mockedOrganizers.requireVerifiedOrganizer.mockResolvedValue(ORGANIZER_PROFILE);
    mockedBookings.findById.mockResolvedValue(PENDING_BOOKING as never);

    await expect(venueBookingService.payDeposit('booking-1', 'user-1')).rejects.toMatchObject({
      code: 'DEPOSIT_NOT_PAYABLE',
    });
    expect(mockedPaystack.initializeTransaction).not.toHaveBeenCalled();
  });

  it('requires the organizer to have an email on file', async () => {
    mockedOrganizers.requireVerifiedOrganizer.mockResolvedValue(ORGANIZER_PROFILE);
    mockedBookings.findById.mockResolvedValue(ACCEPTED_BOOKING as never);
    mockedUsers.findById.mockResolvedValue({ id: 'user-1', email: null } as never);

    await expect(venueBookingService.payDeposit('booking-1', 'user-1')).rejects.toMatchObject({
      code: 'EMAIL_REQUIRED_FOR_PAYMENT',
    });
  });

  it('initializes payment for the full deposit and records the computed split', async () => {
    mockedOrganizers.requireVerifiedOrganizer.mockResolvedValue(ORGANIZER_PROFILE);
    mockedBookings.findById.mockResolvedValue(ACCEPTED_BOOKING as never);
    mockedUsers.findById.mockResolvedValue({ id: 'user-1', email: 'ada@example.com' } as never);
    mockedPaystack.initializeTransaction.mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/venue-abc',
      accessCode: 'abc',
    });

    const result = await venueBookingService.payDeposit('booking-1', 'user-1');

    expect(mockedPaystack.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amountKobo: 1000000n, email: 'ada@example.com' }),
    );
    // 10% default commission: 1,000,000 kobo deposit -> 100,000 fee / 900,000 payout
    expect(mockedBookings.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 'booking-1',
        amountKobo: 1000000n,
        platformFeeKobo: 100000n,
        venuePayoutKobo: 900000n,
      }),
    );
    expect(result).toEqual({ paymentAuthorizationUrl: 'https://checkout.paystack.com/venue-abc' });
  });
});
