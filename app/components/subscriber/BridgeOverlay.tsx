'use client';

/**
 * 전환 구간 오버레이 (인지적 예열)
 * 호흡 가이드 + 다음 단계 안내
 */
export interface BridgeOverlayProps {
  /** 남은 초 */
  secondsLeft: number;
  /** 다음 단계 이름 */
  nextPhase: string;
  /** 스킵 버튼 노출 */
  onSkip?: () => void;
}

export function BridgeOverlay({ secondsLeft, nextPhase, onSkip }: BridgeOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-white">
      <div className="text-center">
        <p className="mb-2 text-lg text-neutral-400">휴식 및 다음 단계 준비</p>
        <p className="mb-6 text-4xl font-bold">{secondsLeft}</p>
        <p className="text-xl text-cyan-400">다음: {nextPhase}</p>
        {/* 호흡 원형 v0 - 단순 원 */}
        <div
          className="mx-auto mt-8 h-24 w-24 rounded-full border-4 border-cyan-500/50"
          style={{
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        {onSkip && (
          <button
            type="button"
            className="mt-8 rounded-lg bg-neutral-700 px-6 py-2 text-sm hover:bg-neutral-600"
            onClick={onSkip}
          >
            바로 시작
          </button>
        )}
      </div>
    </div>
  );
}
