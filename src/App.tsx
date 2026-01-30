import { useState, useEffect, useCallback } from 'react';
import { Download, Info, Loader2, AlertCircle, ChevronDown, ChevronUp, Bug, RefreshCw, Clock } from 'lucide-react';
import type {
  Region,
  RegionMode,
  Granularity,
  CompareMode,
  FrequencyResponse,
  DomainLists,
  ApiError,
  EstimateResponse,
} from './types';
import { DEFAULT_DOMAINS } from './constants/domains';
import { exportToCsv, downloadCsv } from './lib/helpers';
import { fetchFrequencyData, fetchEstimate, testGdeltQuery, TestQueryResponse } from './lib/api';
import { PhraseInput, MIN_PHRASE_LENGTH, getPhraseMatchType } from './components/PhraseInput';
import { RegionSelect } from './components/RegionSelect';
import { ModeToggle } from './components/ModeToggle';
import { DateRangePicker } from './components/DateRangePicker';
import { GranularitySelect } from './components/GranularitySelect';
import { DomainsEditor } from './components/DomainsEditor';
import { SummaryCards } from './components/SummaryCards';
import { FrequencyChart } from './components/FrequencyChart';
import { DataTable } from './components/DataTable';
import { CompareModeToggle } from './components/CompareModeToggle';
import { AboutModal } from './components/AboutModal';
import { WordPiggyLogo } from './components/WordPiggyLogo';
import { QueryPreview } from './components/QueryPreview';

const MAX_PHRASES = 10;
const MAX_PHRASE_LENGTH = 80;
const MIN_DATE = '2017-01-01';
const IS_DEV = import.meta.env.DEV;

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${seconds} seconds`;
  const mins = Math.ceil(seconds / 60);
  return `~${mins} minute${mins > 1 ? 's' : ''}`;
}

function App() {
  const defaultDates = getDefaultDates();

  const [phrases, setPhrases] = useState<string[]>([]);
  const [regions, setRegions] = useState<Region[]>(['US']);
  const [mode, setMode] = useState<RegionMode>('domains');
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [domains, setDomains] = useState<DomainLists>({ ...DEFAULT_DOMAINS });

  const [results, setResults] = useState<FrequencyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const [compareMode, setCompareMode] = useState<CompareMode>('phrase');
  const [showAbout, setShowAbout] = useState(false);

  const [testResult, setTestResult] = useState<TestQueryResponse | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const dateWarning = startDate && startDate < MIN_DATE
    ? 'GDELT data before 2017 may be incomplete or unavailable.'
    : null;

  const dateError = startDate && endDate && startDate > endDate
    ? 'Start date must be before end date.'
    : null;

  const phraseErrors: string[] = [];
  if (phrases.length > MAX_PHRASES) {
    phraseErrors.push(`Maximum ${MAX_PHRASES} phrases allowed.`);
  }
  phrases.forEach((p, i) => {
    if (p.trim().length < MIN_PHRASE_LENGTH) {
      phraseErrors.push(`Phrase ${i + 1} is too short (min ${MIN_PHRASE_LENGTH} chars).`);
    }
    if (p.length > MAX_PHRASE_LENGTH) {
      phraseErrors.push(`Phrase ${i + 1} exceeds ${MAX_PHRASE_LENGTH} characters.`);
    }
  });

  const hasValidPhrases = phrases.length > 0 && phrases.every(p => getPhraseMatchType(p) !== 'too-short');

  const canRun = hasValidPhrases &&
    phrases.length <= MAX_PHRASES &&
    phraseErrors.length === 0 &&
    regions.length > 0 &&
    startDate &&
    endDate &&
    !dateError &&
    (!estimate || !estimate.exceedsLimit);

  const loadEstimate = useCallback(async () => {
    if (!hasValidPhrases || regions.length === 0 || !startDate || !endDate || dateError) {
      setEstimate(null);
      return;
    }

    setIsEstimating(true);
    try {
      const est = await fetchEstimate({
        phrases,
        regions,
        mode,
        startDate,
        endDate,
        granularity,
        customDomains: mode === 'domains' ? domains : undefined,
      });
      setEstimate(est);
    } catch {
      setEstimate(null);
    } finally {
      setIsEstimating(false);
    }
  }, [phrases, regions, mode, startDate, endDate, granularity, domains, hasValidPhrases, dateError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEstimate();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadEstimate]);

  const handleRun = async () => {
    if (!canRun) return;

    setIsLoading(true);
    setError(null);
    setResults(null);
    setShowErrorDetails(false);
    setTestResult(null);

    try {
      const response = await fetchFrequencyData({
        phrases,
        regions,
        mode,
        startDate,
        endDate,
        granularity,
        customDomains: mode === 'domains' ? domains : undefined,
      });
      setResults(response);
      loadEstimate();
    } catch (err) {
      const typedErr = err as Error & { code?: string };
      const errorObj: ApiError = {
        message: typedErr.message || 'An error occurred',
        code: typedErr.code,
        details: {
          phrases,
          regions,
          startDate,
          endDate,
          mode,
        },
      };
      setError(errorObj);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestQuery = async () => {
    if (phrases.length === 0 || regions.length === 0) return;

    setIsTestLoading(true);
    setTestResult(null);

    try {
      const result = await testGdeltQuery({
        phrases: [phrases[0]],
        regions: [regions[0]],
        mode,
        startDate,
        endDate,
        customDomains: mode === 'domains' ? domains : undefined,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        url: '',
        query: '',
        phrase: phrases[0],
        region: regions[0],
        rawText: '',
        parsedJson: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!results) return;

    const filteredSeries = compareMode === 'phrase'
      ? results.series.filter(s => s.region === 'ALL' || results.series.filter(x => x.phrase === s.phrase).length === 1)
      : results.series.filter(s => s.region !== 'ALL');

    const csv = exportToCsv(filteredSeries, granularity);
    const filename = `wordpiggy-${startDate}-${endDate}.csv`;
    downloadCsv(csv, filename);
  };

  const isRateLimitError = error?.code === 'RATE_LIMIT';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WordPiggyLogo size={40} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Word Piggy</h1>
                <p className="text-xs text-gray-500">GDELT Phrase Frequency Analysis</p>
              </div>
            </div>
            <button
              onClick={() => setShowAbout(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Info className="h-4 w-4" />
              About
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5 sticky top-6">
              <PhraseInput phrases={phrases} onChange={setPhrases} />
              <RegionSelect selectedRegions={regions} onChange={setRegions} />
              <ModeToggle mode={mode} onChange={setMode} />
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
              <GranularitySelect granularity={granularity} onChange={setGranularity} />

              {mode === 'domains' && (
                <DomainsEditor domains={domains} onChange={setDomains} />
              )}

              {phrases.length > 0 && regions.length > 0 && (
                <QueryPreview
                  phrase={phrases[0]}
                  region={regions[0]}
                  mode={mode}
                  domains={domains}
                />
              )}

              {estimate && !isEstimating && (
                <div className={`rounded-lg p-3 text-xs ${estimate.exceedsLimit ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className={`h-3.5 w-3.5 ${estimate.exceedsLimit ? 'text-red-500' : 'text-blue-500'}`} />
                    <span className={`font-medium ${estimate.exceedsLimit ? 'text-red-700' : 'text-blue-700'}`}>
                      Request Estimate
                    </span>
                  </div>
                  <div className={estimate.exceedsLimit ? 'text-red-600' : 'text-blue-600'}>
                    {estimate.newRequests === 0 ? (
                      <span>All data cached - instant results</span>
                    ) : (
                      <>
                        <span>{estimate.newRequests} GDELT request{estimate.newRequests !== 1 ? 's' : ''} needed</span>
                        {estimate.cachedRequests > 0 && (
                          <span className="text-blue-500"> ({estimate.cachedRequests} cached)</span>
                        )}
                        <br />
                        <span className="text-slate-500">
                          Rate limited: {formatDuration(estimate.estimatedTimeSeconds)}
                        </span>
                      </>
                    )}
                  </div>
                  {estimate.exceedsLimit && (
                    <div className="mt-2 text-red-700 font-medium">
                      Exceeds limit of {estimate.maxRequests} requests. Reduce phrases or regions.
                    </div>
                  )}
                </div>
              )}

              {dateWarning && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  {dateWarning}
                </div>
              )}

              {dateError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  {dateError}
                </div>
              )}

              {phraseErrors.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 space-y-1">
                  {phraseErrors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}

              <button
                onClick={handleRun}
                disabled={!canRun || isLoading}
                className="w-full rounded-lg bg-rose-500 px-4 py-3 text-sm font-medium text-white hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Run Analysis'
                )}
              </button>

              {IS_DEV && (
                <button
                  onClick={handleTestQuery}
                  disabled={phrases.length === 0 || regions.length === 0 || isTestLoading}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isTestLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Bug className="h-3 w-3" />
                      Test Query (Dev)
                    </>
                  )}
                </button>
              )}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {testResult && IS_DEV && (
              <div className="bg-gray-800 text-gray-100 rounded-xl p-4 mb-6 font-mono text-xs overflow-auto">
                <div className="flex items-center gap-2 mb-3 text-amber-400">
                  <Bug className="h-4 w-4" />
                  <span className="font-semibold">Test Query Result</span>
                  <button
                    onClick={() => setTestResult(null)}
                    className="ml-auto text-gray-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2">
                  <div><span className="text-gray-400">Phrase:</span> {testResult.phrase}</div>
                  <div><span className="text-gray-400">Region:</span> {testResult.region}</div>
                  <div><span className="text-gray-400">Query:</span> {testResult.query}</div>
                  <div className="break-all"><span className="text-gray-400">URL:</span> {testResult.url}</div>
                  {testResult.error && (
                    <div className="text-red-400"><span className="text-gray-400">Error:</span> {testResult.error}</div>
                  )}
                  <div>
                    <span className="text-gray-400">Raw Response (first 1000 chars):</span>
                    <pre className="mt-1 p-2 bg-gray-900 rounded overflow-auto max-h-40 whitespace-pre-wrap">
                      {testResult.rawText || '(empty)'}
                    </pre>
                  </div>
                  {testResult.parsedJson && (
                    <div>
                      <span className="text-gray-400">Parsed JSON:</span>
                      <pre className="mt-1 p-2 bg-gray-900 rounded overflow-auto max-h-40">
                        {JSON.stringify(testResult.parsedJson, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className={`border rounded-xl p-4 mb-6 ${isRateLimitError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isRateLimitError ? 'text-amber-500' : 'text-red-500'}`} />
                  <div className="flex-1">
                    <h3 className={`text-sm font-medium ${isRateLimitError ? 'text-amber-800' : 'text-red-800'}`}>
                      {isRateLimitError ? 'Rate limit reached' : 'GDELT request failed'}
                    </h3>
                    <p className={`text-sm mt-1 ${isRateLimitError ? 'text-amber-700' : 'text-red-700'}`}>{error.message}</p>

                    {isRateLimitError && (
                      <button
                        onClick={handleRun}
                        disabled={isLoading}
                        className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                      </button>
                    )}

                    {!isRateLimitError && (
                      <button
                        onClick={() => setShowErrorDetails(!showErrorDetails)}
                        className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:text-red-800 transition-colors"
                      >
                        {showErrorDetails ? (
                          <>
                            <ChevronUp className="h-3 w-3" />
                            Hide details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            Show details
                          </>
                        )}
                      </button>
                    )}
                    {showErrorDetails && error.details && !isRateLimitError && (
                      <div className="mt-3 p-3 bg-red-100 rounded-lg text-xs font-mono text-red-800 space-y-1 overflow-x-auto">
                        <div><span className="font-semibold">Phrases:</span> {error.details.phrases?.join(', ') || 'N/A'}</div>
                        <div><span className="font-semibold">Regions:</span> {error.details.regions?.join(', ') || 'N/A'}</div>
                        <div><span className="font-semibold">Date range:</span> {error.details.startDate} to {error.details.endDate}</div>
                        <div><span className="font-semibold">Mode:</span> {error.details.mode}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!results && !isLoading && !error && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="mx-auto mb-4 opacity-50">
                  <WordPiggyLogo size={64} />
                </div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to analyze
                </h2>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Enter one or more phrases, select regions and a date range,
                  then click "Run Analysis" to see phrase frequency trends over time.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Loader2 className="h-12 w-12 text-rose-500 animate-spin mx-auto mb-4" />
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Analyzing phrases...
                </h2>
                <p className="text-sm text-gray-500 mb-3">
                  Querying GDELT for phrase frequency data.
                </p>
                {estimate && estimate.newRequests > 0 && (
                  <p className="text-xs text-slate-400">
                    Processing {estimate.newRequests} request{estimate.newRequests !== 1 ? 's' : ''} (rate limited to 1 per 5 seconds)
                  </p>
                )}
              </div>
            )}

            {results && (
              <div className="space-y-6">
                <SummaryCards series={results.series} phrases={phrases} />

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Frequency Over Time
                    </h3>
                    <div className="flex items-center gap-4">
                      <CompareModeToggle
                        mode={compareMode}
                        onChange={setCompareMode}
                        disabled={regions.length < 2}
                      />
                      <button
                        onClick={handleExportCsv}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <FrequencyChart
                      series={results.series}
                      granularity={granularity}
                      compareMode={compareMode}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">
                      Data Table
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    <DataTable
                      series={results.series}
                      granularity={granularity}
                      compareMode={compareMode}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}

export default App;
