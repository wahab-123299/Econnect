import { useRef, useState } from 'react';
import { useAuth } from '../../lib/auth-context';

interface Props {
  eventId: string | null;
  flyerUrl: string;
  onChange: (url: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepFlyer({ eventId, flyerUrl, onChange, onNext, onBack }: Props) {
  const { authFetch } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    if (!eventId) {
      setError('Save your event details first (this should not happen — please go back).');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('flyer', file);
      const res = await authFetch(`/organizers/events/${eventId}/flyer`, {
        method: 'POST',
        body: formData,
        // Deliberately no Content-Type header — the browser sets the correct
        // multipart boundary automatically when the body is a FormData.
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Upload failed.');
      }
      const updated = await res.json();
      onChange(updated.flyerUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Event flyer</h2>
      <p className="text-sm text-gray-500">JPEG, PNG, or WEBP, up to 5MB.</p>

      <div
        className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileSelected(file);
        }}
      >
        {flyerUrl ? (
          <img src={flyerUrl} alt="Flyer preview" className="max-h-64 mx-auto rounded-md" />
        ) : (
          <p className="text-gray-500 text-sm">
            {uploading ? 'Uploading…' : 'Tap to choose a photo, or drag one here'}
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button className="flex-1 border rounded-md py-2.5 font-medium" onClick={onBack}>
          Back
        </button>
        <button
          className="flex-1 bg-black text-white rounded-md py-2.5 font-medium disabled:opacity-40"
          disabled={!flyerUrl || uploading}
          onClick={onNext}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
