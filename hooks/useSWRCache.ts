import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight SWR-style cache with stale-while-revalidate semantics.
 * - In-memory global map + sessionStorage persistence (to survive reloads in same session)
 * - TTL based stale logic (default 2 minutes)
 * - Deduplicates concurrent fetches
 */

interface CacheEntry<T> { value: T; timestamp: number; }
interface UseSWRCacheOptions<T> {
  fetcher: () => Promise<T>;
  ttlMs?: number; // time after which data is considered stale (will revalidate in background)
  revalidateOnMount?: boolean; // force revalidation even if fresh
  key: string;
}

const memoryCache: Record<string, CacheEntry<any>> = {};
const inflight: Record<string, Promise<any>> = {};

function loadFromSession<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = sessionStorage.getItem('swr:' + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function saveToSession<T>(key: string, entry: CacheEntry<T>) {
  try { sessionStorage.setItem('swr:' + key, JSON.stringify(entry)); } catch { /* ignore */ }
}

export function mutate<T>(key: string, value: T) {
  const entry: CacheEntry<T> = { value, timestamp: Date.now() };
  memoryCache[key] = entry;
  saveToSession(key, entry);
}

export function clearCache(key?: string) {
  if (key) {
    delete memoryCache[key];
    sessionStorage.removeItem('swr:' + key);
  } else {
    for (const k of Object.keys(memoryCache)) delete memoryCache[k];
    Object.keys(sessionStorage).filter(k => k.startsWith('swr:')).forEach(k => sessionStorage.removeItem(k));
  }
}

export function useSWRCache<T>({ key, fetcher, ttlMs = 120_000, revalidateOnMount = true }: UseSWRCacheOptions<T>) {
  const [data, setData] = useState<T | undefined>(() => {
    if (memoryCache[key]) return memoryCache[key].value as T;
    const session = loadFromSession<T>(key);
    if (session) {
      memoryCache[key] = session;
      return session.value;
    }
    return undefined;
  });
  const [error, setError] = useState<Error | undefined>();
  const [loading, setLoading] = useState(!data);
  const first = useRef(true);

  useEffect(() => {
    const entry = memoryCache[key];
    const isStale = !entry || Date.now() - entry.timestamp > ttlMs;
    if (!revalidateOnMount && !isStale && !first.current) return;

    if (!isStale && data !== undefined) {
      // Fresh enough, but we can optionally refresh in background
      if (revalidateOnMount) triggerFetch(false);
      return;
    }
    triggerFetch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function triggerFetch(markLoading: boolean) {
    if (inflight[key]) return;
    if (markLoading) setLoading(true);
    inflight[key] = fetcher()
      .then(res => {
        mutate(key, res);
        setData(res);
        setError(undefined);
      })
      .catch(err => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => {
        setLoading(false);
        delete inflight[key];
      });
  }

  const refresh = () => triggerFetch(true);

  return { data, error, loading, refresh, mutate: (val: T) => mutate(key, val) } as const;
}
