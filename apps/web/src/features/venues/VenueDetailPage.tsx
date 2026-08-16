import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { VenueDetailDTO } from '@econnect/shared-types';
import { apiGet } from '../../lib/api-client';
import BookingRequestModal from './BookingRequestModal';

function formatNaira(kobo: string | null): string {
  if (kobo === null) return 'Price on request';
  return `₦${(Number(kobo) / 100).toLocaleString()}`;
}

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<VenueDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<VenueDetailDTO>(`/venues/${id}`)
      .then(setVenue)
      .catch(() => setError('This venue could not be found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6 text-gray-500 text-sm">Loading…</p>;
  if (error || !venue) return <p className="p-6 text-red-600 text-sm">{error}</p>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-28">
      {venue.photos.length > 0 && (
        <div className="mb-2">
          <img
            src={venue.photos[activePhoto]}
            alt={venue.name}
            className="w-full aspect-[16/9] object-cover rounded-lg"
          />
          {venue.photos.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {venue.photos.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setActivePhoto(i)}
                  className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                    i === activePhoto ? 'border-black' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {venue.videoUrl && (
        <video controls className="w-full rounded-lg mb-4">
          <source src={venue.videoUrl} />
        </video>
      )}

      <h1 className="text-2xl font-bold">{venue.name}</h1>
      <p className="text-gray-500 mt-1">
        Hosted by {venue.hostedBy}
        {venue.category && ` · ${venue.category}`}
      </p>

      <div className="mt-4 space-y-1 text-sm">
        {venue.address && <p>{venue.address}</p>}
        {venue.capacity && <p>Up to {venue.capacity} guests</p>}
      </div>

      {venue.description && (
        <p className="mt-4 text-gray-700 whitespace-pre-wrap">{venue.description}</p>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between max-w-2xl mx-auto">
        <span className="font-semibold">{formatNaira(venue.basePriceKobo)}</span>
        {requestSent ? (
          <span className="text-sm text-green-600 font-medium">Request sent ✓</span>
        ) : (
          <button
            className="bg-black text-white rounded-md px-6 py-2.5 font-medium"
            onClick={() => setShowBookingModal(true)}
          >
            Request to book
          </button>
        )}
      </div>

      {showBookingModal && id && (
        <BookingRequestModal
          venueId={id}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            setShowBookingModal(false);
            setRequestSent(true);
          }}
        />
      )}
    </div>
  );
}
