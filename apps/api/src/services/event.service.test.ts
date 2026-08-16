import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/prisma', () => ({ prisma: {} }));
vi.mock('../repositories/event.repository', () => ({
  eventRepository: {
    findById: vi.fn(),
    findByIdForOwnerCheck: vi.fn(),
    createDraft: vi.fn(),
    updateBasics: vi.fn(),
    replaceTicketTiers: vi.fn(),
    setStatus: vi.fn(),
  },
}));
vi.mock('./organizer.service', () => ({
  organizerService: {
    getMyProfile: vi.fn(),
    requireVerifiedOrganizer: vi.fn(),
  },
}));

import { eventService } from './event.service';
import { eventRepository } from '../repositories/event.repository';
import { organizerService } from './organizer.service';

const mockedEvents = vi.mocked(eventRepository);
const mockedOrganizers = vi.mocked(organizerService);

const ORGANIZER_PROFILE = {
  id: 'org-1',
  businessName: 'Test Co',
  verificationStatus: 'verified' as const,
  verifiedAt: new Date(),
};

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

function baseEventForCheck(overrides: Partial<{
  flyerUrl: string | null;
  startDatetime: Date;
  organizerId: string;
}> = {}) {
  return {
    id: 'event-1',
    organizerId: 'org-1',
    status: 'draft' as const,
    flyerUrl: null,
    startDatetime: futureDate,
    ...overrides,
  };
}

describe('eventService.publish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedOrganizers.getMyProfile.mockResolvedValue(ORGANIZER_PROFILE);
  });

  it('refuses to publish without a flyer', async () => {
    mockedEvents.findByIdForOwnerCheck.mockResolvedValue(baseEventForCheck({ flyerUrl: null }));
    mockedEvents.findById.mockResolvedValue({
      id: 'event-1',
      ticketTiers: [{ id: 't1' }],
    } as never);

    await expect(eventService.publish('event-1', 'user-1')).rejects.toMatchObject({
      code: 'CANNOT_PUBLISH_INCOMPLETE_EVENT',
    });
  });

  it('refuses to publish without any ticket tiers', async () => {
    mockedEvents.findByIdForOwnerCheck.mockResolvedValue(
      baseEventForCheck({ flyerUrl: 'https://cdn.example.com/flyer.jpg' }),
    );
    mockedEvents.findById.mockResolvedValue({ id: 'event-1', ticketTiers: [] } as never);

    const error = await eventService.publish('event-1', 'user-1').catch((e) => e);
    expect(error.code).toBe('CANNOT_PUBLISH_INCOMPLETE_EVENT');
    expect(error.message).toContain('ticket tier');
  });

  it('refuses to publish with a start date in the past', async () => {
    mockedEvents.findByIdForOwnerCheck.mockResolvedValue(
      baseEventForCheck({ flyerUrl: 'https://cdn.example.com/flyer.jpg', startDatetime: pastDate }),
    );
    mockedEvents.findById.mockResolvedValue({
      id: 'event-1',
      ticketTiers: [{ id: 't1' }],
    } as never);

    const error = await eventService.publish('event-1', 'user-1').catch((e) => e);
    expect(error.code).toBe('CANNOT_PUBLISH_INCOMPLETE_EVENT');
    expect(error.message).toContain('future start date');
  });

  it('publishes successfully when all requirements are met', async () => {
    mockedEvents.findByIdForOwnerCheck.mockResolvedValue(
      baseEventForCheck({ flyerUrl: 'https://cdn.example.com/flyer.jpg' }),
    );
    mockedEvents.findById.mockResolvedValue({
      id: 'event-1',
      ticketTiers: [{ id: 't1' }],
    } as never);
    mockedEvents.setStatus.mockResolvedValue({
      id: 'event-1',
      status: 'published',
      ticketTiers: [],
    } as never);

    const result = await eventService.publish('event-1', 'user-1');
    expect(result.status).toBe('published');
    expect(mockedEvents.setStatus).toHaveBeenCalledWith('event-1', 'published');
  });

  it('rejects publishing an event owned by a different organizer', async () => {
    mockedEvents.findByIdForOwnerCheck.mockResolvedValue(baseEventForCheck({ organizerId: 'org-OTHER' }));

    await expect(eventService.publish('event-1', 'user-1')).rejects.toMatchObject({
      code: 'NOT_EVENT_OWNER',
    });
  });

  it('404s when the event does not exist', async () => {
    mockedEvents.findByIdForOwnerCheck.mockResolvedValue(null);

    await expect(eventService.publish('missing', 'user-1')).rejects.toMatchObject({
      code: 'EVENT_NOT_FOUND',
    });
  });
});

describe('eventService.createDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires a verified organizer before creating an event', async () => {
    mockedOrganizers.requireVerifiedOrganizer.mockRejectedValue(
      Object.assign(new Error('not verified'), { code: 'ORGANIZER_NOT_VERIFIED' }),
    );

    await expect(
      eventService.createDraft('user-1', { title: 'x', startDatetime: futureDate }, []),
    ).rejects.toMatchObject({ code: 'ORGANIZER_NOT_VERIFIED' });
    expect(mockedEvents.createDraft).not.toHaveBeenCalled();
  });
});
