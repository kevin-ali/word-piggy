import type { DataPoint, Granularity, Region, SeriesData } from '../types';
import { SOURCE_COUNTRY_CODES, DOMAINS_VERSION } from '../constants/domains';

export function dateToStartDatetime(dateStr: string): string {
  return dateStr.replace(/-/g, '') + '000000';
}

export function dateToEndDatetime(dateStr: string): string {
  return dateStr.replace(/-/g, '') + '235959';
}

export function buildPhraseClause(phrase: string): string {
  return `"${phrase}"`;
}

export function buildDomainClause(domains: string[]): string {
  if (domains.length === 0) return '';
  const domainClauses = domains.map(d => `domain:${d}`);
  return `(${domainClauses.join(' OR ')})`;
}

export function buildSourceCountryClause(region: Region): string {
  const codes = SOURCE_COUNTRY_CODES[region];
  if (codes.length === 1) {
    return `sourcecountry:${codes[0]}`;
  }
  const clauses = codes.map(c => `sourcecountry:${c}`);
  return `(${clauses.join(' OR ')})`;
}

export function buildQuery(
  phrase: string,
  region: Region,
  mode: 'domains' | 'sourcecountry',
  domainLists: Record<Region, string[]>
): string {
  const phraseClause = buildPhraseClause(phrase);

  let regionClause: string;
  if (mode === 'domains') {
    regionClause = buildDomainClause(domainLists[region]);
  } else {
    regionClause = buildSourceCountryClause(region);
  }

  return `${phraseClause} ${regionClause}`;
}

export function mergeSeriesSum(seriesList: SeriesData[]): SeriesData {
  if (seriesList.length === 0) {
    return { phrase: '', region: 'ALL', total: 0, points: [] };
  }

  const phrase = seriesList[0].phrase;
  const dateMap = new Map<string, number>();

  for (const series of seriesList) {
    for (const point of series.points) {
      const current = dateMap.get(point.date) || 0;
      dateMap.set(point.date, current + point.value);
    }
  }

  const sortedDates = Array.from(dateMap.keys()).sort();
  const points: DataPoint[] = sortedDates.map(date => ({
    date,
    value: dateMap.get(date)!,
  }));

  const total = points.reduce((sum, p) => sum + p.value, 0);

  return {
    phrase,
    region: 'ALL',
    total,
    points,
  };
}

export function generateCacheKey(
  phrases: string[],
  regions: Region[],
  mode: 'domains' | 'sourcecountry',
  startDate: string,
  endDate: string,
  granularity: Granularity,
  domainLists: Record<Region, string[]>
): string {
  const normalizedPhrases = [...phrases].sort();
  const normalizedRegions = [...regions].sort();

  const domainsHash = mode === 'domains'
    ? JSON.stringify(normalizedRegions.map(r => domainLists[r].sort()))
    : '';

  const payload = JSON.stringify({
    phrases: normalizedPhrases,
    regions: normalizedRegions,
    mode,
    startDate,
    endDate,
    granularity,
    domainsHash,
    version: DOMAINS_VERSION,
  });

  return btoa(payload).replace(/[+/=]/g, c =>
    c === '+' ? '-' : c === '/' ? '_' : ''
  );
}

export function normalizeGranularityDate(
  dateStr: string,
  granularity: Granularity
): string {
  const date = new Date(dateStr);

  if (granularity === 'monthly') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }

  if (granularity === 'weekly') {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().split('T')[0];
  }

  return dateStr;
}

export function formatDateForDisplay(
  dateStr: string,
  granularity: Granularity
): string {
  const date = new Date(dateStr);

  if (granularity === 'monthly') {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  if (granularity === 'weekly') {
    return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function exportToCsv(
  series: SeriesData[],
  granularity: Granularity
): string {
  const allDates = new Set<string>();
  series.forEach(s => s.points.forEach(p => allDates.add(p.date)));
  const sortedDates = Array.from(allDates).sort();

  const headers = ['Date', ...series.map(s =>
    s.region === 'ALL' ? s.phrase : `${s.phrase} (${s.region})`
  )];

  const rows = sortedDates.map(date => {
    const values = series.map(s => {
      const point = s.points.find(p => p.date === date);
      return point ? point.value : 0;
    });
    return [formatDateForDisplay(date, granularity), ...values];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csvContent;
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
