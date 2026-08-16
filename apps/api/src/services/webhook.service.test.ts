import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/order.repository', () => ({
  orderRepository: {
    findByPaymentReference: vi.fn(),
    markPaidAndIssueTickets: vi.fn(),
  },
}));
vi.mock('../repositories/venue-booking.repository', () => ({
  venueBookingRepository: {
    findPaymentByReference: vi.fn(),
    confirmPayment: vi.fn(),
  },
}));

import { webhookService } from './webhook.service';
import { orderRepository } from '../repositories/order.repository';
import { venueBookingRepository } from '../repositories/venue-booking.repository';

const mockedOrders = vi.mocked(orderRepository);
const mockedVenueBookings = vi.mocked(venueBookingRepository);

const PENDING_ORDER = {
  id: 'order-1',
  userId: 'user-1',
  status: 'pending' as const,
  totalKobo: 1500000n,
  paymentReference: 'TIX-abc',
  createdAt: new Date(),
  paidAt: null,
};

function chargeSuccessPayload(overrides: Partial<{ reference: string; metadata: object }> = {}) {
  return {
    event: 'charge.success',
    data: {
      reference: overrides.reference ?? 'TIX-abc',
      metadata: overrides.metadata ?? { ticketTierId: 'tier-1', quantity: 2, userId: 'user-1' },
    },
  };
}

describe('webhookService.handlePaystackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores non charge.success events', async () => {
    const result = await webhookService.handlePaystackEvent({
      event: 'charge.failed',
      data: { reference: 'TIX-abc' },
    });
    expect(result).toEqual({ processed: false, reason: 'ignored_event_type' });
    expect(mockedOrders.findByPaymentReference).not.toHaveBeenCalled();
  });

  it('handles an unknown payment reference gracefully', async () => {
    mockedOrders.findByPaymentReference.mockResolvedValue(null);

    const result = await webhookService.handlePaystackEvent(chargeSuccessPayload());
    expect(result).toEqual({ processed: false, reason: 'order_not_found' });
  });

  it('is idempotent — replaying a webhook for an already-paid order does not reissue tickets', async () => {
    mockedOrders.findByPaymentReference.mockResolvedValue({ ...PENDING_ORDER, status: 'paid' });

    const result = await webhookService.handlePaystackEvent(chargeSuccessPayload());

    expect(result).toEqual({ processed: false, reason: 'already_processed' });
    expect(mockedOrders.markPaidAndIssueTickets).not.toHaveBeenCalled();
  });

  it('refuses to process an order in an unexpected status (e.g. refunded)', async () => {
    mockedOrders.findByPaymentReference.mockResolvedValue({ ...PENDING_ORDER, status: 'refunded' });

    const result = await webhookService.handlePaystackEvent(chargeSuccessPayload());
    expect(result).toEqual({ processed: false, reason: 'unexpected_order_status' });
    expect(mockedOrders.markPaidAndIssueTickets).not.toHaveBeenCalled();
  });

  it('does not issue tickets if metadata is missing', async () => {
    mockedOrders.findByPaymentReference.mockResolvedValue(PENDING_ORDER);

    const result = await webhookService.handlePaystackEvent(
      chargeSuccessPayload({ metadata: {} }),
    );
    expect(result).toEqual({ processed: false, reason: 'missing_metadata' });
    expect(mockedOrders.markPaidAndIssueTickets).not.toHaveBeenCalled();
  });

  it('issues tickets and marks the order paid on a valid first-time webhook', async () => {
    mockedOrders.findByPaymentReference.mockResolvedValue(PENDING_ORDER);
    mockedOrders.markPaidAndIssueTickets.mockResolvedValue({
      order: { ...PENDING_ORDER, status: 'paid' },
      ticketIds: ['t1', 't2'],
    } as never);

    const result = await webhookService.handlePaystackEvent(chargeSuccessPayload());

    expect(mockedOrders.markPaidAndIssueTickets).toHaveBeenCalledWith(
      'order-1',
      'tier-1',
      'user-1',
      2,
    );
    expect(result).toEqual({ processed: true, orderId: 'order-1', ticketIds: ['t1', 't2'] });
  });
});

const PENDING_VENUE_PAYMENT = {
  id: 'payment-1',
  bookingId: 'booking-1',
  paymentReference: 'VEN-abc',
  amountKobo: 1000000n,
  platformFeeKobo: 100000n,
  venuePayoutKobo: 900000n,
  status: 'pending' as const,
  createdAt: new Date(),
  confirmedAt: null,
};

function venueChargePayload(reference = 'VEN-abc') {
  return { event: 'charge.success', data: { reference } };
}

describe('webhookService.handlePaystackEvent — venue bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches VEN- prefixed references to the venue booking handler, not the order handler', async () => {
    mockedVenueBookings.findPaymentByReference.mockResolvedValue(PENDING_VENUE_PAYMENT);
    mockedVenueBookings.confirmPayment.mockResolvedValue([{}, {}] as never);

    await webhookService.handlePaystackEvent(venueChargePayload());

    expect(mockedOrders.findByPaymentReference).not.toHaveBeenCalled();
    expect(mockedVenueBookings.findPaymentByReference).toHaveBeenCalledWith('VEN-abc');
  });

  it('handles an unknown venue payment reference gracefully', async () => {
    mockedVenueBookings.findPaymentByReference.mockResolvedValue(null);

    const result = await webhookService.handlePaystackEvent(venueChargePayload());
    expect(result).toEqual({ processed: false, reason: 'payment_not_found' });
  });

  it('is idempotent — replaying a webhook for an already-confirmed payment is a no-op', async () => {
    mockedVenueBookings.findPaymentByReference.mockResolvedValue({
      ...PENDING_VENUE_PAYMENT,
      status: 'confirmed',
    });

    const result = await webhookService.handlePaystackEvent(venueChargePayload());
    expect(result).toEqual({ processed: false, reason: 'already_processed' });
    expect(mockedVenueBookings.confirmPayment).not.toHaveBeenCalled();
  });

  it('confirms a pending payment and passes the commission amount through', async () => {
    mockedVenueBookings.findPaymentByReference.mockResolvedValue(PENDING_VENUE_PAYMENT);
    mockedVenueBookings.confirmPayment.mockResolvedValue([{}, {}] as never);

    const result = await webhookService.handlePaystackEvent(venueChargePayload());

    expect(mockedVenueBookings.confirmPayment).toHaveBeenCalledWith(
      'payment-1',
      'booking-1',
      100000n,
    );
    expect(result).toEqual({ processed: true, bookingId: 'booking-1' });
  });
});
