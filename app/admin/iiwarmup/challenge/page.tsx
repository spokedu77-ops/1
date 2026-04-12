'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { SpokeduRhythmGame } from '@/app/components/runtime/SpokeduRhythmGame';
import { useChallengeBGM } from '@/app/lib/admin/hooks/useChallengeBGM';
import { getAllOverrides, putOverride, type TemplateOverrideEntry } from '@/app/lib/admin/assets/templateOverrideStore';
import {
  type ChallengeTemplate,
  CHALLENGE_TEMPLATES,
} from '@/app/program/iiwarmup/challenge/challengeTemplateDefaults';

export type { ChallengeTemplate };

type ChallengeTemplateOverride = TemplateOverrideEntry;


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
    bgmStartOffsetMs,
    setOffsetMs,
    loading: bgmLoading,
    error: bgmError,
    upload: uploadBgm,
    remove: removeBgm,
    select: selectBgm,
  } = useChallengeBGM();
  const bgmFileRef = useRef<HTMLInputElement>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(CHALLENGE_TEMPLATES[0]?.id ?? 'tpl_1');
  const [overrides, setOverrides] = useState<Record<string, ChallengeTemplateOverride>>({});
  const [overridesLoaded, setOverridesLoaded] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // IndexedDB에서 저장된 오버라이드 전체 로드 (마운트 시 1회)
  useEffect(() => {
    getAllOverrides()
      .then((data) => {
        setOverrides(data);
      })
      .catch(() => {
        // IndexedDB 읽기 실패 시 빈 오버라이드로 진행 (기본값 사용)
      })
      .finally(() => {
        setOverridesLoaded(true);
      });
  }, []);

  const selectedTemplate = useMemo(() => {
    const base = CHALLENGE_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? CHALLENGE_TEMPLATES[0]!;
    const override = overrides[selectedTemplateId];
    if (!override) return base;
    return { ...base, ...override };
  }, [selectedTemplateId, overrides]);

  const playbackRateLabel =
    typeof sourceBpm === 'number' && sourceBpm > 0 && selectedTemplate?.bpm > 0
      ? (selectedTemplate.bpm / sourceBpm).toFixed(2)
      : null;

  const handleTemplatePresetChange = useCallback(
    (data: { bpm: number; level: number; grid: string[]; gridsByLevel?: Record<number, string[]> }) => {
      const override: ChallengeTemplateOverride = {
        bpm: data.bpm,
        level: data.level,
        grid: data.grid,
        ...(data.gridsByLevel && { gridsByLevel: data.gridsByLevel }),
      };

      // 즉시 React 상태 반영 (낙관적 업데이트)
      setOverrides((prev) => ({ ...prev, [selectedTemplateId]: override }));

      // IndexedDB에 비동기 저장 — 성공/실패 모두 토스트로 안내
      putOverride(selectedTemplateId, override)
        .then(() => toast.success('픽스 저장 완료'))
        .catch(() => toast.error('저장 실패 — 브라우저 저장소를 확인해주세요'));
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
          <TemplateSelector templates={CHALLENGE_TEMPLATES} selectedId={selectedTemplateId} onSelect={setSelectedTemplateId} />
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
            <div className="mt-2">
              <label className="text-xs font-medium text-neutral-400">BGM 시작 오프셋 (ms)</label>
              <p className="mt-0.5 text-[11px] text-neutral-500">첫 비트를 화면 비트에 맞출 때 조정. 저장 시 DB 반영.</p>
              <input
                type="number"
                min={0}
                max={600000}
                step={1}
                value={bgmStartOffsetMs}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n) && n >= 0) setOffsetMs(Math.round(n));
                }}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200"
              />
            </div>
            {bgmLoading && <p className="mt-1 text-xs text-amber-400">BGM 로딩 중…</p>}
          </section>
        </aside>

        <main className="min-h-0 flex flex-col">
          {/* 실시간 뷰포트: blur/ring/shadow 없음 — 렉 최소화. 전체화면 시 이 영역만 풀스크린. */}
          <div ref={gameContainerRef} className="min-h-[320px] flex-1 overflow-hidden bg-neutral-950">
            {!overridesLoaded ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-neutral-500">
                저장된 설정 불러오는 중…
              </div>
            ) : (
              <SpokeduRhythmGame
                key={selectedTemplateId}
                allowEdit={true}
                soundOn={soundOn}
                bgmPath={bgmPath || undefined}
                bgmSourceBpm={sourceBpm ?? undefined}
                bgmStartOffsetMs={bgmStartOffsetMs}
                initialBpm={selectedTemplate.bpm}
                initialLevel={selectedTemplate.level}
                initialGrid={selectedTemplate.grid}
                initialLevelData={selectedTemplate.gridsByLevel}
                onPresetChange={handleTemplatePresetChange}
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
