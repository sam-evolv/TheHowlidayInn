import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';

// ---- API base: use VITE_API_BASE for cross-origin, empty for same-origin ----
const RAW_BASE = import.meta.env.VITE_API_BASE || '';
const API_BASE = import.meta.env.VITE_API_BASE || '';
const joinPath = (p: string) => '/' + (p ?? '').replace(/^\/+/, '');

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error('API ERROR:', res.status, res.url, text);
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Add Firebase auth token if user is authenticated
  try {
    if (auth.currentUser) {
      const token = await getIdToken(auth.currentUser);
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch (error) {
    console.warn('Failed to get auth token for mutation:', error);
    // Continue without auth - let the server handle the 401
  }

  const url = `${API_BASE}${joinPath(path)}`;
  const credentials: RequestCredentials = (init.credentials as any) ?? 'include';
  const res = await fetch(url, { ...init, headers, credentials });

  if (!res.ok) {
    // surface server message if present
    const text = await res.text();
    console.error('API ERROR:', res.status, url, text);
    throw new Error(text || `Request failed: ${res.status}`);
  }
  // handle no-content endpoints gracefully
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? ((await res.json()) as T) : (undefined as T);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get fresh auth token if user is authenticated
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    try {
      if (auth.currentUser) {
        const token = await getIdToken(auth.currentUser);
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token for query:', error);
      // Continue without auth - let the server handle the 401
    }

    const url = `${API_BASE}${joinPath(queryKey.join("/"))}`;
    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
