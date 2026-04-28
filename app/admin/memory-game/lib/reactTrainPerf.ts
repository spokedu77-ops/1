export type ReactTrainPerfProfile = 'high' | 'mid' | 'low';

function readPerfOverride(): ReactTrainPerfProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get('perf')?.trim().toLowerCase();
    if (v === 'low' || v === 'mid' || v === 'high') return v;
  } catch {
    // ignore
  }
  return null;
}

/**
 * SPOMOVE 시지각 반응(캔버스)용 저사양 자동 감지.
 * - 절대 정확한 “성능 점수”는 아니고, 체감 렉을 줄이기 위한 보수적 휴리스틱이다.
 */
export function getReactTrainPerfProfile(): ReactTrainPerfProfile {
  if (typeof window === 'undefined') return 'high';

  const override = readPerfOverride();
  if (override) return override;

  // 사용자가 OS에서 모션을 줄이면, 이펙트 비용도 같이 낮춘다.
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return 'low';
  } catch {
    // ignore
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  // 데이터 절약 모드면 무조건 보수적으로
  if (nav.connection?.saveData) return 'low';

  const cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 8;
  const mem = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8;

  // 모바일/터치 환경은 GPU 편차가 커서 한 단계 보수적으로
  let isCoarsePointer = false;
  try {
    isCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  } catch {
    // ignore
  }

  // 매우 보수적인 low 기준(학교 현장/노트북/구형 태블릿 대비)
  if (mem <= 2 || cores <= 2) return 'low';
  if (mem <= 4 && cores <= 4) return 'low';
  if (isCoarsePointer && (mem <= 4 || cores <= 4)) return 'low';

  if (mem <= 4 || cores <= 4) return 'mid';
  if (isCoarsePointer && (mem <= 8 || cores <= 6)) return 'mid';

  // 느린 네트워크 타입은 렌더와 무관하지만, 기기가 약한 편일 확률이 높아 mid로
  const eff = nav.connection?.effectiveType;
  if (eff === 'slow-2g' || eff === '2g') return 'mid';

  return 'high';
}

export function perfShadowMul(profile: ReactTrainPerfProfile): number {
  if (profile === 'low') return 0.35;
  if (profile === 'mid') return 0.65;
  return 1;
}

export function perfParticleBudget(profile: ReactTrainPerfProfile): { maxParticles: number; burstColored: number; burstWhite: number } {
  if (profile === 'low') return { maxParticles: 220, burstColored: 18, burstWhite: 4 };
  if (profile === 'mid') return { maxParticles: 320, burstColored: 28, burstWhite: 6 };
  return { maxParticles: 420, burstColored: 38, burstWhite: 8 };
}

export function perfFlashMaxAliveBubbles(profile: ReactTrainPerfProfile): number {
  // FLASH(2단계)는 겹침이 심하면 보기/조작이 어렵고, 너무 적으면 난이도가 급격히 내려간다.
  // 따라서 “최대 2개”로 고정해 리듬과 난이도를 균형 맞춘다.
  void profile;
  return 2;
}

export function perfUseBackdropBlur(profile: ReactTrainPerfProfile): boolean {
  // backdrop-filter는 일부 iGPU에서 매우 비싸다.
  return profile !== 'low';
}
