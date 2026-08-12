export interface SolarBodyImages {
  svg: string;
  png: string;
}

export interface SolarBodySatellites {
  number: number;
  names: string[];
}

export interface SolarBodyFeatures {
  orbitalPeriod: string[];
  orbitalSpeed: string;
  rotationDuration: string;
  radius: string;
  diameter: string;
  sunDistance: string;
  oneWayLightToTheSun: string;
  satellites: SolarBodySatellites;
  temperature: string;
  gravity: string;
}

export interface SolarBody {
  id: string;
  name: string;
  type: string;
  resume: string;
  introduction: string;
  images: SolarBodyImages;
  searchTags: string[];
  features: SolarBodyFeatures;
  geography: string;
}
