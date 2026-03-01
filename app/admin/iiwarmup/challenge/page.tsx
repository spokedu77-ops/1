'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Maximize, Minimize, Trash2, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { SpokeduRhythmGame } from '@/app/components/runtime/SpokeduRhythmGame';
import { useChallengeBGM } from '@/app/lib/admin/hooks/useChallengeBGM';
import { useChallengePrograms } from '@/app/lib/admin/hooks/useChallengePrograms';
import { useDeleteChallengeProgram } from '@/app/lib/admin/hooks/useDeleteChallengeProgram';
import { useUpsertChallengeProgram } from '@/app/lib/admin/hooks/useUpsertChallengeProgram';

export type BeatPreset = {
  weekKey: string;
  title: string;
  bpm: number;
  level: number;
  grid: string[];
  /** 1~4단계 그리드 전체 (있으면 스토어·구독자에 4단계 모두 반영) */
  gridsByLevel?: Record<number, string[]>;
  notes: string;
};

/** 1단계 룰: 앞/뒤만 8칸 (2~5라운드는 이 구성을 셔플) */
const DEFAULT_GRID_LEVEL1 = ['앞', '뒤', '앞', '뒤', '앞', '뒤', '앞', '뒤'];

function generateWeekKey(year: number, month: number, week: number): string {
  return `${year}-${String(month).padStart(2, '0')}-W${week}`;
}

function generateYearPresets(year: number): BeatPreset[] {
  const presets: BeatPreset[] = [];
  for (let month = 1; month <= 12; month++) {
    for (let week = 1; week <= 4; week++) {
      const weekKey = generateWeekKey(year, month, week);
      presets.push({
        weekKey,
        title: `${month}월 ${week}주차 - 챌린지`,
        bpm: 100,
        level: 1,
        grid: [...DEFAULT_GRID_LEVEL1],
        notes: '',
      });
    }
  }
  return presets;
}

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_PRESETS = generateYearPresets(CURRENT_YEAR);

function WeekPresetSelector({
  presets,
  selected,
  onSelect,
  disabled,
}: {
  presets: BeatPreset[];
  selected: BeatPreset;
  onSelect: (p: BeatPreset) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-neutral-400">주차 프리셋</span>
      <select
        value={selected.weekKey}
        onChange={(e) => {
          const p = presets.find((x) => x.weekKey === e.target.value);
          if (p) onSelect(p);
        }}
        disabled={disabled}
        className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-100 border border-neutral-700 focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {presets.map((p) => (
          <option key={p.weekKey} value={p.weekKey}>
            {p.weekKey} · {p.title}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChallengePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const weekFromUrl = searchParams.get('week');
  const {
    list: bgmList,
    selected: bgmPath,
    sourceBpm,
    setSourceBpm,
    loading: bgmLoading,
    error: bgmError,
    upload: uploadBgm,
    remove: removeBgm,
    select: selectBgm,
  } = useChallengeBGM();
  const bgmFileRef = useRef<HTMLInputElement>(null);
  const { data: savedPrograms = [] } = useChallengePrograms();

  const [presets, setPresets] = useState<BeatPreset[]>(() => [...DEFAULT_PRESETS]);
  // presetsRef: weekFromUrl 동기화 Effect가 presets를 의존성으로 가지지 않도록 최신값 유지
  const presetsRef = useRef(presets);
  useEffect(() => { presetsRef.current = presets; }, [presets]);

  const initialPreset = useMemo(() => {
    const found = presets.find((p) => p.weekKey === weekFromUrl);
    if (found) return found;
    if (weekFromUrl) {
      const match = weekFromUrl.match(/^(\d{4})-(\d{2})-W([1-4])$/);
      if (match) {
        const [, , m, w] = match;
        return {
          weekKey: weekFromUrl,
          title: `${Number(m)}월 ${Number(w)}주차 - 챌린지`,
          bpm: 100,
          level: 1,
          grid: [...DEFAULT_GRID_LEVEL1],
          notes: '',
        };
      }
    }
    return presets[0];
  }, [weekFromUrl, presets]);
  const [preset, setPreset] = useState<BeatPreset>(initialPreset);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    if (savedPrograms.length === 0) return;
    const byWeek = new Map(savedPrograms.map((p) => [p.weekKey, p]));
    const merge = (p: BeatPreset) => {
      const saved = byWeek.get(p.weekKey);
      if (!saved) return p;
      const hasGrids = saved.gridsByLevel && typeof saved.gridsByLevel === 'object';
      const hasGrid = saved.grid.length > 0;
      if (!hasGrids && !hasGrid) return p;
      const grid = saved.grid.length >= 8 ? saved.grid.slice(0, 8) : ([...saved.grid, ...Array(8 - saved.grid.length).fill('')].slice(0, 8) as string[]);
      if (hasGrids) {
        return { ...p, bpm: saved.bpm, level: saved.level, grid: saved.gridsByLevel![1] ?? grid, gridsByLevel: saved.gridsByLevel };
      }
      return { ...p, bpm: saved.bpm, level: saved.level, grid };
    };
    queueMicrotask(() => {
      setPresets((prev) => prev.map(merge));
      setPreset((prev) => merge(prev));
    });
  }, [savedPrograms]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const upsertChallenge = useUpsertChallengeProgram();
  const deleteChallenge = useDeleteChallengeProgram();

  const isThisWeekSaved = useMemo(
    () => savedPrograms.some((p) => p.weekKey === preset.weekKey),
    [savedPrograms, preset.weekKey]
  );
  const playbackRateLabel =
    typeof sourceBpm === 'number' && sourceBpm > 0 && preset.bpm > 0
      ? (preset.bpm / sourceBpm).toFixed(2)
      : null;

  const handlePresetChange = useCallback(
    (data: { bpm: number; level: number; grid: string[]; gridsByLevel?: Record<number, string[]> }) => {
      const nextPreset = { ...preset, bpm: data.bpm, level: data.level, grid: data.grid, ...(data.gridsByLevel && { gridsByLevel: data.gridsByLevel }) };
      setPresets((prev) =>
        prev.map((p) => (p.weekKey === preset.weekKey ? nextPreset : p))
      );
      setPreset(nextPreset);
      upsertChallenge.mutate(
        {
          weekKey: preset.weekKey,
          title: preset.title,
          bpm: data.bpm,
          level: data.level,
          grid: data.grid,
          ...(data.gridsByLevel && { gridsByLevel: data.gridsByLevel }),
        },
        {
          onSuccess: () => {
            toast.success('저장되었습니다. 스케줄러에서 이 주차에 배정할 수 있습니다.');
            router.replace(`${pathname}?week=${encodeURIComponent(preset.weekKey)}`, { scroll: false });
          },
          onError: (err: Error) => {
            toast.error(`저장 실패: ${err?.message ?? '알 수 없는 오류'}`);
          },
        }
      );
    },
    [preset.weekKey, preset.title, upsertChallenge, router, pathname]
  );

  const handleDeleteFromScheduler = useCallback(() => {
    if (!confirm(`"${preset.weekKey}" 챌린지를 스케줄러에서 삭제할까요? 스케줄러 배정이 해제됩니다.`)) return;
    deleteChallenge.mutate(preset.weekKey, {
      onSuccess: () => {
        toast.success('삭제되었습니다. 스케줄러에서 해당 주차 배정이 해제됩니다.');
      },
      onError: (err: Error) => {
        toast.error(`삭제 실패: ${err?.message ?? '알 수 없는 오류'}`);
      },
    });
  }, [preset.weekKey, deleteChallenge]);

  const handleBgmUpload = useCallback(async () => {
    const file = bgmFileRef.current?.files?.[0];
    if (!file) return;
    try {
      await uploadBgm(file);
      if (bgmFileRef.current) bgmFileRef.current.value = '';
    } catch {
      /* ignore */
    }
  }, [uploadBgm]);

  // URL의 weekFromUrl이 바뀔 때만 preset 동기화. presets는 ref로 읽어 의존성 순환 방지.
  useEffect(() => {
    const currentPresets = presetsRef.current;
    const found = currentPresets.find((p) => p.weekKey === weekFromUrl);
    if (found) {
      queueMicrotask(() => setPreset(found));
      return;
    }
    if (weekFromUrl) {
      const match = weekFromUrl.match(/^(\d{4})-(\d{2})-W([1-4])$/);
      if (match) {
        const [, , m, w] = match;
        const generated: BeatPreset = {
          weekKey: weekFromUrl,
          title: `${Number(m)}월 ${Number(w)}주차 - 챌린지`,
          bpm: 100,
          level: 1,
          grid: [...DEFAULT_GRID_LEVEL1],
          notes: '',
        };
        queueMicrotask(() => {
          setPresets((prev) => (prev.some((p) => p.weekKey === weekFromUrl) ? prev : [...prev, generated]));
          setPreset(generated);
        });
        return;
      }
    }
    queueMicrotask(() => setPreset(currentPresets[0]));
  }, [weekFromUrl]); // presetsRef는 ref이므로 의존성 불필요

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.documentElement) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold">스포키듀 챌린지</h2>
          <p className="mt-1 text-sm text-neutral-400">
            스포키듀 챌린지 리듬 워밍업 · 주차별 프리셋 편집·미리보기
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 border border-neutral-700"
            title={isFullscreen ? '전체화면 해제' : '전체화면'}
          >
            {isFullscreen ? <Minimize size={18} className="text-neutral-300" /> : <Maximize size={18} className="text-neutral-300" />}
            <span className="text-neutral-300">전체화면</span>
          </button>
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            className={`flex gap-2 rounded-lg px-3 py-2 text-sm border ${soundOn ? 'bg-teal-900/30 border-teal-600 text-teal-300' : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}
            title={soundOn ? '사운드 끄기' : '사운드 켜기'}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span>{soundOn ? '사운드 On' : '사운드 Off'}</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
          <WeekPresetSelector presets={presets} selected={preset} onSelect={setPreset} />
          <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm">
            <p className="font-medium text-neutral-300">
              {preset.weekKey} · BPM {preset.bpm}
              {playbackRateLabel != null && sourceBpm != null && (
                <span className="ml-1 text-cyan-300">({playbackRateLabel}배)</span>
              )}
            </p>
            <p className={isThisWeekSaved ? 'text-teal-400' : 'text-amber-400'}>
              {isThisWeekSaved ? '저장됨' : '미저장'}
            </p>
          </div>
          {preset.notes && (
            <p className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">노트</span> {preset.notes}
            </p>
          )}

          <section>
            <h3 className="mb-1 text-sm font-bold text-neutral-300">BGM 설정 (전역)</h3>
            <p className="mb-2 text-xs text-neutral-500">원곡 BPM은 모든 주차 공통.</p>
            {bgmError && <p className="mb-2 text-xs text-red-400">{bgmError}</p>}
            <input ref={bgmFileRef} type="file" accept="audio/mpeg,audio/mp3,audio/wav" className="hidden" onChange={handleBgmUpload} />
            <button type="button" className="mb-2 w-full rounded-lg bg-neutral-700 px-3 py-2 text-sm hover:bg-neutral-600" onClick={() => bgmFileRef.current?.click()}>
              BGM 업로드
            </button>
            {!bgmLoading && bgmList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bgmList.map((path) => {
                  const name = path.split('/').pop() ?? path;
                  const isSelected = bgmPath === path;
                  return (
                    <div key={path} className="flex items-center gap-1">
                      <button type="button" onClick={() => selectBgm(path)} className={`rounded-lg px-2 py-1 text-xs ${isSelected ? 'bg-teal-600 text-white' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'}`}>
                        {name}
                      </button>
                      <button type="button" onClick={() => removeBgm(path)} className="rounded p-1 text-neutral-500 hover:text-red-400" title="삭제">×</button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-2">
              <label className="text-xs font-medium text-neutral-400">원곡 BPM</label>
              <input
                type="number"
                min={1}
                max={300}
                step={0.01}
                value={sourceBpm ?? ''}
                onChange={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v === null || (!Number.isNaN(v) && v > 0)) setSourceBpm(v); }}
                placeholder="예: 180"
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200"
              />
            </div>
            {bgmLoading && <p className="mt-1 text-xs text-amber-400">BGM 로딩 중…</p>}
          </section>

          <section>
            <h3 className="mb-1 text-sm font-bold text-neutral-300">저장 — {preset.weekKey}</h3>
            <p className="mb-2 text-xs text-neutral-500">게임에서 BPM·그리드 변경 후 재생하면 이 주차에 자동 저장됩니다.</p>
            {upsertChallenge.isPending && <p className="text-xs text-amber-400">저장 중...</p>}
            {upsertChallenge.isSuccess && !upsertChallenge.isPending && <p className="text-xs text-teal-400">저장됨</p>}
            {upsertChallenge.isError && <p className="text-xs text-red-400">{(upsertChallenge.error as Error)?.message}</p>}
            <button type="button" onClick={handleDeleteFromScheduler} disabled={deleteChallenge.isPending} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-red-900/30 hover:text-red-300 disabled:opacity-50">
              <Trash2 size={16} />
              스케줄러에서 삭제
            </button>
          </section>
        </aside>

        <main className="min-h-0 flex flex-col">
          {/* 실시간 뷰포트: blur/ring/shadow 없음 — 렉 최소화 (docs/IIWARMUP_스튜디오_렉최소화_설계.md) */}
          <div className="min-h-[320px] flex-1 overflow-hidden bg-neutral-950">
            {bgmLoading ? (
              <div className="flex min-h-[200px] items-center justify-center text-neutral-500">BGM 설정 로딩 중…</div>
            ) : (
              <SpokeduRhythmGame
                allowEdit={true}
                soundOn={soundOn}
                bgmPath={bgmPath || undefined}
                bgmSourceBpm={sourceBpm ?? undefined}
                initialBpm={preset.bpm}
                initialLevel={1}
                initialGrid={preset.grid}
                initialLevelData={preset.gridsByLevel}
                onPresetChange={handlePresetChange}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ChallengeStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12 text-neutral-500">
          로딩 중...
        </div>
      }
    >
      <ChallengePageContent />
    </Suspense>
  );
}
