/**
 * ColorGate shared definitions.
 *
 * 2단계 Color Gate 전용 포즈 키 — 1단계 장애물(FlowModuleKey)과 분리.
 * 새 솔로 라이브러리는 4개 체력 카테고리 × 쉬움/어려움 5개씩 = 40개 동작.
 */

export const GATE_COLOR_IDS = ['red', 'yellow', 'green', 'blue'] as const;
export type GateColorId = (typeof GATE_COLOR_IDS)[number];
export const PLAYABLE_GATE_COLOR_IDS = GATE_COLOR_IDS;

export interface GateColorDef {
  bg: string;
  label: string;
  text: string;
  hex: number;
}

export const GATE_COLORS: Record<GateColorId, GateColorDef> = {
  red:    { bg: '#b91c1c', label: '빨강', text: '#ffffff', hex: 0xb91c1c },
  yellow: { bg: '#ca8a04', label: '노랑', text: '#111827', hex: 0xca8a04 },
  green:  { bg: '#15803d', label: '초록', text: '#ffffff', hex: 0x15803d },
  blue:   { bg: '#1d4ed8', label: '파랑', text: '#ffffff', hex: 0x1d4ed8 },
};

export type ColorGateCategory =
  | 'strength'
  | 'flexibility'
  | 'balance'
  | 'power-jump'
  | 'partner';

export type ColorGateCategoryFilter = 'all' | Exclude<ColorGateCategory, 'partner'>;
export type ColorGateDifficulty = 'easy' | 'hard';
export type ColorGateSelectableCategory = Exclude<ColorGateCategory, 'partner'> | 'together' | 'family';
export type ColorGateDifficultySelection = 'single' | 'compound' | 'family';

/**
 * 기존 설정값을 유지한다.
 * - solo-easy: 새 40개 중 쉬움 20개
 * - solo-normal: 쉬움 + 어려움 전체 40개 (저장 호환을 위해 legacy key 유지)
 * - together-easy: 2인 협동 단일 동작 5개
 * - together-normal: 2인 협동 복합 구성 전체 14개
 * - together-family: 가족 동작 9개
 */
export type ColorGateVariant = 'solo-easy' | 'solo-normal' | 'together-easy' | 'together-normal' | 'together-family';

export const COLOR_GATE_TARGET_COUNT = 20;

export const COLOR_GATE_POSE_DEFINITIONS = [
  // 근력 · 근지구력 — easy 5, hard 5
  { key: 'squat', label: '스쿼트', category: 'strength', difficulty: 'easy', image: '/spomove/dive/color-gate/strength/squat.png' },
  { key: 'plank', label: '플랭크', category: 'strength', difficulty: 'easy', image: '/spomove/dive/color-gate/strength/plank.png' },
  { key: 'lunge', label: '런지', category: 'strength', difficulty: 'easy', image: '/spomove/dive/color-gate/strength/lunge.png' },
  { key: 'push-up', label: '푸시업', category: 'strength', difficulty: 'easy', image: '/spomove/dive/color-gate/strength/push-up.png' },
  { key: 'bear-hold', label: '베어 홀드', category: 'strength', difficulty: 'easy', image: '/spomove/dive/color-gate/strength/bear-hold.png' },
  { key: 'bridge', label: '브릿지', category: 'strength', difficulty: 'hard', image: '/spomove/dive/color-gate/strength/bridge.png' },
  { key: 'side-plank', label: '사이드 플랭크', category: 'strength', difficulty: 'hard', image: '/spomove/dive/color-gate/strength/side-plank.png' },
  { key: 'superman-hold', label: '슈퍼맨 홀드', category: 'strength', difficulty: 'hard', image: '/spomove/dive/color-gate/strength/superman-hold.png' },
  { key: 'v-sit-hold', label: 'V싯 홀드', category: 'strength', difficulty: 'hard', image: '/spomove/dive/color-gate/strength/v-sit-hold.png' },
  { key: 'crab-bridge', label: '크랩 브리지', category: 'strength', difficulty: 'hard', image: '/spomove/dive/color-gate/strength/crab-bridge.png' },

  // 유연성 — easy 5
  { key: 'standing-toe-touch', label: '서서 발끝 터치', category: 'flexibility', difficulty: 'easy', image: '/spomove/dive/color-gate/flexibility/standing-toe-touch.png' },
  { key: 'butterfly', label: '나비 자세', category: 'flexibility', difficulty: 'easy', image: '/spomove/dive/color-gate/flexibility/butterfly.png' },
  { key: 'standing-side-stretch', label: '서서 옆구리 스트레칭', category: 'flexibility', difficulty: 'easy', image: '/spomove/dive/color-gate/flexibility/standing-side-stretch.png' },
  { key: 'child-pose', label: '고양이 자세', category: 'flexibility', difficulty: 'easy', image: '/spomove/dive/color-gate/flexibility/child-pose.png' },
  { key: 'overhead-lunge-stretch', label: '앉아 다리벌리기', category: 'flexibility', difficulty: 'easy', image: '/spomove/dive/color-gate/flexibility/overhead-lunge-stretch.png' },
  // 유연성 — hard 5
  { key: 'cobra', label: '오버헤드 런지', category: 'flexibility', difficulty: 'hard', image: '/spomove/dive/color-gate/flexibility/cobra.png' },
  { key: 'downward-dog', label: '코브라 자세', category: 'flexibility', difficulty: 'hard', image: '/spomove/dive/color-gate/flexibility/downward-dog.png' },
  { key: 'standing-quad-stretch', label: '다운독', category: 'flexibility', difficulty: 'hard', image: '/spomove/dive/color-gate/flexibility/standing-quad-stretch.png' },
  { key: 'seated-straddle', label: '뒤로 발등잡기', category: 'flexibility', difficulty: 'hard', image: '/spomove/dive/color-gate/flexibility/seated-straddle.png' },
  { key: 'straddle-one-foot-hold', label: '앉아 다리벌려 한발 잡기', category: 'flexibility', difficulty: 'hard', image: '/spomove/dive/color-gate/flexibility/straddle-one-foot-hold.png' },

  // 평형성 — easy 5
  { key: 'single-leg-stand', label: '한발 서기', category: 'balance', difficulty: 'easy', image: '/spomove/dive/color-gate/balance/single-leg-stand.png' },
  { key: 'knee-up-balance', label: '무릎 들고 균형잡기', category: 'balance', difficulty: 'easy', image: '/spomove/dive/color-gate/balance/knee-up-balance.png' },
  { key: 'tree-pose', label: '나무 자세', category: 'balance', difficulty: 'easy', image: '/spomove/dive/color-gate/balance/tree-pose.png' },
  { key: 'tiptoe-stand', label: '발끝으로 서기', category: 'balance', difficulty: 'easy', image: '/spomove/dive/color-gate/balance/tiptoe-stand.png' },
  { key: 'straight-stand', label: '일자 서기', category: 'balance', difficulty: 'easy', image: '/spomove/dive/color-gate/balance/straight-stand.png' },
  // 평형성 — hard 5
  { key: 'airplane-pose', label: '발레 자세', category: 'balance', difficulty: 'hard', image: '/spomove/dive/color-gate/balance/ballet-pose.png' },
  { key: 'single-leg-floor-touch', label: '싱글 레그 데드리프트', category: 'balance', difficulty: 'hard', image: '/spomove/dive/color-gate/balance/single-leg-floor-touch.png' },
  { key: 'side-leg-lift', label: '한발 들고 균형 잡기', category: 'balance', difficulty: 'hard', image: '/spomove/dive/color-gate/balance/side-leg-lift.png' },
  { key: 'flamingo-pose', label: '한발 발잡기', category: 'balance', difficulty: 'hard', image: '/spomove/dive/color-gate/balance/one-leg-foot-hold.png' },
  { key: 't-balance', label: 'T자 균형', category: 'balance', difficulty: 'hard', image: '/spomove/dive/color-gate/balance/t-balance.png' },

  // 순발력 · 민첩성 — easy 5
  { key: 'vertical-jump', label: '제자리 점프', category: 'power-jump', difficulty: 'easy', image: '/spomove/dive/color-gate/power-jump/vertical-jump.png' },
  { key: 'star-jump', label: '스타 점프', category: 'power-jump', difficulty: 'easy', image: '/spomove/dive/color-gate/power-jump/star-jump.png' },
  { key: 'knee-up-jump', label: '무릎 올리기 점프', category: 'power-jump', difficulty: 'easy', image: '/spomove/dive/color-gate/power-jump/knee-up-jump.png' },
  { key: 'heel-kick-jump', label: '힐킥 점프', category: 'power-jump', difficulty: 'easy', image: '/spomove/dive/color-gate/power-jump/heel-kick-jump.png' },
  { key: 'clap-jump', label: '박수 점프', category: 'power-jump', difficulty: 'easy', image: '/spomove/dive/color-gate/power-jump/clap-jump.png' },
  // 순발력 · 민첩성 — hard 5
  { key: 'frog-jump', label: '개구리 점프', category: 'power-jump', difficulty: 'hard', image: '/spomove/dive/color-gate/power-jump/frog-jump.png' },
  { key: 'rotation-jump', label: '회전 점프', category: 'power-jump', difficulty: 'hard', image: '/spomove/dive/color-gate/power-jump/rotation-jump.png' },
  { key: 'pike-jump', label: '파이크 점프', category: 'power-jump', difficulty: 'hard', image: '/spomove/dive/color-gate/power-jump/pike-jump.png' },
  { key: 'cossack-jump', label: '이단옆차기 점프', category: 'power-jump', difficulty: 'hard', image: '/spomove/dive/color-gate/power-jump/cossack-jump.png' },
  { key: 'straddle-jump', label: '스트래들 점프', category: 'power-jump', difficulty: 'hard', image: '/spomove/dive/color-gate/power-jump/straddle-jump.png' },

  // 투게더 14동작 — easy 7, hard 7
  { key: 'partner-hold', label: '스쿼트 홀드', category: 'partner', difficulty: 'easy', image: '/spomove/dive/color-gate/1528225d-ed67-4808-988e-6e962f156bb0.png' },
  { key: 'partner-shoulder-waist-press', label: '어깨 잡고 눌러주기', category: 'partner', difficulty: 'easy', image: '/spomove/dive/color-gate/partner-shoulder-waist-press.png' },
  { key: 'partner-high-five', label: '하이파이브', category: 'partner', difficulty: 'easy', image: '/spomove/dive/color-gate/ba690608-f817-4f77-9fa9-25cee0557425.png' },
  { key: 'partner-back-to-back', label: '백투백', category: 'partner', difficulty: 'easy', image: '/spomove/dive/color-gate/partner-back-to-back-arms.png' },
  { key: 'partner-side-lunge', label: '사이드 런지', category: 'partner', difficulty: 'easy', image: '/spomove/dive/color-gate/b4c03adf-8ee9-4fdb-8686-524099fe2776.png' },
  { key: 'partner-hand-jump', label: '손잡고 점프', category: 'partner', difficulty: 'easy', image: '/spomove/dive/color-gate/partner-hand-jump.png' },
  { key: 'partner-leg-touch', label: '어깨동무', category: 'partner', difficulty: 'easy', image: '/spomove/dive/color-gate/8f61c1fa-f873-450a-9c75-1cc98283e3f9.png' },
  { key: 'partner-tunnel', label: '플랭크 하이파이브', category: 'partner', difficulty: 'hard', image: '/spomove/dive/color-gate/4c1b42c6-6707-490d-8acf-c1a9d401055f.png' },
  { key: 'partner-shoulder-balance', label: '머리 붙이기', category: 'partner', difficulty: 'hard', image: '/spomove/dive/color-gate/partner-head-touch.png' },
  { key: 'partner-sit-to-stand', label: '앉았다 일어나기', category: 'partner', difficulty: 'hard', image: '/spomove/dive/color-gate/b8357c09-081c-4ceb-a5dc-034f23d10a30.png' },
  { key: 'partner-pull-up', label: '풀업', category: 'partner', difficulty: 'hard', image: '/spomove/dive/color-gate/528a5182-0e0b-4785-9c12-6de1fb7d300a.png' },
  { key: 'partner-squat', label: 'V밸런스', category: 'partner', difficulty: 'hard', image: '/spomove/dive/color-gate/5a9b623d-b16f-4171-b380-945ee7f1304a.png' },
  { key: 'partner-stacking', label: '한발 들고 하이파이브', category: 'partner', difficulty: 'hard', image: '/spomove/dive/color-gate/partner-stacking.png' },
  { key: 'partner-one-leg-high-five', label: '인간 손수레', category: 'partner', difficulty: 'hard', image: '/spomove/dive/color-gate/partner-one-leg-high-five.png' },

  // 가족 9동작 — 난이도 필터와 분리
  { key: 'family-princess-carry', label: '자장자장', category: 'partner', difficulty: 'family', image: '/spomove/dive/color-gate/family-princess-carry.png' },
  { key: 'family-airplane-play', label: '비행기 놀이', category: 'partner', difficulty: 'family', image: '/spomove/dive/color-gate/family-airplane-play.png' },
  { key: 'family-piggyback', label: '어부바', category: 'partner', difficulty: 'family', image: '/spomove/dive/color-gate/family-piggyback.png' },
  { key: 'family-hug', label: '안아주기', category: 'partner', difficulty: 'family', image: '/spomove/dive/color-gate/family-hug.png' },
  { key: 'family-arm-heart', label: '팔 하트', category: 'partner', difficulty: 'family', image: '/spomove/dive/color-gate/family-arm-heart.png' },
  { key: 'family-double-tree', label: '더블 트리', category: 'partner', difficulty: 'family', image: '/spomove/dive/color-gate/family-double-tree.png' },
  { key: 'family-big-circle', label: '큰 원 만들기', category: 'partner', difficulty: 'family', image: '/spomove/dive/color-gate/family-big-circle.png' },
  { key: 'family-horse-riding', label: '승마 자세', category: 'partner', difficulty: 'family', image: '/spomove/dive/color-gate/family-horse-riding.png' },
  { key: 'family-spin', label: '빙글빙글', category: 'partner', difficulty: 'family', image: '/spomove/dive/color-gate/family-spin.png' },
] as const;

export type ColorGatePoseKey = (typeof COLOR_GATE_POSE_DEFINITIONS)[number]['key'];

type ColorGatePoseDefinition = (typeof COLOR_GATE_POSE_DEFINITIONS)[number];

export const COLOR_GATE_POSE_SEQUENCE: ColorGatePoseKey[] =
  COLOR_GATE_POSE_DEFINITIONS.map((pose) => pose.key);

export const COLOR_GATE_POSE_IMAGE_MAP = Object.fromEntries(
  COLOR_GATE_POSE_DEFINITIONS.map((pose) => [pose.key, pose.image]),
) as Record<ColorGatePoseKey, string>;

export const COLOR_GATE_POSE_LABELS = Object.fromEntries(
  COLOR_GATE_POSE_DEFINITIONS.map((pose) => [pose.key, pose.label]),
) as Record<ColorGatePoseKey, string>;

export const COLOR_GATE_POSE_INSTRUCTIONS = Object.fromEntries(
  COLOR_GATE_POSE_DEFINITIONS.map((pose) => [
    pose.key,
    pose.category === 'partner'
      ? `두 명이 함께 ${pose.label} 자세를 취하세요`
      : `${pose.label} 자세를 취하세요`,
  ]),
) as Record<ColorGatePoseKey, string>;

export function colorGatePosesForCategory(
  category: Exclude<ColorGateCategory, 'partner'>,
  difficulty: ColorGateDifficulty,
): readonly ColorGatePoseKey[] {
  return COLOR_GATE_POSE_DEFINITIONS
    .filter((pose) => pose.category === category && pose.difficulty === difficulty)
    .map((pose) => pose.key);
}

/**
 * 기존 3개 난이도 옵션과 호환되는 런타임 포즈 풀.
 * category가 all이면 솔로 4개 체력 유형 전체를 사용하고, 특정 유형이면 해당 5개만 사용한다.
 * together 계열은 category와 무관하게 2인 협동 포즈만 사용한다.
 */
export const COLOR_GATE_VARIANT_POSES: Record<ColorGateVariant, readonly ColorGatePoseKey[]> = {
  'solo-easy': COLOR_GATE_POSE_DEFINITIONS
    .filter((pose) => pose.category !== 'partner' && pose.difficulty === 'easy')
    .map((pose) => pose.key),
  'solo-normal': COLOR_GATE_POSE_DEFINITIONS
    .filter((pose) => pose.category !== 'partner')
    .map((pose) => pose.key),
  'together-easy': COLOR_GATE_POSE_DEFINITIONS
    .filter((pose) => pose.category === 'partner' && pose.difficulty !== 'family')
    .slice(0, 5)
    .map((pose) => pose.key),
  'together-normal': COLOR_GATE_POSE_DEFINITIONS
    .filter((pose) => pose.category === 'partner' && pose.difficulty !== 'family')
    .map((pose) => pose.key),
  'together-family': COLOR_GATE_POSE_DEFINITIONS
    .filter((pose) => pose.category === 'partner' && pose.difficulty === 'family')
    .map((pose) => pose.key),
};

export function colorGatePosesForVariant(
  variant: ColorGateVariant,
  category: ColorGateCategoryFilter = 'all',
): readonly ColorGatePoseKey[] {
  if (variant === 'together-easy' || variant === 'together-normal' || variant === 'together-family') {
    return COLOR_GATE_VARIANT_POSES[variant];
  }
  if (category === 'all') return COLOR_GATE_VARIANT_POSES[variant];

  if (variant === 'solo-normal') {
    return COLOR_GATE_POSE_DEFINITIONS
      .filter((pose) => pose.category === category)
      .map((pose) => pose.key);
  }
  return colorGatePosesForCategory(category, 'easy');
}

export function colorGatePosesForSelection(
  categories: readonly ColorGateSelectableCategory[],
  difficulties: readonly ColorGateDifficultySelection[],
): readonly ColorGatePoseKey[] {
  const selectedCategories = new Set(categories);
  const selectedDifficulties = new Set(difficulties);
  const includeEasy = selectedDifficulties.size === 0
    || selectedDifficulties.has('single')
    || selectedDifficulties.has('compound');
  const includeHard = selectedDifficulties.has('compound');

  return COLOR_GATE_POSE_DEFINITIONS
    .filter((pose) => {
      if (pose.difficulty === 'family') return selectedCategories.has('family');
      if (pose.category === 'partner') {
        return selectedCategories.has('together')
          && (pose.difficulty === 'easy' ? includeEasy : includeHard);
      }
      return selectedCategories.has(pose.category)
        && (pose.difficulty === 'easy' ? includeEasy : includeHard);
    })
    .map((pose) => pose.key);
}

export function getColorGatePoseDefinition(pose: ColorGatePoseKey): ColorGatePoseDefinition {
  const found = COLOR_GATE_POSE_DEFINITIONS.find((item) => item.key === pose);
  return found ?? COLOR_GATE_POSE_DEFINITIONS[0];
}

export const COLOR_GATE_FIXED_COLOR_ID = 'red' as GateColorId;

const SILHOUETTE_ALPHA_MIN = 16;
const SILHOUETTE_LUMA_MAX = 150;
const SILHOUETTE_RGB = { r: 10, g: 10, b: 12 };

const poseImageCacheByPose = new Map<ColorGatePoseKey, HTMLImageElement>();
let poseImagesLoadPromise: Promise<Map<ColorGatePoseKey, HTMLImageElement>> | null = null;

function loadPoseImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function preloadColorGatePoseImages(): Promise<Map<ColorGatePoseKey, HTMLImageElement>> {
  if (poseImagesLoadPromise) return poseImagesLoadPromise;

  poseImagesLoadPromise = Promise.all(
    COLOR_GATE_POSE_SEQUENCE.map(async (pose) => {
      const url = COLOR_GATE_POSE_IMAGE_MAP[pose];
      const cached = poseImageCacheByPose.get(pose);
      if (cached) return [pose, cached] as const;
      const img = await loadPoseImage(url);
      if (img) poseImageCacheByPose.set(pose, img);
      return [pose, img] as const;
    }),
  ).then((entries) => {
    const map = new Map<ColorGatePoseKey, HTMLImageElement>();
    for (const [pose, img] of entries) {
      if (img) map.set(pose, img);
    }
    return map;
  });
  return poseImagesLoadPromise;
}

export function getColorGatePoseImage(pose: ColorGatePoseKey): HTMLImageElement | null {
  return poseImageCacheByPose.get(pose) ?? null;
}

export function buildColorGateCue(gateColorId: GateColorId): string {
  return `${GATE_COLORS[gateColorId].label}으로!`;
}

export function buildColorGateInstruction(gateColorId: GateColorId, pose: ColorGatePoseKey): string {
  const color = GATE_COLORS[gateColorId];
  return `${color.label} 패드로 이동한 뒤\n「${COLOR_GATE_POSE_LABELS[pose]}」 자세를 취하세요`;
}

export function buildColorGateSilhouetteCanvas(
  poseImage: HTMLImageElement,
  lowRes: boolean,
): HTMLCanvasElement {
  const w = lowRes ? 128 : 192;
  const h = lowRes ? 192 : 288;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const sample = document.createElement('canvas');
  sample.width = w;
  sample.height = h;
  const sampleCtx = sample.getContext('2d');
  if (!sampleCtx) return canvas;

  const scale = Math.min(w / poseImage.width, h / poseImage.height) * 0.9;
  const dw = poseImage.width * scale;
  const dh = poseImage.height * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  sampleCtx.drawImage(poseImage, dx, dy, dw, dh);

  const sampleData = sampleCtx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < out.data.length; i += 4) {
    const alpha = sampleData.data[i + 3]!;
    const luma =
      0.2126 * sampleData.data[i]!
      + 0.7152 * sampleData.data[i + 1]!
      + 0.0722 * sampleData.data[i + 2]!;
    if (alpha >= SILHOUETTE_ALPHA_MIN && luma <= SILHOUETTE_LUMA_MAX) {
      out.data[i] = SILHOUETTE_RGB.r;
      out.data[i + 1] = SILHOUETTE_RGB.g;
      out.data[i + 2] = SILHOUETTE_RGB.b;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}
