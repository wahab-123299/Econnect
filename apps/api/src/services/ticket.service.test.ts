import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/ticket.repository', () => ({
  ticketRepository: { findByOwnerUserId: vi.fn() },
}));

import { ticketService } from './ticket.service';
import { ticketRepository } from '../repositories/ticket.repository';

const mockedTickets = vi.mocked(ticketRepository);

describe('ticketService.getMyTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps DB rows into flat ticket DTOs with string kobo amounts', async () => {
    mockedTickets.findByOwnerUserId.mockResolvedValue([
      {
        id: 'ticket-1',
        status: 'unused',
        qrSignature: 'ticket-1.abc123',
        checkedInAt: null,
        ticketTier: {
          name: 'Regular',
          priceKobo: 500000n,
          event: {
            id: 'event-1',
            title: 'Concert',
            startDatetime: new Date('2026-12-01T18:00:00Z'),
            locationName: 'Landmark Centre',
            flyerUrl: 'https://cdn.example.com/flyer.jpg',
          },
        },
      },
    ] as never);

    const result = await ticketService.getMyTickets('user-1');

    expect(result).toEqual([
      {
        id: 'ticket-1',
        status: 'unused',
        qrSignature: 'ticket-1.abc123',
        checkedInAt: null,
        event: {
          id: 'event-1',
          title: 'Concert',
          startDatetime: new Date('2026-12-01T18:00:00Z'),
          locationName: 'Landmark Centre',
          flyerUrl: 'https://cdn.example.com/flyer.jpg',
        },
        ticketTier: { name: 'Regular', priceKobo: '500000' },
      },
    ]);
  });

  it('returns an empty array for a user with no tickets', async () => {
    mockedTickets.findByOwnerUserId.mockResolvedValue([]);
    const result = await ticketService.getMyTickets('user-1');
    expect(result).toEqual([]);
  });
});
