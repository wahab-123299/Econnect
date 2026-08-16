import { orderRepository } from '../repositories/order.repository';
import { userRepository } from '../repositories/user.repository';
import { paystackClient } from './paystack.client';
import { generateOrderPaymentReference } from '../utils/payment-reference';
import { AppError } from '../middleware/error-handler';

export const orderService = {
  async createOrder(userId: string, ticketTierId: string, quantity: number) {
    const tier = await orderRepository.findTierById(ticketTierId);
    if (!tier) {
      throw new AppError(404, 'TICKET_TIER_NOT_FOUND', 'Ticket tier not found.');
    }
    if (tier.event.status !== 'published') {
      throw new AppError(422, 'EVENT_NOT_ON_SALE', 'This event is not currently on sale.');
    }
    const now = new Date();
    if (tier.salesStart && now < tier.salesStart) {
      throw new AppError(422, 'SALES_NOT_STARTED', 'Ticket sales have not started yet.');
    }
    if (tier.salesEnd && now > tier.salesEnd) {
      throw new AppError(422, 'SALES_CLOSED', 'Ticket sales have closed for this tier.');
    }

    const user = await userRepository.findById(userId);
    if (!user?.email) {
      // Paystack/Flutterwave both require an email to initiate a charge.
      // Phone-only accounts (via OTP signup) will hit this — the frontend
      // should prompt for an email at checkout time in that case, rather
      // than requiring it at signup for every attendee.
      throw new AppError(
        422,
        'EMAIL_REQUIRED_FOR_PAYMENT',
        'An email address is required to complete payment. Please add one to your account.',
      );
    }

    // Reserve BEFORE calling out to Paystack — see order.repository.ts for
    // why this specific UPDATE is safe under concurrent requests for the
    // last remaining ticket.
    const reserved = await orderRepository.reserveCapacity(ticketTierId, quantity);
    if (!reserved) {
      throw new AppError(409, 'SOLD_OUT', 'Not enough tickets remaining at this tier.');
    }

    const totalKobo = tier.priceKobo * BigInt(quantity);
    const reference = generateOrderPaymentReference();

    let authorizationUrl: string;
    try {
      const result = await paystackClient.initializeTransaction({
        email: user.email,
        amountKobo: totalKobo,
        reference,
        metadata: { userId, ticketTierId, quantity, eventId: tier.event.id },
      });
      authorizationUrl = result.authorizationUrl;
    } catch (err) {
      // Payment init failed — release the reservation so these tickets go
      // back on sale instead of being silently locked away forever.
      await orderRepository.releaseCapacity(ticketTierId, quantity);
      throw err;
    }

    const order = await orderRepository.create({
      userId,
      totalKobo,
      paymentReference: reference,
    });

    return { orderId: order.id, paymentAuthorizationUrl: authorizationUrl };
  },
};
