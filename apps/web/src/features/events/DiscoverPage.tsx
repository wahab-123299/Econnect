import { useEffect, useState } from 'react';
import type { BrowseEventsResponseDTO } from '@econnect/shared-types';
import { apiGet } from '../../lib/api-client';
import EventCard from './EventCard';

const CATEGORIES = ['Concert', 'Comedy', 'Conference', 'Wedding', 'Party', 'Other'];

export default function DiscoverPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [data, setData] = useState<BrowseEventsResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);

    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      apiGet<BrowseEventsResponseDTO>(`/events?${params.toString()}`)
        .then(setData)
        .catch(() => setError('Could not load events. Please try again.'))
        .finally(() => setLoading(false));
    }, 300); // debounce search-as-you-type

    return () => clearTimeout(timeout);
  }, [search, category]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Discover events</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          className="flex-1 border rounded-md px-3 py-2"
          placeholder="Search events or locations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded-md px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-500 text-sm">Loading events…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!loading && !error && data?.events.length === 0 && (
        <p className="text-gray-500 text-sm">No events match your search yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.events.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </div>
  );
}
