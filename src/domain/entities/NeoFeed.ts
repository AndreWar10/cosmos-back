export interface NeoDiameterRange {
  min: number;
  max: number;
}

export interface NeoCloseApproach {
  closeApproachDate: string;
  relativeVelocityKmh: string;
  missDistanceKm: string;
  orbitingBody: string;
}

export interface NearEarthObject {
  id: string;
  neoReferenceId: string;
  name: string;
  nasaJplUrl: string;
  absoluteMagnitude: number;
  estimatedDiameterKm: NeoDiameterRange;
  isPotentiallyHazardous: boolean;
  isSentryObject: boolean;
  closeApproach: NeoCloseApproach | null;
}

export interface NeoFeed {
  elementCount: number;
  startDate: string;
  endDate: string;
  objectsByDate: Record<string, NearEarthObject[]>;
}
