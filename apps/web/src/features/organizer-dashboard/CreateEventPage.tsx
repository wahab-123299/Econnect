import { useState } from 'react';
import type { CreateEventRequestDTO, CreateTicketTierInput } from '@econnect/shared-types';
import { useAuth } from '../../lib/auth-context';
import StepBasics from './StepBasics';
import StepFlyer from './StepFlyer';
import StepTiers from './StepTiers';
import StepReview from './StepReview';

type Basics = Pick<
  CreateEventRequestDTO,
  'title' | 'description' | 'category' | 'locationName' | 'startDatetime' | 'endDatetime'
>;

const STEPS = ['Basics', 'Flyer', 'Tickets', 'Review'] as const;

// The draft event is created as soon as Basics is confirmed (step 0 -> 1),
// not at the very end — the flyer upload endpoint (Issue #9) needs a real
// event id to attach the image to, so "create, then progressively fill in"
// is the natural shape here rather than "collect everything, submit once".
export default function CreateEventPage() {
  const { authFetch } = useAuth();
  const [step, setStep] = useState(0);
  const [basics, setBasics] = useState<Basics>({ title: '', startDatetime: '' });
  const [flyerUrl, setFlyerUrl] = useState('');
  const [tiers, setTiers] = useState<CreateTicketTierInput[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedEventId, setPublishedEventId] = useState<string | null>(null);

  async function handleBasicsNext() {
    setSaving(true);
    setError(null);
    try {
      const payload: CreateEventRequestDTO = {
        ...basics,
        startDatetime: new Date(basics.startDatetime).toISOString(),
        endDatetime: basics.endDatetime ? new Date(basics.endDatetime).toISOString() : undefined,
        ticketTiers: [],
      };
      const res = await authFetch('/organizers/events', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Failed to save event details.');
      }
      const created = await res.json();
      setEventId(created.id);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTiersNext() {
    if (!eventId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(`/organizers/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ticketTiers: tiers }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Failed to save ticket tiers.');
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    // Everything is already saved incrementally as the organizer moves through
    // the steps — "save as draft" just means "stop here", nothing left to send.
    setPublishedEventId(eventId);
  }

  async function handlePublish() {
    if (!eventId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch(`/organizers/events/${eventId}/publish`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Could not publish event.');
      }
      setPublishedEventId(eventId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (publishedEventId) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center space-y-2">
        <h2 className="text-xl font-semibold">Event saved</h2>
        <p className="text-gray-500">Event ID: {publishedEventId}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-black' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2 mb-4">
          {error}
        </p>
      )}

      {step === 0 && (
        <StepBasics value={basics} onChange={setBasics} onNext={handleBasicsNext} />
      )}
      {step === 1 && (
        <StepFlyer
          eventId={eventId}
          flyerUrl={flyerUrl}
          onChange={setFlyerUrl}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepTiers
          tiers={tiers}
          onChange={setTiers}
          onNext={handleTiersNext}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepReview
          event={{ ...basics, ticketTiers: tiers }}
          flyerUrl={flyerUrl}
          saving={saving}
          publishError={error}
          onBack={() => setStep(2)}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
        />
      )}
    </div>
  );
}
