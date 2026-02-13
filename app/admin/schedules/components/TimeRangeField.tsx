'use client';

interface TimeRangeFieldProps {
  startTime: string | null;
  endTime: string | null;
  onStartChange: (v: string | null) => void;
  onEndChange: (v: string | null) => void;
  disabled?: boolean;
}

export function TimeRangeField({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  disabled,
}: TimeRangeFieldProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="time"
        value={startTime ?? ''}
        onChange={(e) => onStartChange(e.target.value || null)}
        disabled={disabled}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
      />
      <span className="text-slate-400 text-sm">~</span>
      <input
        type="time"
        value={endTime ?? ''}
        onChange={(e) => onEndChange(e.target.value || null)}
        disabled={disabled}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
      />
    </div>
  );
}
