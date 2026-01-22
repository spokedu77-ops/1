/**
 * Play Phase 시나리오 타입 정의
 * 타임라인 기반 몰입형 웜업 프로그램 구조
 */

export type TriggerType = 'FLICKER' | 'SWEEP' | 'BURST' | 'APPROACH' | 'EXPLODE' | 'PULSE' | 'ROTATE';
export type ActionType = 'TURN' | 'DUCK' | 'JUMP' | 'PUNCH' | 'PUSH' | 'PULL' | 'POINT';
export type ObjectType = 'flame' | 'pan' | 'popcorn' | 'wall' | 'rope' | 'knife' | 'steam' | 'spark';
export type RepetitionVariation = 'random' | 'alternating' | 'sequential';

export interface TriggerConfig {
  type: TriggerType;
  interval?: number;              // 반복 간격 (초)
  random_delay?: [number, number]; // 랜덤 지연 범위 [min, max]
  count?: number;                  // 반복 횟수
  speed?: number;                  // 속도 (0-1)
  intensity?: 'LOW' | 'MID' | 'HIGH';
}

export interface VisualEffect {
  object_type: ObjectType;
  position: { x: number; y: number; z?: number }; // x, y: 0-100%, z: 3D depth
  scale?: number;                  // 크기 배율
  animation_key: string;           // 애니메이션 키 (예: "gas_stove_flicker")
  color?: string;                  // 색상 (hex)
  rotation?: { x?: number; y?: number; z?: number }; // 회전 각도
}

export interface RepetitionConfig {
  count: number;                   // 반복 횟수
  interval: number;                // 반복 간격 (초)
  variation?: RepetitionVariation;   // 반복 패턴
}

export interface TimelineEvent {
  start: number;                    // 시작 시간 (초)
  end: number;                      // 종료 시간 (초)
  trigger: TriggerConfig;
  action: ActionType;
  visual_effect: VisualEffect;
  repetition?: RepetitionConfig;
  sound_effect?: {
    type: 'trigger' | 'action' | 'ambient';
    frequency?: number;
    duration?: number;
  };
}

export interface BackgroundConfig {
  type: 'gradient' | 'image' | '3d';
  colors?: string[];                // 그라데이션 색상
  image_url?: string;               // 배경 이미지 URL
  scene_config?: {
    fog_color?: string;
    fog_near?: number;
    fog_far?: number;
    ambient_light?: number;
    point_lights?: Array<{
      color: string;
      intensity: number;
      position: { x: number; y: number; z: number };
    }>;
  };
}

export interface Episode {
  id: string;                       // "KITCHEN_INFERNO"
  name: string;                      // "주방의 불꽃"
  theme: string;                    // "kitchen"
  total_time: number;               // 120 (초)
  background: BackgroundConfig;
  timeline: TimelineEvent[];
}
