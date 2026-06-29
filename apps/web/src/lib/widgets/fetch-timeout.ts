/**
 * fetch() with a hard timeout via AbortController. Without this, a hung upstream
 * (GitHub/Wakapi/Kuma/Gotenberg) blocks SSR indefinitely — "fail-soft" only
 * works if the fetch actually FAILS. Throws on timeout so callers fall back.
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 3000
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
