/**
 * play_asset_packs 조회 결과 → 컴파일러용 AssetIndex 생성
 * 20슬롯: 5 action × (set1 off/on, set2 off/on) = 20. DEFAULT_DRAFT 순서(say_hi, walk, throw, clap, punch)에 매핑.
 */

import { PLAY_SLOT_KEYS, type PlaySlotKey } from '@/app/lib/admin/assets/storagePaths';
import type { AssetIndex } from './types';

const MOTION_ORDER = ['say_hi', 'walk', 'throw', 'clap', 'punch'] as const;

export type PlayPackImages = Record<PlaySlotKey, string | null>;

/**
 * 20슬롯이 모두 채워져 있으면 AssetIndex 반환, 아니면 null
 */
export function buildPlayAssetIndex(
  images: PlayPackImages,
  getImageUrl: (path: string | null) => string,
  bgmPath: string | null
): AssetIndex | null {
  const motions: AssetIndex['motions'] = {};
  for (let i = 0; i < MOTION_ORDER.length; i++) {
    const motionId = MOTION_ORDER[i];
    const base = i * 4; // a1_set1_off, a1_set1_on, a1_set2_off, a1_set2_on
    const set1OffKey = PLAY_SLOT_KEYS[base] as PlaySlotKey;
    const set1OnKey = PLAY_SLOT_KEYS[base + 1] as PlaySlotKey;
    const set2OffKey = PLAY_SLOT_KEYS[base + 2] as PlaySlotKey;
    const set2OnKey = PLAY_SLOT_KEYS[base + 3] as PlaySlotKey;
    const s1o = images[set1OffKey];
    const s1n = images[set1OnKey];
    const s2o = images[set2OffKey];
    const s2n = images[set2OnKey];
    if (!s1o || !s1n || !s2o || !s2n) return null;
    const set1Off = getImageUrl(s1o);
    const set1On = getImageUrl(s1n);
    const set2Off = getImageUrl(s2o);
    const set2On = getImageUrl(s2n);
    if (!set1Off || !set1On || !set2Off || !set2On) return null;
    motions[motionId] = {
      off: set1Off,
      on: set1On,
      set1: { off: set1Off, on: set1On },
      set2: { off: set2Off, on: set2On },
    };
  }
  return {
    motions,
    ...(bgmPath ? { bgm: bgmPath } : {}),
  };
}
