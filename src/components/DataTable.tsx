import type { SeriesData, CompareMode, Granularity } from '../types';
import { REGION_LABELS } from '../constants/domains';
import { formatDateForDisplay } from '../lib/helpers';

interface DataTableProps {
  series: SeriesData[];
  granularity: Granularity;
  compareMode: CompareMode;
}

export function DataTable({ series, granularity, compareMode }: DataTableProps) {
  const filteredSeries = compareMode === 'phrase'
    ? series.filter(s => s.region === 'ALL' || series.filter(x => x.phrase === s.phrase).length === 1)
    : series.filter(s => s.region !== 'ALL');

  const allDates = new Set<string>();
  filteredSeries.forEach(s => s.points.forEach(p => allDates.add(p.date)));
  const sortedDates = Array.from(allDates).sort();

  const columns = filteredSeries.map(s =>
    compareMode === 'phrase'
      ? s.phrase
      : `${s.phrase} (${REGION_LABELS[s.region as keyof typeof REGION_LABELS]})`
  );

  if (sortedDates.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No data to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700 bg-gray-50 sticky left-0">
              Date
            </th>
            {columns.map(col => (
              <th
                key={col}
                className="text-right py-3 px-4 font-medium text-gray-700 bg-gray-50 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedDates.map((date, idx) => (
            <tr
              key={date}
              className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              <td className="py-2 px-4 text-gray-600 sticky left-0 bg-inherit whitespace-nowrap">
                {formatDateForDisplay(date, granularity)}
              </td>
              {filteredSeries.map((s, sIdx) => {
                const point = s.points.find(p => p.date === date);
                return (
                  <td
                    key={`${date}-${sIdx}`}
                    className="py-2 px-4 text-right text-gray-900 tabular-nums"
                  >
                    {(point?.value ?? 0).toLocaleString()}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
