import { useEffect, useState } from 'react';
import type { BrowseVenuesResponseDTO } from '@econnect/shared-types';
import { apiGet } from '../../lib/api-client';
import VenueCard from './VenueCard';

const CATEGORIES = ['Conference Hall', 'Pool Party', 'Wedding Garden', 'Event Centre', 'Other'];

export default function VenuesBrowsePage() {
  const [category, setCategory] = useState('');
  const [data, setData] = useState<BrowseVenuesResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);

    setLoading(true);
    setError(null);
    apiGet<BrowseVenuesResponseDTO>(`/venues?${params.toString()}`)
      .then(setData)
      .catch(() => setError('Could not load venues. Please try again.'))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Find a venue</h1>

      <select
        className="border rounded-md px-3 py-2 mb-4"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">All venue types</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {loading && <p className="text-gray-500 text-sm">Loading venues…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && !error && data?.venues.length === 0 && (
        <p className="text-gray-500 text-sm">No venues match yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.venues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
      </div>
    </div>
  );
}
