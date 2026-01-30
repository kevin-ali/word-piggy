import { Code } from 'lucide-react';
import type { Region, RegionMode, DomainLists } from '../types';

interface QueryPreviewProps {
  phrase: string;
  region: Region;
  mode: RegionMode;
  domains: DomainLists;
}

const SOURCE_COUNTRY_NAMES: Record<Region, string[]> = {
  CA: ['canada'],
  US: ['unitedstates'],
  EU: [
    'unitedkingdom', 'france', 'germany', 'spain', 'italy',
    'netherlands', 'belgium', 'switzerland', 'sweden', 'norway',
    'denmark', 'ireland', 'portugal', 'austria', 'poland',
    'finland', 'greece', 'czechrepublic', 'hungary', 'romania',
  ],
};

const CHUNK_SIZE = 6;
const EXACT_MATCH_MIN_LENGTH = 5;

function buildPhraseClause(phrase: string): string {
  const trimmed = phrase.trim();
  if (trimmed.length >= EXACT_MATCH_MIN_LENGTH) {
    return `"${trimmed}"`;
  }
  return trimmed;
}

function buildDomainClause(domains: string[]): string {
  if (domains.length === 0) return '';
  if (domains.length === 1) return `domain:${domains[0]}`;
  const domainClauses = domains.map((d) => `domain:${d}`);
  return `(${domainClauses.join(' OR ')})`;
}

function buildSourceCountryClause(countries: string[]): string {
  if (countries.length === 0) return '';
  if (countries.length === 1) return `sourcecountry:${countries[0]}`;
  const clauses = countries.map((c) => `sourcecountry:${c}`);
  return `(${clauses.join(' OR ')})`;
}

function generatePreviewQuery(
  phrase: string,
  region: Region,
  mode: RegionMode,
  domains: DomainLists
): { query: string; chunkInfo: string } {
  const phraseClause = buildPhraseClause(phrase);

  if (mode === 'domains') {
    const regionDomains = domains[region];
    const chunkCount = Math.ceil(regionDomains.length / CHUNK_SIZE);
    const firstChunk = regionDomains.slice(0, CHUNK_SIZE);
    const domainClause = buildDomainClause(firstChunk);
    const query = `${phraseClause} ${domainClause}`;
    const chunkInfo = chunkCount > 1
      ? `(chunk 1 of ${chunkCount}, results merged)`
      : '';
    return { query, chunkInfo };
  } else {
    const countries = SOURCE_COUNTRY_NAMES[region];
    const chunkCount = Math.ceil(countries.length / CHUNK_SIZE);
    const firstChunk = countries.slice(0, CHUNK_SIZE);
    const countryClause = buildSourceCountryClause(firstChunk);
    const query = `${phraseClause} ${countryClause}`;
    const chunkInfo = chunkCount > 1
      ? `(chunk 1 of ${chunkCount}, results merged)`
      : '';
    return { query, chunkInfo };
  }
}

export function QueryPreview({ phrase, region, mode, domains }: QueryPreviewProps) {
  if (!phrase.trim()) return null;

  const { query, chunkInfo } = generatePreviewQuery(phrase, region, mode, domains);

  return (
    <div className="rounded-lg bg-slate-100 border border-slate-200 p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
        <Code className="h-3 w-3" />
        <span>Query Preview</span>
        {chunkInfo && <span className="text-slate-400">{chunkInfo}</span>}
      </div>
      <code className="text-xs text-slate-700 break-all leading-relaxed">
        {query}
      </code>
    </div>
  );
}
