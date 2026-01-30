import { Check } from 'lucide-react';
import type { Region } from '../types';
import { REGION_LABELS } from '../constants/domains';

interface RegionSelectProps {
  selectedRegions: Region[];
  onChange: (regions: Region[]) => void;
}

const REGIONS: Region[] = ['CA', 'US', 'EU'];

export function RegionSelect({ selectedRegions, onChange }: RegionSelectProps) {
  const toggleRegion = (region: Region) => {
    if (selectedRegions.includes(region)) {
      onChange(selectedRegions.filter(r => r !== region));
    } else {
      onChange([...selectedRegions, region]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Regions
      </label>
      <div className="space-y-1">
        {REGIONS.map(region => (
          <button
            key={region}
            type="button"
            onClick={() => toggleRegion(region)}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              selectedRegions.includes(region)
                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>{REGION_LABELS[region]}</span>
            {selectedRegions.includes(region) && (
              <Check className="h-4 w-4 text-sky-600" />
            )}
          </button>
        ))}
      </div>
      {selectedRegions.length === 0 && (
        <p className="text-xs text-gray-500">Select at least one region</p>
      )}
    </div>
  );
}
