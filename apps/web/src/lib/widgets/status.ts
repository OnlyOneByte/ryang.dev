/**
 * Homelab status from Uptime Kuma's status-page API, server-side + cached.
 * Needs KUMA_STATUS_URL (e.g. https://status.ryang.dev/api/status-page/heartbeat/<slug>)
 * — fail-soft → null when unset/unreachable. Returns up/total counts.
 */
import { cached } from './cache';
import { fetchWithTimeout } from './fetch-timeout';

const URL_ = process.env.KUMA_STATUS_URL;
const TTL = 60 * 1000; // 1 min

export interface HomelabStatus { up: number; total: number; }

export async function getHomelabStatus(): Promise<HomelabStatus | null> {
  if (!URL_) return null;
  try {
    return await cached('kuma:status', TTL, async () => {
      const r = await fetchWithTimeout(URL_, {}, 2000);
      if (!r.ok) throw new Error(`kuma ${r.status}`);
      const data: any = await r.json();
      // heartbeatList: { monitorId: [{ status: 1|0 }, ...] }; last beat per monitor
      const lists = Object.values(data?.heartbeatList ?? {}) as any[][];
      const total = lists.length;
      const up = lists.filter((beats) => beats.at(-1)?.status === 1).length;
      return { up, total };
    });
  } catch {
    return null;
  }
}
