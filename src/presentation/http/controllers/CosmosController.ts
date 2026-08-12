import type { Request, Response, NextFunction } from 'express';
import type { GetApodUseCase } from '../../../application/use-cases/GetApodUseCase.js';
import type { GetNewsUseCase } from '../../../application/use-cases/GetNewsUseCase.js';
import type { GetLaunchesUseCase } from '../../../application/use-cases/GetLaunchesUseCase.js';
import type { GetNeoFeedUseCase } from '../../../application/use-cases/GetNeoFeedUseCase.js';
import type { GetSolarSystemUseCase } from '../../../application/use-cases/GetSolarSystemUseCase.js';

export class CosmosController {
  constructor(
    private readonly getApod: GetApodUseCase,
    private readonly getNews: GetNewsUseCase,
    private readonly getLaunches: GetLaunchesUseCase,
    private readonly getNeoFeed: GetNeoFeedUseCase,
    private readonly getSolarSystem: GetSolarSystemUseCase,
  ) {}

  apod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.getApod.execute({
        locale: req.locale,
        date: req.query.date as string | undefined,
      });

      res.json({
        locale: req.locale,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  news = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.getNews.execute({
        locale: req.locale,
        limit: Number(req.query.limit),
        offset: Number(req.query.offset),
        search: req.query.search as string | undefined,
      });

      res.json({
        locale: req.locale,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  launches = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mode = (req.query.mode as 'list' | 'latest' | 'next') ?? 'list';

      const data = await this.getLaunches.execute({
        locale: req.locale,
        mode,
        limit: Number(req.query.limit),
      });

      res.json({
        locale: req.locale,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  neo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.getNeoFeed.execute({
        locale: req.locale,
        startDate: req.query.start_date as string | undefined,
        endDate: req.query.end_date as string | undefined,
      });

      res.json({
        locale: req.locale,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  solarSystem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.getSolarSystem.execute({
        locale: req.locale,
      });

      res.json({
        locale: req.locale,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
