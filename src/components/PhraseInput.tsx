import { useState, KeyboardEvent } from 'react';
import { X, Plus, AlertTriangle } from 'lucide-react';

const MIN_PHRASE_LENGTH = 3;
const EXACT_MATCH_MIN_LENGTH = 5;

interface PhraseInputProps {
  phrases: string[];
  onChange: (phrases: string[]) => void;
}

function getPhraseMatchType(phrase: string): 'exact' | 'broad' | 'too-short' {
  const trimmed = phrase.trim();
  if (trimmed.length < MIN_PHRASE_LENGTH) return 'too-short';
  if (trimmed.length < EXACT_MATCH_MIN_LENGTH) return 'broad';
  return 'exact';
}

export function PhraseInput({ phrases, onChange }: PhraseInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addPhrase = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !phrases.includes(trimmed)) {
      onChange([...phrases, trimmed]);
      setInputValue('');
    }
  };

  const removePhrase = (phrase: string) => {
    onChange(phrases.filter(p => p !== phrase));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPhrase();
    }
  };

  const hasBroadMatch = phrases.some(p => getPhraseMatchType(p) === 'broad');
  const hasTooShort = phrases.some(p => getPhraseMatchType(p) === 'too-short');

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Search Phrases
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a phrase..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
        />
        <button
          type="button"
          onClick={addPhrase}
          disabled={!inputValue.trim()}
          className="rounded-lg bg-rose-500 px-3 py-2 text-white hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      {phrases.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {phrases.map(phrase => {
            const matchType = getPhraseMatchType(phrase);
            const isBroad = matchType === 'broad';
            const isTooShort = matchType === 'too-short';

            return (
              <span
                key={phrase}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                  isTooShort
                    ? 'bg-red-100 text-red-800'
                    : isBroad
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {phrase}
                {isBroad && (
                  <span className="ml-1 text-[10px] font-medium bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                    BROAD
                  </span>
                )}
                {isTooShort && (
                  <span className="ml-1 text-[10px] font-medium bg-red-200 text-red-900 px-1.5 py-0.5 rounded">
                    TOO SHORT
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhrase(phrase)}
                  className={`rounded-full p-0.5 transition-colors ${
                    isTooShort
                      ? 'hover:bg-red-200'
                      : isBroad
                      ? 'hover:bg-amber-200'
                      : 'hover:bg-rose-200'
                  }`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {hasTooShort && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>Phrases must be at least {MIN_PHRASE_LENGTH} characters.</span>
        </div>
      )}

      {hasBroadMatch && !hasTooShort && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Short phrases (3-4 chars) use broad matching and may produce noisy results.
            Phrases with 5+ characters use exact phrase matching.
          </span>
        </div>
      )}

      {phrases.length === 0 && (
        <p className="text-xs text-gray-500">Add at least one phrase to search</p>
      )}
    </div>
  );
}

export { MIN_PHRASE_LENGTH, EXACT_MATCH_MIN_LENGTH, getPhraseMatchType };
