import { Link } from 'react-router-dom';
import type { VenueSummaryDTO } from '@econnect/shared-types';

function formatNaira(kobo: string | null): string {
  if (kobo === null) return 'Price on request';
  return `From ₦${(Number(kobo) / 100).toLocaleString()}`;
}

export default function VenueCard({ venue }: { venue: VenueSummaryDTO }) {
  return (
    <Link
      to={`/venues/${venue.id}`}
      className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[16/9] bg-gray-100">
        {venue.coverPhotoUrl ? (
          <img src={venue.coverPhotoUrl} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No photo yet
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold truncate">{venue.name}</p>
        {venue.category && <p className="text-sm text-gray-500">{venue.category}</p>}
        {venue.capacity && <p className="text-sm text-gray-500">Up to {venue.capacity} guests</p>}
        <p className="text-sm font-medium mt-1">{formatNaira(venue.basePriceKobo)}</p>
      </div>
    </Link>
  );
}
