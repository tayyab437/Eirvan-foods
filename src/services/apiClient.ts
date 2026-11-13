import { getFirebaseAuth } from '../firebase/config';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  requireAuth?: boolean;
  optionalAuth?: boolean;
}

async function resolveIdToken(required: boolean): Promise<string | null> {
  try {
    const auth = await getFirebaseAuth();
    const user = auth?.currentUser;
    if (!user) {
      if (required) {
        throw new Error('Authentication required. Please sign in to continue.');
      }
      return null;
    }
    return await user.getIdToken();
  } catch (err) {
    if (required) {
      throw err instanceof Error ? err : new Error('Failed to retrieve authentication token.');
    }
    return null;
  }
}

export async function apiRequest<T = any>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, requireAuth = false, optionalAuth = false } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (requireAuth || optionalAuth) {
    const token = await resolveIdToken(requireAuth);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`API returned unexpected response format (HTTP ${res.status}). Ensure PHP backend is reachable.`);
  }

  const data = await res.json();
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || data?.message || `Request failed (HTTP ${res.status}).`);
  }

  return data as T;
}
