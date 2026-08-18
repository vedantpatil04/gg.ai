// ─── Multi-tier in-memory TTL cache with Stale Fallback ───────────────────────
// Used to prevent redundant external provider requests (e.g. Open-Meteo)
// and gracefully serve stale data when external providers return HTTP 429
// (Too Many Requests), timeout, or encounter network errors.
//
// Tier 1: Fresh TTL (`ttlMs`, e.g. 15-30m) — data is considered fresh.
// Tier 2: Stale TTL (`staleTtlMs`, e.g. 24h) — data is retained as a reliable
// fallback when upstream rate limits or outages occur.

interface CacheEntry<T> {
  value: T;
  setAt: number;
  expiresAt: number;
  staleExpiresAt: number;
}

export interface CacheStatus<T> {
  value: T;
  isStale: boolean;
  ageMs: number;
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(
    private ttlMs: number,
    private staleTtlMs: number = Math.max(ttlMs * 4, 24 * 60 * 60 * 1000), // Default 24 hours stale grace window
  ) {}

  /**
   * Get fresh cached value. Returns undefined if key is missing or fresh TTL has expired.
   * Does NOT purge data immediately if within stale window, preserving fallback capability.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now > entry.staleExpiresAt) {
      this.store.delete(key);
      return undefined;
    }

    if (now > entry.expiresAt) {
      return undefined; // Expired fresh window, but preserved in store for getStale()
    }

    return entry.value;
  }

  /**
   * Retrieve cached value even if fresh TTL has expired, as long as it is within the stale window.
   * Useful for fallback when upstream returns HTTP 429 or network errors.
   */
  getStale(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now > entry.staleExpiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Inspect cache entry with status metadata (fresh vs stale and age in ms).
   */
  getWithStatus(key: string): CacheStatus<T> | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now > entry.staleExpiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return {
      value: entry.value,
      isStale: now > entry.expiresAt,
      ageMs: now - entry.setAt,
    };
  }

  /**
   * Store a value in cache with fresh and stale expiration timestamps.
   */
  set(key: string, value: T, customTtlMs?: number): void {
    const now = Date.now();
    const freshTtl = customTtlMs ?? this.ttlMs;
    const staleTtl = Math.max(freshTtl, this.staleTtlMs);

    this.store.set(key, {
      value,
      setAt: now,
      expiresAt: now + freshTtl,
      staleExpiresAt: now + staleTtl,
    });
  }

  /**
   * Check if a fresh entry exists for this key.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Check if a valid (fresh or stale) entry exists for this key.
   */
  hasStale(key: string): boolean {
    return this.getStale(key) !== undefined;
  }

  /**
   * Explicitly delete a key from the cache.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all items from the cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Number of items currently stored in cache.
   */
  get size(): number {
    return this.store.size;
  }
}

