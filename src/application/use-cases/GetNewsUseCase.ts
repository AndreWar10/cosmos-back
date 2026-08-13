import type { ArticleList } from '../../domain/entities/Article.js';
import type {
  GetArticlesParams,
  NewsRepository,
} from '../../domain/repositories/NewsRepository.js';
import type { TranslationService } from '../../domain/services/TranslationService.js';
import type { Locale } from '../../shared/types/locale.js';
import { mapPool } from '../../shared/async/mapPool.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';

function newsResponseKey(
  locale: Locale,
  params: GetArticlesParams,
): string {
  const limit = params.limit ?? 10;
  const offset = params.offset ?? 0;
  const search = params.search?.trim() || '';
  return `resp:news:${locale}:limit=${limit}:offset=${offset}:search=${search}`;
}

export class GetNewsUseCase {
  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly translationService: TranslationService,
  ) {}

  async execute(
    params: GetArticlesParams & { locale: Locale },
  ): Promise<ArticleList> {
    const cacheKey = newsResponseKey(params.locale, params);

    const data = await upstreamCache.getStaleWhileRevalidate(
      cacheKey,
      () => this.build(params),
      CACHE_TTL.newsResponse,
    );

    this.prefetchNextPage(params);
    return data;
  }

  /** Force rebuild + store (warmup / background refresh). */
  async warm(
    params: GetArticlesParams & { locale: Locale },
  ): Promise<ArticleList> {
    const data = await this.build(params);
    upstreamCache.set(
      newsResponseKey(params.locale, params),
      data,
      CACHE_TTL.newsResponse,
    );
    this.prefetchNextPage(params);
    return data;
  }

  private async build(
    params: GetArticlesParams & { locale: Locale },
  ): Promise<ArticleList> {
    const articles = await this.newsRepository.getArticles({
      limit: params.limit,
      offset: params.offset,
      search: params.search,
    });

    if (params.locale === 'en') return articles;

    const results = await mapPool(articles.results, 5, async (article) => {
      const [title, summary] = await this.translationService.translateMany(
        [article.title, article.summary],
        params.locale,
      );

      return {
        ...article,
        title,
        summary,
      };
    });

    return {
      ...articles,
      results,
    };
  }

  private prefetchNextPage(
    params: GetArticlesParams & { locale: Locale },
  ): void {
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;
    const nextParams = { ...params, offset: offset + limit };
    const nextKey = newsResponseKey(params.locale, nextParams);

    if (upstreamCache.getStale<ArticleList>(nextKey) !== undefined) return;

    void upstreamCache
      .getStaleWhileRevalidate(
        nextKey,
        () => this.build(nextParams),
        CACHE_TTL.newsResponse,
      )
      .catch((error) => {
        console.warn(
          '[news] prefetch failed:',
          error instanceof Error ? error.message : error,
        );
      });
  }
}
