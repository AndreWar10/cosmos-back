import { env, externalApis } from '../../config/env.js';
import type { Apod } from '../../domain/entities/Apod.js';
import type {
  ApodRepository,
  GetApodParams,
} from '../../domain/repositories/ApodRepository.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';
import { httpGet } from '../../shared/http/httpClient.js';

interface NasaApodResponse {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  copyright?: string;
  thumbnail_url?: string;
}

function mapApod(raw: NasaApodResponse): Apod {
  return {
    date: raw.date,
    title: raw.title,
    explanation: raw.explanation,
    url: raw.url,
    hdUrl: raw.hdurl,
    mediaType: raw.media_type,
    copyright: raw.copyright,
    thumbnailUrl: raw.thumbnail_url,
  };
}

export class NasaApodRepository implements ApodRepository {
  async getApod(params: GetApodParams = {}): Promise<Apod> {
    const cacheKey = `apod:${params.date ?? 'today'}`;

    return upstreamCache.getStaleWhileRevalidate(
      cacheKey,
      async () => {
      const raw = await httpGet<NasaApodResponse>(externalApis.nasaApod, {
        query: {
          api_key: env.NASA_API_KEY,
          date: params.date,
        },
      });

      return mapApod(raw);
    },
      CACHE_TTL.apod,
    );
  }
}
