import { prisma } from '../config/prisma';
import type { EventStatus, Prisma } from '@prisma/client';

export interface TicketTierInput {
  name: string;
  priceKobo: bigint;
  quantityTotal: number;
  salesStart?: Date;
  salesEnd?: Date;
}

export interface EventBasicsInput {
  title: string;
  description?: string;
  category?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  startDatetime: Date;
  endDatetime?: Date;
}

export interface PublicEventFilters {
  category?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}

export const eventRepository = {
  findById(id: string) {
    return prisma.event.findUnique({
      where: { id },
      include: { ticketTiers: true },
    });
  },

  // Separate from findById: callers that need to verify ownership want the
  // organizerId available without pulling every field, and this makes the
  // intent explicit at call sites (see event.service.ts).
  findByIdForOwnerCheck(id: string) {
    return prisma.event.findUnique({
      where: { id },
      select: { id: true, organizerId: true, status: true, flyerUrl: true, startDatetime: true },
    });
  },

  createDraft(
    organizerId: string,
    basics: EventBasicsInput,
    ticketTiers: TicketTierInput[],
  ) {
    return prisma.event.create({
      data: {
        organizerId,
        ...basics,
        ticketTiers: { create: ticketTiers },
      },
      include: { ticketTiers: true },
    });
  },

  updateBasics(id: string, basics: Partial<EventBasicsInput>) {
    return prisma.event.update({ where: { id }, data: basics });
  },

  // v1 keeps tier editing simple: replace the whole set rather than supporting
  // granular add/remove/reorder. Once an event has real sales, tiers should
  // become append-only anyway (never delete a tier tickets were sold against) —
  // that nuance is worth designing properly if/when organizers ask for it,
  // rather than guessing at the UX now.
  replaceTicketTiers(eventId: string, ticketTiers: TicketTierInput[]) {
    return prisma.$transaction([
      prisma.ticketTier.deleteMany({ where: { eventId } }),
      prisma.event.update({
        where: { id: eventId },
        data: { ticketTiers: { create: ticketTiers } },
        include: { ticketTiers: true },
      }),
    ]);
  },

  setStatus(id: string, status: EventStatus) {
    return prisma.event.update({ where: { id }, data: { status } });
  },

  // Only ever returns published events — draft/cancelled events must be
  // invisible to public browsing, not just filtered client-side.
  async findPublishedPaginated(filters: PublicEventFilters) {
    const where: Prisma.EventWhereInput = {
      status: 'published',
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            startDatetime: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { locationName: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: { ticketTiers: { select: { priceKobo: true } } },
        orderBy: { startDatetime: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.event.count({ where }),
    ]);

    return { events, total };
  },

  findPublishedById(id: string) {
    return prisma.event.findFirst({
      where: { id, status: 'published' },
      include: {
        ticketTiers: true,
        organizer: { select: { businessName: true, user: { select: { fullName: true } } } },
      },
    });
  },
};
