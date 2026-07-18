import { MODES } from '../constants';
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
  if (mode === 'basic' || mode === 'reactTrain') {
    const idx = mo?.levels.findIndex((l) => l.id === level) ?? -1;
    if (idx >= 0) displayNum = idx + 1;
  }

  const numStr = `${displayNum}번`;
  const exact = guide.phases.find((p) => p.num === numStr);
  if (exact) return exact;

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

function buildSelfCheckItems(mode: string, level: number): SelfCheckItem[] {
  const items: SelfCheckItem[] = [
    { id: 'finish', label: '끝까지 해냈나요?' },
  ];

  if (isMovementMode(mode, level)) {
    items.push(
      { id: 'move', label: '점프·이동을 활짝 했나요?' },
      { id: 'target', label: '목표 자리에 잘 갔나요?' },
      { id: 'pace', label: '속도에 맞춰 잘 따라갔나요?' },
    );
  } else if (mode === 'stroop' && isVoiceHeavyStroop(level)) {
    items.push(
      { id: 'voice', label: '목소리를 크게 냈나요?' },
      { id: 'rule', label: '규칙을 잘 맞췄나요?' },
      { id: 'pace', label: '속도에 맞춰 잘 따라갔나요?' },
    );
  } else if (mode === 'spatial') {
    items.push(
      { id: 'memory', label: '순서를 잘 기억했나요?' },
      { id: 'focus', label: '차분히 집중했나요?' },
      { id: 'retry', label: '틀려도 다시 도전했나요?' },
    );
  } else {
    items.push(
      { id: 'focus', label: '집중해서 잘 따라갔나요?' },
      { id: 'pace', label: '속도에 맞춰 잘 따라갔나요?' },
      { id: 'enjoy', label: '다음에도 또 하고 싶나요?' },
    );
  }

  return items.slice(0, 4);
}

function buildActivityFeel(mode: string, level: number, colorTotal: number): string {
  if (isMovementMode(mode, level) && colorTotal > 0) return '몸을 활발히 썼어요';
  if (mode === 'stroop' && isVoiceHeavyStroop(level)) return '입과 머리를 썼어요';
  if (mode === 'spatial') return '집중했어요';
  if (mode === 'flanker' || mode === 'simon') return '눈과 발을 연결했어요';
  return '잘 해냈어요';
}

function buildPraise(mode: string): { praise: string; praiseSub: string } {
  const mo = MODES[mode];
  const title = mo?.title ?? 'SPOMOVE';
  return {
    praise: '오늘도 멋지게 해냈어요!',
    praiseSub: `${withObjectParticle(title)} 끝까지 완주했어요.`,
  };
}

function buildPhaseName(mode: string, level: number): string {
  const phase = findGuidePhase(mode, level);
  if (phase?.name) return phase.name;
  const mo = MODES[mode];
  const levelMeta = mo?.levels.find((l) => l.id === level);
  return levelMeta?.name ?? '';
}

function buildProgramSummary(mode: string, level: number): string {
  const mo = MODES[mode];
  const phase = findGuidePhase(mode, level);
  const levelMeta = mo?.levels.find((l) => l.id === level);

  if (phase?.screen) return toFriendlyLine(phase.screen);
  if (phase?.action) return toFriendlyLine(phase.action);

  const source = phase?.goal ?? levelMeta?.desc ?? mo?.desc ?? '몸과 머리를 함께 쓰는 훈련이었어요.';
  return toFriendlyLine(source);
}

function buildBenefitLine(mode: string, level: number): string {
  if (mode === 'basic' && level === 2) return '눈이 색을 잡는 순간 발이 출발합니다';

  const phase = findGuidePhase(mode, level);
  const fallbacks: Record<string, string> = {
    basic: '화면을 보면 몸이 바로 움직이는 힘을 키웠어요',
    reactTrain: '눈으로 본 색에 발이 빠르게 닿도록 연습했어요',
    simon: '자극 위치에 흔들리지 않고 색만 보는 힘을 키웠어요',
    flanker: '옆은 무시하고 가운데만 보는 연습을 했어요',
    stroop: '규칙에 맞게 빠르게 답하는 힘을 키웠어요',
    spatial: '순서를 기억하고 차분히 되짚는 연습을 했어요',
    flow: '리듬에 맞춰 몸을 움직이는 연습을 했어요',
  };

  if (phase?.coach) return toCoachQuote(phase.coach);
  return fallbacks[mode] ?? '오늘도 몸과 머리가 함께 자랐어요';
}

function buildCoachTip(mode: string, level: number): string {
  const phase = findGuidePhase(mode, level);
  const raw = phase?.pitfall ?? GUIDE_BLOCKS.find((b) => b.id === mode)?.tip;
  if (!raw) return '다음에도 이렇게 하면 더 쉬워져요.';
  return toFriendlyLine(raw);
}

function spatialPatternLabel(level: number): string {
  if (level === 1) return '3색';
  if (level === 2) return '5색';
  if (level === 4 || level === 5) return '색·번호';
  return '10색';
}

function buildSessionHighlight(cfg: TrainingResultConfig, phaseName: string, volumeLabel: string): string {
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
): SessionSnapshotItem[] {
  const mo = MODES[cfg.mode];
  const items: SessionSnapshotItem[] = [
    { id: 'mode', label: '프로그램', value: mo?.title ?? 'SPOMOVE' },
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
    items.push({ id: 'focus', label: '활동 포인트', value: '가운데만 보기' });
  } else {
    items.push({ id: 'feel', label: '오늘 느낌', value: activityFeel });
  }

  return items.slice(0, 5);
}

function buildColorDominantLine(colorCounts: ColorStimulusCounts, colorTotal: number): string | null {
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
  return `${meta.name}이 가장 많이 나왔어요 · ${topCount}회(${percent}%)`;
}

export function resolveTrainingResultRichContent(
  cfg: TrainingResultConfig,
  elapsedMs: number,
  colorCounts: ColorStimulusCounts | null,
  options?: { programTitle?: string },
): TrainingResultRichContent {
  const mo = MODES[cfg.mode];
  const colorTotal = colorCounts ? totalColorStimulusCount(colorCounts) : 0;
  const { praise, praiseSub } = buildPraise(cfg.mode);
  const phaseName = buildPhaseName(cfg.mode, cfg.level);
  const elapsedLabel = formatElapsedSeconds(elapsedMs);
  const volumeLabel = describeSessionVolume(cfg);
  const activityFeel = buildActivityFeel(cfg.mode, cfg.level, colorTotal);

  return {
    praise,
    praiseSub,
    activityFeel,
    elapsedLabel,
    volumeLabel,
    sessionHighlight: buildSessionHighlight(cfg, phaseName, volumeLabel),
    sessionSnapshot: buildSessionSnapshot(cfg, elapsedLabel, volumeLabel, activityFeel, phaseName),
    colorDominantLine: colorCounts && colorTotal > 0 ? buildColorDominantLine(colorCounts, colorTotal) : null,
    programTitle: options?.programTitle ?? (phaseName ? `${mo?.title ?? 'SPOMOVE'} · ${phaseName}` : mo?.title ?? 'SPOMOVE'),
    phaseName,
    programSummary: buildProgramSummary(cfg.mode, cfg.level),
    benefitTags: defaultBenefitTags(cfg.mode),
    benefitLine: buildBenefitLine(cfg.mode, cfg.level),
    coachTip: buildCoachTip(cfg.mode, cfg.level),
    selfCheckItems: buildSelfCheckItems(cfg.mode, cfg.level),
  };
}
