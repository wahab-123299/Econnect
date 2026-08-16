import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/event.repository', () => ({
  eventRepository: {
    findPublishedPaginated: vi.fn(),
    findPublishedById: vi.fn(),
  },
}));

import { publicEventService } from './public-event.service';
import { eventRepository } from '../repositories/event.repository';

const mockedEvents = vi.mocked(eventRepository);

describe('publicEventService.browse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes the minimum ticket price per event', async () => {
    mockedEvents.findPublishedPaginated.mockResolvedValue({
      events: [
        {
          id: 'e1',
          title: 'Concert',
          flyerUrl: null,
          startDatetime: new Date(),
          locationName: 'Lagos',
          ticketTiers: [{ priceKobo: 500000n }, { priceKobo: 250000n }, { priceKobo: 1000000n }],
        },
      ],
      total: 1,
    } as never);

    const result = await publicEventService.browse({ page: 1, limit: 20 });
    expect(result.events[0].minPriceKobo).toBe('250000');
  });

  it('returns null price for an event with no ticket tiers yet', async () => {
    mockedEvents.findPublishedPaginated.mockResolvedValue({
      events: [
        {
          id: 'e1',
          title: 'Concert',
          flyerUrl: null,
          startDatetime: new Date(),
          locationName: 'Lagos',
          ticketTiers: [],
        },
      ],
      total: 1,
    } as never);

    const result = await publicEventService.browse({ page: 1, limit: 20 });
    expect(result.events[0].minPriceKobo).toBeNull();
  });

  it('passes pagination through to the response', async () => {
    mockedEvents.findPublishedPaginated.mockResolvedValue({ events: [], total: 47 } as never);

    const result = await publicEventService.browse({ page: 2, limit: 10 });
    expect(result.pagination).toEqual({ page: 2, limit: 10, total: 47 });
  });
});

describe('publicEventService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404s identically whether the event does not exist or is not published', async () => {
    mockedEvents.findPublishedById.mockResolvedValue(null);

    await expect(publicEventService.getById('anything')).rejects.toMatchObject({
      code: 'EVENT_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('computes remaining quantity per tier and prefers business name over personal name', async () => {
    mockedEvents.findPublishedById.mockResolvedValue({
      id: 'e1',
      title: 'Concert',
      description: null,
      category: null,
      flyerUrl: null,
      locationName: 'Lagos',
      latitude: null,
      longitude: null,
      startDatetime: new Date(),
      endDatetime: null,
      status: 'published',
      organizer: { businessName: 'Acme Events', user: { fullName: 'Ada Okoye' } },
      ticketTiers: [
        { id: 't1', name: 'Regular', priceKobo: 500000n, quantityTotal: 100, quantitySold: 30 },
      ],
    } as never);

    const result = await publicEventService.getById('e1');
    expect(result.organizerName).toBe('Acme Events');
    expect(result.ticketTiers[0].quantityRemaining).toBe(70);
  });

  it('falls back to the organizer personal name when no business name is set', async () => {
    mockedEvents.findPublishedById.mockResolvedValue({
      id: 'e1',
      title: 'Concert',
      description: null,
      category: null,
      flyerUrl: null,
      locationName: null,
      latitude: null,
      longitude: null,
      startDatetime: new Date(),
      endDatetime: null,
      status: 'published',
      organizer: { businessName: null, user: { fullName: 'Ada Okoye' } },
      ticketTiers: [],
    } as never);

    const result = await publicEventService.getById('e1');
    expect(result.organizerName).toBe('Ada Okoye');
  });
});
