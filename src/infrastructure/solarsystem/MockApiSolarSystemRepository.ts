import { externalApis } from '../../config/env.js';
import type { SolarBody } from '../../domain/entities/SolarBody.js';
import type { SolarSystemRepository } from '../../domain/repositories/SolarSystemRepository.js';
import { CACHE_TTL, upstreamCache } from '../../shared/cache/MemoryCache.js';
import { httpGet } from '../../shared/http/httpClient.js';

interface SolarBodyRaw {
  id: string;
  name: string;
  type: string;
  resume: string;
  introduction: string;
  images: {
    svg: string;
    png: string;
  };
  searchTags: string[];
  features: {
    orbitalPeriod: string[];
    orbitalSpeed: string;
    rotationDuration: string;
    radius: string;
    Diameter: string;
    sunDistance: string;
    oneWayLightToTheSun?: string;
    satellites: {
      number: number;
      names: string[];
    };
    temperature: string;
    gravity: string;
  };
  geography: string;
}

function mapBody(raw: SolarBodyRaw): SolarBody {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    resume: raw.resume,
    introduction: raw.introduction ?? '',
    images: {
      svg: raw.images.svg,
      png: raw.images.png,
    },
    searchTags: raw.searchTags ?? [],
    features: {
      orbitalPeriod: raw.features.orbitalPeriod ?? [],
      orbitalSpeed: raw.features.orbitalSpeed ?? '',
      rotationDuration: raw.features.rotationDuration ?? '',
      radius: raw.features.radius ?? '',
      diameter: raw.features.Diameter ?? '',
      sunDistance: raw.features.sunDistance ?? '',
      oneWayLightToTheSun: raw.features.oneWayLightToTheSun ?? '',
      satellites: {
        number: raw.features.satellites?.number ?? 0,
        names: (raw.features.satellites?.names ?? []).filter(Boolean),
      },
      temperature: raw.features.temperature ?? '',
      gravity: raw.features.gravity ?? '',
    },
    geography: raw.geography ?? '',
  };
}

export class MockApiSolarSystemRepository implements SolarSystemRepository {
  async getBodies(): Promise<SolarBody[]> {
    return upstreamCache.getStaleWhileRevalidate(
      'solar-system:all',
      async () => {
        const raw = await httpGet<SolarBodyRaw[]>(externalApis.solarSystem);
        return raw.map(mapBody);
      },
      CACHE_TTL.solarSystem,
    );
  }
}
