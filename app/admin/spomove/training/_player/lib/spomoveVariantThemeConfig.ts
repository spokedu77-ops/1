/**
 * SPOMOVE 변형 색지각 — 테마·팩 ID·Hub 섹션 (트레이닝·Asset Hub 공용)
 */

export const SPOMOVE_VARIANT_THEME_LS_KEY = 'spomove_variant_training_theme';

export type SpomoveColorThemeId = 'color' | 'fruit' | 'vehicle' | 'emotion' | 'animal' | 'nature' | 'food';

export const SPOMOVE_COLOR_THEME_ORDER: SpomoveColorThemeId[] = ['emotion', 'fruit', 'animal', 'nature', 'food', 'color', 'vehicle'];

export const SPOMOVE_COLOR_THEME_LABELS: Record<SpomoveColorThemeId, string> = {
  color: '색상',
  fruit: '과일',
  vehicle: '탈 것',
  emotion: '감정',
  animal: '동물',
  nature: '자연물',
  food: '음식',
};

export const SPOMOVE_VARIANT_VEHICLE_PACK_ID = 'spomove_variant_vehicles';
export const SPOMOVE_VARIANT_EMOTION_PACK_ID = 'spomove_variant_emotions';
export const SPOMOVE_VARIANT_ANIMAL_PACK_ID = 'spomove_variant_animals';
export const SPOMOVE_VARIANT_NATURE_PACK_ID = 'spomove_variant_nature';
export const SPOMOVE_VARIANT_FOOD_PACK_ID = 'spomove_variant_food';

export const SPOMOVE_THEMED_SLOT_COUNT = 8 as const;

export type SpomoveThemedStorageSubfolder =
  | 'spomove_variant_vehicles'
  | 'spomove_variant_emotions'
  | 'spomove_variant_animals'
  | 'spomove_variant_nature'
  | 'spomove_variant_food';

export type SpomoveThemedPackDef = {
  packId: string;
  packName: string;
  subfolder: SpomoveThemedStorageSubfolder;
  slotLabels: readonly string[];
  intro: string;
};

export const SPOMOVE_THEMED_PACK_BY_THEME: Record<
  Exclude<SpomoveColorThemeId, 'color' | 'fruit'>,
  SpomoveThemedPackDef
> = {
  vehicle: {
    packId: SPOMOVE_VARIANT_VEHICLE_PACK_ID,
    packName: 'SPOMOVE 색지각 탈 것',
    subfolder: 'spomove_variant_vehicles',
    slotLabels: [
      '1. 자전거 (빨강)',
      '2. 버스 (노랑)',
      '3. 기차 (초록)',
      '4. 배 (파랑)',
      '5. 오토바이 (빨강)',
      '6. 택시 (노랑)',
      '7. 트럭 (초록)',
      '8. 비행기 (파랑)',
    ],
    intro:
      '탈 것 8슬롯 — 1~4=각 패드(빨·노·초·파), 5~8=같은 패드 두 번째. 업로드한 슬롯만 훈련에 반영됩니다.',
  },
  emotion: {
    packId: SPOMOVE_VARIANT_EMOTION_PACK_ID,
    packName: 'SPOMOVE 색지각 감정',
    subfolder: 'spomove_variant_emotions',
    slotLabels: [
      '1. 화남 (빨강)',
      '2. 기쁨 (노랑)',
      '3. 평온 (초록)',
      '4. 놀람 (파랑)',
      '5. 설렘 (빨강)',
      '6. 지루함 (노랑)',
      '7. 슬픔 (초록)',
      '8. 두려움 (파랑)',
    ],
    intro: '감정 8슬롯 — 1~4=각 패드, 5~8=두 번째(1·5 빨 / 2·6 노 / 3·7 초 / 4·8 파).',
  },
  animal: {
    packId: SPOMOVE_VARIANT_ANIMAL_PACK_ID,
    packName: 'SPOMOVE 색지각 동물',
    subfolder: 'spomove_variant_animals',
    slotLabels: [
      '1. 강아지 (빨강)',
      '2. 병아리 (노랑)',
      '3. 개구리 (초록)',
      '4. 고래 (파랑)',
      '5. 여우 (빨강)',
      '6. 토끼 (노랑)',
      '7. 펭귄 (초록)',
      '8. 돌고래 (파랑)',
    ],
    intro: '동물 8슬롯 — 1~4=각 패드, 5~8=두 번째. 업로드·반영 방식은 탈 것 탭과 동일합니다.',
  },
  nature: {
    packId: SPOMOVE_VARIANT_NATURE_PACK_ID,
    packName: 'SPOMOVE 색지각 자연물',
    subfolder: 'spomove_variant_nature',
    slotLabels: [
      '1. 꽃 (빨강)',
      '2. 해 (노랑)',
      '3. 나무 (초록)',
      '4. 구름 (파랑)',
      '5. 모래 (빨강)',
      '6. 나뭇잎 (노랑)',
      '7. 잎 (초록)',
      '8. 파도 (파랑)',
    ],
    intro: '자연물 8슬롯 — 1~4=각 패드, 5~8=두 번째. 업로드·반영 방식은 탈 것 탭과 동일합니다.',
  },
  food: {
    packId: SPOMOVE_VARIANT_FOOD_PACK_ID,
    packName: 'SPOMOVE 색지각 음식',
    subfolder: 'spomove_variant_food',
    slotLabels: [
      '1. 사과 (빨강)',
      '2. 바나나 (노랑)',
      '3. 오이 (초록)',
      '4. 물고기 (파랑)',
      '5. 딸기 (빨강)',
      '6. 치즈 (노랑)',
      '7. 샐러드 (초록)',
      '8. 빵 (파랑)',
    ],
    intro: '음식 8슬롯 — 1~4=각 패드, 5~8=두 번째. 업로드·반영 방식은 탈 것 탭과 동일합니다.',
  },
};

/** Asset Hub 색지각 — 6개 섹션 (1: 테마·미리보기, 2~6: 자산 편집) */
export const SPOMOVE_COLOR_HUB_SECTIONS: {
  id: 'theme' | SpomoveColorThemeId;
  tabLabel: string;
}[] = [
  { id: 'theme', tabLabel: '1. 테마' },
  { id: 'fruit', tabLabel: '2. 과일' },
  { id: 'vehicle', tabLabel: '3. 탈 것' },
  { id: 'emotion', tabLabel: '4. 감정' },
  { id: 'animal', tabLabel: '5. 동물' },
  { id: 'nature', tabLabel: '6. 자연물' },
  { id: 'food', tabLabel: '7. 음식' },
];

export function parseStoredVariantTheme(raw: string | null): SpomoveColorThemeId {
  if (raw === 'color' || raw === 'fruit' || raw === 'vehicle' || raw === 'emotion' || raw === 'animal' || raw === 'nature' || raw === 'food') return raw;
  return 'color';
}
