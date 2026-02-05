/**
 * PlayRenderer - 무상태
 * props로 받은 visuals 중 currentTick에 해당하는 event만 렌더
 * state/useEffect 금지
 */

import { PLAY_RULES } from '@/app/lib/constants/rules';
import type { PlayRendererProps, VisualEvent } from '@/app/lib/engine/play/types';

const TICK_MS = PLAY_RULES.TICK_MS;
const DROP_WINDOW_TICKS = 8;
const DROP_MAX_PER_TICK = 3;
const { EXPLAIN, SET, TRANSITION } = PLAY_RULES.TICKS;
const BLOCK_TICKS = EXPLAIN + SET + SET + TRANSITION; // 50

/** SET 구간 내 setOffset(0..19)별 강·중·약 가중치. action tick에서만 사용. */
function getIntensityWeight(currentTick: number): number {
  const localTick = currentTick % BLOCK_TICKS;
  let setOffset: number;
  if (localTick >= EXPLAIN && localTick < EXPLAIN + SET) {
    setOffset = localTick - EXPLAIN; // set1: 0..19
  } else if (localTick >= EXPLAIN + SET && localTick < EXPLAIN + SET + SET) {
    setOffset = localTick - (EXPLAIN + SET); // set2: 0..19
  } else {
    return 1;
  }
  if (setOffset <= 6) return 1.0;
  if (setOffset <= 13) return 1.06;
  return 1.1;
}

const IMPACT_CLAMP = { scale: [1, 1.07] as const, contrast: [1, 1.06] as const, brightness: [1, 1.06] as const };
function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

/** action tick일 때만 미세 임팩트(scale/contrast/brightness). rest/explain/transition에는 1,1,1. 과자극 방지 clamp 적용. */
function getActionImpact(currentTick: number, isAction: boolean): { scale: number; contrast: number; brightness: number } {
  if (!isAction) return { scale: 1, contrast: 1, brightness: 1 };
  const w = getIntensityWeight(currentTick);
  return {
    scale: clamp(1.02 * w, IMPACT_CLAMP.scale[0], IMPACT_CLAMP.scale[1]),
    contrast: clamp(1.02 * w, IMPACT_CLAMP.contrast[0], IMPACT_CLAMP.contrast[1]),
    brightness: clamp(1.02 * w, IMPACT_CLAMP.brightness[0], IMPACT_CLAMP.brightness[1]),
  };
}

export function PlayRenderer({ tMs, visuals, totalTicks }: PlayRendererProps) {
  const currentTick = Math.floor(tMs / TICK_MS);
  // 단일 순회: eventsAtTick + dropInWindow 동시 수집 (filter 2회 → 1회)
  const eventsAtTick: VisualEvent[] = [];
  const dropInWindow: Extract<VisualEvent, { kind: 'DROP' }>[] = [];
  for (const v of visuals) {
    if (v.tick === currentTick) eventsAtTick.push(v);
    if (v.kind === 'DROP' && v.tick <= currentTick && v.tick >= currentTick - DROP_WINDOW_TICKS) dropInWindow.push(v);
  }

  // DROP: objIndex 중복 시 최신만 + tick당 최대 N개 (로직 유지)
  const byKey = new Map<string, Extract<VisualEvent, { kind: 'DROP' }>>();
  for (const ev of dropInWindow) {
    const k = `${ev.blockIndex}-${ev.setIndex}-${ev.objIndex}`;
    const cur = byKey.get(k);
    if (!cur || ev.tick > cur.tick) byKey.set(k, ev);
  }
  const deduped = [...byKey.values()].sort((a, b) => a.tick - b.tick);
  const byTick = new Map<number, Extract<VisualEvent, { kind: 'DROP' }>[]>();
  for (const ev of deduped) {
    const arr = byTick.get(ev.tick) ?? [];
    if (arr.length < DROP_MAX_PER_TICK) arr.push(ev);
    byTick.set(ev.tick, arr);
  }
  const dropEvents = [...byTick.values()].flat().sort((a, b) => a.tick - b.tick);

  const binary = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'BINARY' }> => v.kind === 'BINARY');
  const revealWipe = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'REVEAL_WIPE' }> => v.kind === 'REVEAL_WIPE');
  const explain = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'EXPLAIN' }> => v.kind === 'EXPLAIN');
  const transition = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'TRANSITION' }> => v.kind === 'TRANSITION');

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-900">
      {/* EXPLAIN: 텍스트/아이콘만 (사진 금지) */}
      {explain && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          <span className="text-2xl font-bold text-white">{explain.label}</span>
          <span className="text-sm text-neutral-400">{explain.motionId}</span>
        </div>
      )}

      {/* BINARY: 풀스크린 img (action tick에서만 미세 임팩트) */}
      {binary && !explain && (() => {
        const impact = getActionImpact(currentTick, binary.isActionPhase === true);
        return (
          <img
            src={binary.src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: `scale(${impact.scale})`,
              transformOrigin: 'center center',
              filter: `contrast(${impact.contrast}) brightness(${impact.brightness})`,
            }}
          />
        );
      })()}

      {/* REVEAL_WIPE: bg + fg 오버레이 (action phase에서만 미세 임팩트) */}
      {revealWipe && !explain && (() => {
        const impact = getActionImpact(currentTick, revealWipe.phase === 'action');
        const imgStyle = {
          transform: `scale(${impact.scale})`,
          transformOrigin: 'center center' as const,
          filter: `contrast(${impact.contrast}) brightness(${impact.brightness})`,
        };
        return (
          <div className="absolute inset-0">
            <img
              src={revealWipe.bgSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={imgStyle}
            />
            <div
              className="absolute inset-0"
              style={{
                clipPath: `inset(${(1 - revealWipe.progress) * 100}% 0 0 0)`,
              }}
            >
              <img
                src={revealWipe.fgSrc}
                alt=""
                className="h-full w-full object-cover"
                style={imgStyle}
              />
            </div>
          </div>
        );
      })()}

      {/* DROP: obj 이미지 위->아래 translateY 0.5s, key=tick로 애니메이션 리스타트 */}
      {dropEvents.length > 0 && !explain && !binary && !revealWipe && !transition && (
        <div className="absolute inset-0">
          {dropEvents[0]?.bgSrc && (
            <img
              src={dropEvents[0].bgSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {dropEvents.map((ev) => (
            <div
              key={`${ev.blockIndex}-${ev.setIndex}-${ev.tick}-${ev.objIndex}`}
              className="absolute left-1/2 top-0 flex h-24 w-24 -translate-x-1/2 justify-center"
            >
              <img
                src={ev.objSrc}
                alt=""
                className="h-full w-auto object-contain animate-drop"
                style={{
                  animationDuration: '0.5s',
                  animationTimingFunction: 'cubic-bezier(0.2, 0, 0.2, 1)',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* TRANSITION: 빈 화면 또는 간단 표시 */}
      {transition && !explain && !binary && !revealWipe && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
          <span className="text-sm text-neutral-500">전환</span>
        </div>
      )}

      {/* 기본: 아무것도 없을 때 */}
      {!explain && !binary && !revealWipe && dropEvents.length === 0 && !transition && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-neutral-600">대기</span>
        </div>
      )}
    </div>
  );
}
