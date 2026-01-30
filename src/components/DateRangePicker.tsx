import { AlertTriangle } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  const minDate = '2017-01-01';
  const today = new Date().toISOString().split('T')[0];

  const startYear = startDate ? new Date(startDate).getFullYear() : 2020;
  const showWarning = startYear < 2017;

  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate) : null;

  let rangeWarning = '';
  if (startDateObj && endDateObj) {
    const diffYears = (endDateObj.getTime() - startDateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (diffYears > 5) {
      rangeWarning = 'Date range exceeds 5 years. Results may be limited.';
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Date Range
      </label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            min={minDate}
            max={endDate || today}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate || minDate}
            max={today}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>
      {showWarning && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>GDELT DOC API data before 2017 may be limited or unavailable.</span>
        </div>
      )}
      {rangeWarning && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{rangeWarning}</span>
        </div>
      )}
    </div>
  );
}
