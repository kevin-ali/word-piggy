import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

type Region = "CA" | "US" | "EU";
type RegionMode = "domains" | "sourcecountry";
type Granularity = "monthly" | "weekly" | "daily";

interface FrequencyRequest {
  phrases: string[];
  regions: Region[];
  mode: RegionMode;
  startDate: string;
  endDate: string;
  granularity: Granularity;
  customDomains?: Record<Region, string[]>;
  testMode?: boolean;
  estimateOnly?: boolean;
}

interface DataPoint {
  date: string;
  value: number;
}

interface SeriesData {
  phrase: string;
  region: Region | "ALL";
  total: number;
  points: DataPoint[];
}

interface FrequencyResponse {
  meta: {
    startDatetime: string;
    endDatetime: string;
    granularity: Granularity;
    regions: Region[];
    mode: RegionMode;
  };
  series: SeriesData[];
}

interface EstimateResponse {
  totalRequests: number;
  cachedRequests: number;
  newRequests: number;
  estimatedTimeSeconds: number;
  exceedsLimit: boolean;
  maxRequests: number;
}

interface TestResponse {
  url: string;
  query: string;
  phrase: string;
  region: Region;
  rawText: string;
  parsedJson: unknown | null;
  error: string | null;
}

interface ChunkCacheData {
  phrase: string;
  region: Region;
  chunkIndex: number;
  total: number;
  points: DataPoint[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_DOMAINS: Record<Region, string[]> = {
  CA: [
    "theglobeandmail.com",
    "thestar.com",
    "cbc.ca",
    "nationalpost.com",
    "ctvnews.ca",
    "globalnews.ca",
    "ledevoir.com",
  ],
  US: [
    "nytimes.com",
    "washingtonpost.com",
    "wsj.com",
    "apnews.com",
    "reuters.com",
    "bloomberg.com",
    "npr.org",
    "cnn.com",
    "foxnews.com",
    "nbcnews.com",
  ],
  EU: [
    "bbc.co.uk",
    "theguardian.com",
    "ft.com",
    "reuters.com",
    "france24.com",
    "lemonde.fr",
    "spiegel.de",
    "zeit.de",
    "elpais.com",
    "corriere.it",
    "repubblica.it",
    "rte.ie",
    "politico.eu",
  ],
};

const SOURCE_COUNTRY_NAMES: Record<Region, string[]> = {
  CA: ["canada"],
  US: ["unitedstates"],
  EU: [
    "unitedkingdom",
    "france",
    "germany",
    "spain",
    "italy",
    "netherlands",
    "belgium",
    "switzerland",
    "sweden",
    "norway",
    "denmark",
    "ireland",
    "portugal",
    "austria",
    "poland",
    "finland",
    "greece",
    "czechrepublic",
    "hungary",
    "romania",
  ],
};

const DOMAINS_VERSION = "v4";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CHUNK_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PHRASE_LENGTH = 3;
const EXACT_MATCH_MIN_LENGTH = 5;
const CHUNK_SIZE = 6;
const RATE_LIMIT_MS = 5000;
const RETRY_DELAY_MS = 6000;
const MAX_RETRIES = 2;
const MAX_REQUESTS_PER_RUN = 25;

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
    console.log(`[RateLimit] Waiting ${waitTime}ms before next request`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url);

    if (response.status === 429) {
      console.log(`[RateLimit] Got 429, attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        lastRequestTime = Date.now();
        continue;
      }
      throw new Error("GDELT rate limit hit. Please try again in ~30 seconds.");
    }

    return response;
  }

  throw lastError || new Error("Request failed after retries");
}

function dateToStartDatetime(dateStr: string): string {
  const cleaned = dateStr.replace(/-/g, "");
  if (!/^\d{8}$/.test(cleaned)) {
    throw new Error(`Invalid start date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }
  return cleaned + "000000";
}

function dateToEndDatetime(dateStr: string): string {
  const cleaned = dateStr.replace(/-/g, "");
  if (!/^\d{8}$/.test(cleaned)) {
    throw new Error(`Invalid end date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }
  return cleaned + "235959";
}

function buildPhraseClause(phrase: string): string {
  const trimmed = phrase.trim();
  if (trimmed.length >= EXACT_MATCH_MIN_LENGTH) {
    return `"${trimmed}"`;
  }
  return trimmed;
}

function buildDomainClause(domains: string[]): string {
  if (domains.length === 0) return "";
  if (domains.length === 1) return `domain:${domains[0]}`;
  const domainClauses = domains.map((d) => `domain:${d}`);
  return `(${domainClauses.join(" OR ")})`;
}

function buildSourceCountryClause(countries: string[]): string {
  if (countries.length === 0) return "";
  if (countries.length === 1) return `sourcecountry:${countries[0]}`;
  const clauses = countries.map((c) => `sourcecountry:${c}`);
  return `(${clauses.join(" OR ")})`;
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

function buildQueryForDomainChunk(phrase: string, domainChunk: string[]): string {
  const phraseClause = buildPhraseClause(phrase);
  const domainClause = buildDomainClause(domainChunk);
  return `${phraseClause} ${domainClause}`;
}

function buildQueryForSourceCountryChunk(phrase: string, countryChunk: string[]): string {
  const phraseClause = buildPhraseClause(phrase);
  const countryClause = buildSourceCountryClause(countryChunk);
  return `${phraseClause} ${countryClause}`;
}

function generateChunkCacheKey(
  phrase: string,
  region: Region,
  chunkIndex: number,
  mode: RegionMode,
  startDate: string,
  endDate: string,
  chunkItems: string[]
): string {
  const payload = JSON.stringify({
    phrase: phrase.trim().toLowerCase(),
    region,
    chunkIndex,
    mode,
    startDate,
    endDate,
    chunkItems: [...chunkItems].sort(),
    version: DOMAINS_VERSION,
  });
  return btoa(payload).replace(/[+/=]/g, (c) =>
    c === "+" ? "-" : c === "/" ? "_" : ""
  );
}

function generateResponseCacheKey(
  phrases: string[],
  regions: Region[],
  mode: RegionMode,
  startDate: string,
  endDate: string,
  granularity: Granularity,
  domainLists: Record<Region, string[]>
): string {
  const normalizedPhrases = [...phrases].map(p => p.trim().toLowerCase()).sort();
  const normalizedRegions = [...regions].sort();

  const domainsHash =
    mode === "domains"
      ? JSON.stringify(normalizedRegions.map((r) => domainLists[r].sort()))
      : "";

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

  return btoa(payload).replace(/[+/=]/g, (c) =>
    c === "+" ? "-" : c === "/" ? "_" : ""
  );
}

function countChunksForRegion(region: Region, mode: RegionMode, domainLists: Record<Region, string[]>): number {
  if (mode === "domains") {
    return Math.ceil(domainLists[region].length / CHUNK_SIZE);
  } else {
    return Math.ceil(SOURCE_COUNTRY_NAMES[region].length / CHUNK_SIZE);
  }
}

function calculateTotalRequests(
  phrases: string[],
  regions: Region[],
  mode: RegionMode,
  domainLists: Record<Region, string[]>
): number {
  let total = 0;
  for (const _phrase of phrases) {
    for (const region of regions) {
      total += countChunksForRegion(region, mode, domainLists);
    }
  }
  return total;
}

interface ChunkTask {
  phrase: string;
  region: Region;
  chunkIndex: number;
  chunkItems: string[];
  cacheKey: string;
}

function buildChunkTasks(
  phrases: string[],
  regions: Region[],
  mode: RegionMode,
  domainLists: Record<Region, string[]>,
  startDate: string,
  endDate: string
): ChunkTask[] {
  const tasks: ChunkTask[] = [];

  for (const phrase of phrases) {
    for (const region of regions) {
      const items = mode === "domains" ? domainLists[region] : SOURCE_COUNTRY_NAMES[region];
      const chunks = chunkArray(items, CHUNK_SIZE);

      chunks.forEach((chunkItems, chunkIndex) => {
        const cacheKey = generateChunkCacheKey(
          phrase,
          region,
          chunkIndex,
          mode,
          startDate,
          endDate,
          chunkItems
        );
        tasks.push({ phrase, region, chunkIndex, chunkItems, cacheKey });
      });
    }
  }

  return tasks;
}

async function getChunkCache(
  supabase: SupabaseClient,
  cacheKeys: string[]
): Promise<Map<string, ChunkCacheData>> {
  const cacheMap = new Map<string, ChunkCacheData>();

  if (cacheKeys.length === 0) return cacheMap;

  const { data } = await supabase
    .from("chunk_cache")
    .select("*")
    .in("cache_key", cacheKeys);

  if (!data) return cacheMap;

  const now = Date.now();

  for (const row of data) {
    const createdAt = new Date(row.created_at).getTime();
    if (now - createdAt < CHUNK_CACHE_TTL_MS) {
      cacheMap.set(row.cache_key, row.data_json as ChunkCacheData);
    }
  }

  return cacheMap;
}

async function setChunkCache(
  supabase: SupabaseClient,
  cacheKey: string,
  data: ChunkCacheData
): Promise<void> {
  await supabase.from("chunk_cache").upsert(
    {
      cache_key: cacheKey,
      data_json: data,
      created_at: new Date().toISOString(),
    },
    { onConflict: "cache_key" }
  );
}

function mergeDataPoints(pointsList: DataPoint[][]): DataPoint[] {
  const dateMap = new Map<string, number>();

  for (const points of pointsList) {
    for (const point of points) {
      const current = dateMap.get(point.date) || 0;
      dateMap.set(point.date, current + point.value);
    }
  }

  const sortedDates = Array.from(dateMap.keys()).sort();
  return sortedDates.map((date) => ({
    date,
    value: dateMap.get(date)!,
  }));
}

function mergeSeriesSum(seriesList: SeriesData[]): SeriesData {
  if (seriesList.length === 0) {
    return { phrase: "", region: "ALL", total: 0, points: [] };
  }

  const phrase = seriesList[0].phrase;
  const allPoints = seriesList.map((s) => s.points);
  const mergedPoints = mergeDataPoints(allPoints);
  const total = mergedPoints.reduce((sum, p) => sum + p.value, 0);

  return {
    phrase,
    region: "ALL",
    total,
    points: mergedPoints,
  };
}

function formatGdeltDate(gdeltDate: string): string {
  const dateStr = String(gdeltDate);
  if (dateStr.length >= 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

function aggregatePointsByGranularity(
  points: DataPoint[],
  granularity: Granularity
): DataPoint[] {
  const buckets = new Map<string, number>();

  for (const point of points) {
    const bucketKey = getBucketKey(point.date, granularity);
    const current = buckets.get(bucketKey) || 0;
    buckets.set(bucketKey, current + point.value);
  }

  const sortedKeys = Array.from(buckets.keys()).sort();
  return sortedKeys.map((key) => ({
    date: key,
    value: buckets.get(key)!,
  }));
}

function getBucketKey(dateStr: string, granularity: Granularity): string {
  const date = new Date(dateStr);

  if (granularity === "monthly") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  }

  if (granularity === "weekly") {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    return weekStart.toISOString().split("T")[0];
  }

  return dateStr;
}

async function fetchGdeltChunk(
  query: string,
  startDatetime: string,
  endDatetime: string
): Promise<{ total: number; points: DataPoint[] }> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "timelinevolraw");
  url.searchParams.set("format", "json");
  url.searchParams.set("startdatetime", startDatetime);
  url.searchParams.set("enddatetime", endDatetime);

  const finalUrl = url.toString();
  console.log(`[GDELT] Query: ${query}`);

  const response = await rateLimitedFetch(finalUrl);
  const rawText = await response.text();

  if (!response.ok) {
    const errorSnippet = rawText.slice(0, 300);
    console.error(`[GDELT] HTTP Error ${response.status}: ${errorSnippet}`);
    throw new Error(
      `GDELT error (${response.status}): ${errorSnippet} | Query: ${query}`
    );
  }

  if (!rawText || rawText.trim().length === 0) {
    console.log(`[GDELT] Empty response for query`);
    return { total: 0, points: [] };
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    const snippet = rawText.slice(0, 300);
    console.error(`[GDELT] JSON parse error. Raw response: ${snippet}`);
    throw new Error(
      `GDELT returned non-JSON: "${snippet}..." | Query: ${query}`
    );
  }

  if (!data.timeline || data.timeline.length === 0) {
    console.log(`[GDELT] No timeline data in response`);
    return { total: 0, points: [] };
  }

  const timelineData = data.timeline[0].data || [];
  const points: DataPoint[] = timelineData.map(
    (item: { date: string; value: number }) => ({
      date: formatGdeltDate(item.date),
      value: item.value || 0,
    })
  );

  const total = points.reduce((sum, p) => sum + p.value, 0);
  console.log(`[GDELT] Success: ${points.length} points, total=${total}`);

  return { total, points };
}

async function processChunkTasks(
  tasks: ChunkTask[],
  mode: RegionMode,
  startDatetime: string,
  endDatetime: string,
  supabase: SupabaseClient
): Promise<Map<string, ChunkCacheData>> {
  const cacheKeys = tasks.map((t) => t.cacheKey);
  const cachedResults = await getChunkCache(supabase, cacheKeys);

  console.log(`[Cache] ${cachedResults.size}/${tasks.length} chunks cached`);

  const resultsMap = new Map<string, ChunkCacheData>(cachedResults);
  const uncachedTasks = tasks.filter((t) => !cachedResults.has(t.cacheKey));

  console.log(`[GDELT] Processing ${uncachedTasks.length} uncached chunks sequentially`);

  for (const task of uncachedTasks) {
    const query =
      mode === "domains"
        ? buildQueryForDomainChunk(task.phrase, task.chunkItems)
        : buildQueryForSourceCountryChunk(task.phrase, task.chunkItems);

    const result = await fetchGdeltChunk(query, startDatetime, endDatetime);

    const chunkData: ChunkCacheData = {
      phrase: task.phrase,
      region: task.region,
      chunkIndex: task.chunkIndex,
      total: result.total,
      points: result.points,
    };

    resultsMap.set(task.cacheKey, chunkData);

    await setChunkCache(supabase, task.cacheKey, chunkData);
  }

  return resultsMap;
}

function aggregateChunksToSeries(
  tasks: ChunkTask[],
  resultsMap: Map<string, ChunkCacheData>,
  granularity: Granularity
): SeriesData[] {
  const seriesMap = new Map<string, { phrase: string; region: Region; pointsList: DataPoint[][] }>();

  for (const task of tasks) {
    const key = `${task.phrase}|${task.region}`;
    const chunkData = resultsMap.get(task.cacheKey);

    if (!chunkData) continue;

    if (!seriesMap.has(key)) {
      seriesMap.set(key, { phrase: task.phrase, region: task.region, pointsList: [] });
    }

    seriesMap.get(key)!.pointsList.push(chunkData.points);
  }

  const seriesList: SeriesData[] = [];

  for (const { phrase, region, pointsList } of seriesMap.values()) {
    const mergedPoints = mergeDataPoints(pointsList);
    const aggregatedPoints = aggregatePointsByGranularity(mergedPoints, granularity);
    const total = aggregatedPoints.reduce((sum, p) => sum + p.value, 0);

    seriesList.push({ phrase, region, total, points: aggregatedPoints });
  }

  return seriesList;
}

async function testGdeltQuery(
  phrase: string,
  region: Region,
  mode: RegionMode,
  domainLists: Record<Region, string[]>,
  startDatetime: string,
  endDatetime: string
): Promise<TestResponse> {
  let query: string;

  if (mode === "domains") {
    const domains = domainLists[region];
    const firstChunk = domains.slice(0, CHUNK_SIZE);
    query = buildQueryForDomainChunk(phrase, firstChunk);
  } else {
    const countries = SOURCE_COUNTRY_NAMES[region];
    const firstChunk = countries.slice(0, CHUNK_SIZE);
    query = buildQueryForSourceCountryChunk(phrase, firstChunk);
  }

  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "timelinevolraw");
  url.searchParams.set("format", "json");
  url.searchParams.set("startdatetime", startDatetime);
  url.searchParams.set("enddatetime", endDatetime);

  const finalUrl = url.toString();

  try {
    const response = await fetch(finalUrl);
    const rawText = await response.text();

    let parsedJson: unknown | null = null;
    let error: string | null = null;

    if (!response.ok) {
      error = `HTTP ${response.status}`;
    } else {
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        error = "Failed to parse JSON";
      }
    }

    return {
      url: finalUrl,
      query,
      phrase,
      region,
      rawText: rawText.slice(0, 1000),
      parsedJson,
      error,
    };
  } catch (err) {
    return {
      url: finalUrl,
      query,
      phrase,
      region,
      rawText: "",
      parsedJson: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: FrequencyRequest = await req.json();
    const {
      phrases,
      regions,
      mode,
      startDate,
      endDate,
      granularity,
      customDomains,
      testMode,
      estimateOnly,
    } = body;

    console.log(`[Request] phrases=${JSON.stringify(phrases)}, regions=${JSON.stringify(regions)}, mode=${mode}, dates=${startDate} to ${endDate}, testMode=${testMode}, estimateOnly=${estimateOnly}`);

    if (!phrases || phrases.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one phrase is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (phrases.length > 10) {
      return new Response(
        JSON.stringify({ error: "Maximum 10 phrases allowed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    for (const phrase of phrases) {
      const trimmed = phrase.trim();
      if (trimmed.length < MIN_PHRASE_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Phrase too short (min ${MIN_PHRASE_LENGTH} chars): "${phrase}"` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (trimmed.length > 80) {
        return new Response(
          JSON.stringify({ error: `Phrase too long (max 80 chars): "${phrase.slice(0, 20)}..."` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (!regions || regions.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one region is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: "Start date and end date are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (startDate > endDate) {
      return new Response(
        JSON.stringify({ error: "Start date must be before end date" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const domainLists: Record<Region, string[]> = customDomains
      ? { ...DEFAULT_DOMAINS, ...customDomains }
      : DEFAULT_DOMAINS;

    let startDatetime: string;
    let endDatetime: string;

    try {
      startDatetime = dateToStartDatetime(startDate);
      endDatetime = dateToEndDatetime(endDate);
    } catch (dateError) {
      return new Response(
        JSON.stringify({ error: (dateError as Error).message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const totalRequests = calculateTotalRequests(phrases, regions, mode, domainLists);
    const chunkTasks = buildChunkTasks(phrases, regions, mode, domainLists, startDate, endDate);
    const cachedChunks = await getChunkCache(supabase, chunkTasks.map((t) => t.cacheKey));
    const newRequests = chunkTasks.filter((t) => !cachedChunks.has(t.cacheKey)).length;

    if (estimateOnly) {
      const estimate: EstimateResponse = {
        totalRequests,
        cachedRequests: totalRequests - newRequests,
        newRequests,
        estimatedTimeSeconds: newRequests * 5,
        exceedsLimit: newRequests > MAX_REQUESTS_PER_RUN,
        maxRequests: MAX_REQUESTS_PER_RUN,
      };

      return new Response(JSON.stringify(estimate), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newRequests > MAX_REQUESTS_PER_RUN) {
      return new Response(
        JSON.stringify({
          error: `This query requires ${newRequests} new GDELT requests, but the maximum is ${MAX_REQUESTS_PER_RUN}. Please reduce the number of phrases or regions.`,
          code: "TOO_MANY_REQUESTS",
          newRequests,
          maxRequests: MAX_REQUESTS_PER_RUN,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (testMode) {
      const firstPhrase = phrases[0];
      const firstRegion = regions[0];

      const testResult = await testGdeltQuery(
        firstPhrase,
        firstRegion,
        mode,
        domainLists,
        startDatetime,
        endDatetime
      );

      return new Response(JSON.stringify(testResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseCacheKey = generateResponseCacheKey(
      phrases,
      regions,
      mode,
      startDate,
      endDate,
      granularity,
      domainLists
    );

    const { data: cachedResponse } = await supabase
      .from("frequency_cache")
      .select("*")
      .eq("cache_key", responseCacheKey)
      .maybeSingle();

    if (cachedResponse) {
      const createdAt = new Date(cachedResponse.created_at).getTime();
      const now = Date.now();

      if (now - createdAt < CACHE_TTL_MS) {
        console.log(`[Cache] Full response cache hit`);
        return new Response(JSON.stringify(cachedResponse.response_json), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[GDELT] Processing ${chunkTasks.length} total chunks (${newRequests} new requests)`);

    const resultsMap = await processChunkTasks(
      chunkTasks,
      mode,
      startDatetime,
      endDatetime,
      supabase
    );

    const seriesResults = aggregateChunksToSeries(chunkTasks, resultsMap, granularity);

    const allSeries: SeriesData[] = [...seriesResults];

    if (regions.length > 1) {
      for (const phrase of phrases) {
        const phraseSeries = seriesResults.filter((s) => s.phrase === phrase);
        const combinedSeries = mergeSeriesSum(phraseSeries);
        allSeries.push(combinedSeries);
      }
    }

    const response: FrequencyResponse = {
      meta: {
        startDatetime,
        endDatetime,
        granularity,
        regions,
        mode,
      },
      series: allSeries,
    };

    await supabase.from("frequency_cache").upsert(
      {
        cache_key: responseCacheKey,
        response_json: response,
        created_at: new Date().toISOString(),
        domains_version: DOMAINS_VERSION,
      },
      { onConflict: "cache_key" }
    );

    console.log(`[Response] Success with ${allSeries.length} series`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const isRateLimit = errorMessage.includes("rate limit");
    console.error(`[Error] ${errorMessage}`);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        code: isRateLimit ? "RATE_LIMIT" : "SERVER_ERROR",
      }),
      {
        status: isRateLimit ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
