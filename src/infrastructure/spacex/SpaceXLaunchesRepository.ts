import { externalApis } from '../../config/env.js';
import type { Launch, LaunchList } from '../../domain/entities/Launch.js';
import type {
  GetLaunchesParams,
  LaunchStatusFilter,
  LaunchesRepository,
} from '../../domain/repositories/LaunchesRepository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';
import { httpGet } from '../../shared/http/httpClient.js';

/**
 * SpaceX's community API (api.spacexdata.com) was archived and is currently down.
 * We source SpaceX launches from Launch Library 2 (The Space Devs), filtered by
 * launch service provider id 121 (SpaceX).
 */
const SPACEX_PROVIDER_ID = 121;

const STATUS_IDS: Record<LaunchStatusFilter, string> = {
  success: '3',
  failure: '4',
  partial_failure: '7',
};

interface LaunchLibraryLaunch {
  id: string;
  name: string;
  net: string;
  webcast_live: boolean;
  image: string | null;
  status: {
    id: number;
    name: string;
    abbrev: string;
  };
  rocket: {
    configuration: {
      id: number;
      name: string;
      full_name: string;
    };
  };
  mission: {
    name: string;
    description: string | null;
  } | null;
  pad: {
    name: string;
    wiki_url: string | null;
  };
  agency_launch_attempt_count: number | null;
  program: Array<{
    info_url: string | null;
    wiki_url: string | null;
  }>;
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
  const dateUnix = Math.floor(new Date(raw.net).getTime() / 1000);

  return {
    id: raw.id,
    name: raw.name,
    flightNumber: raw.agency_launch_attempt_count ?? 0,
    dateUtc: raw.net,
    dateUnix,
    success: isSuccessful(raw.status.id),
    upcoming: isUpcoming(raw.status.id, raw.net),
    details: raw.mission?.description ?? null,
    rocket: raw.rocket.configuration.full_name,
    launchpad: raw.pad.name,
    status: raw.status.abbrev,
    links: {
      patch: {
        small: raw.image,
        large: raw.image,
      },
      webcast: null,
      wikipedia: raw.pad.wiki_url,
      article: raw.program[0]?.info_url ?? null,
      flickr: {
        original: [],
      },
    },
    cores: [],
  };
}

async function fetchSpaceXLaunches(options: {
  path?: 'upcoming' | 'previous';
  limit: number;
  offset?: number;
  onlyFuture?: boolean;
  status?: LaunchStatusFilter;
}): Promise<LaunchList> {
  const limit = options.limit;
  const offset = options.offset ?? 0;
  const cacheKey = [
    'launches',
    options.path ?? 'all',
    `limit=${limit}`,
    `offset=${offset}`,
    options.onlyFuture ? 'future' : 'any',
    options.status ?? 'any-status',
  ].join(':');

  return upstreamCache.getOrSet(
    cacheKey,
    async () => {
      const query: Record<string, string | number | boolean | undefined> = {
        lsp__id: SPACEX_PROVIDER_ID,
        limit,
        offset,
        mode: 'detailed',
      };

      if (options.status) {
        query.status__ids = STATUS_IDS[options.status];
      }

      if (options.onlyFuture) {
        // Stable to the minute so cache keys stay useful within the TTL window.
        const now = new Date();
        now.setSeconds(0, 0);
        query.net__gte = now.toISOString();
      }

      const basePath = options.path
        ? `${externalApis.launchLibrary}/${options.path}/`
        : `${externalApis.launchLibrary}/`;

      const raw = await httpGet<LaunchLibraryResponse>(basePath, { query });

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

export class SpaceXLaunchesRepository implements LaunchesRepository {
  async getLaunches(params: GetLaunchesParams = {}): Promise<LaunchList> {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    if (params.upcoming === true) {
      return fetchSpaceXLaunches({
        path: 'upcoming',
        limit,
        offset,
        onlyFuture: true,
        status: params.status,
      });
    }

    if (params.upcoming === false) {
      return fetchSpaceXLaunches({
        path: 'previous',
        limit,
        offset,
        status: params.status,
      });
    }

    return fetchSpaceXLaunches({
      limit,
      offset,
      status: params.status,
    });
  }

  async getLatestLaunch(): Promise<Launch> {
    const list = await fetchSpaceXLaunches({ path: 'previous', limit: 1 });
    const latest = list.results[0];
    if (!latest) throw new NotFoundError('Latest SpaceX launch not found');
    return latest;
  }

  async getNextLaunch(): Promise<Launch> {
    const list = await fetchSpaceXLaunches({
      path: 'upcoming',
      limit: 1,
      onlyFuture: true,
    });
    const next = list.results[0];
    if (!next) throw new NotFoundError('Next SpaceX launch not found');
    return next;
  }
}
