'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { SpokeduRhythmGame } from '@/app/components/runtime/SpokeduRhythmGame';
import { useChallengeBGM } from '@/app/lib/admin/hooks/useChallengeBGM';

export type ChallengeTemplate = {
  id: string;
  title: string;
  bpm: number;
  level: number;
  grid: string[];
  gridsByLevel?: Record<number, string[]>;
  notes?: string;
};

type ChallengeTemplateOverride = {
  bpm: number;
  level: number;
  grid: string[];
  gridsByLevel?: Record<number, string[]>;
};

/** 1단계 룰: 앞/뒤만 8칸 (2~5라운드는 이 구성을 셔플) */
const DEFAULT_GRID_LEVEL1 = ['앞', '뒤', '앞', '뒤', '앞', '뒤', '앞', '뒤'];

const TEMPLATE_COUNT = 12;
const TEMPLATES_12: ChallengeTemplate[] = Array.from({ length: TEMPLATE_COUNT }, (_, i) => {
  const n = i + 1;
  return {
    id: `tpl_${n}`,
    title: `포맷 ${n}`,
    bpm: 100,
    level: 1,
    grid: [...DEFAULT_GRID_LEVEL1],
    notes: '',
  };
});

const TEMPLATE_OVERRIDE_KEY = 'iiwarmup_challenge_templates_v1';

function readTemplateOverrides(): Record<string, ChallengeTemplateOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TEMPLATE_OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const obj = parsed as Record<string, unknown>;
    const out: Record<string, ChallengeTemplateOverride> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!v || typeof v !== 'object') continue;
      const vv = v as Partial<ChallengeTemplateOverride>;
      if (typeof vv.bpm !== 'number') continue;
      if (typeof vv.level !== 'number') continue;
      if (!Array.isArray(vv.grid)) continue;
      out[k] = {
        bpm: vv.bpm,
        level: vv.level,
        grid: vv.grid as string[],
        ...(vv.gridsByLevel && { gridsByLevel: vv.gridsByLevel as Record<number, string[]> }),
      };
    }
    return out;
  } catch {
    return {};
  }
}

function writeTemplateOverrides(next: Record<string, ChallengeTemplateOverride>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEMPLATE_OVERRIDE_KEY, JSON.stringify(next));
  } catch {
    // localStorage 용량 초과 등은 조용히 무시 (UI는 현재 상태 유지)
  }
}

function TemplateSelector({
  templates,
  selectedId,
  onSelect,
  disabled,
}: {
  templates: ChallengeTemplate[];
  selectedId: string;
  onSelect: (tplId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-neutral-400">템플릿</span>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-100 border border-neutral-700 focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.id} · {t.title}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChallengePageContent() {
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

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATES_12[0]?.id ?? 'tpl_1');
  const [overrides, setOverrides] = useState<Record<string, ChallengeTemplateOverride>>(() => readTemplateOverrides());
  const [soundOn, setSoundOn] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const selectedTemplate = useMemo(() => {
    const base = TEMPLATES_12.find((t) => t.id === selectedTemplateId) ?? TEMPLATES_12[0]!;
    const override = overrides[selectedTemplateId];
    if (!override) return base;
    return { ...base, ...override };
  }, [selectedTemplateId]);

  const playbackRateLabel =
    typeof sourceBpm === 'number' && sourceBpm > 0 && selectedTemplate?.bpm > 0
      ? (selectedTemplate.bpm / sourceBpm).toFixed(2)
      : null;

  const handleTemplatePresetChange = useCallback(
    (data: { bpm: number; level: number; grid: string[]; gridsByLevel?: Record<number, string[]> }) => {
      setOverrides((prev) => {
        const next = {
          ...prev,
          [selectedTemplateId]: {
            bpm: data.bpm,
            level: data.level,
            grid: data.grid,
            ...(data.gridsByLevel && { gridsByLevel: data.gridsByLevel }),
          },
        };
        writeTemplateOverrides(next);
        toast.success('픽스 저장 완료');
        return next;
      });
    },
    [selectedTemplateId]
  );

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

  useEffect(() => {
    const handler = () => setIsFullscreen(document.fullscreenElement === gameContainerRef.current);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = gameContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
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
          <TemplateSelector templates={TEMPLATES_12} selectedId={selectedTemplateId} onSelect={setSelectedTemplateId} />
          <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm">
            <p className="font-medium text-neutral-300">
              {selectedTemplate.title} · BPM {selectedTemplate.bpm}
              {playbackRateLabel != null && sourceBpm != null && (
                <span className="ml-1 text-cyan-300">({playbackRateLabel}배)</span>
              )}
            </p>
          </div>
          {selectedTemplate.notes && (
            <p className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">노트</span> {selectedTemplate.notes}
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
        </aside>

        <main className="min-h-0 flex flex-col">
          {/* 실시간 뷰포트: blur/ring/shadow 없음 — 렉 최소화 (docs/IIWARMUP_스튜디오_렉최소화_설계.md). 전체화면 시 이 영역만 풀스크린. */}
          <div ref={gameContainerRef} className="min-h-[320px] flex-1 overflow-hidden bg-neutral-950">
            <SpokeduRhythmGame
              allowEdit={true}
              soundOn={soundOn}
              bgmPath={bgmPath || undefined}
              bgmSourceBpm={sourceBpm ?? undefined}
              initialBpm={selectedTemplate.bpm}
              initialLevel={selectedTemplate.level}
              initialGrid={selectedTemplate.grid}
              initialLevelData={selectedTemplate.gridsByLevel}
              onPresetChange={handleTemplatePresetChange}
            />
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
