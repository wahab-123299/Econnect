import { venueRepository } from '../repositories/venue.repository';
import { AppError } from '../middleware/error-handler';
import type { Venue, VenuePhoto } from '@prisma/client';

interface BrowseFilters {
  category?: string;
  page: number;
  limit: number;
}

function toSummaryDTO(venue: Venue & { photos: VenuePhoto[] }) {
  return {
    id: venue.id,
    name: venue.name,
    category: venue.category,
    address: venue.address,
    capacity: venue.capacity,
    basePriceKobo: venue.basePriceKobo?.toString() ?? null,
    coverPhotoUrl: venue.photos[0]?.url ?? null,
  };
}

export const publicVenueService = {
  async browse(filters: BrowseFilters) {
    const [venues, total] = await venueRepository.findPublishedPaginated(filters);
    return {
      venues: venues.map(toSummaryDTO),
      pagination: { page: filters.page, limit: filters.limit, total },
    };
  },

  async getById(id: string) {
    const venue = await venueRepository.findActiveById(id);
    if (!venue) {
      throw new AppError(404, 'VENUE_NOT_FOUND', 'Venue not found.');
    }

    return {
      id: venue.id,
      name: venue.name,
      description: venue.description,
      category: venue.category,
      address: venue.address,
      latitude: venue.latitude ? Number(venue.latitude) : null,
      longitude: venue.longitude ? Number(venue.longitude) : null,
      capacity: venue.capacity,
      basePriceKobo: venue.basePriceKobo?.toString() ?? null,
      videoUrl: venue.videoUrl,
      photos: venue.photos.map((p) => p.url),
      hostedBy: venue.venueOwner.businessName,
    };
  },
};
