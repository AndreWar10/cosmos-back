import { NasaApodRepository } from '../infrastructure/nasa/NasaApodRepository.js';
import { NasaNeoRepository } from '../infrastructure/nasa/NasaNeoRepository.js';
import { SpaceflightNewsRepository } from '../infrastructure/spaceflight/SpaceflightNewsRepository.js';
import { SpaceXLaunchesRepository } from '../infrastructure/spacex/SpaceXLaunchesRepository.js';

const launchesRepo = new SpaceXLaunchesRepository();

/**
 * Prefills cache with a small burst (Launch Library free = 15 req/hour).
 * Keep launches to a single call so we don't burn the quota on boot.
 */
export async function warmupCache(): Promise<void> {
  const apod = new NasaApodRepository();
  const neo = new NasaNeoRepository();
  const news = new SpaceflightNewsRepository();

  console.log('[warmup] starting cache warmup...');

  const results = await Promise.allSettled([
    apod.getApod(),
    neo.getFeed(),
    news.getArticles({ limit: 20, offset: 0 }),
    // One Launch Library call only — free tier is 15/hour per IP.
    launchesRepo.getLaunches({ limit: 20, offset: 0 }),
  ]);

  const ok = results.filter((result) => result.status === 'fulfilled').length;
  const fail = results.length - ok;

  console.log(`[warmup] done — ${ok} ok, ${fail} failed`);
}

/** Refresh launches in the background (~6 calls/hour, under the free 15/hour). */
export function startLaunchesRefreshLoop(): void {
  const intervalMs = 10 * 60_000;

  setInterval(() => {
    void launchesRepo
      .getLaunches({ limit: 20, offset: 0 })
      .then(() => console.log('[refresh] launches cache updated'))
      .catch((error) => {
        console.warn(
          '[refresh] launches failed:',
          error instanceof Error ? error.message : error,
        );
      });
  }, intervalMs);
}
