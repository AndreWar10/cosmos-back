import type { Launch, LaunchList } from '../entities/Launch.js';

export type LaunchStatusFilter = 'success' | 'failure' | 'partial_failure';

export interface GetLaunchesParams {
  limit?: number;
  offset?: number;
  upcoming?: boolean;
  status?: LaunchStatusFilter;
}

export interface LaunchesRepository {
  getLaunches(params?: GetLaunchesParams): Promise<LaunchList>;
  getLatestLaunch(): Promise<Launch>;
  getNextLaunch(): Promise<Launch>;
}
