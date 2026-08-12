import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { createContainer } from './main/container.js';
import { createCosmosRouter } from './presentation/http/routes/cosmosRoutes.js';
import { errorHandler } from './presentation/http/middlewares/errorHandler.js';

export function createApp() {
  const app = express();
  const { cosmosController } = createContainer();

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    }),
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'cosmos-back',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'Cosmos API',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        apod: 'GET /api/apod | GET /api/pt/apod',
        news: 'GET /api/news | GET /api/pt/news',
        launches: 'GET /api/launches | GET /api/pt/launches',
        neo: 'GET /api/neo | GET /api/pt/neo',
        solarSystem: 'GET /api/solar-system | GET /api/pt/solar-system',
      },
    });
  });

  app.use('/api', createCosmosRouter(cosmosController));
  app.use(errorHandler);

  return app;
}
