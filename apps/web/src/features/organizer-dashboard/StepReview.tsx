import type { CreateEventRequestDTO } from '@econnect/shared-types';

interface Props {
  event: CreateEventRequestDTO;
  flyerUrl: string;
  saving: boolean;
  publishError: string | null;
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export default function StepReview({
  event,
  flyerUrl,
  saving,
  publishError,
  onBack,
  onSaveDraft,
  onPublish,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Review</h2>

      {flyerUrl && (
        <img src={flyerUrl} alt="" className="w-full max-h-48 object-cover rounded-md border" />
      )}

      <div className="space-y-1 text-sm">
        <p className="text-lg font-semibold">{event.title}</p>
        {event.category && <p className="text-gray-500">{event.category}</p>}
        {event.locationName && <p>{event.locationName}</p>}
        <p>{new Date(event.startDatetime).toLocaleString()}</p>
      </div>

      <div className="space-y-1">
        {event.ticketTiers.map((t, i) => (
          <div key={i} className="flex justify-between text-sm border-b py-1">
            <span>{t.name}</span>
            <span>
              ₦{(Number(t.priceKobo) / 100).toLocaleString()} · {t.quantityTotal} available
            </span>
          </div>
        ))}
      </div>

      {publishError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {publishError}
        </p>
      )}

      <div className="flex gap-3">
        <button className="flex-1 border rounded-md py-2.5 font-medium" onClick={onBack}>
          Back
        </button>
        <button
          className="flex-1 border rounded-md py-2.5 font-medium disabled:opacity-40"
          disabled={saving}
          onClick={onSaveDraft}
        >
          Save as draft
        </button>
        <button
          className="flex-1 bg-black text-white rounded-md py-2.5 font-medium disabled:opacity-40"
          disabled={saving}
          onClick={onPublish}
        >
          {saving ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
