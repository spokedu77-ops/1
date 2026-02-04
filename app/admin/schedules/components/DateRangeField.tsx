'use client';

interface DateRangeFieldProps {
  startDate: string | null;
  endDate: string | null;
  onStartChange: (v: string | null) => void;
  onEndChange: (v: string | null) => void;
  disabled?: boolean;
}

export function DateRangeField({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  disabled,
}: DateRangeFieldProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="date"
        value={startDate ?? ''}
        onChange={(e) => onStartChange(e.target.value || null)}
        disabled={disabled}
        className="rounded border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
      />
      <span className="text-slate-400 text-sm">~</span>
      <input
        type="date"
        value={endDate ?? ''}
        onChange={(e) => onEndChange(e.target.value || null)}
        disabled={disabled}
        className="rounded border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
      />
    </div>
  );
}
