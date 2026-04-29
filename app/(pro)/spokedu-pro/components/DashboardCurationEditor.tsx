'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import LibraryView from '../views/LibraryView';
import {
  THEME_KEYS,
  THEME_LABELS,
  ROW1_ROLES,
  PROGRAM_BANK,
  getProgramTitle,
  DEFAULT_DASHBOARD_V4,
  mergePublishedDashboardV4,
  type DashboardV4,
  type ThemeKey,
  type DashboardItemRow1,
  type DashboardItemRow2,
} from '@/app/lib/spokedu-pro/dashboardDefaults';
import { EQUIPMENT_CATALOG } from '@/app/lib/spokedu-pro/programClassification';

const ROW1_ROLE_OPTIONS = ROW1_ROLES as unknown as string[];
const SELECT_DARK_FIX = {
  colorScheme: 'dark' as const,
} as const;
const OPTION_READABLE_STYLE = {
  color: '#0f172a', // slate-900
  backgroundColor: '#ffffff',
} as const;

export default function DashboardCurationEditor({ onClose }: { onClose?: () => void }) {
  const tr = useTranslator();
  const [data, setData] = useState<DashboardV4>(DEFAULT_DASHBOARD_V4);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [activeRow1Slot, setActiveRow1Slot] = useState<0 | 1 | 2 | 3>(0);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [programTitleById, setProgramTitleById] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spokedu-pro/dashboard', { credentials: 'include' });
      if (!res.ok) {
        setData(DEFAULT_DASHBOARD_V4);
        return;
      }
      const j = await res.json();
      const raw = j.data;
      if (
        raw &&
        typeof raw === 'object' &&
        !Array.isArray(raw) &&
        'weekTheme' in raw &&
        'row2' in raw
      ) {
        setData(mergePublishedDashboardV4(raw));
      } else {
        setData(DEFAULT_DASHBOARD_V4);
      }
    } catch {
      setData(DEFAULT_DASHBOARD_V4);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Row1 표시용 타이틀 캐시(내부 id -> 실제 title). 저장된 값도 정상 표시되게.
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/spokedu-pro/programs?limit=200&only_curriculum=1', { credentials: 'include' });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(j?.data)) return;
        const next: Record<number, string> = {};
        for (const r of j.data as any[]) {
          const id = Number(r?.id);
          const title = String(r?.title ?? '').trim();
          if (!Number.isFinite(id) || id <= 0) continue;
          if (!title) continue;
          next[id] = title;
        }
        // API에 없는 id는 prev 병합으로 남지 않게 한다(삭제·비공개 후에도 옛 제목이 슬롯에 붙는 문제 방지).
        // 라이브러리에서 고른 직후 제목은 onSelectProgram에서만 다시 넣는다.
        if (!cancelled) setProgramTitleById(next);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading]);

  useEffect(() => {
    if (!libraryPickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLibraryPickerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [libraryPickerOpen]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/spokedu-pro/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key: 'dashboard_v4',
          value: { weekTheme: data.weekTheme, row2: data.row2, equipmentSpotlight: data.equipmentSpotlight },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const errText = (j.error as string) ?? `HTTP ${res.status}`;
        setMessage({ type: 'error', text: errText });
        toast.error(tr(`대시보드 저장 실패: ${errText}`));
        return;
      }
      setMessage({ type: 'ok', text: '저장되었습니다. 대시보드에 곧바로 반영됩니다.' });
      toast.success(tr('저장되었습니다. 대시보드에 곧바로 반영됩니다.'));
      window.dispatchEvent(new CustomEvent('spokedu-pro-dashboard-saved'));
    } catch (e) {
      const errText = e instanceof Error ? e.message : tr('저장 실패');
      setMessage({ type: 'error', text: errText });
      toast.error(tr(`대시보드 저장 실패: ${errText}`));
    } finally {
      setSaving(false);
    }
  };

  const setWeekTheme = (part: Partial<DashboardV4['weekTheme']>) => {
    setData((prev) => ({
      ...prev,
      weekTheme: { ...prev.weekTheme, ...part },
    }));
  };

  const setRow1Item = (index: number, item: Partial<DashboardItemRow1>) => {
    setData((prev) => {
      const items = [...prev.weekTheme.items];
      items[index] = { ...items[index], ...item } as DashboardItemRow1;
      return { ...prev, weekTheme: { ...prev.weekTheme, items } };
    });
  };

  const setRow2Item = (index: number, item: Partial<DashboardItemRow2>) => {
    setData((prev) => {
      const items = [...prev.row2.items];
      items[index] = { ...items[index], ...item } as DashboardItemRow2;
      return { ...prev, row2: { ...prev.row2, items } };
    });
  };

  const activeRow1Item = data.weekTheme.items[activeRow1Slot] as DashboardItemRow1 | undefined;
  const activeRow1ProgramTitle = (() => {
    const id = activeRow1Item?.programId ?? 0;
    if (!id) return tr('선택 안 함');
    return programTitleById[id] ?? tr('선택됨');
  })();

  if (loading) {
    return (
      <div className="p-6 text-slate-400 flex items-center justify-center min-h-[200px]">
        {tr('대시보드 데이터 불러오는 중...')}
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-bold text-white">{tr('대시보드 큐레이션 — 저장 시 즉시 반영')}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? tr('저장 중…') : tr('저장')}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 text-white rounded-lg border border-slate-700 hover:bg-slate-700"
              aria-label={tr('닫기')}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'ok' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'
          }`}
        >
          {tr(message.text)}
        </div>
      )}

      {/* 테마 1개 — 박스 전체 클릭 시 입력 포커스 */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold text-slate-400">{tr('이번 주 테마 (Row1)')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="block cursor-text rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600">
            <span className="block text-xs text-slate-500 mb-0.5">{tr('배지 문구')}</span>
            <input
              type="text"
              value={data.weekTheme.badge}
              onChange={(e) => setWeekTheme({ badge: e.target.value })}
              className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-0"
              placeholder={tr('이번 주 테마')}
            />
          </label>
          <label className="block cursor-text rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600">
            <span className="block text-xs text-slate-500 mb-0.5">{tr('테마 키')}</span>
            <select
              value={data.weekTheme.themeKey}
              onChange={(e) => setWeekTheme({ themeKey: e.target.value as ThemeKey })}
              className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-0 cursor-pointer"
              style={SELECT_DARK_FIX}
            >
              {THEME_KEYS.map((k) => (
                <option key={k} value={k} style={OPTION_READABLE_STYLE}>
                  {tr(THEME_LABELS[k])}
                </option>
              ))}
            </select>
          </label>
          <label className="block cursor-text rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600 md:col-span-2">
            <span className="block text-xs text-slate-500 mb-0.5">{tr('제목')}</span>
            <input
              type="text"
              value={data.weekTheme.title}
              onChange={(e) => setWeekTheme({ title: e.target.value })}
              className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-0"
              placeholder={tr('테마 제목')}
            />
          </label>
          <label className="block cursor-text rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600 md:col-span-2">
            <span className="block text-xs text-slate-500 mb-0.5">{tr('부제목')}</span>
            <input
              type="text"
              value={data.weekTheme.subtitle}
              onChange={(e) => setWeekTheme({ subtitle: e.target.value })}
              className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-0"
              placeholder={tr('부제목')}
            />
          </label>
        </div>
      </div>

      {/* Row1: 4개 */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold text-slate-400">{tr('Row1 — 테마 4개')}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {([0, 1, 2, 3] as const).map((idx) => {
            const isActive = activeRow1Slot === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveRow1Slot(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-colors ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                {tr(`${idx + 1}번`)}
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setLibraryPickerOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-black bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50"
          >
            {tr('프로그램 선택')}
          </button>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500">{tr('선택된 프로그램')}</p>
              <p className="text-sm font-black text-white truncate">
                #{activeRow1Item?.programId ?? 0} {activeRow1ProgramTitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="block cursor-pointer rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600">
              <span className="block text-xs text-slate-500 mb-0.5">{tr('역할')}</span>
              <select
                value={activeRow1Item?.role ?? ''}
                onChange={(e) => setRow1Item(activeRow1Slot, { role: e.target.value })}
                className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none cursor-pointer"
                style={SELECT_DARK_FIX}
              >
                {ROW1_ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r} style={OPTION_READABLE_STYLE}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600">
              <span className="block text-xs text-slate-500 mb-0.5">{tr('태그 2개')}</span>
              <div className="flex gap-1">
                <label className="flex-1 cursor-text rounded bg-slate-800 px-1.5 py-0.5 min-h-[28px] flex items-center">
                  <input
                    type="text"
                    value={activeRow1Item?.tag2?.[0] ?? ''}
                    onChange={(e) => {
                      const t = [...((activeRow1Item?.tag2 ?? []) as string[])];
                      t[0] = e.target.value;
                      setRow1Item(activeRow1Slot, { tag2: t.slice(0, 2) });
                    }}
                    className="w-full bg-transparent border-0 text-white text-xs focus:outline-none"
                    placeholder={tr('태그1')}
                  />
                </label>
                <label className="flex-1 cursor-text rounded bg-slate-800 px-1.5 py-0.5 min-h-[28px] flex items-center">
                  <input
                    type="text"
                    value={activeRow1Item?.tag2?.[1] ?? ''}
                    onChange={(e) => {
                      const t = [...((activeRow1Item?.tag2 ?? []) as string[])];
                      t[1] = e.target.value;
                      setRow1Item(activeRow1Slot, { tag2: t.slice(0, 2) });
                    }}
                    className="w-full bg-transparent border-0 text-white text-xs focus:outline-none"
                    placeholder={tr('태그2')}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row2: 4개 */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold text-slate-400">{tr('Row2 — 베스트 4개')}</h3>
        <label className="block cursor-text rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600 mb-2 max-w-md">
          <span className="block text-xs text-slate-500 mb-0.5">{tr('Row2 제목')}</span>
          <input
            type="text"
            value={data.row2.title}
            onChange={(e) => setData((p) => ({ ...p, row2: { ...p.row2, title: e.target.value } }))}
            className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none"
            placeholder={tr('선생님 베스트 활동')}
          />
        </label>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
          {data.row2.items.slice(0, 4).map((item, idx) => (
            <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-lg p-2 space-y-1.5">
              <label className="block cursor-pointer">
                <span className="block text-xs text-slate-500 mb-0.5">{tr('프로그램')}</span>
                <select
                  value={item.programId}
                  onChange={(e) => setRow2Item(idx, { programId: Number(e.target.value) })}
                  className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none cursor-pointer"
                  style={SELECT_DARK_FIX}
                >
                  {PROGRAM_BANK.map((p) => (
                    <option key={p.id} value={p.id} style={OPTION_READABLE_STYLE}>
                      #{p.id} {getProgramTitle(p.id)}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="block text-xs text-slate-500 mb-0.5">{tr('태그 2개')}</span>
                <div className="flex gap-1">
                  <label className="flex-1 cursor-text rounded bg-slate-800 px-1.5 py-0.5 min-h-[28px] flex items-center">
                    <input
                      type="text"
                      value={item.tag2[0] ?? ''}
                      onChange={(e) => {
                        const t = [...(item.tag2 ?? [])];
                        t[0] = e.target.value;
                        setRow2Item(idx, { tag2: t.slice(0, 2) });
                      }}
                      className="w-full bg-transparent border-0 text-white text-xs focus:outline-none"
                      placeholder={tr('태그1')}
                    />
                  </label>
                  <label className="flex-1 cursor-text rounded bg-slate-800 px-1.5 py-0.5 min-h-[28px] flex items-center">
                    <input
                      type="text"
                      value={item.tag2[1] ?? ''}
                      onChange={(e) => {
                        const t = [...(item.tag2 ?? [])];
                        t[1] = e.target.value;
                        setRow2Item(idx, { tag2: t.slice(0, 2) });
                      }}
                      className="w-full bg-transparent border-0 text-white text-xs focus:outline-none"
                      placeholder={tr('태그2')}
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-700/80 bg-slate-900/40 p-3">
        <h3 className="text-xs font-bold text-slate-400">{tr('로드맵 · 교구 추천 행')}</h3>
        <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={data.equipmentSpotlight !== null}
            onChange={(e) =>
              setData((p) => ({
                ...p,
                equipmentSpotlight: e.target.checked
                  ? (p.equipmentSpotlight ?? DEFAULT_DASHBOARD_V4.equipmentSpotlight)
                  : null,
              }))
            }
            className="rounded border-slate-600"
          />
          <span>{tr('교구 기반 추천 4종 표시')}</span>
        </label>
        {data.equipmentSpotlight !== null && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            <label className="block rounded-lg bg-slate-800/80 border border-slate-700 p-2">
              <span className="block text-xs text-slate-500 mb-0.5">{tr('교구(카탈로그)')}</span>
              <select
                value={data.equipmentSpotlight.equipmentCatalogItem}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    equipmentSpotlight:
                      p.equipmentSpotlight === null
                        ? { equipmentCatalogItem: e.target.value }
                        : { ...p.equipmentSpotlight, equipmentCatalogItem: e.target.value },
                  }))
                }
                className="w-full bg-transparent border-0 text-white text-sm focus:outline-none cursor-pointer"
                style={SELECT_DARK_FIX}
              >
                {EQUIPMENT_CATALOG.map((name) => (
                  <option key={name} value={name} style={OPTION_READABLE_STYLE}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block rounded-lg bg-slate-800/80 border border-slate-700 p-2 md:col-span-1">
              <span className="block text-xs text-slate-500 mb-0.5">{tr('섹션 제목(선택)')}</span>
              <input
                type="text"
                value={data.equipmentSpotlight.sectionTitle ?? ''}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    equipmentSpotlight:
                      p.equipmentSpotlight === null
                        ? null
                        : { ...p.equipmentSpotlight, sectionTitle: e.target.value },
                  }))
                }
                className="w-full bg-transparent border-0 text-white text-sm focus:outline-none"
                placeholder={tr('비우면 기본 문구')}
              />
            </label>
          </div>
        )}
      </div>

      {libraryPickerOpen && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end md:justify-center md:py-8 pointer-events-none">
          <div
            role="presentation"
            aria-hidden
            className="pointer-events-auto fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setLibraryPickerOpen(false)}
          />
          <div className="pointer-events-auto relative z-10 mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 md:max-h-[min(92vh,900px)] md:flex-none md:px-4 md:pb-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="row1-library-picker-title"
              className="flex max-h-[88dvh] min-h-0 flex-1 flex-col overflow-hidden rounded-t-[1.35rem] border border-slate-600/50 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-[0_28px_90px_-14px_rgba(0,0,0,0.72)] ring-1 ring-white/[0.06] md:max-h-none md:flex-none md:h-[min(92vh,900px)] md:rounded-3xl"
            >
              <div className="shrink-0 border-b border-slate-800/90 bg-slate-950/55 px-4 pb-3 pt-3 md:px-5 md:pb-3.5 md:pt-4">
                <div className="mx-auto mb-1 hidden h-1 w-10 shrink-0 rounded-full bg-slate-600/80 md:hidden" aria-hidden />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200/95">
                        Row1 · {activeRow1Slot + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">{tr('프로그램 뱅크')}</span>
                    </div>
                    <h2
                      id="row1-library-picker-title"
                      className="text-base font-black tracking-tight text-white md:text-lg"
                    >
                      {tr('이번 주 슬롯에 넣을 활동을 고르세요')}
                    </h2>
                    <p className="max-w-xl text-xs leading-relaxed text-slate-400">
                      {tr('카드를 한 번 누르면 이 슬롯에 저장되고 창이 닫힙니다. 바깥 어두운 영역을 눌러도 닫힙니다.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLibraryPickerOpen(false)}
                    className="shrink-0 rounded-xl border border-slate-600/70 bg-slate-800/90 p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                    aria-label={tr('닫기')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto custom-scroll bg-slate-950/25">
                <LibraryView
                  onOpenDetail={() => {}}
                  onSelectProgram={(id, row) => {
                    setRow1Item(activeRow1Slot, { programId: id });
                    const pickedTitle = String(row?.title ?? '').trim();
                    if (pickedTitle) {
                      setProgramTitleById((prev) => ({ ...prev, [id]: pickedTitle }));
                    }
                    setLibraryPickerOpen(false);
                  }}
                  compact
                  functionalCap={144}
                  libraryMode="program"
                  initialPreset={{ themeKey: data.weekTheme.themeKey }}
                  programDetails={{}}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
