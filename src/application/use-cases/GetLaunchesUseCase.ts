import type { Launch, LaunchList } from '../../domain/entities/Launch.js';
import type {
  GetLaunchesParams,
  LaunchesRepository,
} from '../../domain/repositories/LaunchesRepository.js';
import type { TranslationService } from '../../domain/services/TranslationService.js';
import type { Locale } from '../../shared/types/locale.js';
import { mapPool } from '../../shared/async/mapPool.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';

type LaunchQuery =
  | ({ mode: 'list' } & GetLaunchesParams)
  | { mode: 'latest' }
  | { mode: 'next' };

function launchesListKey(locale: Locale, params: GetLaunchesParams): string {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  return `resp:launches:${locale}:limit=${limit}:offset=${offset}`;
}

function launchesSingleKey(
  locale: Locale,
  mode: 'latest' | 'next',
): string {
  return `resp:launches:${locale}:${mode}`;
}

export class GetLaunchesUseCase {
  constructor(
    private readonly launchesRepository: LaunchesRepository,
    private readonly translationService: TranslationService,
  ) {}

  async execute(
    params: LaunchQuery & { locale: Locale },
  ): Promise<Launch | LaunchList> {
    if (params.mode === 'latest' || params.mode === 'next') {
      const cacheKey = launchesSingleKey(params.locale, params.mode);

      return upstreamCache.getStaleWhileRevalidate(
        cacheKey,
        () => this.buildSingle(params.mode, params.locale),
        CACHE_TTL.launchesResponse,
      );
    }

    const cacheKey = launchesListKey(params.locale, params);
    const data = await upstreamCache.getStaleWhileRevalidate(
      cacheKey,
      () => this.buildList(params),
      CACHE_TTL.launchesResponse,
    );

    this.prefetchNextPage(params);
    return data;
  }

  async warm(
    params: LaunchQuery & { locale: Locale },
  ): Promise<Launch | LaunchList> {
    if (params.mode === 'latest' || params.mode === 'next') {
      const data = await this.buildSingle(params.mode, params.locale);
      upstreamCache.set(
        launchesSingleKey(params.locale, params.mode),
        data,
        CACHE_TTL.launchesResponse,
      );
      return data;
    }

    const data = await this.buildList(params);
    upstreamCache.set(
      launchesListKey(params.locale, params),
      data,
      CACHE_TTL.launchesResponse,
    );
    this.prefetchNextPage(params);
    return data;
  }

  private async buildList(
    params: GetLaunchesParams & { locale: Locale },
  ): Promise<LaunchList> {
    const list = await this.launchesRepository.getLaunches({
      limit: params.limit,
      offset: params.offset,
    });

    if (params.locale === 'en') return list;

    const results = await mapPool(list.results, 5, (launch) =>
      this.translateLaunch(launch, params.locale),
    );

    return {
      ...list,
      results,
    };
  }

  private async buildSingle(
    mode: 'latest' | 'next',
    locale: Locale,
  ): Promise<Launch> {
    const launch =
      mode === 'latest'
        ? await this.launchesRepository.getLatestLaunch()
        : await this.launchesRepository.getNextLaunch();

    if (locale === 'en') return launch;
    return this.translateLaunch(launch, locale);
  }

  private async translateLaunch(
    launch: Launch,
    locale: Locale,
  ): Promise<Launch> {
    if (!launch.details && !launch.name) return launch;

    const [name, details] = await this.translationService.translateMany(
      [launch.name, launch.details ?? ''],
      locale,
    );

    return {
      ...launch,
      name,
      details: launch.details ? details : null,
    };
  }

  private prefetchNextPage(
    params: GetLaunchesParams & { locale: Locale },
  ): void {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const nextParams = { ...params, offset: offset + limit };
    const nextKey = launchesListKey(params.locale, nextParams);

    if (upstreamCache.getStale<LaunchList>(nextKey) !== undefined) return;

    void upstreamCache
      .getStaleWhileRevalidate(
        nextKey,
        () => this.buildList(nextParams),
        CACHE_TTL.launchesResponse,
      )
      .catch((error) => {
        console.warn(
          '[launches] prefetch failed:',
          error instanceof Error ? error.message : error,
        );
      });
  }
}
