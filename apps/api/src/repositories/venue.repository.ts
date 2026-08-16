import { prisma } from '../config/prisma';

export interface VenueBasicsInput {
  name?: string;
  description?: string;
  category?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  basePriceKobo?: bigint;
}

export const venueRepository = {
  create(venueOwnerId: string, adminId: string, basics: Required<Pick<VenueBasicsInput, 'name'>> & VenueBasicsInput) {
    return prisma.venue.create({
      data: { venueOwnerId, createdByAdminId: adminId, ...basics },
    });
  },

  findById(id: string) {
    return prisma.venue.findUnique({
      where: { id },
      include: { photos: { orderBy: { sortOrder: 'asc' } }, venueOwner: true },
    });
  },

  update(id: string, basics: VenueBasicsInput) {
    return prisma.venue.update({ where: { id }, data: basics });
  },

  addPhoto(venueId: string, url: string, sortOrder: number) {
    return prisma.venuePhoto.create({ data: { venueId, url, sortOrder } });
  },

  countPhotos(venueId: string) {
    return prisma.venuePhoto.count({ where: { venueId } });
  },

  setVideo(id: string, videoUrl: string) {
    return prisma.venue.update({ where: { id }, data: { videoUrl } });
  },

  findPublishedPaginated(filters: { category?: string; page: number; limit: number }) {
    const where = {
      status: 'active' as const,
      ...(filters.category ? { category: filters.category } : {}),
    };
    return Promise.all([
      prisma.venue.findMany({
        where,
        include: { photos: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.venue.count({ where }),
    ]);
  },

  // Public detail lookup — deliberately scoped to status: 'active' so an
  // inactive/removed venue 404s the same way a nonexistent one does,
  // matching the same "don't leak existence" rule used for draft events.
  findActiveById(id: string) {
    return prisma.venue.findFirst({
      where: { id, status: 'active' },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        venueOwner: { select: { businessName: true } },
      },
    });
  },
};
