import { env, externalApis } from '../../config/env.js';
import type { Launch, LaunchList } from '../../domain/entities/Launch.js';
import type {
  GetLaunchesParams,
  LaunchesRepository,
} from '../../domain/repositories/LaunchesRepository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';
import { httpGet } from '../../shared/http/httpClient.js';

/**
 * SpaceX launches via Launch Library 2.
 * Pagination only (limit + offset) — no status/upcoming filters.
 */
const SPACEX_PROVIDER_ID = 121;

interface LaunchLibraryLaunch {
  id: string;
  name: string;
  net: string;
  image: string | null;
  status: { id: number; abbrev: string };
  rocket: { configuration: { full_name: string } };
  mission: { description: string | null } | null;
  pad: { name: string; wiki_url: string | null };
  agency_launch_attempt_count: number | null;
  program: Array<{ info_url: string | null }>;
}

interface LaunchLibraryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LaunchLibraryLaunch[];
}

function isSuccessful(statusId: number): boolean | null {
  if (statusId === 3) return true;
  if (statusId === 4 || statusId === 7) return false;
  return null;
}

function isUpcoming(statusId: number, net: string): boolean {
  const upcomingStatuses = new Set([1, 2, 5, 6, 8]);
  if (upcomingStatuses.has(statusId)) return true;
  return new Date(net).getTime() > Date.now();
}

function mapLaunch(raw: LaunchLibraryLaunch): Launch {
  return {
    id: raw.id,
    name: raw.name,
    flightNumber: raw.agency_launch_attempt_count ?? 0,
    dateUtc: raw.net,
    dateUnix: Math.floor(new Date(raw.net).getTime() / 1000),
    success: isSuccessful(raw.status.id),
    upcoming: isUpcoming(raw.status.id, raw.net),
    details: raw.mission?.description ?? null,
    rocket: raw.rocket.configuration.full_name,
    launchpad: raw.pad.name,
    status: raw.status.abbrev,
    links: {
      patch: { small: raw.image, large: raw.image },
      webcast: null,
      wikipedia: raw.pad.wiki_url,
      article: raw.program[0]?.info_url ?? null,
      flickr: { original: [] },
    },
    cores: [],
  };
}

function authHeaders(): Record<string, string> | undefined {
  return env.LAUNCH_LIBRARY_TOKEN
    ? { Authorization: `Token ${env.LAUNCH_LIBRARY_TOKEN}` }
    : undefined;
}

export class SpaceXLaunchesRepository implements LaunchesRepository {
  async getLaunches(params: GetLaunchesParams = {}): Promise<LaunchList> {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const cacheKey = `launches:list:limit=${limit}:offset=${offset}`;

    return upstreamCache.getStaleWhileRevalidate(
      cacheKey,
      async () => {
        const raw = await httpGet<LaunchLibraryResponse>(
          `${externalApis.launchLibrary}/`,
          {
            query: {
              lsp__id: SPACEX_PROVIDER_ID,
              limit,
              offset,
              mode: 'detailed',
              ordering: '-net',
            },
            headers: authHeaders(),
          },
        );

        return {
          count: raw.count,
          limit,
          offset,
          results: raw.results.map(mapLaunch),
        };
      },
      CACHE_TTL.launches,
    );
  }

  async getLatestLaunch(): Promise<Launch> {
    const cacheKey = 'launches:latest';

    return upstreamCache.getStaleWhileRevalidate(
      cacheKey,
      async () => {
        const raw = await httpGet<LaunchLibraryResponse>(
          `${externalApis.launchLibrary}/previous/`,
          {
            query: {
              lsp__id: SPACEX_PROVIDER_ID,
              limit: 1,
              mode: 'detailed',
            },
            headers: authHeaders(),
          },
        );

        const latest = raw.results[0];
        if (!latest) throw new NotFoundError('Latest SpaceX launch not found');
        return mapLaunch(latest);
      },
      CACHE_TTL.launches,
    );
  }

  async getNextLaunch(): Promise<Launch> {
    const cacheKey = 'launches:next';

    return upstreamCache.getStaleWhileRevalidate(
      cacheKey,
      async () => {
        const raw = await httpGet<LaunchLibraryResponse>(
          `${externalApis.launchLibrary}/upcoming/`,
          {
            query: {
              lsp__id: SPACEX_PROVIDER_ID,
              limit: 1,
              mode: 'detailed',
            },
            headers: authHeaders(),
          },
        );

        const next = raw.results[0];
        if (!next) throw new NotFoundError('Next SpaceX launch not found');
        return mapLaunch(next);
      },
      CACHE_TTL.launches,
    );
  }
}
