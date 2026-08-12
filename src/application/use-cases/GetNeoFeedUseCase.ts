import type { NeoFeed } from '../../domain/entities/NeoFeed.js';
import type {
  GetNeoFeedParams,
  NeoRepository,
} from '../../domain/repositories/NeoRepository.js';
import type { Locale } from '../../shared/types/locale.js';

export class GetNeoFeedUseCase {
  constructor(private readonly neoRepository: NeoRepository) {}

  async execute(
    params: GetNeoFeedParams & { locale: Locale },
  ): Promise<NeoFeed> {
    // Locale is accepted for route consistency; NEO payloads are numeric/catalog data.
    void params.locale;

    return this.neoRepository.getFeed({
      startDate: params.startDate,
      endDate: params.endDate,
    });
  }
}
