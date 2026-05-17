'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink, Trash2, Save } from 'lucide-react';
import { DURATION_SLOTS } from '@/app/program/iiwarmup/flow/engine/core/coordContract';

// ── Types ─────────────────────────────────────────────────────────────────────
interface FlowFeatureFlags {
  bigJump: boolean;
  balance: boolean;
  sprint: boolean;
  reach: boolean;
  freeze: boolean;
}

interface FlowPreset {
  id: string;
  name: string;
  createdAt: string;
  durations: number[];
  features: FlowFeatureFlags;
  kidsSafe: boolean;
  skipRest: boolean;
}

const FEATURE_META: Array<{ key: keyof FlowFeatureFlags; label: string; desc: string }> = [
  { key: 'bigJump',  label: '빅 점프',   desc: '다리 간격 넓힘 (준비 중)' },
  { key: 'balance',  label: '밸런스',     desc: '한 발 착지 유도 (준비 중)' },
  { key: 'sprint',   label: '스프린트',   desc: '순간 가속 구간 (준비 중)' },
  { key: 'reach',    label: '리치',       desc: '높은 박스 올려치기 (준비 중)' },
  { key: 'freeze',   label: '프리즈',     desc: '정지 신호 반응 (준비 중)' },
];

const DEFAULT_DURATIONS: number[] = DURATION_SLOTS.map((s) => s.defaultSec);
const DEFAULT_FEATURES: FlowFeatureFlags = {
  bigJump: false, balance: false, sprint: false, reach: false, freeze: false,
};
const LS_KEY = 'flow-presets';

function loadPresets(): FlowPreset[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as FlowPreset[]; }
  catch { return []; }
}
function savePresetsToStorage(presets: FlowPreset[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(presets));
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-neutral-700'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : ''}`}
      />
    </button>
  );
}

// ── Admin page ────────────────────────────────────────────────────────────────
export default function AdminFlowPage() {
  const [previewMonth, setPreviewMonth] = useState(() => new Date().getMonth() + 1);
  const [durations, setDurations] = useState<number[]>(DEFAULT_DURATIONS);
  const [features, setFeatures] = useState<FlowFeatureFlags>(DEFAULT_FEATURES);
  const [kidsSafe, setKidsSafe] = useState(false);
  const [skipRest, setSkipRest] = useState(false);
  const [activeTab, setActiveTab] = useState<'timing' | 'features' | 'presets'>('timing');
  const [presets, setPresets] = useState<FlowPreset[]>([]);
  const [presetName, setPresetName] = useState('');

  useEffect(() => { setPresets(loadPresets()); }, []);

  const isDefaultDurations = durations.every((d, i) => d === DEFAULT_DURATIONS[i]);

  const enabledFeatures = useMemo(
    () => (Object.entries(features) as [string, boolean][]).filter(([, v]) => v).map(([k]) => k).join(','),
    [features]
  );

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams({ admin: 'true', showLevelSelector: '1', month: String(previewMonth) });
    if (!isDefaultDurations) params.set('durations', durations.join(','));
    if (enabledFeatures) params.set('features', enabledFeatures);
    if (kidsSafe) params.set('kidsSafe', '1');
    if (skipRest) params.set('skipRest', '1');
    return `/program/iiwarmup/flow?${params.toString()}`;
  }, [previewMonth, durations, isDefaultDurations, enabledFeatures, kidsSafe, skipRest]);

  const handleDurationChange = useCallback((index: number, value: number) => {
    const slot = DURATION_SLOTS[index];
    if (!slot) return;
    const clamped = Math.max(slot.minSec, Math.min(slot.maxSec, value));
    setDurations((prev) => prev.map((d, i) => (i === index ? clamped : d)));
  }, []);

  const totalActiveSec = DURATION_SLOTS.reduce((sum, slot, i) => {
    if (slot.displayLevel >= 1 && slot.displayLevel <= 5) return sum + (durations[i] ?? slot.defaultSec);
    return sum;
  }, 0);

  const handleSavePreset = useCallback(() => {
    const name = presetName.trim() || `프리셋 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    const preset: FlowPreset = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      durations: [...durations],
      features: { ...features },
      kidsSafe,
      skipRest,
    };
    const next = [preset, ...presets];
    setPresets(next);
    savePresetsToStorage(next);
    setPresetName('');
  }, [presetName, durations, features, kidsSafe, skipRest, presets]);

  const handleLoadPreset = useCallback((preset: FlowPreset) => {
    setDurations(preset.durations.length === DEFAULT_DURATIONS.length ? preset.durations : DEFAULT_DURATIONS);
    setFeatures({ ...DEFAULT_FEATURES, ...preset.features });
    setKidsSafe(preset.kidsSafe);
    setSkipRest(preset.skipRest);
    setActiveTab('timing');
  }, []);

  const handleDeletePreset = useCallback((id: string) => {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    savePresetsToStorage(next);
  }, [presets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold">Flow Studio</h2>
          <p className="mt-1 text-sm text-neutral-400">
            3D Flow Phase 미리보기 · BGM·배경은 Asset Hub에서 월별 설정
          </p>
        </div>
        <Link
          href={iframeSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 self-start"
        >
          <ExternalLink size={14} />
          새 창에서 열기
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* ── Sidebar ── */}
        <aside className="space-y-4">
          {/* Month */}
          <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800 space-y-3">
            <label className="block text-sm font-medium text-neutral-400">미리보기 월</label>
            <select
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200"
              value={previewMonth}
              onChange={(e) => setPreviewMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">BGM·파노라마: Asset Hub → Flow 탭</p>
          </div>

          {/* Options */}
          <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800 space-y-3">
            <p className="text-sm font-medium text-neutral-300">옵션</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">키즈 세이프 (느린 속도)</span>
              <Toggle value={kidsSafe} onChange={setKidsSafe} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">휴식 구간 건너뛰기</span>
              <Toggle value={skipRest} onChange={setSkipRest} />
            </div>
          </div>

          {/* Tabs */}
          <div className="rounded-xl bg-neutral-900 ring-1 ring-neutral-800 overflow-hidden">
            <div className="flex border-b border-neutral-800">
              {(['timing', 'features', 'presets'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                    activeTab === tab ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {tab === 'timing' ? '구간 설정' : tab === 'features' ? '기능' : '즐겨찾기'}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* ── Timing tab ── */}
              {activeTab === 'timing' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">활동 합계: {totalActiveSec}초</span>
                    <button
                      type="button"
                      onClick={() => setDurations(DEFAULT_DURATIONS)}
                      className="text-xs text-neutral-500 hover:text-neutral-300 underline"
                    >
                      초기화
                    </button>
                  </div>
                  {DURATION_SLOTS.map((slot, index) => {
                    if (slot.displayLevel === -1) return null;
                    const val = durations[index] ?? slot.defaultSec;
                    const isRest = slot.displayLevel === 0;
                    return (
                      <div key={slot.label} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-medium truncate ${isRest ? 'text-neutral-500' : 'text-neutral-300'}`}>
                            {slot.label}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              value={val}
                              min={slot.minSec}
                              max={slot.maxSec}
                              onChange={(e) => handleDurationChange(index, Number(e.target.value))}
                              className="w-14 rounded bg-neutral-800 px-2 py-0.5 text-right text-xs text-neutral-200"
                            />
                            <span className="text-xs text-neutral-500">초</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={slot.minSec}
                          max={slot.maxSec}
                          step={5}
                          value={val}
                          onChange={(e) => handleDurationChange(index, Number(e.target.value))}
                          className="w-full h-1.5 appearance-none rounded-full bg-neutral-700 cursor-pointer"
                          style={{ accentColor: isRest ? '#6b7280' : '#3b82f6' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Features tab ── */}
              {activeTab === 'features' && (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-500 mb-3">
                    UI 설정만 제공됩니다. 엔진 구현 후 순차 활성화됩니다.
                  </p>
                  {FEATURE_META.map(({ key, label, desc }) => (
                    <div key={key} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-neutral-300">{label}</div>
                        <div className="text-xs text-neutral-600">{desc}</div>
                      </div>
                      <Toggle
                        value={features[key]}
                        onChange={(v) => setFeatures((prev) => ({ ...prev, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* ── Presets tab ── */}
              {activeTab === 'presets' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="프리셋 이름 (Enter)"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); }}
                      className="flex-1 min-w-0 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={handleSavePreset}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 shrink-0"
                    >
                      <Save size={12} />
                      저장
                    </button>
                  </div>

                  {presets.length === 0 ? (
                    <p className="py-4 text-center text-xs text-neutral-600">
                      저장된 즐겨찾기가 없습니다
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {presets.map((p) => {
                        const activeSec = DURATION_SLOTS.reduce((sum, slot, i) => {
                          if (slot.displayLevel >= 1 && slot.displayLevel <= 5)
                            return sum + (p.durations[i] ?? slot.defaultSec);
                          return sum;
                        }, 0);
                        return (
                          <div key={p.id} className="rounded-lg bg-neutral-800 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-neutral-200 truncate">{p.name}</span>
                              <button
                                type="button"
                                onClick={() => handleDeletePreset(p.id)}
                                className="shrink-0 text-neutral-600 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <div className="text-xs text-neutral-500">
                              {activeSec}초 활동
                              {p.kidsSafe ? ' · 키즈' : ''}
                              {p.skipRest ? ' · 휴식 생략' : ''}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleLoadPreset(p)}
                              className="w-full rounded bg-neutral-700 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-600 transition-colors"
                            >
                              불러오기
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Preview ── */}
        <main className="min-h-0 flex flex-col">
          <div className="min-h-[500px] flex-1 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950">
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              title="Flow Phase 미리보기"
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
