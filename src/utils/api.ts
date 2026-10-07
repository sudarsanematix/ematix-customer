const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.34:4000';

export type ApiError = Error & { status?: number; code?: string };

/**
 * Fetch wrapper that attaches the session bearer token and normalises the
 * backend's error responses into a thrown Error carrying the HTTP status, so
 * callers can distinguish a 401 from a network failure.
 */
export async function authedFetch(
  path: string,
  token: string | null,
  options: { method?: string; body?: unknown } = {}
): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || (data && data.success === false)) {
    const err = new Error(data?.error || data?.message || `Request failed (${res.status})`) as ApiError;
    err.status = res.status;
    err.code = data?.error;
    throw err;
  }

  return data;
}

export { API_BASE };