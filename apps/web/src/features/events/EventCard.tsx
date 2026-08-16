import { Link } from 'react-router-dom';
import type { EventSummaryDTO } from '@econnect/shared-types';

function formatNaira(kobo: string | null): string {
  if (kobo === null) return 'Price TBA';
  const naira = Number(kobo) / 100;
  return `From ₦${naira.toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function EventCard({ event }: { event: EventSummaryDTO }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[16/9] bg-gray-100">
        {event.flyerUrl ? (
          <img src={event.flyerUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No flyer yet
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold truncate">{event.title}</p>
        <p className="text-sm text-gray-500">{formatDate(event.startDatetime)}</p>
        {event.locationName && (
          <p className="text-sm text-gray-500 truncate">{event.locationName}</p>
        )}
        <p className="text-sm font-medium mt-1">{formatNaira(event.minPriceKobo)}</p>
      </div>
    </Link>
  );
}
