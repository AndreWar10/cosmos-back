import { GetLaunchesUseCase } from '../application/use-cases/GetLaunchesUseCase.js';
import { GetNewsUseCase } from '../application/use-cases/GetNewsUseCase.js';
import { SpaceflightNewsRepository } from '../infrastructure/spaceflight/SpaceflightNewsRepository.js';
import { SpaceXLaunchesRepository } from '../infrastructure/spacex/SpaceXLaunchesRepository.js';
import { ResilientTranslationService } from '../infrastructure/translation/ResilientTranslationService.js';

function createWarmUseCases() {
  const translationService = new ResilientTranslationService();
  const getNews = new GetNewsUseCase(
    new SpaceflightNewsRepository(),
    translationService,
  );
  const getLaunches = new GetLaunchesUseCase(
    new SpaceXLaunchesRepository(),
    translationService,
  );
  return { getNews, getLaunches };
}

/**
 * Prefills localized response caches so the first app hits are fast.
 * Launch Library free tier = 15 req/hour — keep periodic refresh light.
 */
export async function warmupCache(): Promise<void> {
  const { getNews, getLaunches } = createWarmUseCases();

  console.log('[warmup] starting cache warmup...');

  const results = await Promise.allSettled([
    getNews.warm({ locale: 'en', limit: 20, offset: 0 }),
    getNews.warm({ locale: 'pt', limit: 20, offset: 0 }),
    getLaunches.warm({ mode: 'list', locale: 'en', limit: 20, offset: 0 }),
    getLaunches.warm({ mode: 'list', locale: 'pt', limit: 20, offset: 0 }),
    getLaunches.warm({ mode: 'next', locale: 'en' }),
    getLaunches.warm({ mode: 'latest', locale: 'en' }),
  ]);

  const ok = results.filter((result) => result.status === 'fulfilled').length;
  const fail = results.length - ok;

  console.log(`[warmup] done — ${ok} ok, ${fail} failed`);
  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') {
      console.warn(`[warmup] task ${index} failed:`, result.reason);
    }
  }
}

/** Refresh hot pages every 15 minutes (always-on Starter). */
export function startCacheRefreshLoop(): void {
  const intervalMs = 15 * 60_000;
  const { getNews, getLaunches } = createWarmUseCases();

  setInterval(() => {
    void Promise.allSettled([
      getNews.warm({ locale: 'en', limit: 20, offset: 0 }),
      getNews.warm({ locale: 'pt', limit: 20, offset: 0 }),
      getLaunches.warm({ mode: 'list', locale: 'en', limit: 20, offset: 0 }),
      getLaunches.warm({ mode: 'list', locale: 'pt', limit: 20, offset: 0 }),
      getLaunches.warm({ mode: 'next', locale: 'en' }),
      getLaunches.warm({ mode: 'latest', locale: 'en' }),
    ]).then((results) => {
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`[refresh] hot cache updated — ${ok}/${results.length} ok`);
    });
  }, intervalMs);
}
