/**
 * In-memory cache for flight search results.
 *
 * Keyed by a hash of the search parameters so identical searches within
 * the TTL window return cached results without consuming API quota.
 *
 * This is a single-process, in-memory cache — it resets on server restart.
 * For a persistent cache, swap the Map for Redis or a DB-backed store.
 */

import type { DayPrice } from "./flight-api-types.js";

export interface CachedResult {
  pricesByDay: DayPrice[];
  searchedAt: string;
  cachedAt: number; // Date.now() ms
  apiCallsUsed: number;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes

const cache = new Map<string, CachedResult>();

/**
 * Build a deterministic cache key from search parameters.
 */
export function makeCacheKey(params: {
  origin: string;
  destination: string;
  departureDateFrom: string;
  departureDateTo: string;
  travelers: number;
}): string {
  return [
    params.origin.toUpperCase(),
    params.destination.toUpperCase(),
    params.departureDateFrom,
    params.departureDateTo,
    String(params.travelers),
  ].join("|");
}

export function getCached(key: string): CachedResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCached(key: string, result: Omit<CachedResult, "cachedAt">): void {
  cache.set(key, { ...result, cachedAt: Date.now() });
}

/** How many seconds until a cached entry expires. */
export function ttlSeconds(entry: CachedResult): number {
  return Math.max(0, Math.round((TTL_MS - (Date.now() - entry.cachedAt)) / 1000));
}

/** Prune expired entries. Call occasionally to avoid unbounded growth. */
export function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.cachedAt > TTL_MS) cache.delete(key);
  }
}
