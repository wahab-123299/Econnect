import { eventRepository, type EventBasicsInput, type TicketTierInput } from '../repositories/event.repository';
import { organizerService } from './organizer.service';
import { AppError } from '../middleware/error-handler';
import type { Event, TicketTier } from '@prisma/client';

function toEventDTO(event: Event & { ticketTiers?: TicketTier[] }) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    flyerUrl: event.flyerUrl,
    locationName: event.locationName,
    startDatetime: event.startDatetime,
    endDatetime: event.endDatetime,
    status: event.status,
    ticketTiers: (event.ticketTiers ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      priceKobo: t.priceKobo.toString(),
      quantityTotal: t.quantityTotal,
      quantitySold: t.quantitySold,
    })),
  };
}

async function assertOwnership(eventId: string, userId: string) {
  const event = await eventRepository.findByIdForOwnerCheck(eventId);
  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found.');
  }
  const organizerProfile = await organizerService.getMyProfile(userId).catch(() => null);
  if (!organizerProfile || event.organizerId !== organizerProfile.id) {
    throw new AppError(403, 'NOT_EVENT_OWNER', 'You do not own this event.');
  }
  return event;
}

export const eventService = {
  async createDraft(
    userId: string,
    basics: EventBasicsInput,
    ticketTiers: TicketTierInput[],
  ) {
    const organizerProfile = await organizerService.requireVerifiedOrganizer(userId);
    const event = await eventRepository.createDraft(organizerProfile.id, basics, ticketTiers);
    return toEventDTO(event);
  },

  async updateEvent(
    eventId: string,
    userId: string,
    updates: Partial<EventBasicsInput> & { flyerUrl?: string; ticketTiers?: TicketTierInput[] },
  ) {
    await assertOwnership(eventId, userId);

    const { ticketTiers, ...basics } = updates;

    if (Object.keys(basics).length > 0) {
      await eventRepository.updateBasics(eventId, basics);
    }
    if (ticketTiers) {
      await eventRepository.replaceTicketTiers(eventId, ticketTiers);
    }

    const updated = await eventRepository.findById(eventId);
    return toEventDTO(updated!);
  },

  async publish(eventId: string, userId: string) {
    const eventForCheck = await assertOwnership(eventId, userId);
    const full = await eventRepository.findById(eventId);
    if (!full) {
      throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found.');
    }

    const missing: string[] = [];
    if (!eventForCheck.flyerUrl) missing.push('flyer');
    if (full.ticketTiers.length === 0) missing.push('at least one ticket tier');
    if (eventForCheck.startDatetime.getTime() <= Date.now()) missing.push('a future start date/time');

    if (missing.length > 0) {
      throw new AppError(
        422,
        'CANNOT_PUBLISH_INCOMPLETE_EVENT',
        `Cannot publish yet — missing: ${missing.join(', ')}.`,
      );
    }

    const updated = await eventRepository.setStatus(eventId, 'published');
    return toEventDTO(updated);
  },

  async getForEdit(eventId: string, userId: string) {
    await assertOwnership(eventId, userId);
    const event = await eventRepository.findById(eventId);
    return toEventDTO(event!);
  },
};
