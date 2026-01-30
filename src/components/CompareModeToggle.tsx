import type { CompareMode } from '../types';

interface CompareModeToggleProps {
  mode: CompareMode;
  onChange: (mode: CompareMode) => void;
  disabled?: boolean;
}

export function CompareModeToggle({ mode, onChange, disabled }: CompareModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Compare by:</span>
      <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
        <button
          type="button"
          onClick={() => onChange('phrase')}
          disabled={disabled}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            mode === 'phrase'
              ? 'bg-white text-sky-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          } disabled:opacity-50`}
        >
          Phrase
        </button>
        <button
          type="button"
          onClick={() => onChange('phrase-region')}
          disabled={disabled}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            mode === 'phrase-region'
              ? 'bg-white text-sky-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          } disabled:opacity-50`}
        >
          Phrase + Region
        </button>
      </div>
    </div>
  );
}
