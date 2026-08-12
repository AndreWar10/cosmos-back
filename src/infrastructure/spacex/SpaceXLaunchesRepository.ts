import { externalApis } from '../../config/env.js';
import type { Launch } from '../../domain/entities/Launch.js';
import type {
  GetLaunchesParams,
  LaunchesRepository,
} from '../../domain/repositories/LaunchesRepository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { httpGet } from '../../shared/http/httpClient.js';

/**
 * SpaceX's community API (api.spacexdata.com) was archived and is currently down.
 * We source SpaceX launches from Launch Library 2 (The Space Devs), filtered by
 * launch service provider id 121 (SpaceX).
 */
const SPACEX_PROVIDER_ID = 121;

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
  results: LaunchLibraryLaunch[];
}

function isSuccessful(statusId: number): boolean | null {
  // 3 = Success, 4 = Failure, 7 = Partial Failure
  if (statusId === 3) return true;
  if (statusId === 4 || statusId === 7) return false;
  return null;
}

function isUpcoming(statusId: number, net: string): boolean {
  // 1 Go, 2 TBD, 5 Hold, 6 In Flight, 8 TBC
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
  path: 'upcoming' | 'previous';
  limit: number;
  onlyFuture?: boolean;
}): Promise<Launch[]> {
  const query: Record<string, string | number | boolean | undefined> = {
    lsp__id: SPACEX_PROVIDER_ID,
    limit: options.onlyFuture ? Math.max(options.limit * 3, 10) : options.limit,
    mode: 'detailed',
  };

  if (options.onlyFuture) {
    query.net__gte = new Date().toISOString();
  }

  const raw = await httpGet<LaunchLibraryResponse>(
    `${externalApis.launchLibrary}/${options.path}/`,
    { query },
  );

  let launches = raw.results.map(mapLaunch);

  if (options.onlyFuture) {
    const now = Date.now();
    launches = launches
      .filter((launch) => launch.dateUnix * 1000 >= now)
      .slice(0, options.limit);
  }

  return launches;
}

export class SpaceXLaunchesRepository implements LaunchesRepository {
  async getLaunches(params: GetLaunchesParams = {}): Promise<Launch[]> {
    const limit = params.limit ?? 20;

    if (params.upcoming === true) {
      return fetchSpaceXLaunches({
        path: 'upcoming',
        limit,
        onlyFuture: true,
      });
    }

    if (params.upcoming === false) {
      return fetchSpaceXLaunches({ path: 'previous', limit });
    }

    const [upcoming, previous] = await Promise.all([
      fetchSpaceXLaunches({ path: 'upcoming', limit, onlyFuture: true }),
      fetchSpaceXLaunches({ path: 'previous', limit }),
    ]);

    return [...upcoming, ...previous]
      .sort((a, b) => b.dateUnix - a.dateUnix)
      .slice(0, limit);
  }

  async getLatestLaunch(): Promise<Launch> {
    const [latest] = await fetchSpaceXLaunches({ path: 'previous', limit: 1 });
    if (!latest) throw new NotFoundError('Latest SpaceX launch not found');
    return latest;
  }

  async getNextLaunch(): Promise<Launch> {
    const [next] = await fetchSpaceXLaunches({
      path: 'upcoming',
      limit: 1,
      onlyFuture: true,
    });
    if (!next) throw new NotFoundError('Next SpaceX launch not found');
    return next;
  }
}
