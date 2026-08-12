import { externalApis } from '../../config/env.js';
import type { Article, ArticleList } from '../../domain/entities/Article.js';
import type {
  GetArticlesParams,
  NewsRepository,
} from '../../domain/repositories/NewsRepository.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';
import { httpGet } from '../../shared/http/httpClient.js';

interface SpaceflightAuthorRaw {
  name: string;
}

interface SpaceflightArticleRaw {
  id: number;
  title: string;
  summary: string;
  url: string;
  image_url: string;
  news_site: string;
  published_at: string;
  updated_at: string;
  featured: boolean;
  authors: SpaceflightAuthorRaw[];
}

interface SpaceflightArticlesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SpaceflightArticleRaw[];
}

function mapArticle(raw: SpaceflightArticleRaw): Article {
  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary,
    url: raw.url,
    imageUrl: raw.image_url,
    newsSite: raw.news_site,
    publishedAt: raw.published_at,
    updatedAt: raw.updated_at,
    featured: raw.featured,
    authors: (raw.authors ?? []).map((author) => ({ name: author.name })),
  };
}

export class SpaceflightNewsRepository implements NewsRepository {
  async getArticles(params: GetArticlesParams = {}): Promise<ArticleList> {
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;
    const search = params.search?.trim() || '';
    const cacheKey = `news:limit=${limit}:offset=${offset}:search=${search}`;

    return upstreamCache.getOrSet(
      cacheKey,
      async () => {
        const raw = await httpGet<SpaceflightArticlesResponse>(
          externalApis.spaceflightNews,
          {
            query: {
              limit,
              offset,
              search: search || undefined,
            },
          },
        );

        return {
          count: raw.count,
          next: raw.next,
          previous: raw.previous,
          results: raw.results.map(mapArticle),
        };
      },
      CACHE_TTL.news,
    );
  }
}
