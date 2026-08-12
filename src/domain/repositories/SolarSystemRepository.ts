import type { SolarBody } from '../entities/SolarBody.js';

export interface SolarSystemRepository {
  getBodies(): Promise<SolarBody[]>;
}
