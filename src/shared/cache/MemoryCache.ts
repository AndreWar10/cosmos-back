interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

type Factory<T> = () => Promise<T>;

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(private readonly defaultTtlMs: number) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) return undefined;
    return entry.value as T;
  }

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

  /**
   * Classic get-or-set: waits for fresh data on miss.
   * On upstream failure, serves stale if available.
   */
  async getOrSet<T>(
    key: string,
    factory: Factory<T>,
    ttlMs = this.defaultTtlMs,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    try {
      return await this.refresh(key, factory, ttlMs);
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

  /**
   * Stale-while-revalidate:
   * - If any cached value exists → return immediately
   * - If expired (or missing) → refresh in background (or await on cold miss)
   */
  async getStaleWhileRevalidate<T>(
    key: string,
    factory: Factory<T>,
    ttlMs = this.defaultTtlMs,
  ): Promise<T> {
    const stale = this.getStale<T>(key);
    const fresh = this.get<T>(key);

    if (stale !== undefined) {
      if (fresh === undefined && !this.inflight.has(key)) {
        void this.refresh(key, factory, ttlMs).catch((error) => {
          console.warn(
            `[cache] background refresh failed for "${key}":`,
            error instanceof Error ? error.message : error,
          );
        });
      }
      return stale;
    }

    return this.refresh(key, factory, ttlMs);
  }

  private refresh<T>(
    key: string,
    factory: Factory<T>,
    ttlMs: number,
  ): Promise<T> {
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = factory()
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }
}

/** Shared cache for upstream API responses. */
export const upstreamCache = new MemoryCache(5 * 60_000);

export const CACHE_TTL = {
  apod: 30 * 60_000,
  neo: 10 * 60_000,
  news: 5 * 60_000,
  launches: 10 * 60_000,
  solarSystem: 60 * 60_000,
  translation: 60 * 60_000,
} as const;
