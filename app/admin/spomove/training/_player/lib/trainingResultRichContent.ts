import {
  catalogBasicUiLevel,
  isFront3PanelLevel,
  isModifiedQuadrantLevel,
  modifiedQuadrantStage,
  MODES,
} from '../constants';
import { GUIDE_BLOCKS, type GuidePhase } from '../trainingGuideContent';
import {
  RESULT_COLOR_ORDER,
  colorMeta,
  describeSessionVolume,
  formatElapsedSeconds,
  totalColorStimulusCount,
  type ColorStimulusCounts,
  type PadColorId,
  type TrainingResultConfig,
} from './trainingResultSummary';

export type SelfCheckItem = {
  id: string;
  label: string;
};

export type SessionSnapshotItem = {
  id: string;
  label: string;
  value: string;
};

export type TrainingResultRichContent = {
  praise: string;
  praiseSub: string;
  activityFeel: string;
  elapsedLabel: string;
  volumeLabel: string;
  /** 헤더형 한 줄: 모드 · 단계 · 분량 */
  sessionHighlight: string;
  /** 색 집계가 없을 때 가운데 패널을 채울 세션 스냅샷 */
  sessionSnapshot: SessionSnapshotItem[];
  /** 색 집계가 있을 때 최빈색 한 줄 코멘트 (없으면 null) */
  colorDominantLine: string | null;
  programTitle: string;
  phaseName: string;
  programSummary: string;
  benefitTags: string[];
  benefitLine: string;
  coachTip: string;
  selfCheckItems: SelfCheckItem[];
};

function findGuidePhase(mode: string, level: number): GuidePhase | undefined {
  const guide = GUIDE_BLOCKS.find((b) => b.id === mode);
  if (!guide?.phases.length) return undefined;

  if (mode === 'flanker') return guide.phases[0];

  const mo = MODES[mode];
  let displayNum = level;
  if (mode === 'basic') {
    // 변형사분할 7~10 → 카탈로그 3번, 전면3패널 5·6 → 카탈로그 6번
    const catalogId = catalogBasicUiLevel(level);
    const idx = mo?.levels.findIndex((l) => l.id === catalogId) ?? -1;
    if (idx >= 0) displayNum = idx + 1;
  } else if (mode === 'reactTrain') {
    const idx = mo?.levels.findIndex((l) => l.id === level) ?? -1;
    if (idx >= 0) displayNum = idx + 1;
  }

  const numStr = `${displayNum}번`;
  const exact = guide.phases.find((p) => p.num === numStr);
  if (exact) return exact;

  // 전용 Target Tracking은 기존 reactTrain 가이드의 첫 단계(풍선)로 폴백하지 않는다.
  if (mode === 'reactTrain' && level === 14) return undefined;
  if (mode === 'basic' && level === 7) return undefined;

  const prefix = guide.phases.find((p) => p.num.startsWith(String(displayNum)));
  if (prefix) return prefix;

  const range = guide.phases.find((p) => {
    const m = p.num.match(/^(\d+)~(\d+)번$/);
    if (!m) return false;
    const lo = Number(m[1]);
    const hi = Number(m[2]);
    return displayNum >= lo && displayNum <= hi;
  });
  if (range) return range;

  return guide.phases[0];
}

function firstSentence(text: string): string {
  const cleaned = text.replace(/^["“]|["”]$/g, '').trim();
  const match = cleaned.match(/^[^.!?。]+[.!?。]?/);
  return (match?.[0] ?? cleaned).trim();
}

function withObjectParticle(phrase: string): string {
  if (!phrase) return phrase;
  const last = phrase.charCodeAt(phrase.length - 1);
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return `${phrase}${hasBatchim ? '을' : '를'}`;
}

function toCoachQuote(text: string): string {
  let cleaned = text.trim().replace(/^["“'']+|["”'']+$/g, '').trim();
  cleaned = cleaned.replace(/^["“'']+/, '').trim();
  const first = firstSentence(cleaned).replace(/[.!?。]+$/, '').replace(/^["“'']+/, '').trim();
  return first;
}

function toFriendlyLine(text: string): string {
  let line = firstSentence(text)
    .replace(/히트 라인/g, '바닥 줄')
    .replace(/레인/g, '길')
    .replace(/자극이/g, '화면 신호가')
    .replace(/색 위치을/g, '색 자리를')
    .replace(/색 위치를/g, '색 자리를')
    .replace(/색 위치/g, '색 자리')
    .replace(/해당 색/g, '그 색')
    .replace(/입니다\.?$/, '이에요.')
    .replace(/습니다\.?$/, '어요.');

  if (!/[.!?]$/.test(line) && !line.endsWith('요')) line = `${line}요`;
  return line;
}

function defaultBenefitTags(mode: string): string[] {
  switch (mode) {
    case 'basic':
    case 'reactTrain':
      return ['민첩성', '순발력', '눈과 몸 연결'];
    case 'simon':
      return ['집중력', '순발력', '색 판단'];
    case 'flanker':
      return ['집중력', '방해 억제', '목표 선택'];
    case 'stroop':
      return ['억제력', '인지 유연성', '빠른 판단'];
    case 'spatial':
      return ['기억력', '집중력', '차분함'];
    case 'flow':
      return ['리듬감', '지구력', '집중 유지'];
    default:
      return ['몸과 머리', '집중력', '자신감'];
  }
}

function isVoiceHeavyStroop(level: number): boolean {
  return level >= 2;
}

function isMovementMode(mode: string, level: number): boolean {
  if (mode === 'stroop') return level === 1;
  if (mode === 'spatial') return false;
  return ['basic', 'reactTrain', 'simon', 'flanker', 'flow'].includes(mode);
}

function selectSelfChecks(items: SelfCheckItem[], seed: string, count = 5): SelfCheckItem[] {
  let state = 0;
  for (let i = 0; i < seed.length; i++) state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, count);
}

function buildSelfCheckItems(mode: string, level: number, programTitle: string | undefined, elapsedMs: number): SelfCheckItem[] {
  const title = programTitle ?? mode;
  const common: SelfCheckItem[] = [
    { id: 'finish', label: '끝까지 참여했나요?' },
    { id: 'focus', label: '화면의 신호에 집중했나요?' },
    { id: 'retry', label: '놓친 뒤에도 다시 집중했나요?' },
    { id: 'enjoy', label: '다음에도 다시 해보고 싶나요?' },
  ];
  let specific: SelfCheckItem[];

  if (mode === 'flanker') {
    const directionOnly = level === 5 || title.includes('화살표');
    specific = directionOnly
      ? [
          { id: 'target', label: '가운데 목표 화살표를 먼저 확인했나요?' },
          { id: 'inhibit', label: '주변 방해 화살표에 흔들리지 않았나요?' },
          { id: 'move', label: '목표 방향에 맞춰 이동했나요?' },
          { id: 'reset', label: '다음 화살표가 나오기 전에 시선을 가운데로 돌렸나요?' },
        ]
      : [
          { id: 'target', label: '가운데 목표 색을 먼저 확인했나요?' },
          { id: 'inhibit', label: '주변 색과 크기에 흔들리지 않았나요?' },
          { id: 'move', label: '가운데 색에 맞는 위치로 이동했나요?' },
          { id: 'reset', label: '다음 자극이 나오기 전에 시선을 가운데로 돌렸나요?' },
        ];
  } else if (mode === 'spatial') {
    specific = [
      { id: 'memory', label: '나온 순서와 위치를 기억했나요?' },
      { id: 'chunk', label: '신호를 짧게 나누어 기억했나요?' },
      { id: 'replay', label: '기억한 순서대로 차분히 움직였나요?' },
      { id: 'steady', label: '서두르지 않고 한 단계씩 확인했나요?' },
    ];
  } else if (mode === 'stroop' && isVoiceHeavyStroop(level)) {
    specific = [
      { id: 'voice', label: '목소리를 크고 또렷하게 냈나요?' },
      { id: 'rule', label: '이번 활동의 규칙대로 답했나요?' },
      { id: 'pace', label: '신호가 바뀔 때 바로 답했나요?' },
      { id: 'switch', label: '헷갈리는 자극에서도 규칙을 다시 떠올렸나요?' },
    ];
  } else if (title.includes('풍선')) {
    specific = [
      { id: 'color', label: '풍선의 색을 먼저 확인했나요?' },
      { id: 'track', label: '떨어지는 풍선을 끝까지 눈으로 따라갔나요?' },
      { id: 'move', label: '풍선 색에 맞는 위치로 이동했나요?' },
      { id: 'next', label: '풍선이 터진 뒤 다음 자극을 바로 찾았나요?' },
    ];
  } else if (title.includes('골키퍼')) {
    specific = [
      { id: 'ball', label: '날아오는 공의 방향을 끝까지 봤나요?' },
      { id: 'corner', label: '공이 향하는 구역으로 이동했나요?' },
      { id: 'ready', label: '다음 슛 전에 준비 자세로 돌아왔나요?' },
      { id: 'wide', label: '팔과 다리를 크게 벌려 막아봤나요?' },
    ];
  } else if (title.includes('두더지')) {
    specific = [
      { id: 'scan', label: '여러 구멍을 고르게 살펴봤나요?' },
      { id: 'color', label: '나타난 두더지의 색을 확인했나요?' },
      { id: 'move', label: '맞는 색 위치로 빠르게 이동했나요?' },
      { id: 'reset', label: '잡은 뒤 가운데로 시선을 돌렸나요?' },
    ];
  } else if (isMovementMode(mode, level)) {
    specific = [
      { id: 'move', label: '점프와 이동 동작을 크게 했나요?' },
      { id: 'target', label: '신호에 맞는 위치로 이동했나요?' },
      { id: 'pace', label: '신호가 바뀔 때 바로 움직였나요?' },
      { id: 'balance', label: '이동한 뒤 몸의 균형을 잡았나요?' },
    ];
  } else {
    specific = [
      { id: 'pace', label: '신호가 바뀔 때 바로 반응했나요?' },
      { id: 'rule', label: '정해진 방법대로 활동했나요?' },
      { id: 'steady', label: '서두르지 않고 정확히 움직였나요?' },
      { id: 'next', label: '다음 신호를 준비하며 참여했나요?' },
    ];
  }

  return selectSelfChecks([...specific, ...common], `${title}:${level}:${Math.round(elapsedMs / 100)}`, 5);
}

function pickResultCopy(copies: readonly string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return copies[hash % copies.length] ?? copies[0] ?? '';
}

function buildActivityFeel(
  mode: string,
  level: number,
  colorTotal: number,
  elapsedMs: number,
  programTitle?: string,
): string {
  const seed = `${programTitle ?? mode}:${level}:${colorTotal}:${Math.round(elapsedMs / 1000)}`;
  if (mode === 'stroop' && isVoiceHeavyStroop(level)) {
    return pickResultCopy([
      '목소리와 생각을 함께 썼어요',
      '규칙을 떠올리며 힘차게 답했어요',
      '보고 생각한 뒤 또렷하게 말했어요',
      '머리를 빠르게 바꿔 가며 답했어요',
    ], seed);
  }
  if (mode === 'spatial') {
    return pickResultCopy([
      '차분히 보고 기억했어요',
      '순서와 위치에 집중했어요',
      '눈으로 살피고 머릿속에 담았어요',
      '끝까지 집중하며 기억했어요',
    ], seed);
  }
  if (mode === 'flanker' || mode === 'simon') {
    return pickResultCopy([
      '눈으로 보고 발로 바로 반응했어요',
      '신호에 맞춰 빠르게 움직였어요',
      '방향을 살피며 몸을 움직였어요',
      '보고 판단한 뒤 힘차게 이동했어요',
    ], seed);
  }
  if (isMovementMode(mode, level) && colorTotal > 0) {
    return pickResultCopy([
      '온몸으로 신호에 반응했어요',
      '몸을 크게 움직였어요',
      '색을 보고 활발히 이동했어요',
      '끝까지 힘차게 움직였어요',
      '빠르게 방향을 바꿔 움직였어요',
    ], seed);
  }
  return pickResultCopy([
    '끝까지 집중해서 참여했어요',
    '신호를 살피며 잘 마쳤어요',
    '차분하게 끝까지 해냈어요',
    '오늘 활동에 힘껏 참여했어요',
  ], seed);
}

function buildPraise(mode: string, programTitle?: string): { praise: string; praiseSub: string } {
  const mo = MODES[mode];
  const title = programTitle ?? mo?.title ?? 'SPOMOVE';
  return {
    praise: '오늘도 멋지게 해냈어요!',
    praiseSub: `${withObjectParticle(title)} 끝까지 완주했어요.`,
  };
}

function buildPhaseName(mode: string, level: number, programTitle?: string): string {
  const phase = findGuidePhase(mode, level);
  if (mode === 'flanker') {
    if (level === 5 || (programTitle?.includes('화살표') ?? false)) return '가운데 화살표 · 방향 선택';
    if (level === 3) return '크기 방해 · 가운데 색 선택';
    if (level === 4) return '겹친 원 · 안쪽 색 선택';
    return '주변 방해 · 가운데 색 선택';
  }
  if (mode === 'basic' && isModifiedQuadrantLevel(level)) {
    return `변형 사분할 자극 · ${modifiedQuadrantStage(level)}단계`;
  }
  if (mode === 'basic' && isFront3PanelLevel(level)) {
    return level === 6 ? '랜덤분할 자극 · 확률 분할' : '3분할 자극 · 서로 다른 신호';
  }
  if (phase?.name) return phase.name;
  const mo = MODES[mode];
  const levelMeta = mo?.levels.find((l) => l.id === level);
  return levelMeta?.name ?? '';
}

function buildProgramSummary(mode: string, level: number, programTitle?: string): string {
  const mo = MODES[mode];
  if (mode === 'flanker') {
    if (level === 5 || (programTitle?.includes('화살표') ?? false)) {
      return '주변 화살표에 흔들리지 않고 가운데 화살표의 방향을 보고 이동하는 활동입니다.';
    }
    if (level === 3) {
      return '서로 다른 크기의 색 원 중 가운데 목표 원의 색을 보고 같은 색 위치로 이동하는 활동입니다.';
    }
    if (level === 4) {
      return '겹쳐진 원을 살펴보고 가장 안쪽 목표 원의 색에 맞춰 이동하는 활동입니다.';
    }
    return '주변 방해 자극 사이에서 가운데 목표의 색을 골라 같은 색 위치로 이동하는 활동입니다.';
  }
  if (mode === 'basic' && isModifiedQuadrantLevel(level)) {
    const stage = modifiedQuadrantStage(level);
    if (stage === 1) return '2×2 사분할에 색과 발 부위가 함께 나와요.';
    if (stage === 2) return '색 1~3개와 손·발 조합이 섞여 나와요.';
    return '3색에 손·발이 섞인 가장 어려운 단계예요.';
  }
  if (mode === 'basic' && level === 5) {
    return '세 패널에 서로 다른 색 신호가 나와요. 목표 색 패드로 이동해요.';
  }
  if (mode === 'basic' && level === 6) {
    return '전면·2패널·3패널이 랜덤으로 바뀌어요. 보이는 색 패드로 이동해요.';
  }
  if (mode === 'basic' && level === 3) {
    return '화면 전체가 한 색(또는 이미지 색)으로 채워져요. 그 색 패드로 바로 이동해요.';
  }

  const phase = findGuidePhase(mode, level);
  const levelMeta = mo?.levels.find((l) => l.id === level);

  if (phase?.screen) return toFriendlyLine(phase.screen);
  if (phase?.action) return toFriendlyLine(phase.action);

  const source = phase?.goal ?? levelMeta?.desc ?? mo?.desc ?? '몸과 머리를 함께 쓰는 훈련이었어요.';
  return toFriendlyLine(source);
}

function buildBenefitLine(mode: string, level: number): string {
  if (mode === 'basic' && level === 2) return '눈이 색을 잡는 순간 발이 출발합니다';
  if (mode === 'basic' && level === 3) return '화면 색을 보는 순간 바로 그 패드로 점프해요';
  if (mode === 'basic' && isModifiedQuadrantLevel(level)) {
    return '색과 부위를 함께 읽고 바로 반응해요';
  }
  if (mode === 'basic' && level === 5) return '서로 다른 세 패널에서 목표 색만 골라 이동해요';
  if (mode === 'basic' && level === 6) return '화면 형태가 바뀌어도 색을 보고 바로 이동해요';
  if (mode === 'flanker') return '주변 방해 자극은 흘려보고 가운데 목표 신호에 집중했어요';

  const phase = findGuidePhase(mode, level);
  const fallbacks: Record<string, string> = {
    basic: '화면을 보면 몸이 바로 움직이는 힘을 키웠어요',
    reactTrain: '눈으로 본 색에 발이 빠르게 닿도록 연습했어요',
    simon: '자극 위치에 흔들리지 않고 색만 보는 힘을 키웠어요',
    flanker: '주변 방해 자극과 가운데 목표 신호를 구분하는 연습을 했어요',
    stroop: '규칙에 맞게 빠르게 답하는 힘을 키웠어요',
    spatial: '순서를 기억하고 차분히 되짚는 연습을 했어요',
    flow: '리듬에 맞춰 몸을 움직이는 연습을 했어요',
  };

  if (phase?.coach) return toCoachQuote(phase.coach);
  return fallbacks[mode] ?? '오늘도 몸과 머리가 함께 자랐어요';
}

function buildCoachTip(mode: string, level: number): string {
  const commercialTips: Record<string, string> = {
    basic: '화면 신호를 확인한 뒤 목표 위치로 정확하게 이동해 보세요.',
    reactTrain: '색과 위치를 함께 확인하고, 서두르기보다 정확한 반응을 이어가 보세요.',
    simon: '화면의 위치와 색을 차례로 확인한 뒤 목표 패드로 움직여 보세요.',
    flanker: '주변 신호보다 목표 신호에 집중해 한 번에 하나씩 반응해 보세요.',
    stroop: '이번 활동의 규칙을 먼저 떠올리고, 화면을 본 뒤 차분하게 반응해 보세요.',
    spatial: '순서를 짧게 나누어 기억하고, 한 단계씩 정확하게 이어가 보세요.',
    flow: '리듬을 유지하면서 다음 신호를 미리 살펴보며 움직여 보세요.',
  };
  return commercialTips[mode] ?? '화면 신호를 확인하고 자신의 속도로 정확하게 반응해 보세요.';

  /* 가이드 원문은 수업용 가이드에서만 사용합니다. 결과 화면에는 노출하지 않습니다. */
  /* istanbul ignore next */
  if (mode === 'basic' && isModifiedQuadrantLevel(level)) {
    return '색만 보지 말고 발·손 아이콘까지 같이 읽어요.';
  }
  if (mode === 'basic' && level === 5) {
    return '세 칸이 모두 달라도 목표 색 하나만 잡으면 돼요.';
  }
  if (mode === 'basic' && level === 6) {
    return '전면인지 패널형인지보다 색을 먼저 읽고 움직여요.';
  }
  if (mode === 'basic' && level === 3) {
    return '이미지가 나와도 그림 내용보다 대표 색만 바로 읽어요.';
  }
  const phase = findGuidePhase(mode, level);
  const raw = phase?.pitfall ?? GUIDE_BLOCKS.find((b) => b.id === mode)?.tip;
  if (!raw) return '다음에도 이렇게 하면 더 쉬워져요.';
  return toFriendlyLine(raw ?? '');
}

function spatialPatternLabel(level: number): string {
  if (level === 1) return '3색';
  if (level === 2) return '5색';
  if (level === 3) return '추가(3→7)';
  if (level === 4 || level === 5) return '색·번호';
  if (level === 7) return '순간 기억';
  return '10색';
}

function buildSessionHighlight(cfg: TrainingResultConfig, phaseName: string, volumeLabel: string, programTitle?: string): string {
  if (programTitle) return `${programTitle} · ${volumeLabel}`;
  const mo = MODES[cfg.mode];
  const title = mo?.title ?? 'SPOMOVE';
  const step = phaseName || `${cfg.level}번`;
  return `${title} · ${step} · ${volumeLabel}`;
}

function buildSessionSnapshot(
  cfg: TrainingResultConfig,
  elapsedLabel: string,
  volumeLabel: string,
  activityFeel: string,
  phaseName: string,
  programTitle?: string,
): SessionSnapshotItem[] {
  const mo = MODES[cfg.mode];
  const items: SessionSnapshotItem[] = [
    { id: 'mode', label: '프로그램', value: programTitle ?? mo?.title ?? 'SPOMOVE' },
    { id: 'phase', label: '단계', value: phaseName || `${cfg.level}번` },
    { id: 'volume', label: '설정 분량', value: volumeLabel },
    { id: 'elapsed', label: '진행 시간', value: elapsedLabel },
  ];

  if (cfg.mode === 'spatial') {
    items.push({ id: 'pattern', label: '기억 길이', value: spatialPatternLabel(cfg.level) });
  } else if (cfg.mode === 'flow') {
    items.push({ id: 'focus', label: '활동 포인트', value: '리듬에 맞춰 동작' });
  } else if (cfg.mode === 'stroop' && isVoiceHeavyStroop(cfg.level)) {
    items.push({ id: 'focus', label: '활동 포인트', value: '규칙에 맞춰 말하기' });
  } else if (cfg.mode === 'flanker') {
    items.push({ id: 'focus', label: '활동 포인트', value: '가운데 목표 신호에 집중하기' });
  } else {
    items.push({ id: 'feel', label: '오늘 느낌', value: activityFeel });
  }

  return items.slice(0, 5);
}

function buildColorDominantLine(colorCounts: ColorStimulusCounts, colorTotal: number, mode: string): string | null {
  if (colorTotal <= 0) return null;

  let topId: PadColorId = 'red';
  let topCount = -1;
  for (const id of RESULT_COLOR_ORDER) {
    const count = colorCounts[id];
    if (count > topCount) {
      topCount = count;
      topId = id;
    }
  }
  if (topCount <= 0) return null;

  const meta = colorMeta(topId);
  const percent = Math.round((topCount / colorTotal) * 100);
  return mode === 'flanker'
    ? `${meta.name}이 가운데 목표로 가장 많이 나왔어요 · ${topCount}회(${percent}%)`
    : `${meta.name}이 가장 많이 나왔어요 · ${topCount}회(${percent}%)`;
}

export function resolveTrainingResultRichContent(
  cfg: TrainingResultConfig,
  elapsedMs: number,
  colorCounts: ColorStimulusCounts | null,
  options?: { programTitle?: string; volumeLabel?: string },
): TrainingResultRichContent {
  const mo = MODES[cfg.mode];
  const colorTotal = colorCounts ? totalColorStimulusCount(colorCounts) : 0;
  const { praise, praiseSub } = buildPraise(cfg.mode, options?.programTitle);
  const phaseName = buildPhaseName(cfg.mode, cfg.level, options?.programTitle);
  const elapsedLabel = formatElapsedSeconds(elapsedMs);
  const volumeLabel = options?.volumeLabel ?? describeSessionVolume(cfg);
  const activityFeel = buildActivityFeel(cfg.mode, cfg.level, colorTotal, elapsedMs, options?.programTitle);
  if (cfg.mode === 'spatial' && cfg.level === 7) {
    const instantTitle = options?.programTitle ?? '한눈에 색 배치 기억하기';
    const gridLabel = instantTitle.includes('4X4') || instantTitle.includes('4×4') ? '4×4' : '3×3';
    const instantFeel = pickResultCopy([
      '배치 변화를 끝까지 살펴봤어요',
      '색과 위치를 차분히 기억했어요',
      '바뀐 칸을 집중해서 찾아봤어요',
      '눈으로 살피고 머릿속에 담았어요',
    ], `${instantTitle}:${Math.round(elapsedMs / 1000)}`);
    return {
      praise: '색 배치 기억 활동을 마쳤어요!',
      praiseSub: `${instantTitle} 활동을 끝까지 진행했어요.`,
      activityFeel: instantFeel,
      elapsedLabel,
      volumeLabel,
      sessionHighlight: `${instantTitle} · ${volumeLabel}`,
      sessionSnapshot: [
        { id: 'program', label: '프로그램', value: instantTitle },
        { id: 'grid', label: '격자', value: gridLabel },
        { id: 'volume', label: '진행 분량', value: volumeLabel },
        { id: 'elapsed', label: '진행 시간', value: elapsedLabel },
        { id: 'scoring', label: '결과 방식', value: '자동 채점 없음' },
      ],
      colorDominantLine: null,
      programTitle: instantTitle,
      phaseName: `${gridLabel} 색 배치 기억`,
      programSummary: `${gridLabel} 색 배치를 기억한 뒤 바뀐 위치를 찾아 움직이는 활동입니다.`,
      benefitTags: ['시각 기억', '공간 탐색', '집중'],
      benefitLine: '색상 빈도가 아니라 배치와 위치의 변화를 기억하는 활동이에요.',
      coachTip: '한 번에 모든 색을 외우기보다 줄이나 모서리처럼 위치 기준을 정해 기억해 보세요.',
      selfCheckItems: selectSelfChecks([
        { id: 'finish', label: '끝까지 참여했나요?' },
        { id: 'layout', label: '색보다 위치와 배치를 먼저 살폈나요?' },
        { id: 'change', label: '바뀐 칸을 차분히 찾았나요?' },
        { id: 'retry', label: '틀려도 다음 배치를 다시 기억했나요?' },
        { id: 'scan', label: '격자의 모서리와 줄을 기준으로 살펴봤나요?' },
        { id: 'focus', label: '배치가 바뀌는 순간에 집중했나요?' },
        { id: 'move', label: '기억한 위치에 맞춰 움직였나요?' },
      ], `${instantTitle}:${Math.round(elapsedMs / 100)}`, 5),
    };
  }
  const shapeCompletionTitle = '맞는 조각 찾아가기';
  if (cfg.mode === 'basic' && cfg.level === 8 && options?.programTitle === shapeCompletionTitle) {
    const shapePhaseName = '필요한 조각 추론과 공간 선택';
    const shapeFeel = pickResultCopy([
      '형태를 끝까지 완성했어요',
      '필요한 조각을 차분히 찾아냈어요',
      '부분을 보고 전체 모습을 떠올렸어요',
      '모양을 비교하며 집중했어요',
    ], `${shapeCompletionTitle}:${Math.round(elapsedMs / 1000)}`);
    return {
      praise: '오늘도 멋지게 해냈어요!',
      praiseSub: `${withObjectParticle(shapeCompletionTitle)} 끝까지 완주했어요.`,
      activityFeel: shapeFeel,
      elapsedLabel,
      volumeLabel,
      sessionHighlight: `${shapeCompletionTitle} · ${volumeLabel}`,
      sessionSnapshot: [
        { id: 'program', label: '프로그램', value: shapeCompletionTitle },
        { id: 'activity', label: '활동', value: shapePhaseName },
        { id: 'volume', label: '설정 분량', value: volumeLabel },
        { id: 'elapsed', label: '진행 시간', value: elapsedLabel },
        { id: 'feel', label: '오늘 느낌', value: shapeFeel },
      ],
      colorDominantLine: null,
      programTitle: shapeCompletionTitle,
      phaseName: shapePhaseName,
      programSummary: '현재 조각과 완성 형태를 비교해 필요한 조각을 찾고, 해당 후보의 SPOMAT 위치로 이동했어요.',
      benefitTags: ['형태 지각', '부분·전체 관계', '공간 선택'],
      benefitLine: '보이지 않는 조각을 머릿속으로 완성하고 움직임으로 연결해요',
      coachTip: '현재 조각에 없는 부분을 먼저 찾은 뒤, 완성 형태와 정확히 맞는 후보를 골라보세요.',
      selfCheckItems: selectSelfChecks([
        { id: 'finish', label: '끝까지 참여했나요?' },
        { id: 'compare', label: '현재 조각과 완성 형태를 비교했나요?' },
        { id: 'piece', label: '필요한 조각을 정확히 찾았나요?' },
        { id: 'move', label: '선택한 후보의 자리로 이동했나요?' },
        { id: 'whole', label: '부분을 보고 전체 모양을 떠올렸나요?' },
        { id: 'retry', label: '틀린 뒤에도 다음 문제에 다시 집중했나요?' },
        { id: 'steady', label: '서두르지 않고 후보를 차례로 살펴봤나요?' },
      ], `${shapeCompletionTitle}:${Math.round(elapsedMs / 100)}`, 5),
    };
  }
  const relativeCompassTitle = '내 자리에서 방향 따라가기';
  const isRelativeCompass =
    cfg.mode === 'basic' &&
    cfg.level === 7 &&
    options?.programTitle === relativeCompassTitle;

  if (isRelativeCompass) {
    const relativePhaseName = '내 자리에서 방향 따라가기';
    const relativeFeel = pickResultCopy([
      '화살표 방향으로 정확히 이동했어요',
      '내 위치를 기억하며 움직였어요',
      '방향을 살피고 한 칸씩 이동했어요',
      '다음 방향에 집중하며 움직였어요',
    ], `${relativeCompassTitle}:${Math.round(elapsedMs / 1000)}`);
    return {
      praise: '오늘도 멋지게 해냈어요!',
      praiseSub: `${withObjectParticle(relativeCompassTitle)} 끝까지 완주했어요.`,
      activityFeel: relativeFeel,
      elapsedLabel,
      volumeLabel,
      sessionHighlight: `${relativeCompassTitle} · ${volumeLabel}`,
      sessionSnapshot: [
        { id: 'program', label: '프로그램', value: relativeCompassTitle },
        { id: 'activity', label: '활동', value: relativePhaseName },
        { id: 'volume', label: '설정 분량', value: volumeLabel },
        { id: 'elapsed', label: '진행 시간', value: elapsedLabel },
        { id: 'feel', label: '오늘 느낌', value: relativeFeel },
      ],
      colorDominantLine: null,
      programTitle: relativeCompassTitle,
      phaseName: relativePhaseName,
      programSummary: '시작 색에 선 뒤, 지금 자리에서 화살표 방향으로 한 칸 이동하고 그 자리에 남아 다음 신호를 받았어요.',
      benefitTags: ['공간 방향', '위치 기억', '방향 전환'],
      benefitLine: '가운데로 돌아가지 않고, 선 칸에서 다음 방향으로 이어 가요',
      coachTip: '시작 색을 먼저 확인하고, 화살표가 뜨면 지금 자리에서 한 칸만 이동하게 하세요. 돌아오지 않습니다.',
      selfCheckItems: selectSelfChecks([
        { id: 'finish', label: '끝까지 참여했나요?' },
        { id: 'start', label: '시작 색 패드에 섰나요?' },
        { id: 'direction', label: '화살표 방향으로 한 칸 이동했나요?' },
        { id: 'stay', label: '제자리로 돌아오지 않고 그 자리에 남았나요?' },
        { id: 'position', label: '움직인 뒤 현재 위치를 기억했나요?' },
        { id: 'next', label: '다음 화살표가 나올 때까지 준비했나요?' },
        { id: 'balance', label: '한 칸 이동한 뒤 균형을 잡았나요?' },
      ], `${relativeCompassTitle}:${Math.round(elapsedMs / 100)}`, 5),
    };
  }

  return {
    praise,
    praiseSub,
    activityFeel,
    elapsedLabel,
    volumeLabel,
    sessionHighlight: buildSessionHighlight(cfg, phaseName, volumeLabel, options?.programTitle),
    sessionSnapshot: buildSessionSnapshot(cfg, elapsedLabel, volumeLabel, activityFeel, phaseName, options?.programTitle),
    colorDominantLine: colorCounts && colorTotal > 0 ? buildColorDominantLine(colorCounts, colorTotal, cfg.mode) : null,
    programTitle: options?.programTitle ?? (phaseName ? `${mo?.title ?? 'SPOMOVE'} · ${phaseName}` : mo?.title ?? 'SPOMOVE'),
    phaseName,
    programSummary: buildProgramSummary(cfg.mode, cfg.level, options?.programTitle),
    benefitTags: defaultBenefitTags(cfg.mode),
    benefitLine: buildBenefitLine(cfg.mode, cfg.level),
    coachTip: buildCoachTip(cfg.mode, cfg.level),
    selfCheckItems: buildSelfCheckItems(cfg.mode, cfg.level, options?.programTitle, elapsedMs),
  };
}
