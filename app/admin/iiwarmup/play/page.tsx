'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { compile, buildTimeline } from '@/app/lib/engine/play';
import { buildPlayAssetIndex } from '@/app/lib/engine/play/buildPlayAssetIndex';
import { RuntimePlayer } from '@/app/components/runtime/RuntimePlayer';
import type { PlayTimeline, AudioEvent } from '@/app/lib/engine/play/types';
import { generateWeekKey } from '@/app/lib/admin/assets/storagePaths';
import { usePlayAssetPack } from '@/app/lib/admin/hooks/usePlayAssetPack';
import { startBGM, stopBGM, playSFX, stopAllSFX } from '@/app/lib/admin/engines/think150/think150Audio';
import { PLAY_RULES } from '@/app/lib/constants/rules';
import { PLAY_SLOT_KEYS, type PlaySlotKey } from '@/app/lib/admin/assets/storagePaths';
import type { SetOperator } from '@/app/lib/constants/schemas';
import {
  MOTION_IDS,
  MOTION_LABELS,
  MOTION_OPERATOR_MAP,
  type MotionId,
} from '@/app/lib/engine/play/presets';

const MOTION_ORDER: readonly string[] = ['say_hi', 'walk', 'throw', 'clap', 'punch'];

const DEFAULT_DRAFT = {
  blocks: [
    { motionId: 'say_hi', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'PROGRESSIVE' as const, style: 'wipe' as const } } },
    { motionId: 'walk', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
    { motionId: 'throw', set1: { operator: { type: 'DROP' as const } }, set2: { operator: { type: 'DROP' as const } } },
    { motionId: 'clap', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
    { motionId: 'punch', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
  ],
};

type AllowedPattern = 'BINARY' | 'DROP' | 'PROGRESSIVE' | { type: 'PROGRESSIVE'; style: 'wipe' | 'frames' };

function patternToOperators(patterns: AllowedPattern[]): SetOperator[] {
  const seen = new Set<string>();
  const out: SetOperator[] = [];
  for (const p of patterns) {
    if (p === 'BINARY' && !seen.has('BINARY')) {
      seen.add('BINARY');
      out.push({ type: 'BINARY' });
    } else if (p === 'DROP' && !seen.has('DROP')) {
      seen.add('DROP');
      out.push({ type: 'DROP' });
    } else if (p === 'PROGRESSIVE' || (typeof p === 'object' && p.type === 'PROGRESSIVE')) {
      const style = typeof p === 'object' ? p.style : 'wipe';
      const k = `PROGRESSIVE:${style}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ type: 'PROGRESSIVE', style });
      }
    }
  }
  if (patterns.some((p) => p === 'PROGRESSIVE' || (typeof p === 'object' && p.type === 'PROGRESSIVE'))) {
    if (!seen.has('PROGRESSIVE:wipe')) out.push({ type: 'PROGRESSIVE', style: 'wipe' });
    if (!seen.has('PROGRESSIVE:frames')) out.push({ type: 'PROGRESSIVE', style: 'frames' });
  }
  return out.length ? out : [{ type: 'BINARY' }];
}

function opKey(op: SetOperator): string {
  return op.type === 'PROGRESSIVE' ? `PROGRESSIVE:${op.style}` : op.type;
}

function opLabel(op: SetOperator): string {
  return op.type === 'PROGRESSIVE' ? `PROGRESSIVE(${op.style})` : op.type;
}

function opFromKey(key: string): SetOperator {
  if (key === 'BINARY') return { type: 'BINARY' };
  if (key === 'DROP') return { type: 'DROP' };
  if (key.startsWith('PROGRESSIVE:')) return { type: 'PROGRESSIVE', style: key.slice(11) as 'wipe' | 'frames' };
  return { type: 'BINARY' };
}

type PackStatus = 'loading' | 'empty' | 'error' | 'ready';

function filledImageCount(images: Record<PlaySlotKey, string | null>): number {
  return PLAY_SLOT_KEYS.filter((k) => !!images[k]).length;
}

function motionSlotStatus(
  images: Record<PlaySlotKey, string | null>,
  motionIndex: number
): [boolean, boolean, boolean, boolean] {
  const base = motionIndex * 4;
  return [
    !!images[PLAY_SLOT_KEYS[base] as PlaySlotKey],
    !!images[PLAY_SLOT_KEYS[base + 1] as PlaySlotKey],
    !!images[PLAY_SLOT_KEYS[base + 2] as PlaySlotKey],
    !!images[PLAY_SLOT_KEYS[base + 3] as PlaySlotKey],
  ];
}

function motionHasAssets(motionId: string, images: Record<PlaySlotKey, string | null>): boolean {
  const i = MOTION_ORDER.indexOf(motionId);
  if (i < 0) return false;
  const [a, b, c, d] = motionSlotStatus(images, i);
  return !!(a && b && c && d);
}

type ComposerBlock = { motionId: string; set1: { operator: SetOperator }; set2: { operator: SetOperator } };

const initialComposerDraft: ComposerBlock[] = DEFAULT_DRAFT.blocks.map((b) => ({
  motionId: b.motionId,
  set1: { operator: b.set1.operator },
  set2: { operator: b.set2.operator },
}));

export default function PlayStudioPage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(1);
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(1);
  const [seed, setSeed] = useState(() => Date.now());
  const [debug, setDebug] = useState(true);
  const [composerDraft, setComposerDraft] = useState<ComposerBlock[]>(() => initialComposerDraft);

  const weekKey = useMemo(() => generateWeekKey(year, month, week), [year, month, week]);
  const { state, loading, error, tableMissing, getImageUrl } = usePlayAssetPack(year, month, week);

  const assetIndex = useMemo(
    () => buildPlayAssetIndex(state.images, getImageUrl, state.bgmPath),
    [state.images, state.bgmPath, getImageUrl]
  );

  const packStatus: PackStatus = useMemo(() => {
    if (loading) return 'loading';
    if (error || tableMissing) return 'error';
    return assetIndex ? 'ready' : 'empty';
  }, [loading, error, tableMissing, assetIndex]);

  const draftForCompile = useMemo(() => ({ blocks: composerDraft }), [composerDraft]);

  const timeline: PlayTimeline | null = useMemo(() => {
    if (!assetIndex) return null;
    try {
      const resolved = compile({
        draft: draftForCompile,
        assetIndex,
        seed,
        policy: 'presets',
      });
      return buildTimeline(resolved);
    } catch {
      return null;
    }
  }, [assetIndex, seed, draftForCompile]);

  const totalMs = timeline ? (timeline.totalTicks - 1) * PLAY_RULES.TICK_MS : 0;
  const filledCount = useMemo(() => filledImageCount(state.images), [state.images]);
  const canPlay = !!(timeline && packStatus === 'ready');

  useEffect(() => {
    return () => {
      stopBGM();
      stopAllSFX();
    };
  }, []);

  const onAudioEvent = useCallback(
    (ev: AudioEvent) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PLAY] audioEvent=', ev.kind);
      }
      if (ev.kind === 'BGM_START' && ev.path) {
        startBGM(ev.path, 0, Math.max(0, totalMs)).catch(() => {});
      } else if (ev.kind === 'BGM_STOP') {
        stopBGM();
      } else if (ev.kind === 'SFX' && ev.path) {
        playSFX(ev.path).catch(() => {});
      }
    },
    [totalMs]
  );

  const placeholderMessage =
    packStatus === 'loading'
      ? '에셋 로딩 중…'
      : packStatus === 'empty'
        ? '에셋이 부족합니다. (20슬롯 이미지 + BGM 필요)'
        : packStatus === 'error'
          ? '에러 또는 테이블 미존재'
          : !timeline
            ? '컴파일 실패 — draft/assetIndex 정책 확인'
            : '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold">Play Studio</h2>
        <p className="mt-1 text-sm text-neutral-400">
          연도·주차 선택 → 해당 주차 에셋으로 compile → buildTimeline → RuntimePlayer
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-400">year</label>
            <input
              type="number"
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 font-mono text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
              min={2020}
              max={2030}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-400">month</label>
            <select
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-400">week</label>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    week === w ? 'bg-blue-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'
                  }`}
                  onClick={() => setWeek(w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-neutral-500 font-mono">{weekKey}</div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-400">seed</label>
            <input
              type="number"
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 font-mono text-sm"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || Date.now())}
            />
            <button
              type="button"
              className="mt-2 w-full rounded-lg bg-neutral-700 py-1.5 text-xs hover:bg-neutral-600"
              onClick={() => setSeed(Date.now())}
            >
              새 seed
            </button>
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={debug}
              onChange={(e) => setDebug(e.target.checked)}
            />
            <span className="text-sm text-neutral-400">디버그 오버레이</span>
          </label>

          {/* 준비 상태 패널 */}
          <div className="rounded-lg border border-neutral-700 p-3">
            <p className="mb-2 text-sm font-medium text-neutral-300">준비 상태</p>
            <p className="text-xs text-neutral-400">
              BGM: {state.bgmPath ? 'O' : 'X'}
            </p>
            <p className="text-xs text-neutral-400">
              Images: {filledCount}/20
            </p>
            {state.bgmPath && (
              <p className="mt-1 truncate font-mono text-[10px] text-neutral-500" title={state.bgmPath}>
                {state.bgmPath}
              </p>
            )}
            <div className="mt-2 space-y-1">
              {(['say_hi', 'walk', 'throw', 'clap', 'punch'] as const).map((motion, i) => {
                const [s1o, s1n, s2o, s2n] = motionSlotStatus(state.images, i);
                return (
                  <div key={motion} className="flex items-center gap-2 text-xs">
                    <span className="w-14 shrink-0 text-neutral-500">{motion}</span>
                    <span className={s1o ? 'text-green-500' : 'text-neutral-600'}>s1_off</span>
                    <span className={s1n ? 'text-green-500' : 'text-neutral-600'}>s1_on</span>
                    <span className={s2o ? 'text-green-500' : 'text-neutral-600'}>s2_off</span>
                    <span className={s2n ? 'text-green-500' : 'text-neutral-600'}>s2_on</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-neutral-500">
              EXPLAIN: 프리셋 텍스트(항상)
            </p>
            <p className="text-[10px] text-neutral-500">
              Intro/Outro: v1 엔진 미지원
            </p>
          </div>

          {/* Draft Composer */}
          <div className="rounded-lg border border-neutral-700 p-3">
            <p className="mb-2 text-sm font-medium text-neutral-300">Draft Composer</p>
            {composerDraft.map((block, idx) => {
              const pattern1 = MOTION_OPERATOR_MAP[block.motionId as MotionId]?.set1 ?? ['BINARY'];
              const pattern2 = MOTION_OPERATOR_MAP[block.motionId as MotionId]?.set2 ?? ['BINARY'];
              const opts1 = patternToOperators(pattern1);
              const opts2 = patternToOperators(pattern2);
              const isMotionTaken = (m: string) => composerDraft.some((b, j) => j !== idx && b.motionId === m);
              return (
                <div key={idx} className="mb-3 rounded bg-neutral-800/50 p-2">
                  <p className="mb-1 text-xs font-medium text-neutral-400">Block {idx + 1}</p>
                  <div className="space-y-1">
                    <select
                      className="w-full rounded bg-neutral-800 px-2 py-1 text-xs"
                      value={block.motionId}
                      onChange={(e) => {
                        const next = [...composerDraft];
                        next[idx] = {
                          ...next[idx]!,
                          motionId: e.target.value,
                          set1: { operator: { type: 'BINARY' } },
                          set2: { operator: { type: 'BINARY' } },
                        };
                        setComposerDraft(next);
                      }}
                    >
                      {MOTION_IDS.map((m) => {
                        const hasAssets = motionHasAssets(m, state.images);
                        const taken = isMotionTaken(m);
                        return (
                          <option
                            key={m}
                            value={m}
                            disabled={!hasAssets || taken}
                          >
                            {MOTION_LABELS[m]} {!hasAssets ? '(에셋 없음)' : taken ? '(선택됨)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 rounded bg-neutral-800 px-2 py-1 text-xs"
                        value={opKey(block.set1.operator)}
                        onChange={(e) => {
                          const next = [...composerDraft];
                          next[idx] = { ...next[idx]!, set1: { operator: opFromKey(e.target.value) } };
                          setComposerDraft(next);
                        }}
                      >
                        {opts1.map((op) => (
                          <option key={opKey(op)} value={opKey(op)}>{opLabel(op)}</option>
                        ))}
                      </select>
                      <select
                        className="flex-1 rounded bg-neutral-800 px-2 py-1 text-xs"
                        value={opKey(block.set2.operator)}
                        onChange={(e) => {
                          const next = [...composerDraft];
                          next[idx] = { ...next[idx]!, set2: { operator: opFromKey(e.target.value) } };
                          setComposerDraft(next);
                        }}
                      >
                        {opts2.map((op) => (
                          <option key={opKey(op)} value={opKey(op)}>{opLabel(op)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded bg-neutral-700 px-2 py-1 text-xs hover:bg-neutral-600"
                onClick={() => setComposerDraft(initialComposerDraft.map((b) => ({ ...b })))}
              >
                템플릿으로 리셋
              </button>
              <button
                type="button"
                className="rounded bg-neutral-700 px-2 py-1 text-xs hover:bg-neutral-600 disabled:opacity-50"
                disabled={MOTION_ORDER.filter((m) => motionHasAssets(m, state.images)).length < 5}
                onClick={() => {
                  const withAssets = MOTION_ORDER.filter((m) => motionHasAssets(m, state.images));
                  if (withAssets.length < 5) return;
                  const shuffled = [...withAssets].sort(() => Math.random() - 0.5).slice(0, 5);
                  const next: ComposerBlock[] = shuffled.map((motionId) => {
                    const pat = MOTION_OPERATOR_MAP[motionId as MotionId] ?? { set1: ['BINARY'], set2: ['BINARY'] };
                    const o1 = patternToOperators(pat.set1);
                    const o2 = patternToOperators(pat.set2);
                    return {
                      motionId,
                      set1: { operator: o1[Math.floor(Math.random() * o1.length)]! ?? { type: 'BINARY' } },
                      set2: { operator: o2[Math.floor(Math.random() * o2.length)]! ?? { type: 'BINARY' } },
                    };
                  });
                  setComposerDraft(next);
                }}
              >
                랜덤 구성
              </button>
            </div>
            <p className="mt-2 text-[10px] text-neutral-500">
              주차별 연출 저장(DB)은 미지원. 로컬 상태만 적용.
            </p>
          </div>
        </aside>

        <main>
          <div className="rounded-xl bg-neutral-900 p-3 ring-1 ring-neutral-800">
            {/* 재생 프레임: 항상 16:9 영역 */}
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-800">
              {canPlay ? (
                <RuntimePlayer
                  timeline={timeline!}
                  debug={debug}
                  onAudioEvent={onAudioEvent}
                  snapToTick
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                  <p className="text-sm text-neutral-400">{placeholderMessage}</p>
                  <p className="font-mono text-xs text-neutral-600">{weekKey}</p>
                </div>
              )}
            </div>

            {/* 컨트롤 바: ready && timeline 이면 RuntimePlayer 내부 버튼만 사용. 없을 때는 비활성 바 */}
            {!canPlay && (
              <div className="mt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-lg bg-neutral-700 px-3 py-2 text-sm opacity-60"
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-lg bg-neutral-700 px-3 py-2 text-sm opacity-60"
                  >
                    Pause
                  </button>
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-lg bg-neutral-700 px-3 py-2 text-sm opacity-60"
                  >
                    Reset
                  </button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  재생하려면 20슬롯 이미지 + BGM을 모두 업로드하세요.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
