import { venueRepository, type VenueBasicsInput } from '../repositories/venue.repository';
import { venueOwnerRepository } from '../repositories/venue-owner.repository';
import { AppError } from '../middleware/error-handler';
import type { Venue, VenuePhoto, VenueOwnerProfile } from '@prisma/client';

const MAX_PHOTOS_PER_VENUE = 10;

function toVenueDTO(venue: Venue & { photos?: VenuePhoto[]; venueOwner?: VenueOwnerProfile }) {
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
    status: venue.status,
    photos: (venue.photos ?? []).map((p) => p.url),
    ownerBusinessName: venue.venueOwner?.businessName,
  };
}

export const venueService = {
  async createOwner(businessName: string, contactPhone: string) {
    const owner = await venueOwnerRepository.create(businessName, contactPhone);
    return { id: owner.id, businessName: owner.businessName, contactPhone: owner.contactPhone };
  },

  async createVenue(
    adminId: string,
    input: { venueOwnerId: string; name: string } & VenueBasicsInput,
  ) {
    const owner = await venueOwnerRepository.findById(input.venueOwnerId);
    if (!owner) {
      throw new AppError(404, 'VENUE_OWNER_NOT_FOUND', 'Venue owner not found.');
    }
    const { venueOwnerId, ...basics } = input;
    const venue = await venueRepository.create(venueOwnerId, adminId, basics);
    return toVenueDTO(venue);
  },

  async updateVenue(venueId: string, updates: VenueBasicsInput) {
    const existing = await venueRepository.findById(venueId);
    if (!existing) {
      throw new AppError(404, 'VENUE_NOT_FOUND', 'Venue not found.');
    }
    const updated = await venueRepository.update(venueId, updates);
    return toVenueDTO(updated);
  },

  async addPhoto(venueId: string, url: string) {
    const existing = await venueRepository.findById(venueId);
    if (!existing) {
      throw new AppError(404, 'VENUE_NOT_FOUND', 'Venue not found.');
    }
    const currentCount = await venueRepository.countPhotos(venueId);
    if (currentCount >= MAX_PHOTOS_PER_VENUE) {
      throw new AppError(
        422,
        'TOO_MANY_PHOTOS',
        `A venue can have at most ${MAX_PHOTOS_PER_VENUE} photos.`,
      );
    }
    await venueRepository.addPhoto(venueId, url, currentCount);
    const updated = await venueRepository.findById(venueId);
    return toVenueDTO(updated!);
  },

  async setVideo(venueId: string, videoUrl: string) {
    const existing = await venueRepository.findById(venueId);
    if (!existing) {
      throw new AppError(404, 'VENUE_NOT_FOUND', 'Venue not found.');
    }
    const updated = await venueRepository.setVideo(venueId, videoUrl);
    return toVenueDTO(updated);
  },

  async getById(venueId: string) {
    const venue = await venueRepository.findById(venueId);
    if (!venue) {
      throw new AppError(404, 'VENUE_NOT_FOUND', 'Venue not found.');
    }
    return toVenueDTO(venue);
  },
};
