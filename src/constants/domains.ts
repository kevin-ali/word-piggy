import type { DomainLists, Region } from '../types';

export const DEFAULT_DOMAINS: DomainLists = {
  CA: [
    'theglobeandmail.com',
    'thestar.com',
    'cbc.ca',
    'nationalpost.com',
    'ctvnews.ca',
    'globalnews.ca',
    'ledevoir.com',
  ],
  US: [
    'nytimes.com',
    'washingtonpost.com',
    'wsj.com',
    'apnews.com',
    'reuters.com',
    'bloomberg.com',
    'npr.org',
    'cnn.com',
    'foxnews.com',
    'nbcnews.com',
  ],
  EU: [
    'bbc.co.uk',
    'theguardian.com',
    'ft.com',
    'reuters.com',
    'france24.com',
    'lemonde.fr',
    'spiegel.de',
    'zeit.de',
    'elpais.com',
    'corriere.it',
    'repubblica.it',
    'rte.ie',
    'politico.eu',
  ],
};

export const REGION_LABELS: Record<Region | 'ALL', string> = {
  CA: 'Canada',
  US: 'United States',
  EU: 'Europe',
  ALL: 'All Regions',
};

export const SOURCE_COUNTRY_CODES: Record<Region, string[]> = {
  CA: ['CAN'],
  US: ['USA'],
  EU: [
    'GBR', 'FRA', 'DEU', 'ESP', 'ITA', 'NLD', 'BEL', 'CHE',
    'SWE', 'NOR', 'DNK', 'IRL', 'PRT', 'AUT', 'POL', 'CZE',
    'GRC', 'HUN', 'ROU', 'FIN',
  ],
};

export const DOMAINS_VERSION = 'v1';
