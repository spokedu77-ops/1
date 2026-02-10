/**
 * Think 150s Scheduler
 * 출력: ThinkTimelineEvent[] (정렬된 이벤트 리스트)
 * set 결정은 cue 이벤트 생성 시점에 고정, payload에 저장
 */

import { getCueBlankMs } from '@/app/lib/admin/constants/thinkTiming';
import type { Audience } from '@/app/lib/admin/constants/thinkTiming';
import type {
  ThinkTimelineEvent,
  ThinkPhase,
  ThinkPackSets,
  ThinkPackByWeek,
  ThinkPackByMonthAndWeek,
  StageABPayload,
  StageCPayload,
  RestPayload,
  OutroPayload,
  IntroPayload,
  StageCLayout,
} from './types';
import { SeededRNG } from './seededRng';
import { computeStageCCueSpec } from './weekRulesEngine';
import type { PADColor } from '@/app/lib/admin/constants/padGrid';
import { getImageUrl, getImageUrlAnySet, getPackForWeek } from './think150AssetLoader';

const COLORS: PADColor[] = ['red', 'green', 'yellow', 'blue'];

const SEGMENTS: { phase: ThinkPhase; startMs: number; endMs: number }[] = [
  { phase: 'intro', startMs: 0, endMs: 6000 },
  { phase: 'ready', startMs: 6000, endMs: 10000 },
  { phase: 'stageA', startMs: 10000, endMs: 34000 },
  { phase: 'rest1', startMs: 34000, endMs: 40000 },
  { phase: 'stageB', startMs: 40000, endMs: 70000 },
  { phase: 'rest2', startMs: 70000, endMs: 76000 },
  { phase: 'stageC', startMs: 76000, endMs: 136000 },
  { phase: 'rest3', startMs: 136000, endMs: 142000 },
  { phase: 'outro', startMs: 142000, endMs: 150000 },
];

function getStageCLayout(week: 1 | 2 | 3 | 4, set: 'setA' | 'setB', slotCount: number): StageCLayout {
  if (week === 4) return 'fullscreen';
  if (week === 1) {
    if (set === 'setA') return 'vertical';
    return 'horizontal';
  }
  if (week === 2) {
    if (set === 'setA') return 'horizontal';
    return 'vertical';
  }
  if (week === 3) {
    if (set === 'setA') return 'fullscreen';
    return 'vertical';
  }
  return 'fullscreen';
}

function getRestLabel(week: 1 | 2 | 3 | 4, restId: 'rest1' | 'rest2' | 'rest3'): string {
  if (restId === 'rest1') {
    return '잘하고 있어요! 색을 보며 발을 옮기면 반응력과 균형 감각이 좋아져요.';
  }
  if (restId === 'rest3') {
    return '잠시 후 마무리해요. 지금까지 참여해 준 모습 정말 훌륭해요!';
  }
  switch (week) {
    case 1:
      return '화면에 나온 색을 보이는 개수만큼 밟으세요! 한 번에 하나씩 집중하면 더 정확해요.';
    case 2:
      return '화면에 나온 두 가지 색을 밟으세요! 왼발·오른발을 같이 쓰면 두뇌 활성화에 도움이 돼요.';
    case 3:
      return '화면에 나온 색의 대각선 색을 밟으세요! 공간 인지력이 커지는 시간이에요.';
    case 4:
      return '화면에 나온 색 순서를 기억했다가 빈 화면에서 밟으세요! 기억력과 집중력이 쑥쑥 자라요.';
    default:
      return '';
  }
}

const OUTRO_TEXTS = [
  '오늘도 수고했어요. 내일 다시 만나요!',
  '잘했어요! 다음에 또 도전해봐요.',
  '집중력과 반응이 좋아졌어요. 수고했어요!',
  '오늘도 열심히 참여해 줘서 고마워요. 다음에 또 만나요!',
  '잘 따라와 줘서 고마워요. 다음 시간에도 함께해요!',
];

export interface Think150SchedulerConfig {
  audience: Audience;
  week: 1 | 2 | 3 | 4;
  seed: number;
  thinkPack?: ThinkPackSets;
  /** 월(1-12). thinkPackByMonthAndWeek 사용 시 필요 */
  month?: number;
  /** 주차별 pack (1주차=색상만, 2/3/4주차 각각 다른 이미지) */
  thinkPackByWeek?: ThinkPackByWeek;
  /** 월별×주차별 pack (1~12월, 각 월마다 week2/3/4) */
  thinkPackByMonthAndWeek?: ThinkPackByMonthAndWeek;
}

/** Week4: set1 색1→색2 연속(블랭크 없음) + 블랭크 2배 / set2 색1→2→3 연속 + 블랭크 3배 */
function buildWeek4StageCEvents(
  events: ThinkTimelineEvent[],
  seg: { startMs: number; endMs: number },
  config: Think150SchedulerConfig,
  rng: SeededRNG,
  cueBlankMs: number,
  pack: ThinkPackSets | undefined
): void {
  const blank2x = cueBlankMs * 2;
  const blank3x = cueBlankMs * 3;
  const startMs = seg.startMs;
  const endMs = seg.endMs;

  let t = startMs;

  while (t < startMs + 30000 && t + cueBlankMs * 2 + blank2x <= startMs + 30000) {
    const c1 = rng.pick(COLORS);
    const c2 = rng.pickExcluding(COLORS, c1);
    const seq = [c1, c2] as PADColor[];

    events.push({
      t0: t,
      t1: t + cueBlankMs,
      phase: 'stageC',
      frame: 'cue',
      payload: {
        type: 'stageC',
        slotCount: 1,
        slotColors: [seq[0]!],
        images: [''],
        week: 4,
        set: 'setA',
        layout: 'fullscreen',
        memory: { sequence: seq },
      },
    });
    t += cueBlankMs;
    events.push({
      t0: t,
      t1: t + cueBlankMs,
      phase: 'stageC',
      frame: 'cue',
      payload: {
        type: 'stageC',
        slotCount: 1,
        slotColors: [seq[1]!],
        images: [''],
        week: 4,
        set: 'setA',
        layout: 'fullscreen',
        memory: { sequence: seq },
      },
    });
    t += cueBlankMs;
    events.push({
      t0: t,
      t1: t + blank2x,
      phase: 'stageC',
      frame: 'blank',
      payload: {
        type: 'stageC',
        slotCount: 1,
        slotColors: [seq[1]!],
        images: [''],
        week: 4,
        set: 'setA',
        layout: 'fullscreen',
        memory: { sequence: seq },
      },
    });
    t += blank2x;
  }

  t = Math.max(t, startMs + 30000);
  while (t < endMs && t + cueBlankMs * 3 + blank3x <= endMs) {
    const c1 = rng.pick(COLORS);
    const c2 = rng.pickExcluding(COLORS, c1);
    const c3 = rng.pickExcludingAll(COLORS, [c1, c2]);
    const seq = [c1, c2, c3] as PADColor[];

    for (let i = 0; i < 3; i++) {
      events.push({
        t0: t,
        t1: t + cueBlankMs,
        phase: 'stageC',
        frame: 'cue',
        payload: {
          type: 'stageC',
          slotCount: 1,
          slotColors: [seq[i]!],
          images: [''],
          week: 4,
          set: 'setB',
          layout: 'fullscreen',
          memory: { sequence: seq },
        },
      });
      t += cueBlankMs;
    }
    events.push({
      t0: t,
      t1: t + blank3x,
      phase: 'stageC',
      frame: 'blank',
      payload: {
        type: 'stageC',
        slotCount: 1,
        slotColors: [seq[2]!],
        images: [''],
        week: 4,
        set: 'setB',
        layout: 'fullscreen',
        memory: { sequence: seq },
      },
    });
    t += blank3x;
  }

  if (t < endMs) {
    events.push({ t0: t, t1: endMs, phase: 'stageC', frame: 'hold' });
  }
}

export function buildThink150Timeline(config: Think150SchedulerConfig): ThinkTimelineEvent[] {
  const events: ThinkTimelineEvent[] = [];
  const rng = new SeededRNG(config.seed);
  const cueBlankMs = getCueBlankMs(config.audience);
  const pack = getPackForWeek(
    config.week,
    config.thinkPack,
    config.thinkPackByWeek,
    config.month,
    config.thinkPackByMonthAndWeek
  );

  for (const seg of SEGMENTS) {
    const duration = seg.endMs - seg.startMs;

    if (seg.phase === 'intro') {
      const payload: IntroPayload = {
        type: 'intro',
        week: config.week,
        subtitle: '',
      };
      events.push({
        t0: seg.startMs,
        t1: seg.endMs,
        phase: 'intro',
        frame: 'hold',
        payload,
      });
      continue;
    }

    if (seg.phase === 'ready') {
      const readyDuration = (seg.endMs - seg.startMs) / 3;
      for (let i = 0; i < 3; i++) {
        events.push({
          t0: seg.startMs + i * readyDuration,
          t1: seg.startMs + (i + 1) * readyDuration,
          phase: 'ready',
          frame: 'hold',
          payload: { type: 'ready' as const, count: 3 - i as 3 | 2 | 1 },
        });
      }
      continue;
    }

    if (seg.phase === 'stageA' || seg.phase === 'stageB') {
      const duration = seg.endMs - seg.startMs;
      const pairDuration = cueBlankMs * 2;
      const pairCount = Math.floor(duration / pairDuration);

      const useImageRatio = (() => {
        if (seg.phase === 'stageA') {
          if (config.week === 1) return 0;
          if (config.week === 2 || config.week === 3) return 0;
          if (config.week === 4) return 1;
        }
        if (seg.phase === 'stageB') {
          if (config.week === 1) return 0;
          if (config.week === 2 || config.week === 4) return 0.5;
          if (config.week === 3) return 1;
        }
        return 0;
      })();
      const colorOnlyCount = Math.floor(pairCount * (1 - useImageRatio));

      const counts: Record<string, number> = { red: 0, green: 0, yellow: 0, blue: 0 };
      let lastColor: PADColor | null = null;

      let t = seg.startMs;
      let idx = 0;
      while (t + pairDuration <= seg.endMs) {
        const color = rng.pickBalanced(COLORS, counts, lastColor) as PADColor;
        counts[color]++;
        lastColor = color;
        const set = 'setA';
        const useImage = useImageRatio === 1 ? true : useImageRatio === 0 ? false : idx >= colorOnlyCount;
        const imageUrl = useImage ? getImageUrlAnySet(pack, color) : '';
        const payload: StageABPayload = {
          type: seg.phase,
          color,
          imageUrl,
          set,
        };
        events.push({ t0: t, t1: t + cueBlankMs, phase: seg.phase, frame: 'cue', payload });
        events.push({ t0: t + cueBlankMs, t1: t + pairDuration, phase: seg.phase, frame: 'blank', payload });
        t += pairDuration;
        idx++;
      }
      if (t < seg.endMs) {
        events.push({ t0: t, t1: seg.endMs, phase: seg.phase, frame: 'hold' });
      }
      continue;
    }

    if (seg.phase.startsWith('rest')) {
      const restId = seg.phase as 'rest1' | 'rest2' | 'rest3';
      const ruleLabel = getRestLabel(config.week, restId);
      const payload: RestPayload = { type: 'rest', ruleLabel, restId };
      events.push({
        t0: seg.startMs,
        t1: seg.endMs,
        phase: seg.phase as 'rest1' | 'rest2' | 'rest3',
        frame: 'hold',
        payload,
      });
      continue;
    }

    if (seg.phase === 'stageC') {
      if (config.week === 4) {
        buildWeek4StageCEvents(events, seg, config, rng, cueBlankMs, pack);
      } else {
        const duration = seg.endMs - seg.startMs;
        const isWeek2 = config.week === 2;
        const cueMs = isWeek2 ? cueBlankMs * 1.5 : cueBlankMs;
        const blankMs = isWeek2 ? cueBlankMs * 2 : cueBlankMs;
        const pairDuration = cueMs + blankMs;

        let t = seg.startMs;
        let idx = 0;
        let lastStageCColor: PADColor | null = null;
        while (t + pairDuration <= seg.endMs) {
          const elapsedInStageC = t - seg.startMs;
          const set: 'setA' | 'setB' = elapsedInStageC < 30000 ? 'setA' : 'setB';

          const spec = computeStageCCueSpec({
            week: config.week,
            audience: config.audience,
            t: elapsedInStageC,
            mode: set,
            rng,
            lastColor: lastStageCColor,
          });
          lastStageCColor = spec.slotColors[0] ?? null;

          const useImages = (() => {
            if (config.week === 1) return false;
            if (config.week === 2) return false;
            if (config.week === 3) return false;
            return false;
          })();
          const images = useImages
            ? spec.slotColors.map((c) => getImageUrl(pack, set, c))
            : spec.slotColors.map(() => '');

          const layout = getStageCLayout(config.week, set, spec.slotCount);
          const payload: StageCPayload = {
            type: 'stageC',
            slotCount: spec.slotCount,
            slotColors: spec.slotColors,
            images,
            week: config.week,
            set,
            layout,
            ...(spec.memory && {
              isRecallPhase: spec.memory.isRecall,
              stepCount: spec.memory.stepCount,
              memory: { sequence: spec.memory.sequence ?? [] },
            }),
          };

          events.push({ t0: t, t1: t + cueMs, phase: 'stageC', frame: 'cue', payload });
          events.push({ t0: t + cueMs, t1: t + pairDuration, phase: 'stageC', frame: 'blank', payload });
          t += pairDuration;
          idx++;
        }
        if (t < seg.endMs) {
          events.push({ t0: t, t1: seg.endMs, phase: 'stageC', frame: 'hold' });
        }
      }
      continue;
    }

    if (seg.phase === 'outro') {
      const summaryText = rng.pick(OUTRO_TEXTS);
      const payload: OutroPayload = { type: 'outro', summaryText };
      events.push({
        t0: seg.startMs,
        t1: seg.endMs,
        phase: 'outro',
        frame: 'hold',
        payload,
      });
    }
  }

  return events;
}
