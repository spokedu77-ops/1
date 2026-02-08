/**
 * PlayRenderer - 무상태
 * props로 받은 visuals 중 currentTick에 해당하는 event만 렌더
 * state/useEffect 금지
 */

import { PLAY_RULES } from '@/app/lib/constants/rules';
import type { PlayRendererProps, VisualEvent } from '@/app/lib/engine/play/types';

const TICK_MS = PLAY_RULES.TICK_MS;
const DROP_FALL_MS = 1000; // 1초 낙하
const DROP_WINDOW_TICKS = 8;
const DROP_LANES = 5;
/** 5레인 x 위치 (%, 왼쪽~오른쪽). laneIndex 0..4 */
const DROP_LANE_X_PERCENT = [10, 30, 50, 70, 90] as const;

export function PlayRenderer({ tMs, visuals, totalTicks }: PlayRendererProps) {
  const currentTick = Math.floor(tMs / TICK_MS);
  // 단일 순회: eventsAtTick + dropInWindow 동시 수집 (filter 2회 → 1회)
  const eventsAtTick: VisualEvent[] = [];
  const dropInWindow: Extract<VisualEvent, { kind: 'DROP' }>[] = [];
  for (const v of visuals) {
    if (v.tick === currentTick) eventsAtTick.push(v);
    if (v.kind === 'DROP' && v.tick <= currentTick && v.tick >= currentTick - DROP_WINDOW_TICKS) dropInWindow.push(v);
  }

  // DROP: 레인별 최신 1개 유지 (5레인 × 윈도우 내 최신)
  const byKey = new Map<string, Extract<VisualEvent, { kind: 'DROP' }>>();
  for (const ev of dropInWindow) {
    const laneIndex = 'laneIndex' in ev && typeof ev.laneIndex === 'number' ? ev.laneIndex : Math.min(Math.max(ev.objIndex, 0), DROP_LANES - 1);
    const k = `${ev.blockIndex}-${ev.setIndex}-${laneIndex}`;
    const cur = byKey.get(k);
    if (!cur || ev.tick > cur.tick) byKey.set(k, ev);
  }
  const deduped = [...byKey.values()].sort((a, b) => a.tick - b.tick);
  const byTick = new Map<number, Extract<VisualEvent, { kind: 'DROP' }>[]>();
  for (const ev of deduped) {
    const arr = byTick.get(ev.tick) ?? [];
    arr.push(ev);
    byTick.set(ev.tick, arr);
  }
  const dropEvents = [...byTick.values()].flat().sort((a, b) => a.tick - b.tick);

  const binary = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'BINARY' }> => v.kind === 'BINARY');
  const revealWipe = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'REVEAL_WIPE' }> => v.kind === 'REVEAL_WIPE');
  const explain = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'EXPLAIN' }> => v.kind === 'EXPLAIN');
  const transition = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'TRANSITION' }> => v.kind === 'TRANSITION');

  return (
    <div className="relative h-full w-full min-h-[320px] overflow-hidden rounded-lg bg-neutral-900">
      {/* DROP: 1초 낙하 */}
      <style>{`@keyframes dropFall { 0% { transform: translateY(0); } 100% { transform: translateY(70vh); } }`}</style>
      {/* EXPLAIN: 텍스트/아이콘만 (사진 금지) */}
      {explain && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          <span className="text-2xl font-bold text-white">{explain.label}</span>
          <span className="text-sm text-neutral-400">{explain.motionId}</span>
        </div>
      )}

      {/* BINARY: 500ms 틱별 이미지 (잘림 없이 전체 표시) */}
      {binary && !explain && (
        <img
          src={binary.src}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}

      {/* REVEAL_WIPE: 5단계 스냅, 블라인드 한 칸씩 올라가는 느낌. 이미지 잘림 없음 */}
      {revealWipe && !explain && (
        <div className="absolute inset-0">
          <img
            src={revealWipe.bgSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
          />
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: `inset(${(1 - revealWipe.progress) * 100}% 0 0 0)`,
            }}
          >
            <img
              src={revealWipe.fgSrc}
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* DROP: 5개 차례로 1초 낙하 */}
      {dropEvents.length > 0 && !explain && !binary && !revealWipe && !transition && (
        <div className="absolute inset-0">
          {dropEvents[0]?.bgSrc && (
            <img
              src={dropEvents[0].bgSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
          {dropEvents.map((ev) => {
            const lane = 'laneIndex' in ev && typeof ev.laneIndex === 'number' ? ev.laneIndex : Math.min(Math.max(ev.objIndex, 0), DROP_LANES - 1);
            const xPercent = DROP_LANE_X_PERCENT[lane];
            const spawnTick = ev.tick;
            const msSinceSpawn = (currentTick - spawnTick) * TICK_MS;
            const isFalling = msSinceSpawn < DROP_FALL_MS;
            const animationDelay = -msSinceSpawn;
            return (
            <div
              key={`${ev.blockIndex}-${ev.setIndex}-${ev.tick}-${ev.laneIndex ?? ev.objIndex}`}
              className="absolute flex h-24 w-24 justify-center"
              style={{
                top: '8%',
                left: `${xPercent}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <img
                src={ev.objSrc}
                alt=""
                className="h-full w-auto object-contain"
                style={
                  isFalling
                    ? { animation: `dropFall ${DROP_FALL_MS}ms linear forwards`, animationDelay: `${animationDelay}ms` }
                    : { transform: 'translateY(70vh)' }
                }
              />
            </div>
            );
          })}
        </div>
      )}

      {/* TRANSITION: 해당 block motion label + motionId (Draft Composer 연결) */}
      {transition && !explain && !binary && !revealWipe && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-800 p-4">
          <span className="text-lg font-bold text-white">{transition.label}</span>
          <span className="text-sm text-neutral-400">{transition.motionId}</span>
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
