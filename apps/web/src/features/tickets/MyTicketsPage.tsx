import { useEffect, useState } from 'react';
import type { TicketDTO } from '@econnect/shared-types';
import { useAuth } from '../../lib/auth-context';
import TicketCard from './TicketCard';
import TicketQrView from './TicketQrView';

export default function MyTicketsPage() {
  const { authFetch } = useAuth();
  const [tickets, setTickets] = useState<TicketDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TicketDTO | null>(null);

  useEffect(() => {
    authFetch('/me/tickets')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load tickets.');
        const body = await res.json();
        setTickets(body.tickets);
      })
      .catch(() => setError('Could not load your tickets. Please try again.'));
  }, [authFetch]);

  const now = Date.now();
  const upcoming = tickets?.filter((t) => new Date(t.event.startDatetime).getTime() >= now) ?? [];
  const past = tickets?.filter((t) => new Date(t.event.startDatetime).getTime() < now) ?? [];

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Tickets</h1>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!tickets && !error && <p className="text-gray-500 text-sm">Loading…</p>}

      {tickets && tickets.length === 0 && (
        <p className="text-gray-500 text-sm">You haven't bought any tickets yet.</p>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Upcoming</h2>
          {upcoming.map((t) => (
            <TicketCard key={t.id} ticket={t} onClick={() => setSelected(t)} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Past</h2>
          {past.map((t) => (
            <TicketCard key={t.id} ticket={t} onClick={() => setSelected(t)} />
          ))}
        </div>
      )}

      {selected && <TicketQrView ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
