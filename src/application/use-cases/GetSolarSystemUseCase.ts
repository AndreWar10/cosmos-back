import type { SolarBody } from '../../domain/entities/SolarBody.js';
import type { SolarSystemRepository } from '../../domain/repositories/SolarSystemRepository.js';
import type { TranslationService } from '../../domain/services/TranslationService.js';
import type { Locale } from '../../shared/types/locale.js';

/**
 * Upstream MockAPI payload is Portuguese by default.
 * - /api/pt/solar-system → return as-is
 * - /api/solar-system → translate PT → EN
 */
export class GetSolarSystemUseCase {
  constructor(
    private readonly solarSystemRepository: SolarSystemRepository,
    private readonly translationService: TranslationService,
  ) {}

  async execute(params: { locale: Locale }): Promise<SolarBody[]> {
    const bodies = await this.solarSystemRepository.getBodies();

    if (params.locale === 'pt') return bodies;

    return Promise.all(
      bodies.map((body) => this.translateBody(body, params.locale)),
    );
  }

  private async translateBody(
    body: SolarBody,
    locale: Locale,
  ): Promise<SolarBody> {
    const source: Locale = 'pt';

    const [
      name,
      type,
      resume,
      introduction,
      geography,
      ...rest
    ] = await this.translationService.translateMany(
      [
        body.name,
        body.type,
        body.resume,
        body.introduction,
        body.geography,
        ...body.searchTags,
        ...body.features.orbitalPeriod,
        body.features.orbitalSpeed,
        body.features.rotationDuration,
        ...body.features.satellites.names,
      ],
      locale,
      source,
    );

    const searchTagsCount = body.searchTags.length;
    const orbitalPeriodCount = body.features.orbitalPeriod.length;
    const searchTags = rest.slice(0, searchTagsCount);
    const afterTags = rest.slice(searchTagsCount);
    const orbitalPeriod = afterTags.slice(0, orbitalPeriodCount);
    const afterPeriod = afterTags.slice(orbitalPeriodCount);
    const orbitalSpeed = afterPeriod[0] ?? body.features.orbitalSpeed;
    const rotationDuration = afterPeriod[1] ?? body.features.rotationDuration;
    const satelliteNames = afterPeriod.slice(2);

    return {
      ...body,
      name,
      type,
      resume,
      introduction,
      geography,
      searchTags,
      features: {
        ...body.features,
        orbitalPeriod,
        orbitalSpeed,
        rotationDuration,
        satellites: {
          ...body.features.satellites,
          names: satelliteNames,
        },
      },
    };
  }
}
