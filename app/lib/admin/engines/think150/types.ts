/**
 * Think 150s - TimelineEvent 기반 타입
 */

import type { PADColor } from '@/app/lib/admin/constants/padGrid';

export type ThinkPhase =
  | 'intro'
  | 'ready'
  | 'stageA'
  | 'rest1'
  | 'stageB'
  | 'rest2'
  | 'stageC'
  | 'rest3'
  | 'stageD'
  | 'outro';

export type ThinkFrameType = 'cue' | 'blank' | 'hold';

export interface StageABPayload {
  type: 'stageA' | 'stageB';
  color: PADColor;
  imageUrl: string;
  set: 'setA' | 'setB';
  /** 뷰어에서 3주차 blank/배경 분기용 */
  week?: 1 | 2 | 3 | 4;
}

/** Stage C 레이아웃: 세로길게 | 가로길게 | 전체화면 */
export type StageCLayout = 'vertical' | 'horizontal' | 'fullscreen';

export type ActionMission = 'clap' | 'punch' | 'hurray';

export interface StageCPayload {
  type: 'stageC';
  slotCount: 1 | 2 | 3;
  slotColors: PADColor[];
  images: string[];
  week: 1 | 2 | 3 | 4;
  set: 'setA' | 'setB';
  layout?: StageCLayout;
  isRecallPhase?: boolean;
  stepCount?: 2 | 3;
  subPhase?: string;
  memory?: { sequence: PADColor[] };
  /** 1주차 ANTI: 상단 표시용 */
  antiLabel?: string;
  /** 2주차 행동 미션 */
  actionMission?: ActionMission;
}

export interface ReadyPayload {
  type: 'ready';
  count: 3 | 2 | 1;
  /** A단계 안내 문구 (교육적 멘트) */
  stageIntro?: string;
}

export interface RestPayload {
  type: 'rest';
  ruleLabel: string;
  restId: 'rest1' | 'rest2' | 'rest3';
}

export interface IntroPayload {
  type: 'intro';
  week: 1 | 2 | 3 | 4;
  subtitle?: string;
}

export interface OutroPayload {
  type: 'outro';
  summaryText: string;
}

export type ThinkPayload =
  | StageABPayload
  | StageCPayload
  | RestPayload
  | ReadyPayload
  | IntroPayload
  | OutroPayload;

export interface ThinkTimelineEvent {
  t0: number;
  t1: number;
  phase: ThinkPhase;
  frame: ThinkFrameType;
  payload?: ThinkPayload;
}

export interface Think150Config {
  audience: '900ms' | '700ms' | '550ms';
  week: 1 | 2 | 3 | 4;
  /** 월(1-12). thinkPackByMonthAndWeek 사용 시 필요 */
  month?: number;
  seed: number;
  /** 단일 pack (구 호환) - week 2/3/4에 동일 적용 */
  thinkPack?: ThinkPackSets;
  /** 주차별 pack (1주차=색상만, 2/3/4주차 각각 다른 이미지) */
  thinkPackByWeek?: ThinkPackByWeek;
  /** 월별×주차별 pack (1~12월, 각 월마다 week2/3/4) */
  thinkPackByMonthAndWeek?: ThinkPackByMonthAndWeek;
  /** BGM Storage path (e.g. 'audio/think/bgm/bgm.mp3') */
  bgmPath?: string;
}

export type ThinkPackSets = {
  setA: Record<PADColor, string>;
  setB: Record<PADColor, string>;
};

export type ThinkPackByWeek = {
  week2?: ThinkPackSets;
  week3?: ThinkPackSets;
  week4?: ThinkPackSets;
};

export type ThinkPackByMonthAndWeek = {
  [month: number]: ThinkPackByWeek;
};
