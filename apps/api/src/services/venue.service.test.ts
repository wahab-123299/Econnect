import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/venue.repository', () => ({
  venueRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    addPhoto: vi.fn(),
    countPhotos: vi.fn(),
    setVideo: vi.fn(),
  },
}));
vi.mock('../repositories/venue-owner.repository', () => ({
  venueOwnerRepository: { create: vi.fn(), findById: vi.fn() },
}));

import { venueService } from './venue.service';
import { venueRepository } from '../repositories/venue.repository';
import { venueOwnerRepository } from '../repositories/venue-owner.repository';

const mockedVenues = vi.mocked(venueRepository);
const mockedOwners = vi.mocked(venueOwnerRepository);

const BASE_VENUE = {
  id: 'venue-1',
  venueOwnerId: 'owner-1',
  name: 'Landmark Hall',
  description: null,
  category: 'Conference Hall',
  address: 'Lagos',
  latitude: null,
  longitude: null,
  capacity: 200,
  basePriceKobo: 50000000n,
  videoUrl: null,
  status: 'active' as const,
  createdByAdminId: 'admin-1',
  createdAt: new Date(),
  photos: [],
};

describe('venueService.createVenue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404s when the venue owner does not exist', async () => {
    mockedOwners.findById.mockResolvedValue(null);

    await expect(
      venueService.createVenue('admin-1', { venueOwnerId: 'missing', name: 'X' }),
    ).rejects.toMatchObject({ code: 'VENUE_OWNER_NOT_FOUND' });
    expect(mockedVenues.create).not.toHaveBeenCalled();
  });

  it('creates a venue and returns kobo as a string', async () => {
    mockedOwners.findById.mockResolvedValue({
      id: 'owner-1',
      userId: null,
      businessName: 'Owner Co',
      contactPhone: '+2348000000000',
      payoutAccount: null,
      createdAt: new Date(),
    });
    mockedVenues.create.mockResolvedValue(BASE_VENUE as never);

    const result = await venueService.createVenue('admin-1', {
      venueOwnerId: 'owner-1',
      name: 'Landmark Hall',
      basePriceKobo: 50000000n,
    });

    expect(result.basePriceKobo).toBe('50000000');
    expect(result.category).toBe('Conference Hall');
  });
});

describe('venueService.addPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404s when the venue does not exist', async () => {
    mockedVenues.findById.mockResolvedValue(null);

    await expect(venueService.addPhoto('missing', 'https://x/y.jpg')).rejects.toMatchObject({
      code: 'VENUE_NOT_FOUND',
    });
  });

  it('refuses to add a photo past the cap', async () => {
    mockedVenues.findById.mockResolvedValue(BASE_VENUE as never);
    mockedVenues.countPhotos.mockResolvedValue(10);

    await expect(venueService.addPhoto('venue-1', 'https://x/y.jpg')).rejects.toMatchObject({
      code: 'TOO_MANY_PHOTOS',
    });
    expect(mockedVenues.addPhoto).not.toHaveBeenCalled();
  });

  it('adds a photo with the correct next sort order', async () => {
    mockedVenues.findById
      .mockResolvedValueOnce(BASE_VENUE as never)
      .mockResolvedValueOnce({ ...BASE_VENUE, photos: [{ id: 'p1', venueId: 'venue-1', url: 'x', sortOrder: 0 }] } as never);
    mockedVenues.countPhotos.mockResolvedValue(3);

    await venueService.addPhoto('venue-1', 'https://x/new.jpg');

    expect(mockedVenues.addPhoto).toHaveBeenCalledWith('venue-1', 'https://x/new.jpg', 3);
  });
});

describe('venueService.setVideo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404s when the venue does not exist', async () => {
    mockedVenues.findById.mockResolvedValue(null);
    await expect(venueService.setVideo('missing', 'https://x/y.mp4')).rejects.toMatchObject({
      code: 'VENUE_NOT_FOUND',
    });
  });

  it('sets the video url on an existing venue', async () => {
    mockedVenues.findById.mockResolvedValue(BASE_VENUE as never);
    mockedVenues.setVideo.mockResolvedValue({ ...BASE_VENUE, videoUrl: 'https://x/y.mp4' } as never);

    const result = await venueService.setVideo('venue-1', 'https://x/y.mp4');
    expect(result.videoUrl).toBe('https://x/y.mp4');
  });
});
