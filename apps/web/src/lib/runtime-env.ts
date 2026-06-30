/**
 * Read a PUBLIC_* value in BROWSER code at runtime.
 *
 * Precedence: window.__PUBLIC_ENV (injected by /env.js from container env) →
 * import.meta.env (build-time fallback, so dev works without the endpoint) →
 * the caller's default. This lets one published image be reconfigured by
 * container env without a rebuild. PUBLIC values only — never secrets.
 */
type PublicEnv = Record<string, string | undefined>;

function runtimeEnv(): PublicEnv {
  return (globalThis as unknown as { __PUBLIC_ENV?: PublicEnv }).__PUBLIC_ENV ?? {};
}

export function publicEnv(key: string, fallback = ''): string {
  return runtimeEnv()[key] || (import.meta.env[key] as string | undefined) || fallback;
}
