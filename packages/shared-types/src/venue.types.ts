export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'deposit_paid'
  | 'confirmed'
  | 'cancelled';

export interface VenueSummaryDTO {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  capacity: number | null;
  basePriceKobo: string | null;
  coverPhotoUrl: string | null;
}

export interface BrowseVenuesResponseDTO {
  venues: VenueSummaryDTO[];
  pagination: { page: number; limit: number; total: number };
}

export interface VenueDetailDTO {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  basePriceKobo: string | null;
  videoUrl: string | null;
  photos: string[];
  hostedBy: string;
}

export interface CreateBookingRequestDTO {
  venueId: string;
  proposedDate: string;
  proposedBudgetKobo?: string;
  eventId?: string;
}

export interface BookingDTO {
  id: string;
  status: BookingStatus;
  proposedDate: string;
  proposedBudgetKobo: string | null;
  depositAmountKobo: string | null;
  venue: { id: string; name: string };
}
