const API_BASE = import.meta.env.VITE_API_URL || '/api';
export interface CurrentUser { email: string; workspace: 'quynh' | 'job-applications'; }
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const res = await fetch(`${API_BASE}/auth/me`);
  if (!res.ok) throw new Error('Not signed in');
  return res.json();
}
