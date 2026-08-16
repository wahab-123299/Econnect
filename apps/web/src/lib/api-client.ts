const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw await res.json();
  return res.json();
}

// POST/PATCH helpers with auth will be filled in alongside the auth feature (Issue #3).
