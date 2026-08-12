import { env, externalApis } from '../../config/env.js';
import type {
  NearEarthObject,
  NeoFeed,
} from '../../domain/entities/NeoFeed.js';
import type {
  GetNeoFeedParams,
  NeoRepository,
} from '../../domain/repositories/NeoRepository.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';
import { httpGet } from '../../shared/http/httpClient.js';

interface NasaNeoRaw {
  id: string;
  neo_reference_id: string;
  name: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  is_sentry_object: boolean;
  close_approach_data: Array<{
    close_approach_date: string;
    relative_velocity: {
      kilometers_per_hour: string;
    };
    miss_distance: {
      kilometers: string;
    };
    orbiting_body: string;
  }>;
}

interface NasaNeoFeedResponse {
  element_count: number;
  near_earth_objects: Record<string, NasaNeoRaw[]>;
}

function mapNeo(raw: NasaNeoRaw): NearEarthObject {
  const approach = raw.close_approach_data[0];

  return {
    id: raw.id,
    neoReferenceId: raw.neo_reference_id,
    name: raw.name,
    nasaJplUrl: raw.nasa_jpl_url,
    absoluteMagnitude: raw.absolute_magnitude_h,
    estimatedDiameterKm: {
      min: raw.estimated_diameter.kilometers.estimated_diameter_min,
      max: raw.estimated_diameter.kilometers.estimated_diameter_max,
    },
    isPotentiallyHazardous: raw.is_potentially_hazardous_asteroid,
    isSentryObject: raw.is_sentry_object,
    closeApproach: approach
      ? {
          closeApproachDate: approach.close_approach_date,
          relativeVelocityKmh: approach.relative_velocity.kilometers_per_hour,
          missDistanceKm: approach.miss_distance.kilometers,
          orbitingBody: approach.orbiting_body,
        }
      : null,
  };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export class NasaNeoRepository implements NeoRepository {
  async getFeed(params: GetNeoFeedParams = {}): Promise<NeoFeed> {
    const startDate = params.startDate ?? todayIsoDate();
    const endDate = params.endDate ?? startDate;
    const cacheKey = `neo:${startDate}:${endDate}`;

    return upstreamCache.getStaleWhileRevalidate(
      cacheKey,
      async () => {
      const raw = await httpGet<NasaNeoFeedResponse>(externalApis.nasaNeo, {
        query: {
          api_key: env.NASA_API_KEY,
          start_date: startDate,
          end_date: endDate,
        },
      });

      const objectsByDate: Record<string, NearEarthObject[]> = {};

      for (const [date, items] of Object.entries(raw.near_earth_objects ?? {})) {
        objectsByDate[date] = items.map(mapNeo);
      }

      return {
        elementCount: raw.element_count,
        startDate,
        endDate,
        objectsByDate,
      };
    },
      CACHE_TTL.neo,
    );
  }
}
