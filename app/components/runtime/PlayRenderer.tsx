/**
 * PlayRenderer - 무상태
 * props로 받은 visuals 중 currentTick에 해당하는 event만 렌더
 * state/useEffect 금지
 */

import { PLAY_RULES } from '@/app/lib/constants/rules';
import type { PlayRendererProps, VisualEvent } from '@/app/lib/engine/play/types';

const TICK_MS = PLAY_RULES.TICK_MS;

export function PlayRenderer({ tMs, visuals, totalTicks }: PlayRendererProps) {
  const currentTick = Math.floor(tMs / TICK_MS);
  const eventsAtTick = visuals.filter((v) => v.tick === currentTick);

  // DROP: tick <= currentTick인 모든 DROP (누적 표시)
  const dropEvents = visuals.filter(
    (v): v is Extract<VisualEvent, { kind: 'DROP' }> => v.kind === 'DROP' && v.tick <= currentTick
  );

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

      {/* BINARY: 풀스크린 img */}
      {binary && !explain && (
        <img
          src={binary.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* REVEAL_WIPE: bg + fg 오버레이, clip-path inset 아래->위 */}
      {revealWipe && !explain && (
        <div className="absolute inset-0">
          <img
            src={revealWipe.bgSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
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
            />
          </div>
        </div>
      )}

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
                style={{ animationDuration: '0.5s' }}
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
