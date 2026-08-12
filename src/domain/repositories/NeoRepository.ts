import type { NeoFeed } from '../entities/NeoFeed.js';

export interface GetNeoFeedParams {
  startDate?: string;
  endDate?: string;
}

export interface NeoRepository {
  getFeed(params?: GetNeoFeedParams): Promise<NeoFeed>;
}
