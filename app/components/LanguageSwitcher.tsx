'use client';

import { LOCALE_LABELS, SUPPORTED_LOCALES, isUiLocale, type UiLocale } from '@/app/lib/i18n/constants';
import { useI18n } from '@/app/providers/I18nProvider';

type Props = {
  className?: string;
  variant?: 'default' | 'dark';
};

export function LanguageSwitcher({ className = '', variant = 'default' }: Props) {
  const { locale, setLocale } = useI18n();

  const base =
    variant === 'dark'
      ? 'rounded-lg border border-slate-600 bg-slate-800/80 px-2 py-1.5 text-xs font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500'
      : 'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <select
      className={`${base} ${className}`}
      value={locale}
      aria-label="언어 선택"
      onChange={(e) => {
        const value = e.target.value;
        if (isUiLocale(value)) setLocale(value);
      }}
    >
      {(SUPPORTED_LOCALES as readonly UiLocale[]).map((loc) => (
        <option key={loc} value={loc}>
          {LOCALE_LABELS[loc]}
        </option>
      ))}
    </select>
  );
}
