'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
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

export default function DashboardCurationEditor({ onClose }: { onClose?: () => void }) {
  const [data, setData] = useState<DashboardV4>(DEFAULT_DASHBOARD_V4);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

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
        toast.error('대시보드 저장 실패: ' + errText);
        return;
      }
      setMessage({ type: 'ok', text: '저장되었습니다. 대시보드에 곧바로 반영됩니다.' });
      toast.success('저장되었습니다. 대시보드에 곧바로 반영됩니다.');
      window.dispatchEvent(new CustomEvent('spokedu-pro-dashboard-saved'));
    } catch (e) {
      const errText = e instanceof Error ? e.message : '저장 실패';
      setMessage({ type: 'error', text: errText });
      toast.error('대시보드 저장 실패: ' + errText);
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

  if (loading) {
    return (
      <div className="p-6 text-slate-400 flex items-center justify-center min-h-[200px]">
        대시보드 데이터 불러오는 중...
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-bold text-white">대시보드 큐레이션 — 저장 시 즉시 반영</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 text-white rounded-lg border border-slate-700 hover:bg-slate-700"
              aria-label="닫기"
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
          {message.text}
        </div>
      )}

      {/* 테마 1개 — 박스 전체 클릭 시 입력 포커스 */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold text-slate-400">이번 주 테마 (Row1)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="block cursor-text rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600">
            <span className="block text-xs text-slate-500 mb-0.5">배지 문구</span>
            <input
              type="text"
              value={data.weekTheme.badge}
              onChange={(e) => setWeekTheme({ badge: e.target.value })}
              className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-0"
              placeholder="이번 주 테마"
            />
          </label>
          <label className="block cursor-text rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600">
            <span className="block text-xs text-slate-500 mb-0.5">테마 키</span>
            <select
              value={data.weekTheme.themeKey}
              onChange={(e) => setWeekTheme({ themeKey: e.target.value as ThemeKey })}
              className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-0 cursor-pointer"
            >
              {THEME_KEYS.map((k) => (
                <option key={k} value={k}>
                  {THEME_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block cursor-text rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600 md:col-span-2">
            <span className="block text-xs text-slate-500 mb-0.5">제목</span>
            <input
              type="text"
              value={data.weekTheme.title}
              onChange={(e) => setWeekTheme({ title: e.target.value })}
              className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-0"
              placeholder="테마 제목"
            />
          </label>
          <label className="block cursor-text rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600 md:col-span-2">
            <span className="block text-xs text-slate-500 mb-0.5">부제목</span>
            <input
              type="text"
              value={data.weekTheme.subtitle}
              onChange={(e) => setWeekTheme({ subtitle: e.target.value })}
              className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-0"
              placeholder="부제목"
            />
          </label>
        </div>
      </div>

      {/* Row1: 4개 */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold text-slate-400">Row1 — 테마 4개</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
          {data.weekTheme.items.slice(0, 4).map((item, idx) => (
            <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-lg p-2 space-y-1.5">
              <label className="block cursor-pointer">
                <span className="block text-xs text-slate-500 mb-0.5">프로그램</span>
                <select
                  value={item.programId}
                  onChange={(e) => setRow1Item(idx, { programId: Number(e.target.value) })}
                  className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none cursor-pointer"
                >
                  {PROGRAM_BANK.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block cursor-pointer">
                <span className="block text-xs text-slate-500 mb-0.5">역할</span>
                <select
                  value={item.role}
                  onChange={(e) => setRow1Item(idx, { role: e.target.value })}
                  className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none cursor-pointer"
                >
                  {ROW1_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="block text-xs text-slate-500 mb-0.5">태그 2개</span>
                <div className="flex gap-1">
                  <label className="flex-1 cursor-text rounded bg-slate-800 px-1.5 py-0.5 min-h-[28px] flex items-center">
                    <input
                      type="text"
                      value={item.tag2[0] ?? ''}
                      onChange={(e) => {
                        const t = [...(item.tag2 ?? [])];
                        t[0] = e.target.value;
                        setRow1Item(idx, { tag2: t.slice(0, 2) });
                      }}
                      className="w-full bg-transparent border-0 text-white text-xs focus:outline-none"
                      placeholder="태그1"
                    />
                  </label>
                  <label className="flex-1 cursor-text rounded bg-slate-800 px-1.5 py-0.5 min-h-[28px] flex items-center">
                    <input
                      type="text"
                      value={item.tag2[1] ?? ''}
                      onChange={(e) => {
                        const t = [...(item.tag2 ?? [])];
                        t[1] = e.target.value;
                        setRow1Item(idx, { tag2: t.slice(0, 2) });
                      }}
                      className="w-full bg-transparent border-0 text-white text-xs focus:outline-none"
                      placeholder="태그2"
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row2: 4개 */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold text-slate-400">Row2 — 베스트 4개</h3>
        <label className="block cursor-text rounded-lg bg-slate-800/80 border border-slate-700 p-2 hover:border-slate-600 mb-2 max-w-md">
          <span className="block text-xs text-slate-500 mb-0.5">Row2 제목</span>
          <input
            type="text"
            value={data.row2.title}
            onChange={(e) => setData((p) => ({ ...p, row2: { ...p.row2, title: e.target.value } }))}
            className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none"
            placeholder="선생님 베스트 활동"
          />
        </label>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
          {data.row2.items.slice(0, 4).map((item, idx) => (
            <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-lg p-2 space-y-1.5">
              <label className="block cursor-pointer">
                <span className="block text-xs text-slate-500 mb-0.5">프로그램</span>
                <select
                  value={item.programId}
                  onChange={(e) => setRow2Item(idx, { programId: Number(e.target.value) })}
                  className="w-full bg-transparent border-0 text-white rounded px-1 py-0.5 text-sm focus:outline-none cursor-pointer"
                >
                  {PROGRAM_BANK.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} {getProgramTitle(p.id)}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="block text-xs text-slate-500 mb-0.5">태그 2개</span>
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
                      placeholder="태그1"
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
                      placeholder="태그2"
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
