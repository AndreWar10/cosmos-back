import type { Launch, LaunchList } from '../entities/Launch.js';

export interface GetLaunchesParams {
  limit?: number;
  offset?: number;
}

export interface LaunchesRepository {
  getLaunches(params?: GetLaunchesParams): Promise<LaunchList>;
  getLatestLaunch(): Promise<Launch>;
  getNextLaunch(): Promise<Launch>;
}
