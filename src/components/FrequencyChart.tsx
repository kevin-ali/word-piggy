import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SeriesData, CompareMode, Granularity } from '../types';
import { REGION_LABELS } from '../constants/domains';
import { formatDateForDisplay } from '../lib/helpers';

interface FrequencyChartProps {
  series: SeriesData[];
  granularity: Granularity;
  compareMode: CompareMode;
}

const COLORS = [
  '#0284c7',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
  '#4f46e5',
];

export function FrequencyChart({ series, granularity, compareMode }: FrequencyChartProps) {
  const filteredSeries = compareMode === 'phrase'
    ? series.filter(s => s.region === 'ALL' || series.filter(x => x.phrase === s.phrase).length === 1)
    : series.filter(s => s.region !== 'ALL');

  const allDates = new Set<string>();
  filteredSeries.forEach(s => s.points.forEach(p => allDates.add(p.date)));
  const sortedDates = Array.from(allDates).sort();

  const chartData = sortedDates.map(date => {
    const dataPoint: Record<string, string | number> = {
      date,
      displayDate: formatDateForDisplay(date, granularity),
    };

    filteredSeries.forEach((s, idx) => {
      const key = compareMode === 'phrase'
        ? s.phrase
        : `${s.phrase} (${REGION_LABELS[s.region as keyof typeof REGION_LABELS]})`;
      const point = s.points.find(p => p.date === date);
      dataPoint[key] = point?.value ?? 0;
    });

    return dataPoint;
  });

  const seriesKeys = filteredSeries.map((s, idx) =>
    compareMode === 'phrase'
      ? s.phrase
      : `${s.phrase} (${REGION_LABELS[s.region as keyof typeof REGION_LABELS]})`
  );

  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No data to display
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            angle={-45}
            textAnchor="end"
            height={70}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return value;
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [value.toLocaleString(), '']}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
          {seriesKeys.map((key, idx) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
