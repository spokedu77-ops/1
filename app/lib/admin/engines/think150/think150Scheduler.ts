/**
 * Think 150s Scheduler
 * 출력: ThinkTimelineEvent[] (정렬된 이벤트 리스트)
 * set 결정은 cue 이벤트 생성 시점에 고정, payload에 저장
 */

import {
  getCueBlankMs,
  getCueBlankMsTwoColors,
  getMemoryTiming,
} from '@/app/lib/admin/constants/thinkTiming';
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
  ActionMission,
} from './types';
import { SeededRNG } from './seededRng';
import { computeStageCCueSpec } from './weekRulesEngine';
import type { PADColor } from '@/app/lib/admin/constants/padGrid';
import { getImageUrlAnySet, getPackForWeek, getPackForWeekFallback } from './think150AssetLoader';

const COLORS: PADColor[] = ['red', 'green', 'yellow', 'blue'];

const SEGMENTS: { phase: ThinkPhase; startMs: number; endMs: number }[] = [
  { phase: 'intro', startMs: 0, endMs: 5000 },
  { phase: 'ready', startMs: 5000, endMs: 10000 },
  { phase: 'stageA', startMs: 10000, endMs: 30000 },
  { phase: 'rest1', startMs: 30000, endMs: 35000 },
  { phase: 'stageB', startMs: 35000, endMs: 60000 },
  { phase: 'rest2', startMs: 60000, endMs: 65000 },
  { phase: 'stageC', startMs: 65000, endMs: 100000 },
  { phase: 'rest3', startMs: 100000, endMs: 105000 },
  { phase: 'stageD', startMs: 105000, endMs: 140000 },
  { phase: 'outro', startMs: 140000, endMs: 150000 },
];

function getStageCLayout(week: 1 | 2 | 3 | 4, set: 'setA' | 'setB', slotCount: number): StageCLayout {
  if (week === 4) return 'fullscreen';
  if (week === 1) {
    return 'horizontal';
  }
  if (week === 2) {
    if (set === 'setA') return 'horizontal';
    return 'vertical';
  }
  if (week === 3) {
    if (set === 'setA') return 'fullscreen';
    return 'horizontal';
  }
  return 'fullscreen';
}

function getRestLabel(week: 1 | 2 | 3 | 4, restId: 'rest1' | 'rest2' | 'rest3'): string {
  if (restId === 'rest1') {
    return '주의 전환: 다음 단계로 넘어가요. 반응력과 균형 감각이 좋아지고 있어요!';
  }
  if (restId === 'rest3') {
    switch (week) {
      case 1:
        return '다음은 두 가지 색을 가로로 밟는 단계예요. 집중해 보세요!';
      case 2:
        return '다음은 색 세 개 순서를 기억했다가 빈 화면에서 재현하는 단계예요!';
      case 3:
        return '다음은 색 두 개 순서를 기억했다가 빈 화면에서 재현하는 단계예요!';
      case 4:
        return '다음은 색 세 개 순서를 기억했다가 빈 화면에서 재현하는 단계예요!';
      default:
        return '다음 단계로 넘어가요!';
    }
  }
  switch (week) {
    case 1:
      return '다음은 제외 단계예요. 화면에 나오는 색을 피해서 밟아 보세요!';
    case 2:
      return '다음은 행동 미션이에요. 화면에 나온 동작(박수/펀치/만세)을 따라 해 보세요!';
    case 3:
      return '다음은 두 가지 색을 가로로 밟는 단계예요. 두 색을 동시에 밟아 보세요!';
    case 4:
      return '다음은 전체 화면에 나오는 색을 보고 밟는 단계예요. 집중해 보세요!';
    default:
      return '';
  }
}

const OUTRO_TEXTS = [
  '오늘 반응력·집중력·작업 기억을 연습했어요. 꾸준히 하면 두뇌가 더 튼튼해져요!',
  '색을 보고 밟고, 기억하고 재현하는 연습이 인지 기능을 키워요. 수고했어요!',
  '주의 전환과 양발 협응이 두뇌 활성화에 도움이 돼요. 오늘도 잘했어요!',
  '시·공간 처리와 순차 기억을 연습한 시간이에요. 내일도 함께해요!',
  '오늘도 열심히 참여해 줘서 고마워요. 꾸준한 연습이 인지 능력을 키워요!',
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
    const img0 = pack ? getImageUrlAnySet(pack, seq[0]!) : '';
    const img1 = pack ? getImageUrlAnySet(pack, seq[1]!) : '';

    events.push({
      t0: t,
      t1: t + cueBlankMs,
      phase: 'stageC',
      frame: 'cue',
      payload: {
        type: 'stageC',
        slotCount: 1,
        slotColors: [seq[0]!],
        images: [img0],
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
        images: [img1],
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
        images: [img1],
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
    const imgs = pack
      ? [getImageUrlAnySet(pack, seq[0]!), getImageUrlAnySet(pack, seq[1]!), getImageUrlAnySet(pack, seq[2]!)]
      : ['', '', ''];

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
          images: [imgs[i]!],
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
        images: [imgs[2]!],
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

/** Stage C: 1주차 ANTI, 2주차 행동미션, 3·4주차 2색 세로(1050/1400) */
function buildStageCEvents(
  events: ThinkTimelineEvent[],
  seg: { startMs: number; endMs: number },
  config: Think150SchedulerConfig,
  rng: SeededRNG,
  cueBlankMs: number,
  pack: ThinkPackSets | undefined
): void {
  const startMs = seg.startMs;
  const endMs = seg.endMs;

  if (config.week === 1) {
    const cueMs = 900;
    const blankMs = 900;
    const pairDuration = cueMs + blankMs;
    let t = startMs;
    let lastColor: PADColor | null = null;
    while (t + pairDuration <= endMs) {
      const color = rng.pickAvoidingConsecutive(COLORS, lastColor) as PADColor;
      lastColor = color;
      const payload: StageCPayload = {
        type: 'stageC',
        slotCount: 1,
        slotColors: [color],
        images: [''],
        week: 1,
        set: 'setA',
        layout: 'fullscreen',
        antiLabel: '제외',
      };
      events.push({ t0: t, t1: t + cueMs, phase: 'stageC', frame: 'cue', payload });
      events.push({ t0: t + cueMs, t1: t + pairDuration, phase: 'stageC', frame: 'blank', payload });
      t += pairDuration;
    }
    if (t < endMs) events.push({ t0: t, t1: endMs, phase: 'stageC', frame: 'hold' });
    return;
  }

  if (config.week === 2) {
    const cueMs = 900;
    const blankMs = 900;
    const pairDuration = cueMs + blankMs;
    const ACTIONS: ActionMission[] = ['clap', 'punch', 'hurray'];
    const counts: Record<string, number> = { clap: 0, punch: 0, hurray: 0 };
    let t = startMs;
    let lastColor: PADColor | null = null;

    while (t + pairDuration <= endMs) {
      const minCount = Math.min(...ACTIONS.map((a) => counts[a] ?? 0));
      const candidates = ACTIONS.filter((a) => (counts[a] ?? 0) <= minCount);
      const action = rng.pick(candidates) as ActionMission;
      counts[action]++;
      const color = rng.pickAvoidingConsecutive(COLORS, lastColor) as PADColor;
      lastColor = color;
      const payload: StageCPayload = {
        type: 'stageC',
        slotCount: 1,
        slotColors: [color],
        images: [''],
        week: 2,
        set: 'setA',
        layout: 'fullscreen',
        actionMission: action,
      };
      events.push({ t0: t, t1: t + cueMs, phase: 'stageC', frame: 'cue', payload });
      events.push({ t0: t + cueMs, t1: t + pairDuration, phase: 'stageC', frame: 'blank', payload });
      t += pairDuration;
    }
    if (t < endMs) events.push({ t0: t, t1: endMs, phase: 'stageC', frame: 'hold' });
    return;
  }

  if (config.week === 3 || config.week === 4) {
    const { cueMs, blankMs } = getCueBlankMsTwoColors(config.audience);
    const pairDuration = cueMs + blankMs;
    let t = startMs;
    let lastColor: PADColor | null = null;

    while (t + pairDuration <= endMs) {
      const c1 = rng.pickAvoidingConsecutive(COLORS, lastColor) as PADColor;
      const c2 = rng.pickExcluding(COLORS, c1);
      lastColor = c2;
      const images = pack
        ? [getImageUrlAnySet(pack, c1), getImageUrlAnySet(pack, c2)]
        : ['', ''];
      const payload: StageCPayload = {
        type: 'stageC',
        slotCount: 2,
        slotColors: [c1, c2],
        images,
        week: config.week,
        set: 'setA',
        layout: 'horizontal',
      };
      events.push({ t0: t, t1: t + cueMs, phase: 'stageC', frame: 'cue', payload });
      events.push({ t0: t + cueMs, t1: t + pairDuration, phase: 'stageC', frame: 'blank', payload });
      t += pairDuration;
    }
    if (t < endMs) events.push({ t0: t, t1: endMs, phase: 'stageC', frame: 'hold' });
  }
}

/** Stage D: 1주차 2색 세로(1050/1400), 2·3·4주차 메모리 */
function buildStageDEvents(
  events: ThinkTimelineEvent[],
  seg: { startMs: number; endMs: number },
  config: Think150SchedulerConfig,
  rng: SeededRNG,
  pack: ThinkPackSets | undefined
): void {
  const startMs = seg.startMs;
  const endMs = seg.endMs;

  if (config.week === 1) {
    const { cueMs, blankMs } = getCueBlankMsTwoColors(config.audience);
    const pairDuration = cueMs + blankMs;
    let t = startMs;
    let lastColor: PADColor | null = null;

    while (t + pairDuration <= endMs) {
      const c1 = rng.pickAvoidingConsecutive(COLORS, lastColor) as PADColor;
      const c2 = rng.pickExcluding(COLORS, c1);
      lastColor = c2;

      const payload: StageCPayload = {
        type: 'stageC',
        slotCount: 2,
        slotColors: [c1, c2],
        images: ['', ''],
        week: 1,
        set: 'setA',
        layout: 'horizontal',
      };
      events.push({ t0: t, t1: t + cueMs, phase: 'stageD', frame: 'cue', payload });
      events.push({ t0: t + cueMs, t1: t + pairDuration, phase: 'stageD', frame: 'blank', payload });
      t += pairDuration;
    }
    if (t < endMs) {
      events.push({ t0: t, t1: endMs, phase: 'stageD', frame: 'hold' });
    }
    return;
  }

  const { cueMs, blank3xMs } = getMemoryTiming(config.audience);
  const blank2x = cueMs * 2;
  let t = startMs;

  if (config.week === 3) {
    while (t + cueMs * 2 + blank2x <= endMs) {
      const c1 = rng.pick(COLORS);
      const c2 = rng.pickExcluding(COLORS, c1);
      const seq = [c1, c2] as PADColor[];
      const images = pack
        ? [getImageUrlAnySet(pack, seq[0]!), getImageUrlAnySet(pack, seq[1]!)]
        : ['', ''];

      for (let i = 0; i < 2; i++) {
        events.push({
          t0: t,
          t1: t + cueMs,
          phase: 'stageD',
          frame: 'cue',
          payload: {
            type: 'stageC',
            slotCount: 1,
            slotColors: [seq[i]!],
            images: [images[i]!],
            week: 3,
            set: 'setA',
            layout: 'fullscreen',
            memory: { sequence: seq },
          },
        });
        t += cueMs;
      }
      events.push({
        t0: t,
        t1: t + blank2x,
        phase: 'stageD',
        frame: 'blank',
        payload: {
          type: 'stageC',
          slotCount: 1,
          slotColors: [seq[1]!],
          images: [images[1]!],
          week: 3,
          set: 'setA',
          layout: 'fullscreen',
          memory: { sequence: seq },
        },
      });
      t += blank2x;
    }
    if (t < endMs) events.push({ t0: t, t1: endMs, phase: 'stageD', frame: 'hold' });
    return;
  }

  if (config.week === 4) {
    while (t + cueMs * 3 + blank3xMs <= endMs) {
      const c1 = rng.pick(COLORS);
      const c2 = rng.pickExcluding(COLORS, c1);
      const c3 = rng.pickExcludingAll(COLORS, [c1, c2]);
      const seq = [c1, c2, c3] as PADColor[];
      const images = pack
        ? [getImageUrlAnySet(pack, seq[0]!), getImageUrlAnySet(pack, seq[1]!), getImageUrlAnySet(pack, seq[2]!)]
        : ['', '', ''];

      for (let i = 0; i < 3; i++) {
        events.push({
          t0: t,
          t1: t + cueMs,
          phase: 'stageD',
          frame: 'cue',
          payload: {
            type: 'stageC',
            slotCount: 1,
            slotColors: [seq[i]!],
            images: [images[i]!],
            week: 4,
            set: 'setB',
            layout: 'fullscreen',
            memory: { sequence: seq },
          },
        });
        t += cueMs;
      }
      events.push({
        t0: t,
        t1: t + blank3xMs,
        phase: 'stageD',
        frame: 'blank',
        payload: {
          type: 'stageC',
          slotCount: 1,
          slotColors: [seq[2]!],
          images: [images[2]!],
          week: 4,
          set: 'setB',
          layout: 'fullscreen',
          memory: { sequence: seq },
        },
      });
      t += blank3xMs;
    }
    if (t < endMs) events.push({ t0: t, t1: endMs, phase: 'stageD', frame: 'hold' });
    return;
  }

  if (config.week === 2) {
    while (t + cueMs * 3 + blank3xMs <= endMs) {
      const c1 = rng.pick(COLORS);
      const c2 = rng.pickExcluding(COLORS, c1);
      const c3 = rng.pickExcludingAll(COLORS, [c1, c2]);
      const seq = [c1, c2, c3] as PADColor[];

      for (let i = 0; i < 3; i++) {
        events.push({
          t0: t,
          t1: t + cueMs,
          phase: 'stageD',
          frame: 'cue',
          payload: {
            type: 'stageC',
            slotCount: 1,
            slotColors: [seq[i]!],
            images: [''],
            week: 2,
            set: 'setA',
            layout: 'fullscreen',
            memory: { sequence: seq },
          },
        });
        t += cueMs;
      }
      events.push({
        t0: t,
        t1: t + blank3xMs,
        phase: 'stageD',
        frame: 'blank',
        payload: {
          type: 'stageC',
          slotCount: 1,
          slotColors: [seq[2]!],
          images: [''],
          week: 2,
          set: 'setB',
          layout: 'fullscreen',
          memory: { sequence: seq },
        },
      });
      t += blank3xMs;
    }
    if (t < endMs) events.push({ t0: t, t1: endMs, phase: 'stageD', frame: 'hold' });
    return;
  }

  if (t < endMs) {
    events.push({ t0: t, t1: endMs, phase: 'stageD', frame: 'hold' });
  }
}

export function buildThink150Timeline(config: Think150SchedulerConfig): ThinkTimelineEvent[] {
  const events: ThinkTimelineEvent[] = [];
  const rng = new SeededRNG(config.seed);
  const cueBlankMs = getCueBlankMs(config.audience);
  let pack = getPackForWeek(
    config.week,
    config.thinkPack,
    config.thinkPackByWeek,
    config.month,
    config.thinkPackByMonthAndWeek
  );
  if ((config.week === 3 || config.week === 4) && !pack && config.thinkPackByMonthAndWeek) {
    pack = getPackForWeekFallback(config.week as 3 | 4, config.thinkPackByMonthAndWeek);
  }

  for (const seg of SEGMENTS) {
    const duration = seg.endMs - seg.startMs;

    if (seg.phase === 'intro') {
      const subtitle =
        config.week === 3 || config.week === 4
          ? '이름을 외치면서 점프하세요!'
          : '색을 보고 발로 반응하며 두뇌를 깨워요.';
      const payload: IntroPayload = {
        type: 'intro',
        week: config.week,
        subtitle,
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
      const stageIntro = '4분할로 나온 색만큼 밟아 보세요. 반응력이 쑥쑥 자라요!';
      for (let i = 0; i < 3; i++) {
        events.push({
          t0: seg.startMs + i * readyDuration,
          t1: seg.startMs + (i + 1) * readyDuration,
          phase: 'ready',
          frame: 'hold',
          payload: { type: 'ready' as const, count: (3 - i) as 3 | 2 | 1, stageIntro },
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
          if (config.week === 1 || config.week === 2) return 0;
          if (config.week === 3 || config.week === 4) return 1;
        }
        if (seg.phase === 'stageB') {
          if (config.week === 1 || config.week === 2) return 0;
          if (config.week === 3 || config.week === 4) return 1;
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
          week: config.week,
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
      buildStageCEvents(events, seg, config, rng, cueBlankMs, pack);
      continue;
    }

    if (seg.phase === 'stageD') {
      buildStageDEvents(events, seg, config, rng, pack);
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
