import { NasaApodRepository } from '../infrastructure/nasa/NasaApodRepository.js';
import { NasaNeoRepository } from '../infrastructure/nasa/NasaNeoRepository.js';
import { SpaceflightNewsRepository } from '../infrastructure/spaceflight/SpaceflightNewsRepository.js';
import { SpaceXLaunchesRepository } from '../infrastructure/spacex/SpaceXLaunchesRepository.js';

/**
 * Prefills cache with a light burst.
 * Launch Library free tier = 15 req/hour — keep launches to one page.
 */
export async function warmupCache(): Promise<void> {
  const apod = new NasaApodRepository();
  const neo = new NasaNeoRepository();
  const news = new SpaceflightNewsRepository();
  const launches = new SpaceXLaunchesRepository();

  console.log('[warmup] starting cache warmup...');

  const results = await Promise.allSettled([
    apod.getApod(),
    neo.getFeed(),
    news.getArticles({ limit: 20, offset: 0 }),
    launches.getLaunches({ limit: 20, offset: 0 }),
  ]);

  const ok = results.filter((result) => result.status === 'fulfilled').length;
  const fail = results.length - ok;

  console.log(`[warmup] done — ${ok} ok, ${fail} failed`);
}

export function startLaunchesRefreshLoop(): void {
  // no-op: pages are refreshed via stale-while-revalidate on demand
}
