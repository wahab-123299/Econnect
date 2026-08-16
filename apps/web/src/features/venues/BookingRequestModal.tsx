import { useState } from 'react';
import { useAuth } from '../../lib/auth-context';

interface Props {
  venueId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingRequestModal({ venueId, onClose, onSuccess }: Props) {
  const { authFetch } = useAuth();
  const [proposedDate, setProposedDate] = useState('');
  const [budgetNaira, setBudgetNaira] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!proposedDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch('/organizers/venue-bookings', {
        method: 'POST',
        body: JSON.stringify({
          venueId,
          proposedDate: new Date(proposedDate).toISOString(),
          ...(budgetNaira
            ? { proposedBudgetKobo: String(Math.round(Number(budgetNaira) * 100)) }
            : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Could not send booking request.');
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-lg sm:rounded-lg w-full sm:max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Request to book</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Proposed date</label>
          <input
            type="date"
            className="w-full border rounded-md px-3 py-2"
            value={proposedDate}
            onChange={(e) => setProposedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Budget (₦, optional)</label>
          <input
            type="number"
            min={0}
            className="w-full border rounded-md px-3 py-2"
            value={budgetNaira}
            onChange={(e) => setBudgetNaira(e.target.value)}
            placeholder="e.g. 500000"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button className="flex-1 border rounded-md py-2.5 font-medium" onClick={onClose}>
            Cancel
          </button>
          <button
            className="flex-1 bg-black text-white rounded-md py-2.5 font-medium disabled:opacity-40"
            disabled={!proposedDate || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  );
}
