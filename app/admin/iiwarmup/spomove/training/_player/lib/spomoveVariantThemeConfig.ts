/**
 * SPOMOVE 변형 색지각 — 테마·팩 ID·Hub 섹션 (트레이닝·Asset Hub 공용)
 */

export const SPOMOVE_VARIANT_THEME_LS_KEY = 'spomove_variant_training_theme';

export type SpomoveColorThemeId = 'color' | 'fruit' | 'vehicle' | 'emotion' | 'animal';

export const SPOMOVE_COLOR_THEME_ORDER: SpomoveColorThemeId[] = ['color', 'fruit', 'vehicle', 'animal', 'emotion'];

export const SPOMOVE_COLOR_THEME_LABELS: Record<SpomoveColorThemeId, string> = {
  color: '색상',
  fruit: '과일',
  vehicle: '탈 것',
  emotion: '감정',
  animal: '동물',
};

export const SPOMOVE_VARIANT_VEHICLE_PACK_ID = 'spomove_variant_vehicles';
export const SPOMOVE_VARIANT_EMOTION_PACK_ID = 'spomove_variant_emotions';
export const SPOMOVE_VARIANT_ANIMAL_PACK_ID = 'spomove_variant_animals';

export const SPOMOVE_THEMED_SLOT_COUNT = 8 as const;

export type SpomoveThemedStorageSubfolder =
  | 'spomove_variant_vehicles'
  | 'spomove_variant_emotions'
  | 'spomove_variant_animals';

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
      '자전거',
      '스쿠터',
      '자동차',
      '버스',
      '지하철',
      '트럭',
      '배',
      '비행기',
    ],
    intro:
      '탈 것 테마 이미지 8슬롯입니다. 업로드한 슬롯만 훈련에 반영됩니다(비어 있으면 해당 칸은 건너뜀).',
  },
  emotion: {
    packId: SPOMOVE_VARIANT_EMOTION_PACK_ID,
    packName: 'SPOMOVE 색지각 감정',
    subfolder: 'spomove_variant_emotions',
    slotLabels: ['기쁨', '슬픔', '화남', '놀람', '두려움', '평온', '설렘', '지루함'],
    intro: '감정 테마 이미지 8슬롯입니다. 업로드·반영 방식은 탈 것 탭과 동일합니다.',
  },
  animal: {
    packId: SPOMOVE_VARIANT_ANIMAL_PACK_ID,
    packName: 'SPOMOVE 색지각 동물',
    subfolder: 'spomove_variant_animals',
    slotLabels: ['강아지', '고양이', '토끼', '새', '곰', '펭귄', '사자', '코끼리'],
    intro: '동물 테마 이미지 8슬롯입니다. 업로드·반영 방식은 탈 것 탭과 동일합니다.',
  },
};

/** Asset Hub 색지각 — 5개 섹션 (1: 테마·미리보기, 2~5: 자산 편집) */
export const SPOMOVE_COLOR_HUB_SECTIONS: {
  id: 'theme' | SpomoveColorThemeId;
  tabLabel: string;
}[] = [
  { id: 'theme', tabLabel: '1. 테마' },
  { id: 'fruit', tabLabel: '2. 과일' },
  { id: 'vehicle', tabLabel: '3. 탈 것' },
  { id: 'emotion', tabLabel: '4. 감정' },
  { id: 'animal', tabLabel: '5. 동물' },
];

export function parseStoredVariantTheme(raw: string | null): SpomoveColorThemeId {
  if (raw === 'color' || raw === 'fruit' || raw === 'vehicle' || raw === 'emotion' || raw === 'animal') return raw;
  return 'color';
}
