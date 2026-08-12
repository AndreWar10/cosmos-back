import type { Launch } from '../entities/Launch.js';

export interface GetLaunchesParams {
  limit?: number;
  upcoming?: boolean;
}

export interface LaunchesRepository {
  getLaunches(params?: GetLaunchesParams): Promise<Launch[]>;
  getLatestLaunch(): Promise<Launch>;
  getNextLaunch(): Promise<Launch>;
}
