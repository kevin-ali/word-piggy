import { useState } from 'react';
import { ChevronDown, ChevronUp, X, Plus, RotateCcw } from 'lucide-react';
import type { Region, DomainLists } from '../types';
import { DEFAULT_DOMAINS, REGION_LABELS } from '../constants/domains';

interface DomainsEditorProps {
  domains: DomainLists;
  onChange: (domains: DomainLists) => void;
}

export function DomainsEditor({ domains, onChange }: DomainsEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newDomains, setNewDomains] = useState<Record<Region, string>>({
    CA: '',
    US: '',
    EU: '',
  });

  const addDomain = (region: Region) => {
    const domain = newDomains[region].trim().toLowerCase();
    if (domain && !domains[region].includes(domain)) {
      onChange({
        ...domains,
        [region]: [...domains[region], domain],
      });
      setNewDomains({ ...newDomains, [region]: '' });
    }
  };

  const removeDomain = (region: Region, domain: string) => {
    onChange({
      ...domains,
      [region]: domains[region].filter(d => d !== domain),
    });
  };

  const resetToDefaults = () => {
    onChange({ ...DEFAULT_DOMAINS });
  };

  const regions: Region[] = ['CA', 'US', 'EU'];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          Advanced: Edit Domain Lists
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={resetToDefaults}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to defaults
            </button>
          </div>

          {regions.map(region => (
            <div key={region} className="space-y-2">
              <label className="block text-xs font-medium text-gray-600">
                {REGION_LABELS[region]}
              </label>
              <div className="flex flex-wrap gap-1">
                {domains[region].map(domain => (
                  <span
                    key={domain}
                    className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                  >
                    {domain}
                    <button
                      type="button"
                      onClick={() => removeDomain(region, domain)}
                      className="rounded-full p-0.5 hover:bg-gray-200 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newDomains[region]}
                  onChange={(e) => setNewDomains({ ...newDomains, [region]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDomain(region);
                    }
                  }}
                  placeholder="Add domain..."
                  className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => addDomain(region)}
                  disabled={!newDomains[region].trim()}
                  className="rounded bg-gray-100 px-2 py-1 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
