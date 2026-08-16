import { describe, it, expect } from 'vitest';
import { browseEventsQuerySchema } from './public-event.schemas';

describe('browseEventsQuerySchema', () => {
  it('applies default page and limit when omitted', () => {
    const result = browseEventsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('coerces string query params to numbers', () => {
    const result = browseEventsQuerySchema.parse({ page: '3', limit: '5' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(5);
  });

  it('rejects a limit above the max', () => {
    const result = browseEventsQuerySchema.safeParse({ limit: '999' });
    expect(result.success).toBe(false);
  });

  it('coerces date_from and date_to into Date objects', () => {
    const result = browseEventsQuerySchema.parse({ date_from: '2026-01-01', date_to: '2026-12-31' });
    expect(result.date_from).toBeInstanceOf(Date);
    expect(result.date_to).toBeInstanceOf(Date);
  });

  it('rejects a non-positive page number', () => {
    const result = browseEventsQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });
});
