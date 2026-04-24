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
  type DashboardV4,
  type ThemeKey,
  type DashboardItemRow1,
  type DashboardItemRow2,
} from '@/app/lib/spokedu-pro/dashboardDefaults';

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
        setData(raw as DashboardV4);
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
        const res = await fetch('/api/spokedu-pro/programs?limit=200', { credentials: 'include' });
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
        if (!cancelled) setProgramTitleById((prev) => ({ ...prev, ...next }));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading]);

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
          value: { weekTheme: data.weekTheme, row2: data.row2 },
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

      {libraryPickerOpen && (
        <>
          <div
            role="presentation"
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] transition-opacity cursor-pointer"
            onClick={() => setLibraryPickerOpen(false)}
          />
          <div className="fixed inset-0 z-[90] p-2 md:p-4">
            <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl flex flex-col">
              <div className="h-12 px-4 flex items-center justify-between border-b border-slate-700 bg-slate-950/80">
                <p className="text-sm font-black text-slate-200">
                  {tr(`Row1 ${activeRow1Slot + 1}번 프로그램 선택`)}
                </p>
                <button
                  type="button"
                  onClick={() => setLibraryPickerOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                >
                  {tr('닫기')}
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
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
        </>
      )}
    </div>
  );
}
