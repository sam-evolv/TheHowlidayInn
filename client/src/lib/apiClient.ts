// TODO HowlidayInn: API client with Firebase authentication (same-origin)
import { getAuth } from 'firebase/auth';

// ---- API base: use VITE_API_BASE for cross-origin, empty for same-origin ----
const RAW_BASE = import.meta.env.VITE_API_BASE || '';
const API_BASE = import.meta.env.VITE_API_BASE || '';
const joinPath = (p: string) => '/' + (p ?? '').replace(/^\/+/, '');

// ---- Firebase auth token (if present) ----
async function getAuthToken(): Promise<string | null> {
  const user = getAuth().currentUser;
  if (!user) return null;
  try { return await user.getIdToken(); } catch { return null; }
}

// ---- Authenticated fetch (cookies included by default) ----
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fullUrl = `${API_BASE}${joinPath(url)}`;
  const credentials: RequestCredentials = (options.credentials as any) ?? 'include';

  return fetch(fullUrl, { ...options, headers, credentials });
}
