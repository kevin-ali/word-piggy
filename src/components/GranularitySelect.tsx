import type { Granularity } from '../types';

interface GranularitySelectProps {
  granularity: Granularity;
  onChange: (granularity: Granularity) => void;
}

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function GranularitySelect({ granularity, onChange }: GranularitySelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Granularity
      </label>
      <select
        value={granularity}
        onChange={(e) => onChange(e.target.value as Granularity)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
      >
        {OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
