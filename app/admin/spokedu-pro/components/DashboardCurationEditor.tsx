'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function DashboardCurationEditor() {
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
        setMessage({ type: 'error', text: (j.error as string) ?? '저장 실패' });
        return;
      }
      setMessage({ type: 'ok', text: '저장되었습니다. 대시보드에 곧바로 반영됩니다.' });
      window.dispatchEvent(new CustomEvent('spokedu-pro-dashboard-saved'));
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : '저장 실패' });
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
      <div className="p-6 bg-slate-900/80 border-b border-slate-800 text-slate-400">
        대시보드 데이터 불러오는 중...
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900/80 border-b border-slate-800 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-bold text-white">대시보드 큐레이션 (v4) — 저장 시 즉시 반영</h2>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
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

      {/* 테마 1개: 제목·부제·themeKey */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-300">이번 주 테마 (Row1 헤더)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">배지 문구</label>
            <input
              type="text"
              value={data.weekTheme.badge}
              onChange={(e) => setWeekTheme({ badge: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
              placeholder="이번 주 테마"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">테마 키 (7개 중 1개)</label>
            <select
              value={data.weekTheme.themeKey}
              onChange={(e) => setWeekTheme({ themeKey: e.target.value as ThemeKey })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
            >
              {THEME_KEYS.map((k) => (
                <option key={k} value={k}>
                  {THEME_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">제목</label>
            <input
              type="text"
              value={data.weekTheme.title}
              onChange={(e) => setWeekTheme({ title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
              placeholder="테마 제목"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">부제목</label>
            <input
              type="text"
              value={data.weekTheme.subtitle}
              onChange={(e) => setWeekTheme({ subtitle: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
              placeholder="부제목"
            />
          </div>
        </div>
      </div>

      {/* Row1: 4개 프로그램 + role + tag2 */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-300">Row1 — 테마 4개 슬롯</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {data.weekTheme.items.slice(0, 4).map((item, idx) => (
            <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 space-y-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">프로그램</label>
                <select
                  value={item.programId}
                  onChange={(e) => setRow1Item(idx, { programId: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded px-2 py-1.5 text-sm"
                >
                  {PROGRAM_BANK.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">역할</label>
                <select
                  value={item.role}
                  onChange={(e) => setRow1Item(idx, { role: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded px-2 py-1.5 text-sm"
                >
                  {ROW1_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">태그 2개 (표시용)</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={item.tag2[0] ?? ''}
                    onChange={(e) => {
                      const t = [...(item.tag2 ?? [])];
                      t[0] = e.target.value;
                      setRow1Item(idx, { tag2: t.slice(0, 2) });
                    }}
                    className="flex-1 bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs"
                    placeholder="태그1"
                  />
                  <input
                    type="text"
                    value={item.tag2[1] ?? ''}
                    onChange={(e) => {
                      const t = [...(item.tag2 ?? [])];
                      t[1] = e.target.value;
                      setRow1Item(idx, { tag2: t.slice(0, 2) });
                    }}
                    className="flex-1 bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs"
                    placeholder="태그2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row2: 제목 + 4개 */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-300">Row2 — 선생님 베스트 4개</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Row2 제목</label>
            <input
              type="text"
              value={data.row2.title}
              onChange={(e) => setData((p) => ({ ...p, row2: { ...p.row2, title: e.target.value } }))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
              placeholder="선생님 베스트 활동"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {data.row2.items.slice(0, 4).map((item, idx) => (
            <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 space-y-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">프로그램</label>
                <select
                  value={item.programId}
                  onChange={(e) => setRow2Item(idx, { programId: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded px-2 py-1.5 text-sm"
                >
                  {PROGRAM_BANK.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} {getProgramTitle(p.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">태그 2개</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={item.tag2[0] ?? ''}
                    onChange={(e) => {
                      const t = [...(item.tag2 ?? [])];
                      t[0] = e.target.value;
                      setRow2Item(idx, { tag2: t.slice(0, 2) });
                    }}
                    className="flex-1 bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs"
                    placeholder="태그1"
                  />
                  <input
                    type="text"
                    value={item.tag2[1] ?? ''}
                    onChange={(e) => {
                      const t = [...(item.tag2 ?? [])];
                      t[1] = e.target.value;
                      setRow2Item(idx, { tag2: t.slice(0, 2) });
                    }}
                    className="flex-1 bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs"
                    placeholder="태그2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
