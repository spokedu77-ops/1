'use client';

/**
 * 전환 구간 오버레이 (인지적 예열)
 * 호흡 가이드 + 다음 단계 안내
 */
export interface BridgeOverlayProps {
  /** 남은 초 */
  secondsLeft: number;
  /** 다음 단계 이름 (교육용어: 띵크, 챌린지, 플로우) */
  nextPhase: string;
  /** 다음 단계 보조 설명 (인지, 리듬, 몰입 등) */
  nextPhaseSub?: string;
  /** 스킵 버튼 노출 */
  onSkip?: () => void;
}

export function BridgeOverlay({ secondsLeft, nextPhase, nextPhaseSub, onSkip }: BridgeOverlayProps) {
  const description =
    nextPhase === '띵크' || nextPhase === 'Think'
      ? '색을 이용한 인지 활동입니다. 준비되면 시작해요.'
      : nextPhase === '챌린지' || nextPhase === 'Challenge'
        ? '리듬에 맞춰 움직이는 챌린지입니다. 잠시 후 시작해요.'
        : nextPhase === '플로우' || nextPhase === 'Flow'
          ? '몰입 단계입니다. 잠시 후 시작해요.'
          : `다음: ${nextPhase}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-950 via-black to-neutral-950 text-white">
      {/* subtle radial glow behind countdown */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_45%,rgb(6_182_212_/0.15),transparent)]" />
      <div className="relative z-10 text-center px-4">
        <p className="mb-4 text-lg text-neutral-300 max-w-md mx-auto md:text-xl">{description}</p>
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500">시작까지</p>
        <p
          className="mb-6 text-8xl font-black tabular-nums tracking-tight text-white drop-shadow-[0_0_30px_rgba(6,182,212,0.3)] md:text-9xl"
          style={{ fontFamily: "'Black Han Sans', sans-serif" }}
        >
          {secondsLeft}
        </p>
        <p className="text-base font-semibold text-cyan-400 md:text-lg">
          다음: {nextPhase}{nextPhaseSub ? ` (${nextPhaseSub})` : ''}
        </p>
        {/* 호흡 원 - 부드러운 breathe 애니메이션 */}
        <div
          className="mx-auto mt-8 h-28 w-28 rounded-full border-2 border-cyan-500/40 bg-cyan-500/5 bridge-breathe"
          aria-hidden
        />
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="mt-8 min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-150 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="바로 시작"
          >
            바로 시작
          </button>
        )}
      </div>
    </div>
  );
}
