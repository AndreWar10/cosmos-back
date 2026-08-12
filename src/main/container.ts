import { GetApodUseCase } from '../application/use-cases/GetApodUseCase.js';
import { GetLaunchesUseCase } from '../application/use-cases/GetLaunchesUseCase.js';
import { GetNeoFeedUseCase } from '../application/use-cases/GetNeoFeedUseCase.js';
import { GetNewsUseCase } from '../application/use-cases/GetNewsUseCase.js';
import { NasaApodRepository } from '../infrastructure/nasa/NasaApodRepository.js';
import { NasaNeoRepository } from '../infrastructure/nasa/NasaNeoRepository.js';
import { SpaceflightNewsRepository } from '../infrastructure/spaceflight/SpaceflightNewsRepository.js';
import { SpaceXLaunchesRepository } from '../infrastructure/spacex/SpaceXLaunchesRepository.js';
import { ResilientTranslationService } from '../infrastructure/translation/ResilientTranslationService.js';
import { CosmosController } from '../presentation/http/controllers/CosmosController.js';

export function createContainer() {
  const translationService = new ResilientTranslationService();

  const apodRepository = new NasaApodRepository();
  const newsRepository = new SpaceflightNewsRepository();
  const launchesRepository = new SpaceXLaunchesRepository();
  const neoRepository = new NasaNeoRepository();

  const getApod = new GetApodUseCase(apodRepository, translationService);
  const getNews = new GetNewsUseCase(newsRepository, translationService);
  const getLaunches = new GetLaunchesUseCase(
    launchesRepository,
    translationService,
  );
  const getNeoFeed = new GetNeoFeedUseCase(neoRepository);

  const cosmosController = new CosmosController(
    getApod,
    getNews,
    getLaunches,
    getNeoFeed,
  );

  return {
    cosmosController,
  };
}
