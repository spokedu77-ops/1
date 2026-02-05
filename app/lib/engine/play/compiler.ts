/**
 * PLAY v1 컴파일러
 * 유일한 랜덤/풀 결정 지점. Date, Math.random 사용 금지.
 * 입력: PlayDraft + AssetIndex + seed + policy + shutterPoolTag?
 * 출력: ResolvedPlayDraft (모든 imageId 확정)
 */

import { PlayDraftSchema, type PlayDraft, type PlayBlock, type SetOperator } from '@/app/lib/constants/schemas';
import { MOTION_IDS, MOTION_OPERATOR_MAP, isOperatorAllowed, type MotionId } from './presets';
import type { AssetIndex, ResolvedBlock, ResolvedPlayDraft } from './types';

/** 결정적 PRNG (mulberry32) */
function createSeededRandom(seed: number): () => number {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0; // mulberry32
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CompilerInput {
  draft: PlayDraft;
  assetIndex: AssetIndex;
  seed: number;
  policy?: 'presets';
  shutterPoolTag?: string;
  /** 배경 풀 (shutterPoolTag로 필터 후 선택) */
  backgroundPool?: string[];
}

/**
 * PlayDraft를 ResolvedPlayDraft로 컴파일
 * - poolTag 기반 bg 선택/랜덤
 * - policy(presets) 기반 허용 패턴 검증
 * - 모든 imageId 확정
 */
export function compile(input: CompilerInput): ResolvedPlayDraft {
  const { draft, assetIndex, seed, policy = 'presets', shutterPoolTag, backgroundPool } = input;

  const validated = PlayDraftSchema.parse(draft);
  const random = createSeededRandom(seed);

  if (policy === 'presets') {
    for (const block of validated.blocks) {
      const motionId = block.motionId as MotionId;
      if (!MOTION_IDS.includes(motionId)) {
        throw new Error(`Invalid motionId: ${motionId}. Must be one of ${MOTION_IDS.join(', ')}`);
      }
      const pattern = MOTION_OPERATOR_MAP[motionId];
      if (!isOperatorAllowed(block.set1.operator, pattern.set1)) {
        throw new Error(`Motion ${motionId} set1: operator ${JSON.stringify(block.set1.operator)} not allowed`);
      }
      if (!isOperatorAllowed(block.set2.operator, pattern.set2)) {
        throw new Error(`Motion ${motionId} set2: operator ${JSON.stringify(block.set2.operator)} not allowed`);
      }
    }
  }

  const blocks: ResolvedBlock[] = validated.blocks.map((block: PlayBlock) => {
    const motionAssets = assetIndex.motions[block.motionId];
    if (!motionAssets) {
      throw new Error(`Missing assets for motionId: ${block.motionId}`);
    }
    const { off, on, set1: set1Assets, set2: set2Assets, frames, objects, bgSrc, fgSrc } = motionAssets;
    const imageIds1 = set1Assets ?? { off, on };
    const imageIds2 = set2Assets ?? { off, on };

    const baseSet = (op: SetOperator, imageIds: { off: string; on: string }) => ({
      operator: op,
      imageIds,
      ...(frames?.length ? { frames } : undefined),
      ...(objects?.length ? { objects } : undefined),
      ...(bgSrc ? { bgSrc } : undefined),
      ...(fgSrc ? { fgSrc } : undefined),
    });

    return {
      motionId: block.motionId,
      set1: baseSet(block.set1.operator, imageIds1),
      set2: baseSet(block.set2.operator, imageIds2),
    };
  });

  let backgroundUrl: string | undefined = assetIndex.background;
  if (shutterPoolTag && backgroundPool && backgroundPool.length > 0) {
    const filtered = backgroundPool.filter((p) => p.includes(shutterPoolTag));
    const pool = filtered.length > 0 ? filtered : backgroundPool;
    const idx = Math.floor(random() * pool.length);
    backgroundUrl = pool[idx];
  }

  return {
    blocks,
    backgroundUrl,
    bgmPath: assetIndex.bgm,
    sfxPath: assetIndex.sfx,
  };
}
