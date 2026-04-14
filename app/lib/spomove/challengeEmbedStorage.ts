/**
 * SPOMOVE 훈련(메모리 게임) ↔ /program/iiwarmup/challenge 임베드 연동.
 * 같은 origin localStorage로 저장 — 코드 수정 없이 훈련 설정에서 바꿀 수 있음.
 */

import { buildEmbeddedChallengeLevelData } from '@/app/program/iiwarmup/challenge/challengeEmbeddedPreset';

export const SPOMOVE_CHALLENGE_EMBED_KEY = 'spomove_challenge_embed_v1';

export type SpomoveChallengeEmbedStored = {
  /** 사용할 Challenge 스튜디오 템플릿 id (예: tpl_1). IndexedDB 오버레이와 동일 키 */
  templateId?: string;
  /** 화면 BPM (100 / 120 / 150 / 180) */
  bpm?: number;
  /** 단계별 칸(8개) — 비어 있지 않은 칸만 기본값 위에 덮어씀 */
  imageUrlsByLevel?: Partial<Record<number, string[]>>;
};

export function getSpomoveChallengeEmbed(): SpomoveChallengeEmbedStored | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SPOMOVE_CHALLENGE_EMBED_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== 'object') return null;
    return p as SpomoveChallengeEmbedStored;
  } catch {
    return null;
  }
}

export function setSpomoveChallengeEmbed(data: SpomoveChallengeEmbedStored): void {
  try {
    localStorage.setItem(SPOMOVE_CHALLENGE_EMBED_KEY, JSON.stringify(data));
  } catch {
    /* quota 등 */
  }
}

export function clearSpomoveChallengeEmbed(): void {
  try {
    localStorage.removeItem(SPOMOVE_CHALLENGE_EMBED_KEY);
  } catch {
    /* ignore */
  }
}

/** 코드 프리셋(또는 스튜디오 기반 base) + 브라우저에 저장된 SPOMOVE 칸 URL 덮어쓰기 */
export function mergeSpomoveChallengeLevelData(
  baseArg?: Record<number, string[]>
): Record<number, string[]> {
  const base = baseArg ?? buildEmbeddedChallengeLevelData();
  const stored = getSpomoveChallengeEmbed();
  if (!stored?.imageUrlsByLevel) return base;
  const out: Record<number, string[]> = { ...base };
  for (let lv = 1; lv <= 4; lv++) {
    const urls = stored.imageUrlsByLevel[lv];
    if (!urls || !Array.isArray(urls)) continue;
    const row = [...(out[lv] ?? [])];
    for (let i = 0; i < 8; i++) {
      const u = urls[i]?.trim();
      if (u) row[i] = u;
    }
    out[lv] = row;
  }
  return out;
}

/** 리듬 UI 슬라이더와 동일 (SpokeduRhythmGame) */
export const CHALLENGE_DISPLAY_BPM_OPTIONS = [100, 120, 150, 180] as const;

export function getSpomoveChallengeEmbedBpm(): number | undefined {
  const b = getSpomoveChallengeEmbed()?.bpm;
  if (typeof b !== 'number' || !Number.isFinite(b) || b <= 0) return undefined;
  return b;
}

/** 원곡 BPM → 화면에 쓸 수 있는 가장 가까운 표시 BPM */
export function snapSourceBpmToDisplayBpm(source: number): number {
  return CHALLENGE_DISPLAY_BPM_OPTIONS.reduce((best, n) =>
    Math.abs(n - source) < Math.abs(best - source) ? n : best
  );
}

/**
 * 임베드 챌린지 화면 BPM.
 * - 로컬에 저장된 BPM이 있으면 그대로 사용(직접 지정)
 * - 없으면 관리자에 입력한 원곡 BPM에 맞춰 가장 가까운 100/120/150/180 (재생 속도 배율로 박자 정렬)
 * - 원곡 BPM도 없으면 100
 */
export function resolveChallengeProgramBpm(
  storedBpm: number | undefined,
  sourceBpm: number | null | undefined
): number {
  if (typeof storedBpm === 'number' && Number.isFinite(storedBpm) && storedBpm > 0) {
    return storedBpm;
  }
  if (typeof sourceBpm === 'number' && sourceBpm > 0) {
    return sourceBpm;
  }
  return 100;
}
