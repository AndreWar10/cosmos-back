import type { Apod } from '../entities/Apod.js';

export interface GetApodParams {
  date?: string;
}

export interface ApodRepository {
  getApod(params?: GetApodParams): Promise<Apod>;
}
