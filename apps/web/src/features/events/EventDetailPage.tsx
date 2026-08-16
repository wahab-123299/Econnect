import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { EventDetailDTO } from '@econnect/shared-types';
import { apiGet } from '../../lib/api-client';

function formatNaira(kobo: string): string {
  return `₦${(Number(kobo) / 100).toLocaleString()}`;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<EventDetailDTO>(`/events/${id}`)
      .then(setEvent)
      .catch(() => setError('This event could not be found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6 text-gray-500 text-sm">Loading…</p>;
  if (error || !event) return <p className="p-6 text-red-600 text-sm">{error}</p>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-28">
      {event.flyerUrl && (
        <img src={event.flyerUrl} alt={event.title} className="w-full rounded-lg mb-4" />
      )}

      <h1 className="text-2xl font-bold">{event.title}</h1>
      <p className="text-gray-500 mt-1">
        by {event.organizerName}
        {event.category && ` · ${event.category}`}
      </p>

      <div className="mt-4 space-y-1 text-sm">
        <p>{new Date(event.startDatetime).toLocaleString()}</p>
        {event.locationName && <p>{event.locationName}</p>}
      </div>

      {event.description && (
        <p className="mt-4 text-gray-700 whitespace-pre-wrap">{event.description}</p>
      )}

      <div className="mt-6 space-y-2">
        <h2 className="font-semibold">Tickets</h2>
        {event.ticketTiers.map((tier) => (
          <div
            key={tier.id}
            className="flex justify-between items-center border rounded-md p-3"
          >
            <div>
              <p className="font-medium">{tier.name}</p>
              {tier.quantityRemaining <= 10 && tier.quantityRemaining > 0 && (
                <p className="text-xs text-orange-600">Only {tier.quantityRemaining} left</p>
              )}
              {tier.quantityRemaining === 0 && (
                <p className="text-xs text-red-600">Sold out</p>
              )}
            </div>
            <p className="font-semibold">{formatNaira(tier.priceKobo)}</p>
          </div>
        ))}
      </div>

      {/* Sticky buy button — checkout itself lands with the Ticketing epic (Issue #14) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button
          className="max-w-2xl mx-auto w-full block bg-black text-white rounded-md py-3 font-medium disabled:opacity-40"
          disabled={event.ticketTiers.every((t) => t.quantityRemaining === 0)}
        >
          Buy tickets
        </button>
      </div>
    </div>
  );
}
