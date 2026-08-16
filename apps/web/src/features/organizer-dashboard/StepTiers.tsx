import type { CreateTicketTierInput } from '@econnect/shared-types';

interface Props {
  tiers: CreateTicketTierInput[];
  onChange: (tiers: CreateTicketTierInput[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function emptyTier(): CreateTicketTierInput {
  return { name: '', priceKobo: '0', quantityTotal: 100 };
}

export default function StepTiers({ tiers, onChange, onNext, onBack }: Props) {
  const canContinue =
    tiers.length > 0 && tiers.every((t) => t.name.trim() && Number(t.priceKobo) >= 0 && t.quantityTotal > 0);

  function updateTier(index: number, patch: Partial<CreateTicketTierInput>) {
    const next = [...tiers];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeTier(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Ticket tiers</h2>

      {tiers.map((tier, i) => (
        <div key={i} className="border rounded-md p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Tier {i + 1}</span>
            <button className="text-sm text-red-600" onClick={() => removeTier(i)}>
              Remove
            </button>
          </div>
          <input
            className="w-full border rounded-md px-3 py-2"
            placeholder="Tier name (e.g. Regular, VIP)"
            value={tier.name}
            onChange={(e) => updateTier(i, { name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Price (₦)</label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-md px-3 py-2"
                value={Number(tier.priceKobo) / 100}
                onChange={(e) =>
                  updateTier(i, { priceKobo: String(Math.round(Number(e.target.value) * 100)) })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded-md px-3 py-2"
                value={tier.quantityTotal}
                onChange={(e) => updateTier(i, { quantityTotal: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        className="w-full border-dashed border-2 rounded-md py-2.5 text-sm font-medium text-gray-600"
        onClick={() => onChange([...tiers, emptyTier()])}
      >
        + Add tier
      </button>

      <div className="flex gap-3">
        <button className="flex-1 border rounded-md py-2.5 font-medium" onClick={onBack}>
          Back
        </button>
        <button
          className="flex-1 bg-black text-white rounded-md py-2.5 font-medium disabled:opacity-40"
          disabled={!canContinue}
          onClick={onNext}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
