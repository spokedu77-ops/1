'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import type { Tone } from './types';

export default function ToneChip({
  value,
  current,
  label,
  onClick,
}: {
  value: Tone;
  current: Tone;
  label: string;
  onClick: () => void;
}) {
  const t = useTranslator();
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
        active
          ? 'border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-500/20'
          : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-300'
      }`}
    >
      {t(label)}
    </button>
  );
}
