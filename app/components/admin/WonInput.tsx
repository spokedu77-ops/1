'use client';

import type { InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
};

export function WonInput({ value, onValueChange, className = '', ...props }: Props) {
  return <span className="relative block min-w-0">
    <input {...props} type="text" inputMode="numeric" value={value == null ? '' : value.toLocaleString('ko-KR')}
      className={`${className} pr-8 tabular-nums`} onChange={event => {
        const raw = event.target.value.replace(/[,\s원]/g, '');
        if (!raw) { onValueChange(null); return; }
        if (!/^\d+$/.test(raw)) return;
        const parsed = Number(raw);
        if (Number.isSafeInteger(parsed)) onValueChange(parsed);
      }} />
    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">원</span>
  </span>;
}
