import { NasaApodRepository } from '../infrastructure/nasa/NasaApodRepository.js';
import { NasaNeoRepository } from '../infrastructure/nasa/NasaNeoRepository.js';
import { SpaceflightNewsRepository } from '../infrastructure/spaceflight/SpaceflightNewsRepository.js';
import { SpaceXLaunchesRepository } from '../infrastructure/spacex/SpaceXLaunchesRepository.js';

const launchesRepo = new SpaceXLaunchesRepository();

/**
 * Prefills cache. Launches load from bundled seed first, then refresh upstream
 * best-effort (Launch Library free = 15 req/hour).
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
    launchesRepo.getLaunches({ limit: 20 }),
    launchesRepo.refreshMaster(),
  ]);

  const ok = results.filter((result) => result.status === 'fulfilled').length;
  const fail = results.length - ok;

  console.log(`[warmup] done — ${ok} ok, ${fail} failed`);
}

/** Refresh launches ~6x/hour to stay under free quota. */
export function startLaunchesRefreshLoop(): void {
  const intervalMs = 10 * 60_000;

  setInterval(() => {
    void launchesRepo.refreshMaster();
  }, intervalMs);
}
