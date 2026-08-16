import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/venue.repository', () => ({
  venueRepository: {
    findPublishedPaginated: vi.fn(),
    findActiveById: vi.fn(),
  },
}));

import { publicVenueService } from './public-venue.service';
import { venueRepository } from '../repositories/venue.repository';

const mockedVenues = vi.mocked(venueRepository);

describe('publicVenueService.browse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the first photo as the cover photo', async () => {
    mockedVenues.findPublishedPaginated.mockResolvedValue([
      [
        {
          id: 'v1',
          name: 'Hall',
          category: 'Conference Hall',
          address: 'Lagos',
          capacity: 100,
          basePriceKobo: 200000n,
          photos: [{ url: 'https://x/cover.jpg' }, { url: 'https://x/second.jpg' }],
        },
      ],
      1,
    ] as never);

    const result = await publicVenueService.browse({ page: 1, limit: 20 });
    expect(result.venues[0].coverPhotoUrl).toBe('https://x/cover.jpg');
  });

  it('returns null cover photo for a venue with no photos yet', async () => {
    mockedVenues.findPublishedPaginated.mockResolvedValue([
      [
        {
          id: 'v1',
          name: 'Hall',
          category: null,
          address: null,
          capacity: null,
          basePriceKobo: null,
          photos: [],
        },
      ],
      1,
    ] as never);

    const result = await publicVenueService.browse({ page: 1, limit: 20 });
    expect(result.venues[0].coverPhotoUrl).toBeNull();
    expect(result.venues[0].basePriceKobo).toBeNull();
  });
});

describe('publicVenueService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404s for a venue that does not exist or is inactive', async () => {
    mockedVenues.findActiveById.mockResolvedValue(null);

    await expect(publicVenueService.getById('missing')).rejects.toMatchObject({
      code: 'VENUE_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('returns full detail including video and all photos', async () => {
    mockedVenues.findActiveById.mockResolvedValue({
      id: 'v1',
      name: 'Hall',
      description: 'A nice hall',
      category: 'Pool Party',
      address: 'Lekki',
      latitude: null,
      longitude: null,
      capacity: 50,
      basePriceKobo: 300000n,
      videoUrl: 'https://x/walkthrough.mp4',
      photos: [{ url: 'https://x/a.jpg' }, { url: 'https://x/b.jpg' }],
      venueOwner: { businessName: 'Best Halls Ltd' },
    } as never);

    const result = await publicVenueService.getById('v1');
    expect(result.videoUrl).toBe('https://x/walkthrough.mp4');
    expect(result.photos).toEqual(['https://x/a.jpg', 'https://x/b.jpg']);
    expect(result.hostedBy).toBe('Best Halls Ltd');
  });
});
