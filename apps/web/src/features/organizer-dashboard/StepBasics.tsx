import type { CreateEventRequestDTO } from '@econnect/shared-types';

type Basics = Pick<
  CreateEventRequestDTO,
  'title' | 'description' | 'category' | 'locationName' | 'startDatetime' | 'endDatetime'
>;

interface Props {
  value: Basics;
  onChange: (value: Basics) => void;
  onNext: () => void;
}

const CATEGORIES = ['Concert', 'Comedy', 'Conference', 'Wedding', 'Party', 'Other'];

export default function StepBasics({ value, onChange, onNext }: Props) {
  const canContinue = value.title.trim().length >= 3 && value.startDatetime;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Event basics</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          className="w-full border rounded-md px-3 py-2"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="e.g. Lagos Comedy Night"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Category</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={value.category ?? ''}
          onChange={(e) => onChange({ ...value, category: e.target.value || undefined })}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full border rounded-md px-3 py-2"
          rows={4}
          value={value.description ?? ''}
          onChange={(e) => onChange({ ...value, description: e.target.value || undefined })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Location</label>
        <input
          className="w-full border rounded-md px-3 py-2"
          value={value.locationName ?? ''}
          onChange={(e) => onChange({ ...value, locationName: e.target.value || undefined })}
          placeholder="e.g. Landmark Event Centre, Lagos"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start date/time</label>
          <input
            type="datetime-local"
            className="w-full border rounded-md px-3 py-2"
            value={value.startDatetime}
            onChange={(e) => onChange({ ...value, startDatetime: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End date/time (optional)</label>
          <input
            type="datetime-local"
            className="w-full border rounded-md px-3 py-2"
            value={value.endDatetime ?? ''}
            onChange={(e) => onChange({ ...value, endDatetime: e.target.value || undefined })}
          />
        </div>
      </div>

      <button
        className="w-full bg-black text-white rounded-md py-2.5 font-medium disabled:opacity-40"
        disabled={!canContinue}
        onClick={onNext}
      >
        Continue
      </button>
    </div>
  );
}
