/**
 * Wakapi "Currently" stats — server-side, cached. Wakapi is WakaTime-API
 * compatible; we read today's summary + the top language. Needs WAKAPI_API_URL
 * + WAKAPI_API_KEY (gated on the live self-hosted instance). Fail-soft → null.
 */
import { cached } from './cache';

const API = process.env.WAKAPI_API_URL; // e.g. https://wakapi.ryang.dev/api
const KEY = process.env.WAKAPI_API_KEY;
const TTL = 10 * 60 * 1000; // 10 min

export interface Currently {
  todayText: string; // e.g. "4h 12m"
  topLanguage: string | null;
}

export async function getCurrently(): Promise<Currently | null> {
  if (!API || !KEY) return null; // not configured (dev / pre-deploy)
  try {
    return await cached('wakapi:today', TTL, async () => {
      // WakaTime-compatible: /v1/users/current/summaries?range=today
      const url = `${API.replace(/\/$/, '')}/v1/users/current/summaries?range=today`;
      const r = await fetch(url, {
        headers: { Authorization: `Basic ${Buffer.from(KEY).toString('base64')}` },
      });
      if (!r.ok) throw new Error(`wakapi ${r.status}`);
      const data: any = await r.json();
      const day = data?.data?.[0];
      const todayText = day?.grand_total?.text ?? '0 mins';
      const langs = (day?.languages ?? []) as { name: string; total_seconds: number }[];
      const topLanguage = langs.sort((a, b) => b.total_seconds - a.total_seconds)[0]?.name ?? null;
      return { todayText, topLanguage };
    });
  } catch {
    return null;
  }
}
