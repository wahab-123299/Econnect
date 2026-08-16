export interface ApiErrorDTO {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
}

export * from './auth.types';
export * from './event.types';
export * from './order.types';
export * from './venue.types';
