import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { EventDetailDTO } from '@econnect/shared-types';
import { apiGet } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';

function formatNaira(kobo: string): string {
  return `₦${(Number(kobo) / 100).toLocaleString()}`;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, authFetch } = useAuth();
  const [event, setEvent] = useState<EventDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<EventDetailDTO>(`/events/${id}`)
      .then((data) => {
        setEvent(data);
        const firstAvailable = data.ticketTiers.find((t) => t.quantityRemaining > 0);
        setSelectedTierId(firstAvailable?.id ?? data.ticketTiers[0]?.id ?? null);
      })
      .catch(() => setError('This event could not be found.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleBuy() {
    if (!selectedTierId) return;
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setBuying(true);
    setBuyError(null);
    try {
      const res = await authFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({ ticketTierId: selectedTierId, quantity: 1 }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message ?? 'Could not start checkout.');
      }
      // Redirect to Paystack's hosted checkout page
      window.location.href = body.paymentAuthorizationUrl;
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : 'Something went wrong.');
      setBuying(false);
    }
  }

  if (loading) return <p className="p-6 text-gray-500 text-sm">Loading…</p>;
  if (error || !event) return <p className="p-6 text-red-600 text-sm">{error}</p>;

  const selectedTier = event.ticketTiers.find((t) => t.id === selectedTierId);
  const allSoldOut = event.ticketTiers.every((t) => t.quantityRemaining === 0);

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
          <button
            key={tier.id}
            onClick={() => tier.quantityRemaining > 0 && setSelectedTierId(tier.id)}
            disabled={tier.quantityRemaining === 0}
            className={`w-full flex justify-between items-center border rounded-md p-3 text-left disabled:opacity-50 ${
              tier.id === selectedTierId ? 'border-black ring-1 ring-black' : ''
            }`}
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
          </button>
        ))}
      </div>

      {buyError && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {buyError}
        </p>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button
          className="max-w-2xl mx-auto w-full block bg-black text-white rounded-md py-3 font-medium disabled:opacity-40"
          disabled={allSoldOut || !selectedTier || buying}
          onClick={handleBuy}
        >
          {buying
            ? 'Redirecting to payment…'
            : selectedTier
              ? `Buy — ${formatNaira(selectedTier.priceKobo)}`
              : 'Buy tickets'}
        </button>
      </div>
    </div>
  );
}
