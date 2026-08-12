export interface LaunchList {
  count: number;
  limit: number;
  offset: number;
  results: Launch[];
}

export interface LaunchLinks {
  patch: {
    small: string | null;
    large: string | null;
  };
  webcast: string | null;
  wikipedia: string | null;
  article: string | null;
  flickr: {
    original: string[];
  };
}

export interface LaunchCore {
  core: string | null;
  flight: number | null;
  reused: boolean | null;
  landingSuccess: boolean | null;
  landingType: string | null;
}

export interface Launch {
  id: string;
  name: string;
  flightNumber: number;
  dateUtc: string;
  dateUnix: number;
  success: boolean | null;
  upcoming: boolean;
  details: string | null;
  rocket: string;
  launchpad: string;
  status: string;
  links: LaunchLinks;
  cores: LaunchCore[];
}
