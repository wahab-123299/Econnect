import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/ticket.repository', () => ({
  ticketRepository: {
    findForScan: vi.fn(),
    findByQrSignature: vi.fn(),
    checkIn: vi.fn(),
  },
}));
vi.mock('../repositories/event.repository', () => ({
  eventRepository: { findByIdForOwnerCheck: vi.fn() },
}));
vi.mock('./organizer.service', () => ({
  organizerService: { getMyProfile: vi.fn() },
}));

import { scanService } from './scan.service';
import { ticketRepository } from '../repositories/ticket.repository';
import { eventRepository } from '../repositories/event.repository';
import { organizerService } from './organizer.service';
import { generateQrSignature } from '../utils/qr-ticket';

const mockedTickets = vi.mocked(ticketRepository);
const mockedEvents = vi.mocked(eventRepository);
const mockedOrganizers = vi.mocked(organizerService);

const OWNED_EVENT = { id: 'event-1', organizerId: 'org-1', status: 'published' as const, flyerUrl: 'x', startDatetime: new Date() };
const ORGANIZER_PROFILE = { id: 'org-1', businessName: 'Co', verificationStatus: 'verified' as const, verifiedAt: new Date() };

describe('scanService.scanTicket — event ownership guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404s when the event does not exist', async () => {
    mockedEvents.findByIdForOwnerCheck.mockResolvedValue(null);

    await expect(scanService.scanTicket('event-1', 'user-1', 'sig')).rejects.toMatchObject({
      code: 'EVENT_NOT_FOUND',
    });
  });

  it('403s when the organizer does not own this event', async () => {
    mockedEvents.findByIdForOwnerCheck.mockResolvedValue({ ...OWNED_EVENT, organizerId: 'org-OTHER' });
    mockedOrganizers.getMyProfile.mockResolvedValue(ORGANIZER_PROFILE);

    await expect(scanService.scanTicket('event-1', 'user-1', 'sig')).rejects.toMatchObject({
      code: 'NOT_EVENT_OWNER',
    });
    expect(mockedTickets.findForScan).not.toHaveBeenCalled();
  });
});

describe('scanService.scanTicket — scan outcomes', () => {
  const ticketId = 'ticket-1';
  const validSignature = generateQrSignature(ticketId);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedEvents.findByIdForOwnerCheck.mockResolvedValue(OWNED_EVENT);
    mockedOrganizers.getMyProfile.mockResolvedValue(ORGANIZER_PROFILE);
  });

  it('rejects a forged/malformed signature as INVALID_TICKET without a DB lookup', async () => {
    const result = await scanService.scanTicket('event-1', 'user-1', 'garbage-not-a-real-signature');
    expect(result).toEqual({ valid: false, reason: 'INVALID_TICKET' });
    expect(mockedTickets.findForScan).not.toHaveBeenCalled();
  });

  it('rejects a validly-signed ticket id that does not exist in the DB', async () => {
    mockedTickets.findForScan.mockResolvedValue(null);
    const result = await scanService.scanTicket('event-1', 'user-1', validSignature);
    expect(result).toEqual({ valid: false, reason: 'INVALID_TICKET' });
  });

  it('rejects a valid ticket scanned at the wrong event', async () => {
    mockedTickets.findForScan.mockResolvedValue({
      id: ticketId,
      owner: { fullName: 'Ada Okoye' },
      ticketTier: { id: 'tier-1', name: 'Regular', event: { id: 'event-DIFFERENT', organizerId: 'org-1', title: 'X' } },
    } as never);

    const result = await scanService.scanTicket('event-1', 'user-1', validSignature);
    expect(result).toEqual({ valid: false, reason: 'WRONG_EVENT' });
    expect(mockedTickets.checkIn).not.toHaveBeenCalled();
  });

  it('checks in a valid, unused ticket successfully', async () => {
    mockedTickets.findForScan.mockResolvedValue({
      id: ticketId,
      owner: { fullName: 'Ada Okoye' },
      ticketTier: { id: 'tier-1', name: 'Regular', event: { id: 'event-1', organizerId: 'org-1', title: 'X' } },
    } as never);
    mockedTickets.checkIn.mockResolvedValue(true);

    const result = await scanService.scanTicket('event-1', 'user-1', validSignature);
    expect(result).toEqual({ valid: true, attendeeName: 'Ada Okoye', ticketTierName: 'Regular' });
    expect(mockedTickets.checkIn).toHaveBeenCalledWith(ticketId, 'user-1');
  });

  it('reports ALREADY_USED with the real check-in time when the atomic check-in loses the race', async () => {
    const checkedInAt = new Date('2026-06-01T20:00:00Z');
    mockedTickets.findForScan.mockResolvedValue({
      id: ticketId,
      owner: { fullName: 'Ada Okoye' },
      ticketTier: { id: 'tier-1', name: 'Regular', event: { id: 'event-1', organizerId: 'org-1', title: 'X' } },
    } as never);
    mockedTickets.checkIn.mockResolvedValue(false);
    mockedTickets.findByQrSignature.mockResolvedValue({ checkedInAt } as never);

    const result = await scanService.scanTicket('event-1', 'user-1', validSignature);
    expect(result).toEqual({ valid: false, reason: 'ALREADY_USED', checkedInAt });
  });
});
