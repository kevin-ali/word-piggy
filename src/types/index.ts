export type Region = 'CA' | 'US' | 'EU';
export type RegionMode = 'domains' | 'sourcecountry';
export type Granularity = 'monthly' | 'weekly' | 'daily';
export type CompareMode = 'phrase' | 'phrase-region';

export interface FrequencyRequest {
  phrases: string[];
  regions: Region[];
  mode: RegionMode;
  startDate: string;
  endDate: string;
  granularity: Granularity;
  customDomains?: Record<Region, string[]>;
}

export interface DataPoint {
  date: string;
  value: number;
}

export interface SeriesData {
  phrase: string;
  region: Region | 'ALL';
  total: number;
  points: DataPoint[];
}

export interface FrequencyResponse {
  meta: {
    startDatetime: string;
    endDatetime: string;
    granularity: Granularity;
    regions: Region[];
    mode: RegionMode;
  };
  series: SeriesData[];
}

export interface DomainLists {
  CA: string[];
  US: string[];
  EU: string[];
}

export interface CacheEntry {
  id: string;
  cache_key: string;
  created_at: string;
  response_json: FrequencyResponse;
  domains_version: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: {
    phrases?: string[];
    regions?: Region[];
    startDate?: string;
    endDate?: string;
    mode?: RegionMode;
    url?: string;
    rawResponse?: string;
  };
}

export interface EstimateResponse {
  totalRequests: number;
  cachedRequests: number;
  newRequests: number;
  estimatedTimeSeconds: number;
  exceedsLimit: boolean;
  maxRequests: number;
}
