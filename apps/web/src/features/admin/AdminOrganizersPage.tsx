import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';

interface PendingOrganizer {
  id: string;
  businessName: string | null;
  createdAt: string;
  user: { fullName: string; email: string | null; phone: string | null };
}

export default function AdminOrganizersPage() {
  const { authFetch } = useAuth();
  const [organizers, setOrganizers] = useState<PendingOrganizer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  function load() {
    authFetch('/admin/organizers')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load organizers.');
        const body = await res.json();
        setOrganizers(body.organizers);
      })
      .catch(() => setError('Could not load pending organizers.'));
  }

  useEffect(() => {
    load();
    // load() only needs to run once on mount; it's stable across renders.
  }, []);

  async function review(id: string, action: 'approve' | 'reject') {
    setActioningId(id);
    try {
      const res = await authFetch(`/admin/organizers/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Action failed.');
      }
      setOrganizers((prev) => prev?.filter((o) => o.id !== id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Pending Organizers</h1>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {!organizers && !error && <p className="text-gray-500 text-sm">Loading…</p>}
      {organizers?.length === 0 && (
        <p className="text-gray-500 text-sm">No organizers waiting for review.</p>
      )}

      <div className="space-y-3">
        {organizers?.map((org) => (
          <div key={org.id} className="border rounded-lg p-4">
            <p className="font-semibold">{org.user.fullName}</p>
            {org.businessName && <p className="text-sm text-gray-500">{org.businessName}</p>}
            <p className="text-sm text-gray-500">{org.user.email ?? org.user.phone}</p>
            <p className="text-xs text-gray-400 mt-1">
              Applied {new Date(org.createdAt).toLocaleDateString()}
            </p>

            <div className="flex gap-3 mt-3">
              <button
                className="flex-1 border rounded-md py-2 text-sm font-medium disabled:opacity-40"
                disabled={actioningId === org.id}
                onClick={() => review(org.id, 'reject')}
              >
                Reject
              </button>
              <button
                className="flex-1 bg-black text-white rounded-md py-2 text-sm font-medium disabled:opacity-40"
                disabled={actioningId === org.id}
                onClick={() => review(org.id, 'approve')}
              >
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
