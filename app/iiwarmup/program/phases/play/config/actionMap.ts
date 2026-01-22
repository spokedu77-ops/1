/**
 * 트리거-동작 매핑 테이블
 * 시각적 트리거가 어떤 동작을 유도하는지 정의
 */

import { ActionType, TriggerType } from '../types/scenario';

export interface ActionTriggerMapping {
  action: ActionType;
  effect: string;
  visual: string;
  interval?: number;
  speed?: number;
  count?: number;
}

export const ACTION_TRIGGERS: Record<string, ActionTriggerMapping> = {
  FIRE_FLICKER: {
    action: "TURN",
    effect: "FLAME_ON_OFF",
    interval: 1.0,
    visual: "gas_stove_flame"
  },
  PAN_SWEEP: {
    action: "DUCK",
    effect: "HORIZONTAL_SLIDE",
    speed: 0.8,
    visual: "flying_pan"
  },
  POPCORN_BURST: {
    action: "JUMP",
    effect: "VERTICAL_LAUNCH",
    count: 3,
    visual: "popcorn_explosion"
  },
  WALL_APPROACH: {
    action: "PUSH",
    effect: "WALL_COLLISION",
    visual: "approaching_wall"
  },
  ROPE_PULL: {
    action: "PULL",
    effect: "TENSION_RELEASE",
    visual: "rope_tension"
  },
  STEAM_RISE: {
    action: "POINT",
    effect: "VERTICAL_RISE",
    visual: "steam_cloud"
  },
  KNIFE_SLASH: {
    action: "PUNCH",
    effect: "HORIZONTAL_SLASH",
    visual: "knife_slash"
  },
  SPARK_EXPLODE: {
    action: "JUMP",
    effect: "RADIUS_EXPLOSION",
    visual: "spark_burst"
  }
};

/**
 * 트리거 타입별 기본 설정
 */
export const TRIGGER_DEFAULTS: Record<TriggerType, Partial<ActionTriggerMapping>> = {
  FLICKER: {
    interval: 1.0,
    effect: "ON_OFF"
  },
  SWEEP: {
    speed: 0.8,
    effect: "HORIZONTAL_MOTION"
  },
  BURST: {
    count: 3,
    effect: "EXPLOSION"
  },
  APPROACH: {
    speed: 0.6,
    effect: "FORWARD_MOTION"
  },
  EXPLODE: {
    effect: "RADIUS_EXPLOSION"
  },
  PULSE: {
    interval: 0.5,
    effect: "PULSE"
  },
  ROTATE: {
    speed: 1.0,
    effect: "ROTATION"
  }
};
