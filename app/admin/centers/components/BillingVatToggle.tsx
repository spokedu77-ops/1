'use client';

export type BillingVatMode = 'included' | 'excluded' | 'none';

export default function BillingVatToggle({ mode, onChange }: {
  mode: BillingVatMode;
  onChange: (mode: BillingVatMode) => void;
}) {
  return <div role="group" aria-label="청구 수업료 부가세 포함 여부" className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
    {([{ value: 'included', label: '부가세 포함' }, { value: 'excluded', label: '별도 +10%' }, { value: 'none', label: '부가세 없음' }] as const).map(({ value, label }) => <button
      key={label}
      type="button"
      aria-pressed={mode === value}
      onClick={() => onChange(value)}
      className={`min-h-8 shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === value ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'}`}
    >{label}</button>)}
  </div>;
}
