import path from 'node:path';
import { env, externalApis } from '../../config/env.js';
import type { Launch, LaunchList } from '../../domain/entities/Launch.js';
import type {
  GetLaunchesParams,
  LaunchesRepository,
} from '../../domain/repositories/LaunchesRepository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';
import { httpGet } from '../../shared/http/httpClient.js';
import fs from 'node:fs';

/**
 * No query filters — one master list is cached and sliced locally.
 * Launch Library free tier is 15 req/hour; filters were burning the quota.
 */
const SPACEX_PROVIDER_ID = 121;
const MASTER_KEY = 'launches:master';
const SEED_PATH = path.resolve(process.cwd(), 'data', 'launches-seed.json');

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
  results: LaunchLibraryLaunch[];
}

interface MasterSnapshot {
  updatedAt: string;
  results: Launch[];
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

function loadSeed(): MasterSnapshot | undefined {
  try {
    if (!fs.existsSync(SEED_PATH)) return undefined;
    return JSON.parse(fs.readFileSync(SEED_PATH, 'utf8')) as MasterSnapshot;
  } catch {
    return undefined;
  }
}

function mergeLaunches(...groups: Launch[][]): Launch[] {
  const seen = new Set<string>();
  const merged: Launch[] = [];
  for (const group of groups) {
    for (const launch of group) {
      if (seen.has(launch.id)) continue;
      seen.add(launch.id);
      merged.push(launch);
    }
  }
  return merged.sort((a, b) => b.dateUnix - a.dateUnix);
}

async function fetchPage(
  pathName: 'upcoming' | 'previous',
  limit: number,
): Promise<Launch[]> {
  const raw = await httpGet<LaunchLibraryResponse>(
    `${externalApis.launchLibrary}/${pathName}/`,
    {
      query: {
        lsp__id: SPACEX_PROVIDER_ID,
        limit,
        mode: 'detailed',
      },
      headers: authHeaders(),
    },
  );
  return raw.results.map(mapLaunch);
}

async function refreshMasterFromUpstream(): Promise<MasterSnapshot> {
  const [upcoming, previous] = await Promise.all([
    fetchPage('upcoming', 20),
    fetchPage('previous', 40),
  ]);

  const snapshot: MasterSnapshot = {
    updatedAt: new Date().toISOString(),
    results: mergeLaunches(upcoming, previous),
  };

  upstreamCache.set(MASTER_KEY, snapshot, CACHE_TTL.launches);
  return snapshot;
}

async function getMaster(): Promise<Launch[]> {
  const memory = upstreamCache.getStale<MasterSnapshot>(MASTER_KEY);
  if (memory) {
    const fresh = upstreamCache.get<MasterSnapshot>(MASTER_KEY);
    if (!fresh) {
      void refreshMasterFromUpstream().catch((error) => {
        console.warn(
          '[launches] background refresh failed:',
          error instanceof Error ? error.message : error,
        );
      });
    }
    return memory.results;
  }

  const seed = loadSeed();
  if (seed) {
    upstreamCache.set(MASTER_KEY, seed, CACHE_TTL.launches);
    void refreshMasterFromUpstream().catch((error) => {
      console.warn(
        '[launches] background refresh failed:',
        error instanceof Error ? error.message : error,
      );
    });
    return seed.results;
  }

  try {
    const snapshot = await refreshMasterFromUpstream();
    return snapshot.results;
  } catch (error) {
    throw error;
  }
}

export class SpaceXLaunchesRepository implements LaunchesRepository {
  async getLaunches(params: GetLaunchesParams = {}): Promise<LaunchList> {
    const limit = params.limit ?? 20;
    const launches = await getMaster();

    return {
      count: launches.length,
      limit,
      offset: 0,
      results: launches.slice(0, limit),
    };
  }

  async getLatestLaunch(): Promise<Launch> {
    const launches = await getMaster();
    const latest = launches.find((launch) => !launch.upcoming);
    if (!latest) throw new NotFoundError('Latest SpaceX launch not found');
    return latest;
  }

  async getNextLaunch(): Promise<Launch> {
    const launches = await getMaster();
    const next = launches
      .filter((launch) => launch.upcoming)
      .sort((a, b) => a.dateUnix - b.dateUnix)[0];
    if (!next) throw new NotFoundError('Next SpaceX launch not found');
    return next;
  }

  async refreshMaster(): Promise<void> {
    try {
      await refreshMasterFromUpstream();
      console.log('[launches] master cache refreshed');
    } catch (error) {
      const seed = loadSeed();
      if (seed && !upstreamCache.getStale(MASTER_KEY)) {
        upstreamCache.set(MASTER_KEY, seed, CACHE_TTL.launches);
      }
      console.warn(
        '[launches] refresh skipped:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
