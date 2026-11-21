'use client';

import { useId, type KeyboardEvent } from 'react';
import { DIVE_THEME_UI, hasDivePanorama, type DiveActiveThemeId, type DiveThemeEntry, type DiveThemeId, type DivePanoramaStatus } from '@/app/lib/spomove/diveThemes';
import { useSpomoveDiveEnvironments } from '@/app/lib/admin/hooks/useSpomoveDiveEnvironments';

export function DiveEnvironmentSelector({ value, onChange }: { value: DiveThemeId; onChange: (theme: DiveActiveThemeId) => void }) {
  const { data, loading } = useSpomoveDiveEnvironments();
  return <DiveThemeSelector value={value} onChange={onChange} themes={data.themes} loading={loading} />;
}

export function DiveThemeSelector({ value, onChange, tabs = false, disabled = false, themes, loading = false }: {
  value: DiveThemeId;
  onChange: (theme: DiveActiveThemeId) => void;
  tabs?: boolean;
  disabled?: boolean;
  themes?: Partial<Record<DiveThemeId, DiveThemeEntry>>;
  loading?: boolean;
}) {
  const id = useId();
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!tabs || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? DIVE_THEME_UI.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + DIVE_THEME_UI.length) % DIVE_THEME_UI.length;
    onChange(DIVE_THEME_UI[next].id);
    const button = document.getElementById(`${id}-${DIVE_THEME_UI[next].id}`);
    button?.focus(); button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  return <div className="min-w-0" data-dive-theme-selector>
    <div role={tabs ? 'tablist' : 'group'} aria-label="DIVE 환경 테마" className="flex max-w-full gap-2 overflow-x-auto pb-2">
      {DIVE_THEME_UI.map(({ id: theme, label }, index) => <button key={theme} id={`${id}-${theme}`} type="button"
        role={tabs ? 'tab' : undefined} aria-selected={tabs ? value === theme : undefined}
        aria-pressed={tabs ? undefined : value === theme} tabIndex={tabs && value !== theme ? -1 : 0}
        disabled={disabled} onClick={() => onChange(theme)} onKeyDown={event => onKeyDown(event, index)}
        className={`min-h-11 shrink-0 rounded-xl border px-5 text-sm font-bold disabled:opacity-50 ${value === theme ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100' : 'border-white/15 bg-black/20 text-white/65'}`}>
        {label}
      </button>)}
    </div>
    {!loading && themes && !hasDivePanorama(themes[value]) ? <p className="mt-1 text-xs text-amber-200">{value === 'ocean' ? 'OCEAN' : 'SPACE'} · 파노라마 미등록 — 기본 배경 사용</p> : null}
  </div>;
}

export function DiveBackgroundNotice({ theme, status }: { theme: DiveThemeId; status: DivePanoramaStatus }) {
  if (status === 'loading' || status === 'ready') return null;
  return <div role="status" className="pointer-events-none absolute left-3 top-14 z-30 rounded-lg bg-black/70 px-3 py-2 text-xs text-amber-100">
    {theme === 'ocean' ? 'OCEAN' : 'SPACE'} · 기본 배경 ({status === 'unregistered' ? '파노라마 미등록' : '파노라마 로딩 실패'})
  </div>;
}
