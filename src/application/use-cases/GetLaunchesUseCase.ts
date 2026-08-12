import type { Launch, LaunchList } from '../../domain/entities/Launch.js';
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
  ): Promise<Launch | LaunchList> {
    if (params.mode === 'latest') {
      const launch = await this.launchesRepository.getLatestLaunch();
      return params.locale === 'en'
        ? launch
        : this.translateLaunch(launch, params.locale);
    }

    if (params.mode === 'next') {
      const launch = await this.launchesRepository.getNextLaunch();
      return params.locale === 'en'
        ? launch
        : this.translateLaunch(launch, params.locale);
    }

    const list = await this.launchesRepository.getLaunches({
      limit: params.limit,
      offset: params.offset,
    });

    if (params.locale === 'en') return list;

    const results = await Promise.all(
      list.results.map((launch) => this.translateLaunch(launch, params.locale)),
    );

    return {
      ...list,
      results,
    };
  }

  private async translateLaunch(
    launch: Launch,
    locale: Locale,
  ): Promise<Launch> {
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
