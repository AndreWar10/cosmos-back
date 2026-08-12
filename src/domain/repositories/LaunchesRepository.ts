import type { Launch, LaunchList } from '../entities/Launch.js';

export interface GetLaunchesParams {
  limit?: number;
}

export interface LaunchesRepository {
  getLaunches(params?: GetLaunchesParams): Promise<LaunchList>;
  getLatestLaunch(): Promise<Launch>;
  getNextLaunch(): Promise<Launch>;
  /** Best-effort upstream refresh for warmup/background jobs. */
  refreshMaster?(): Promise<void>;
}
