import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/order.repository', () => ({
  orderRepository: {
    findTierById: vi.fn(),
    reserveCapacity: vi.fn(),
    releaseCapacity: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock('../repositories/user.repository', () => ({
  userRepository: { findById: vi.fn() },
}));
vi.mock('./paystack.client', () => ({
  paystackClient: { initializeTransaction: vi.fn() },
}));

import { orderService } from './order.service';
import { orderRepository } from '../repositories/order.repository';
import { userRepository } from '../repositories/user.repository';
import { paystackClient } from './paystack.client';

const mockedOrders = vi.mocked(orderRepository);
const mockedUsers = vi.mocked(userRepository);
const mockedPaystack = vi.mocked(paystackClient);

const PUBLISHED_TIER = {
  id: 'tier-1',
  priceKobo: 500000n,
  quantityTotal: 100,
  quantitySold: 10,
  salesStart: null,
  salesEnd: null,
  event: { id: 'event-1', status: 'published' as const, title: 'Concert' },
};

const USER_WITH_EMAIL = { id: 'user-1', email: 'ada@example.com' };

describe('orderService.createOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404s when the ticket tier does not exist', async () => {
    mockedOrders.findTierById.mockResolvedValue(null);

    await expect(orderService.createOrder('user-1', 'missing-tier', 1)).rejects.toMatchObject({
      code: 'TICKET_TIER_NOT_FOUND',
      statusCode: 404,
    });
    expect(mockedOrders.reserveCapacity).not.toHaveBeenCalled();
  });

  it('refuses to sell for an unpublished event', async () => {
    mockedOrders.findTierById.mockResolvedValue({
      ...PUBLISHED_TIER,
      event: { ...PUBLISHED_TIER.event, status: 'draft' },
    } as never);

    await expect(orderService.createOrder('user-1', 'tier-1', 1)).rejects.toMatchObject({
      code: 'EVENT_NOT_ON_SALE',
    });
  });

  it('refuses to sell before the sales window opens', async () => {
    const future = new Date(Date.now() + 60_000);
    mockedOrders.findTierById.mockResolvedValue({
      ...PUBLISHED_TIER,
      salesStart: future,
    } as never);

    await expect(orderService.createOrder('user-1', 'tier-1', 1)).rejects.toMatchObject({
      code: 'SALES_NOT_STARTED',
    });
  });

  it('refuses to sell after the sales window closes', async () => {
    const past = new Date(Date.now() - 60_000);
    mockedOrders.findTierById.mockResolvedValue({
      ...PUBLISHED_TIER,
      salesEnd: past,
    } as never);

    await expect(orderService.createOrder('user-1', 'tier-1', 1)).rejects.toMatchObject({
      code: 'SALES_CLOSED',
    });
  });

  it('requires the buyer to have an email on file', async () => {
    mockedOrders.findTierById.mockResolvedValue(PUBLISHED_TIER as never);
    mockedUsers.findById.mockResolvedValue({ id: 'user-1', email: null } as never);

    await expect(orderService.createOrder('user-1', 'tier-1', 1)).rejects.toMatchObject({
      code: 'EMAIL_REQUIRED_FOR_PAYMENT',
    });
    expect(mockedOrders.reserveCapacity).not.toHaveBeenCalled();
  });

  it('returns SOLD_OUT and never calls Paystack when reservation fails', async () => {
    mockedOrders.findTierById.mockResolvedValue(PUBLISHED_TIER as never);
    mockedUsers.findById.mockResolvedValue(USER_WITH_EMAIL as never);
    mockedOrders.reserveCapacity.mockResolvedValue(false);

    await expect(orderService.createOrder('user-1', 'tier-1', 5)).rejects.toMatchObject({
      code: 'SOLD_OUT',
      statusCode: 409,
    });
    expect(mockedPaystack.initializeTransaction).not.toHaveBeenCalled();
    expect(mockedOrders.create).not.toHaveBeenCalled();
  });

  it('releases the reservation and creates no order when Paystack init fails', async () => {
    mockedOrders.findTierById.mockResolvedValue(PUBLISHED_TIER as never);
    mockedUsers.findById.mockResolvedValue(USER_WITH_EMAIL as never);
    mockedOrders.reserveCapacity.mockResolvedValue(true);
    mockedPaystack.initializeTransaction.mockRejectedValue(new Error('provider down'));

    await expect(orderService.createOrder('user-1', 'tier-1', 3)).rejects.toThrow('provider down');

    expect(mockedOrders.releaseCapacity).toHaveBeenCalledWith('tier-1', 3);
    expect(mockedOrders.create).not.toHaveBeenCalled();
  });

  it('computes total in kobo correctly and creates the order on success', async () => {
    mockedOrders.findTierById.mockResolvedValue(PUBLISHED_TIER as never);
    mockedUsers.findById.mockResolvedValue(USER_WITH_EMAIL as never);
    mockedOrders.reserveCapacity.mockResolvedValue(true);
    mockedPaystack.initializeTransaction.mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/abc123',
      accessCode: 'abc123',
    });
    mockedOrders.create.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: 'pending',
      totalKobo: 1500000n,
      paymentReference: 'TIX-123',
      createdAt: new Date(),
      paidAt: null,
    } as never);

    const result = await orderService.createOrder('user-1', 'tier-1', 3);

    // 500000 kobo * 3 = 1,500,000 kobo — exact integer math, no float drift.
    expect(mockedPaystack.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amountKobo: 1500000n, email: 'ada@example.com' }),
    );
    expect(result).toEqual({
      orderId: 'order-1',
      paymentAuthorizationUrl: 'https://checkout.paystack.com/abc123',
    });
  });
});
