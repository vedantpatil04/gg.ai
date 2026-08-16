// ─── Minimal in-memory TTL cache ──────────────────────────────────────────────
// No external dependency — used to short-circuit repeated external API calls
// (e.g. forecast lookups) within a small time window. Not shared across
// server instances; that's an acceptable tradeoff for a short-lived cache
// whose only job is to stop every frontend render from re-hitting the
// external provider (see GreenGuard Phase 1 forecast foundation).

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
