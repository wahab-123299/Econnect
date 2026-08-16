import { eventRepository } from '../repositories/event.repository';
import { AppError } from '../middleware/error-handler';
import type { Event, TicketTier } from '@prisma/client';

interface BrowseFilters {
  category?: string;
  search?: string;
  date_from?: Date;
  date_to?: Date;
  page: number;
  limit: number;
}

function minPriceKobo(tiers: { priceKobo: bigint }[]): string | null {
  if (tiers.length === 0) return null;
  return tiers.reduce((min, t) => (t.priceKobo < min ? t.priceKobo : min), tiers[0].priceKobo).toString();
}

function toSummaryDTO(event: Event & { ticketTiers: { priceKobo: bigint }[] }) {
  return {
    id: event.id,
    title: event.title,
    flyerUrl: event.flyerUrl,
    startDatetime: event.startDatetime,
    locationName: event.locationName,
    minPriceKobo: minPriceKobo(event.ticketTiers),
  };
}

export const publicEventService = {
  async browse(filters: BrowseFilters) {
    const { events, total } = await eventRepository.findPublishedPaginated({
      category: filters.category,
      search: filters.search,
      dateFrom: filters.date_from,
      dateTo: filters.date_to,
      page: filters.page,
      limit: filters.limit,
    });

    return {
      events: events.map(toSummaryDTO),
      pagination: { page: filters.page, limit: filters.limit, total },
    };
  },

  async getById(id: string) {
    const event = await eventRepository.findPublishedById(id);
    // Deliberately the same 404 whether the event doesn't exist, is a draft,
    // or was cancelled — an unauthenticated visitor shouldn't be able to tell
    // the difference (see Phase 5: don't leak existence of non-public events).
    if (!event) {
      throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found.');
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      flyerUrl: event.flyerUrl,
      locationName: event.locationName,
      latitude: event.latitude ? Number(event.latitude) : null,
      longitude: event.longitude ? Number(event.longitude) : null,
      startDatetime: event.startDatetime,
      endDatetime: event.endDatetime,
      status: event.status,
      organizerName: event.organizer.businessName ?? event.organizer.user.fullName,
      ticketTiers: event.ticketTiers.map((t: TicketTier) => ({
        id: t.id,
        name: t.name,
        priceKobo: t.priceKobo.toString(),
        quantityTotal: t.quantityTotal,
        quantityRemaining: t.quantityTotal - t.quantitySold,
      })),
    };
  },
};
