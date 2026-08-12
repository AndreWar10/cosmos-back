interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly defaultTtlMs: number) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) return undefined;
    return entry.value as T;
  }

  /** Returns value even if expired (for stale-on-error fallback). */
  getStale<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs = this.defaultTtlMs,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    try {
      const value = await factory();
      this.set(key, value, ttlMs);
      return value;
    } catch (error) {
      const stale = this.getStale<T>(key);
      if (stale !== undefined) {
        console.warn(
          `[cache] upstream failed for "${key}", serving stale cache`,
        );
        return stale;
      }
      throw error;
    }
  }
}

/** Shared cache for upstream API responses. */
export const upstreamCache = new MemoryCache(5 * 60_000);

export const CACHE_TTL = {
  apod: 30 * 60_000,
  neo: 10 * 60_000,
  news: 5 * 60_000,
  launches: 10 * 60_000,
  translation: 60 * 60_000,
} as const;
