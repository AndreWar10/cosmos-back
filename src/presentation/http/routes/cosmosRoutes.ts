import { Router } from 'express';
import type { CosmosController } from '../controllers/CosmosController.js';
import { localeMiddleware } from '../middlewares/localeMiddleware.js';
import { validateQuery } from '../middlewares/validateQuery.js';
import {
  apodQuerySchema,
  launchesQuerySchema,
  neoQuerySchema,
  newsQuerySchema,
} from '../schemas/querySchemas.js';

function createLocaleRouter(controller: CosmosController): Router {
  const router = Router({ mergeParams: true });

  router.use(localeMiddleware);
  router.get('/apod', validateQuery(apodQuerySchema), controller.apod);
  router.get('/news', validateQuery(newsQuerySchema), controller.news);
  router.get(
    '/launches',
    validateQuery(launchesQuerySchema),
    controller.launches,
  );
  router.get('/neo', validateQuery(neoQuerySchema), controller.neo);
  router.get('/solar-system', controller.solarSystem);

  return router;
}

export function createCosmosRouter(controller: CosmosController): Router {
  const router = Router();

  // English (default): GET /api/apod
  router.use(createLocaleRouter(controller));

  // Portuguese: GET /api/pt/apod
  router.use('/:locale(pt)', createLocaleRouter(controller));

  return router;
}
