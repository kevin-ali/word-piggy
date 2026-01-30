import type { RegionMode } from '../types';

interface ModeToggleProps {
  mode: RegionMode;
  onChange: (mode: RegionMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Region Filter Mode
      </label>
      <div className="flex rounded-lg border border-gray-300 p-1 bg-gray-50">
        <button
          type="button"
          onClick={() => onChange('domains')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'domains'
              ? 'bg-white text-sky-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Major Outlets
        </button>
        <button
          type="button"
          onClick={() => onChange('sourcecountry')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'sourcecountry'
              ? 'bg-white text-sky-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Broad Region
        </button>
      </div>
      <p className="text-xs text-gray-500">
        {mode === 'domains'
          ? 'Search only curated major publications per region'
          : 'Search all sources by country code'}
      </p>
    </div>
  );
}
