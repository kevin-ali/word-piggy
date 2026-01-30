import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import type { SeriesData, Region } from '../types';
import { REGION_LABELS } from '../constants/domains';

interface SummaryCardsProps {
  series: SeriesData[];
  phrases: string[];
}

export function SummaryCards({ series, phrases }: SummaryCardsProps) {
  const [expandedPhrase, setExpandedPhrase] = useState<string | null>(null);

  const getPhraseTotals = (phrase: string) => {
    const phraseSeries = series.filter(s => s.phrase === phrase);
    const allRegion = phraseSeries.find(s => s.region === 'ALL');
    const regionTotals = phraseSeries
      .filter(s => s.region !== 'ALL')
      .map(s => ({ region: s.region as Region, total: s.total }));

    return {
      total: allRegion?.total ?? regionTotals.reduce((sum, r) => sum + r.total, 0),
      byRegion: regionTotals,
    };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Total Mentions
      </h3>
      <div className="grid gap-3">
        {phrases.map(phrase => {
          const { total, byRegion } = getPhraseTotals(phrase);
          const isExpanded = expandedPhrase === phrase;

          return (
            <div
              key={phrase}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedPhrase(isExpanded ? null : phrase)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm text-gray-600">{phrase}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(total)}
                  </p>
                </div>
                {byRegion.length > 0 && (
                  isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )
                )}
              </button>

              {isExpanded && byRegion.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <div className="space-y-2">
                    {byRegion.map(({ region, total: regionTotal }) => (
                      <div
                        key={region}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600">{REGION_LABELS[region]}</span>
                        <span className="font-medium text-gray-900">
                          {formatNumber(regionTotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
