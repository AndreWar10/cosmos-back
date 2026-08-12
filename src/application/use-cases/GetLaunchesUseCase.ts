import type { Launch } from '../../domain/entities/Launch.js';
import type {
  GetLaunchesParams,
  LaunchesRepository,
} from '../../domain/repositories/LaunchesRepository.js';
import type { TranslationService } from '../../domain/services/TranslationService.js';
import type { Locale } from '../../shared/types/locale.js';

type LaunchQuery =
  | ({ mode: 'list' } & GetLaunchesParams)
  | { mode: 'latest' }
  | { mode: 'next' };

export class GetLaunchesUseCase {
  constructor(
    private readonly launchesRepository: LaunchesRepository,
    private readonly translationService: TranslationService,
  ) {}

  async execute(
    params: LaunchQuery & { locale: Locale },
  ): Promise<Launch | Launch[]> {
    let data: Launch | Launch[];

    if (params.mode === 'latest') {
      data = await this.launchesRepository.getLatestLaunch();
    } else if (params.mode === 'next') {
      data = await this.launchesRepository.getNextLaunch();
    } else {
      data = await this.launchesRepository.getLaunches({
        limit: params.limit,
        upcoming: params.upcoming,
      });
    }

    if (params.locale === 'en') return data;

    if (Array.isArray(data)) {
      const translated: Launch[] = [];
      for (const launch of data) {
        translated.push(await this.translateLaunch(launch, params.locale));
      }
      return translated;
    }

    return this.translateLaunch(data, params.locale);
  }

  private async translateLaunch(launch: Launch, locale: Locale): Promise<Launch> {
    if (!launch.details && !launch.name) return launch;

    const [name, details] = await this.translationService.translateMany(
      [launch.name, launch.details ?? ''],
      locale,
    );

    return {
      ...launch,
      name,
      details: launch.details ? details : null,
    };
  }
}
