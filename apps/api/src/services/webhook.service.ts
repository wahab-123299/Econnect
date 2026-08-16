import { orderRepository } from '../repositories/order.repository';
import { venueBookingRepository } from '../repositories/venue-booking.repository';
import { verifyPaystackSignature } from '../utils/paystack-webhook';
import { logger } from '../config/logger';

interface PaystackChargeSuccessPayload {
  event: string;
  data: {
    reference: string;
    metadata?: {
      ticketTierId?: string;
      quantity?: number;
      userId?: string;
      bookingId?: string;
      organizerId?: string;
    };
  };
}

async function handleTicketOrderPayment(payload: PaystackChargeSuccessPayload) {
  const order = await orderRepository.findByPaymentReference(payload.data.reference);
  if (!order) {
    logger.warn({ reference: payload.data.reference }, 'Webhook for unknown order reference');
    return { processed: false, reason: 'order_not_found' as const };
  }

  // Idempotency: a webhook can legitimately be delivered more than once
  // (Paystack retries on anything but a fast 200). Re-processing an
  // already-paid order would double-issue tickets — this check is what
  // makes a replayed webhook a safe no-op instead of a fraud vector.
  if (order.status === 'paid') {
    return { processed: false, reason: 'already_processed' as const };
  }
  if (order.status !== 'pending') {
    logger.warn({ orderId: order.id, status: order.status }, 'Webhook for non-pending order');
    return { processed: false, reason: 'unexpected_order_status' as const };
  }

  const { ticketTierId, quantity } = payload.data.metadata ?? {};
  if (!ticketTierId || !quantity) {
    logger.error({ orderId: order.id }, 'Webhook payload missing ticket metadata');
    return { processed: false, reason: 'missing_metadata' as const };
  }

  const result = await orderRepository.markPaidAndIssueTickets(
    order.id,
    ticketTierId,
    order.userId,
    quantity,
  );

  return { processed: true as const, orderId: result.order.id, ticketIds: result.ticketIds };
}

async function handleVenueBookingPayment(payload: PaystackChargeSuccessPayload) {
  const payment = await venueBookingRepository.findPaymentByReference(payload.data.reference);
  if (!payment) {
    logger.warn({ reference: payload.data.reference }, 'Webhook for unknown venue payment reference');
    return { processed: false, reason: 'payment_not_found' as const };
  }

  // Same idempotency reasoning as ticket orders — a replayed webhook for an
  // already-confirmed deposit must be a safe no-op, not a second commission
  // record.
  if (payment.status === 'confirmed') {
    return { processed: false, reason: 'already_processed' as const };
  }
  if (payment.status !== 'pending') {
    logger.warn(
      { paymentId: payment.id, status: payment.status },
      'Webhook for non-pending venue payment',
    );
    return { processed: false, reason: 'unexpected_payment_status' as const };
  }

  await venueBookingRepository.confirmPayment(payment.id, payment.bookingId, payment.platformFeeKobo);

  return { processed: true as const, bookingId: payment.bookingId };
}

export const webhookService = {
  verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    return verifyPaystackSignature(rawBody, signatureHeader);
  },

  // Returns a result object rather than throwing for "nothing to do" cases
  // (unknown reference, already processed, wrong event type) — none of
  // those are errors from the webhook's point of view; Paystack just wants
  // a 200 either way; see docs/ARCHITECTURE.md 3.4.
  //
  // Dispatches on the payment reference PREFIX (TIX- vs VEN-) rather than
  // needing a DB lookup to figure out which flow this belongs to — the
  // prefix is set at reference-generation time specifically for this.
  async handlePaystackEvent(payload: PaystackChargeSuccessPayload) {
    if (payload.event !== 'charge.success') {
      return { processed: false, reason: 'ignored_event_type' as const };
    }

    if (payload.data.reference.startsWith('VEN-')) {
      return handleVenueBookingPayment(payload);
    }
    return handleTicketOrderPayment(payload);
  },
};
