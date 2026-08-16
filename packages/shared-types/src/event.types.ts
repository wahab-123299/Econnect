// All money fields are kobo amounts serialized as strings (BigInt doesn't survive
// JSON.stringify as a number safely). Convert with BigInt(value) / Number(value) as needed
// — always keep arithmetic in kobo, never convert to Naira floats mid-calculation.

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface TicketTierDTO {
  id: string;
  name: string;
  priceKobo: string;
  quantityTotal: number;
  quantityRemaining: number;
}

export interface EventSummaryDTO {
  id: string;
  title: string;
  flyerUrl: string | null;
  startDatetime: string;
  locationName: string | null;
  minPriceKobo: string | null;
}

export interface BrowseEventsResponseDTO {
  events: EventSummaryDTO[];
  pagination: { page: number; limit: number; total: number };
}

export interface EventDetailDTO {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  flyerUrl: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  startDatetime: string;
  endDatetime: string | null;
  status: EventStatus;
  organizerName: string;
  ticketTiers: TicketTierDTO[];
}

export interface CreateTicketTierInput {
  name: string;
  priceKobo: string;
  quantityTotal: number;
}

export interface CreateEventRequestDTO {
  title: string;
  description?: string;
  category?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  startDatetime: string;
  endDatetime?: string;
  ticketTiers: CreateTicketTierInput[];
}

export type TicketStatus = 'unused' | 'used' | 'void';

export interface TicketDTO {
  id: string;
  status: TicketStatus;
  qrSignature: string;
  checkedInAt: string | null;
  event: {
    id: string;
    title: string;
    startDatetime: string;
    locationName: string | null;
    flyerUrl: string | null;
  };
  ticketTier: {
    name: string;
    priceKobo: string;
  };
}
