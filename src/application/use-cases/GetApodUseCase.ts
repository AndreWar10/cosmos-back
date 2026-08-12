import type { Apod } from '../../domain/entities/Apod.js';
import type {
  ApodRepository,
  GetApodParams,
} from '../../domain/repositories/ApodRepository.js';
import type { TranslationService } from '../../domain/services/TranslationService.js';
import type { Locale } from '../../shared/types/locale.js';

export class GetApodUseCase {
  constructor(
    private readonly apodRepository: ApodRepository,
    private readonly translationService: TranslationService,
  ) {}

  async execute(params: GetApodParams & { locale: Locale }): Promise<Apod> {
    const apod = await this.apodRepository.getApod({ date: params.date });

    if (params.locale === 'en') return apod;

    const [title, explanation] = await this.translationService.translateMany(
      [apod.title, apod.explanation],
      params.locale,
    );

    return {
      ...apod,
      title,
      explanation,
    };
  }
}
