/**
 * Generator Scenario 타입 정의
 */

export type ContentType = 'engine' | 'html';

export interface ActionConfig {
  id: string;
  type: string;
  startTime: number;  // 초
  duration: number;  // 초
  position: { x: number; y: number };
  intensity: 'LOW' | 'MID' | 'HIGH';
  images?: { off: string; on: string };
  introText?: { en: string; ko: string };
}

export interface PhaseConfig {
  content_type: ContentType;
  raw_html?: string;        // content_type이 'html'일 때 실행될 코드
  config_vars?: Record<string, any>;  // 코드 내부에서 참조할 변수들
}

export interface EventTimelineItem {
  timestamp: number;  // ms
  type: 'PARTICLE' | 'SHAKE' | 'COLOR_FLASH' | 'ACTION_START' | 'ACTION_END';
  intensity: 'LOW' | 'MID' | 'HIGH';
  direction?: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'CENTER';
  phase: 'play' | 'think' | 'flow';
  metadata?: Record<string, any>;
}

export interface GeneratedScenario {
  play: PhaseConfig & {
    frequency?: number;      // engine 모드일 때만 사용
    actions?: ActionConfig[];
    transitionInterval?: number;
  };
  think: PhaseConfig & {
    roundDuration?: number;
    totalRounds?: number;
    objectSpawnInterval?: number;
    objectLifetime?: number;
    congruentRatio?: number;
    staticDurationRatio?: number;  // NEW
  };
  flow: PhaseConfig & {
    baseSpeed?: number;
    distortion?: number;
    boxRate?: {
      lv3: number;
      lv4: number;
    };
  };
  eventTimeline: EventTimelineItem[];  // 명시적 이벤트 타임라인
}

export interface GeneratorConfig {
  target: 'junior' | 'senior' | 'mixed';
  difficulty: 1 | 2 | 3;  // Easy/Medium/Hard
  theme: string;
  themeId?: string;  // Asset Pack ID (예: "kitchen_v1")
  staticDurationRatio?: number;  // 선택적 (기본값은 STATIC_DURATION_RATIOS에서 가져옴)
}
