# I.I.Warm-up 엔터프라이즈 리팩토링 완전 계획서

## 목표

Binary-Cognitive-Immersive 철학을 완벽히 제어할 수 있는 관리자 저작 도구 구축. 코딩 없이 수치 조작만으로 프로그램 생성 및 운영이 가능한 시스템.

---

## Part 1: 엔진 정밀 제어 모듈화

### 1.1 P1 Binary 엔진 정밀 제어

**파일**: `app/lib/admin/engines/StroboscopicEngine.ts` (기존 확장)

**핵심 공식**: 
```
Interval = CurrentFPS / TargetHz
```

**추가 기능**:
- N프레임마다 정확한 이미지 교체
- 실시간 Hz 조정 API (관리자 패널용)
- 디바이스 FPS 자동 감지 및 보정

**구현**:
```typescript
export class StroboscopicEngine {
  /**
   * 정밀 Hz 제어 (수식 기반)
   * Interval = CurrentFPS / TargetHz
   * N프레임마다 정확히 이미지 교체
   */
  setPreciseFrequency(targetHz: number) {
    const fps = this.deviceFPS;
    const interval = fps / targetHz; // N프레임마다 교체
    this.frequency = targetHz;
    this.frameInterval = interval;
    
    // 프레임 카운터 리셋
    this.frameCounter = 0;
    this.targetFrameInterval = Math.floor(interval);
  }
  
  /**
   * 실시간 Hz 조정 (관리자 패널에서 사용)
   */
  adjustFrequency(newHz: number) {
    this.setPreciseFrequency(newHz);
  }
  
  /**
   * 프레임 카운터 기반 정확한 교체
   */
  private frameCounter: number = 0;
  private targetFrameInterval: number = 0;
  
  tick() {
    this.frameCounter++;
    if (this.frameCounter >= this.targetFrameInterval) {
      this.frameCounter = 0;
      this.togglePhase();
    }
  }
}
```

### 1.2 P2 Cognitive 엔진 (stroopLogic.ts 분리)

**파일**: `app/lib/admin/logic/stroopLogic.ts`

**목적**: Think Phase의 Stroop 간섭 로직을 독립 모듈로 분리

**핵심 기능**:
- 색상-단어 일치/불일치 확률 변수화 (`congruentRatio`)
- 반응 속도(RT) 및 정확도(Accuracy) 측정
- CognitiveTelemetry 내장

**구현**:
```typescript
export interface StroopConfig {
  congruentRatio: number;      // 일치 확률 (0-1)
  totalRounds: number;          // 총 라운드 수
  roundDuration: number;         // 라운드당 시간 (ms)
  objectSpawnInterval: number;  // 객체 스폰 간격 (ms)
  objectLifetime: number;       // 객체 생존 시간 (ms)
}

export interface StroopTrial {
  word: string;                 // 표시되는 단어
  wordColor: string;            // 단어의 색상 (Hex)
  correctColor: string;         // 정답 색상
  isCongruent: boolean;         // 일치 여부
}

export interface StroopResponse {
  trial: StroopTrial;
  selectedColor: string;
  reactionTime: number;         // ms
  correct: boolean;
}

export class StroopEngine {
  private config: StroopConfig;
  private responses: StroopResponse[] = [];
  private currentRound: number = 0;
  private telemetry: CognitiveTelemetry;
  
  constructor(config: StroopConfig) {
    this.config = config;
    this.telemetry = new CognitiveTelemetry();
  }
  
  /**
   * Stroop 시행 생성 (일치/불일치 확률 적용)
   */
  generateTrial(): StroopTrial {
    const colors = ['RED', 'YELLOW', 'GREEN', 'BLUE'];
    const colorWords = ['빨강', '노랑', '초록', '파랑'];
    
    const wordIndex = Math.floor(Math.random() * colorWords.length);
    const colorIndex = Math.floor(Math.random() * colors.length);
    
    const word = colorWords[wordIndex];
    const wordColor = PAD_COLORS[colors[colorIndex]];
    const correctColor = PAD_COLORS[colors[wordIndex]]; // 단어 의미가 정답
    const isCongruent = wordIndex === colorIndex;
    
    // 확률 조정: congruentRatio에 따라 일치/불일치 조절
    const adjustedCongruent = Math.random() < this.config.congruentRatio;
    
    return {
      word,
      wordColor: adjustedCongruent ? correctColor : wordColor,
      correctColor,
      isCongruent: adjustedCongruent && isCongruent
    };
  }
  
  /**
   * 반응 기록 및 Telemetry 전송
   */
  recordResponse(trial: StroopTrial, selectedColor: string, reactionTime: number) {
    const correct = selectedColor === trial.correctColor;
    
    this.responses.push({
      trial,
      selectedColor,
      reactionTime,
      correct
    });
    
    // CognitiveTelemetry 전송
    this.telemetry.track({
      type: 'COGNITIVE_RESPONSE',
      phase: 'think',
      trial: this.currentRound,
      isCongruent: trial.isCongruent,
      correct,
      reactionTime,
      interference: !trial.isCongruent && !correct ? 'high' : 'low'
    });
  }
  
  /**
   * 인지 간섭 점수 계산
   * Score_interf = (RT_incongruent - RT_congruent) / RT_congruent × (1 - ErrorRate)
   */
  calculateInterferenceScore(): {
    score: number;
    rtCongruent: number;
    rtIncongruent: number;
    errorRate: number;
    confidence: number;
  } {
    const congruent = this.responses.filter(r => r.trial.isCongruent);
    const incongruent = this.responses.filter(r => !r.trial.isCongruent);
    
    if (congruent.length === 0 || incongruent.length === 0) {
      return { score: 0, rtCongruent: 0, rtIncongruent: 0, errorRate: 0, confidence: 0 };
    }
    
    const avgCongruentRT = congruent.reduce((sum, r) => sum + r.reactionTime, 0) / congruent.length;
    const avgIncongruentRT = incongruent.reduce((sum, r) => sum + r.reactionTime, 0) / incongruent.length;
    const errorRate = this.responses.filter(r => !r.correct).length / this.responses.length;
    
    const baseInterference = (avgIncongruentRT - avgCongruentRT) / avgCongruentRT;
    const score = baseInterference * (1 - errorRate);
    const confidence = Math.min(1, this.responses.length / 10);
    
    return {
      score,
      rtCongruent: avgCongruentRT,
      rtIncongruent: avgIncongruentRT,
      errorRate,
      confidence
    };
  }
}
```

### 1.3 P3 Immersive 엔진 (SpatialDistortionEngine)

**파일**: `app/lib/admin/engines/SpatialDistortionEngine.ts`

**목적**: Flow Phase의 3D 로직을 엔진으로 추상화

**핵심 기능**:
- baseSpeed 파라미터 실시간 적용
- distortionLevel 파라미터 실시간 적용
- boxRate 파라미터 실시간 적용
- JSON에서 설정값 주입

**구현**:
```typescript
import * as THREE from 'three';

export interface FlowConfig {
  baseSpeed: number;           // 기본 속도 (0.6 기본값)
  distortion: number;           // 공간 왜곡률 (0-1)
  boxRate: {
    lv3: number;                // LV3 박스 등장률 (0.40)
    lv4: number;                // LV4 박스 등장률 (0.45)
  };
  durations: number[];          // 레벨별 지속 시간 [30, 30, 15, 40, 40, 10]
  displayLevels: number[];       // 표시 레벨 [1, 2, 0, 3, 4, -1]
}

export class SpatialDistortionEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private config: FlowConfig;
  private boxes: THREE.Group[] = [];
  private bridges: THREE.Mesh[] = [];
  
  constructor(canvas: HTMLCanvasElement, config: FlowConfig) {
    this.config = config;
    this.init3D(canvas);
  }
  
  /**
   * 3D 초기화
   */
  private init3D(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 500, 3800);
    
    this.camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 30000);
    
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // 조명 설정
    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(amb);
    
    const spot = new THREE.PointLight(0x3b82f6, 15, 10000);
    spot.position.set(0, 2000, 1000);
    this.scene.add(spot);
    
    this.createSpaceBackground();
    this.createTrackLanes();
  }
  
  /**
   * baseSpeed 실시간 업데이트
   */
  updateSpeed(baseSpeed: number) {
    this.config.baseSpeed = baseSpeed;
    // 게임 로직에 즉시 반영
    // bridge 생성 시 baseSpeed 적용
  }
  
  /**
   * 공간 왜곡 실시간 적용
   */
  updateDistortion(distortion: number) {
    this.config.distortion = distortion;
    
    // 카메라 FOV 조정
    const baseFov = 60;
    const targetFov = baseFov + (distortion * 10); // 60-70 범위
    this.camera.fov = targetFov;
    this.camera.updateProjectionMatrix();
    
    // 씬 왜곡 적용 (선택적)
    // ...
  }
  
  /**
   * 박스 등장률 실시간 업데이트
   */
  updateBoxRate(lv3: number, lv4: number) {
    this.config.boxRate.lv3 = lv3;
    this.config.boxRate.lv4 = lv4;
  }
  
  /**
   * JSON 설정값 주입
   */
  loadFromJSON(json: FlowConfig) {
    this.config = json;
    this.updateSpeed(json.baseSpeed);
    this.updateDistortion(json.distortion);
    this.updateBoxRate(json.boxRate.lv3, json.boxRate.lv4);
  }
  
  /**
   * 박스 스폰 결정 (실시간 boxRate 적용)
   */
  shouldSpawnBox(levelNum: number): boolean {
    if (levelNum === 3) return Math.random() < this.config.boxRate.lv3;
    if (levelNum === 4) return Math.random() < this.config.boxRate.lv4;
    return false;
  }
  
  /**
   * 렌더링 루프
   */
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // baseSpeed 적용
    const currentSpeed = this.config.baseSpeed;
    // ... 게임 로직
    
    this.renderer.render(this.scene, this.camera);
  }
}
```

---

## Part 2: 관리자 페이지 3대 핵심 모듈

### 2.1 A. 파라메트릭 제너레이터 (The Generator)

**파일**: `app/admin/iiwarmup/generator/page.tsx`

**기능**: 논리 조립기 - 입력값을 Scenario JSON으로 자동 변환

**입력**:
- Target: 'junior' | 'senior' | 'mixed'
- Difficulty: 1 | 2 | 3 (Easy/Medium/Hard)
- Theme: 'kitchen' | 'jungle' | 'ocean' | 'space' | ... (12종)

**출력**: 완전한 Scenario JSON

**매핑 테이블**:
```typescript
// 난이도 3 → P1 Hz 15Hz, P3 박스 출현 45%
const DIFFICULTY_MAPPING = {
  1: { 
    hz: 8, 
    boxRate: { lv3: 0.30, lv4: 0.35 },
    speed: 0.5,
    distortion: 0.1
  },
  2: { 
    hz: 12, 
    boxRate: { lv3: 0.40, lv4: 0.40 },
    speed: 1.0,
    distortion: 0.3
  },
  3: { 
    hz: 15, 
    boxRate: { lv3: 0.45, lv4: 0.45 },
    speed: 1.5,
    distortion: 0.5
  }
};
```

**구현**:
```typescript
export function generateScenarioJSON(config: GeneratorConfig): GeneratedScenario {
  const mapping = DIFFICULTY_MAPPING[config.difficulty];
  
  return {
    play: {
      frequency: mapping.hz,
      actions: generateActions(config, TRANSITION_INTERVALS[config.target]),
      transitionInterval: TRANSITION_INTERVALS[config.target]
    },
    think: {
      roundDuration: (120 * 1000) / THINK_PHASE_CONFIG.totalRounds,
      totalRounds: THINK_PHASE_CONFIG.totalRounds,
      objectSpawnInterval: THINK_PHASE_CONFIG.objectSpawnInterval,
      objectLifetime: THINK_PHASE_CONFIG.objectLifetime,
      congruentRatio: config.difficulty === 1 ? 0.8 : config.difficulty === 2 ? 0.5 : 0.3
    },
    flow: {
      baseSpeed: 0.6 * mapping.speed,
      distortion: mapping.distortion,
      boxRate: mapping.boxRate
    }
  };
}
```

### 2.2 B. 실시간 시뮬레이터 (Live Preview)

**파일**: `app/admin/iiwarmup/generator/components/ScenarioSimulator.tsx`

**기능**:
- 좌측 패널 수치 변경 시 즉시 우측 Canvas에 반영
- Phase 1, 2, 3 모두 실시간 렌더링
- Hz와 속도를 눈으로 확인 가능한 최종 승인 장치

**구현**:
```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { StroboscopicEngine } from '@/app/lib/admin/engines/StroboscopicEngine';
import { StroopEngine } from '@/app/lib/admin/logic/stroopLogic';
import { SpatialDistortionEngine } from '@/app/lib/admin/engines/SpatialDistortionEngine';
import { GeneratedScenario } from '@/app/lib/admin/logic/generateScenarioJSON';

interface ScenarioSimulatorProps {
  scenario: GeneratedScenario | null;
}

export function ScenarioSimulator({ scenario }: ScenarioSimulatorProps) {
  const playCanvasRef = useRef<HTMLCanvasElement>(null);
  const thinkCanvasRef = useRef<HTMLCanvasElement>(null);
  const flowCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const stroboscopicRef = useRef<StroboscopicEngine | null>(null);
  const cognitiveRef = useRef<StroopEngine | null>(null);
  const spatialRef = useRef<SpatialDistortionEngine | null>(null);
  
  const [currentPhase, setCurrentPhase] = useState<'play' | 'think' | 'flow'>('play');
  
  // Phase 1: Stroboscopic 엔진 초기화
  useEffect(() => {
    if (!scenario || !playCanvasRef.current) return;
    
    const engine = new StroboscopicEngine(scenario.play.frequency);
    engine.setPreciseFrequency(scenario.play.frequency);
    stroboscopicRef.current = engine;
    
    engine.start((phase) => {
      // Binary 이미지 렌더링
      renderBinaryImage(playCanvasRef.current!, phase);
    });
    
    return () => engine.stop();
  }, [scenario?.play]);
  
  // Phase 2: Cognitive 엔진 초기화
  useEffect(() => {
    if (!scenario) return;
    
    const engine = new StroopEngine(scenario.think);
    cognitiveRef.current = engine;
    
    // 시뮬레이션 시작
    engine.start();
    
    return () => engine.stop();
  }, [scenario?.think]);
  
  // Phase 3: Spatial 엔진 초기화
  useEffect(() => {
    if (!scenario || !flowCanvasRef.current) return;
    
    const engine = new SpatialDistortionEngine(flowCanvasRef.current, scenario.flow);
    spatialRef.current = engine;
    
    engine.animate();
    
    return () => engine.cleanup();
  }, [scenario?.flow]);
  
  // 실시간 파라미터 업데이트
  useEffect(() => {
    if (!scenario) return;
    
    // Phase 1: Hz 업데이트
    if (stroboscopicRef.current) {
      stroboscopicRef.current.adjustFrequency(scenario.play.frequency);
    }
    
    // Phase 3: 속도/왜곡 업데이트
    if (spatialRef.current) {
      spatialRef.current.updateSpeed(scenario.flow.baseSpeed);
      spatialRef.current.updateDistortion(scenario.flow.distortion);
      spatialRef.current.updateBoxRate(scenario.flow.boxRate.lv3, scenario.flow.boxRate.lv4);
    }
  }, [scenario]);
  
  return (
    <div className="h-full bg-black relative">
      {/* Phase 선택 탭 */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        {['play', 'think', 'flow'].map((phase) => (
          <button
            key={phase}
            onClick={() => setCurrentPhase(phase as any)}
            className={`px-4 py-2 rounded-lg font-bold ${
              currentPhase === phase
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {phase.toUpperCase()}
          </button>
        ))}
      </div>
      
      {/* Phase별 Canvas */}
      {currentPhase === 'play' && (
        <canvas ref={playCanvasRef} className="w-full h-full" />
      )}
      {currentPhase === 'think' && (
        <canvas ref={thinkCanvasRef} className="w-full h-full" />
      )}
      {currentPhase === 'flow' && (
        <canvas ref={flowCanvasRef} className="w-full h-full" />
      )}
      
      {/* 실시간 파라미터 표시 */}
      {scenario && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-sm">
          <div>Hz: {scenario.play.frequency}Hz</div>
          <div>Speed: {scenario.flow.baseSpeed.toFixed(2)}</div>
          <div>Distortion: {(scenario.flow.distortion * 100).toFixed(0)}%</div>
        </div>
      )}
    </div>
  );
}
```

### 2.3 C. 데이터 텔레메트리 대시보드 (BI)

**파일**: `app/admin/iiwarmup/analytics/page.tsx`

**기능**:
- SESSION_START, PHASE_COMPLETE, INTERACTION_DATA 수집
- 집단 평균 인지 간섭 점수 계산
- 인지-신체 반응 지수 리포트

**수식 구현**:
```typescript
// Score_interf = (RT_incongruent - RT_congruent) / RT_congruent × (1 - ErrorRate)
export function calculateInterferenceScore(responses: StroopResponse[]): number {
  const congruent = responses.filter(r => r.trial.isCongruent);
  const incongruent = responses.filter(r => !r.trial.isCongruent);
  
  if (congruent.length === 0 || incongruent.length === 0) return 0;
  
  const avgCongruentRT = congruent.reduce((sum, r) => sum + r.reactionTime, 0) / congruent.length;
  const avgIncongruentRT = incongruent.reduce((sum, r) => sum + r.reactionTime, 0) / incongruent.length;
  const errorRate = responses.filter(r => !r.correct).length / responses.length;
  
  const baseInterference = (avgIncongruentRT - avgCongruentRT) / avgCongruentRT;
  return baseInterference * (1 - errorRate);
}
```

---

## Part 3: 데이터베이스 스키마

### 3.1 play_motions 테이블

**목적**: 20가지 동작의 바이너리 이미지 URL 및 속성

```sql
CREATE TABLE IF NOT EXISTS play_motions (
  id TEXT PRIMARY KEY,                    -- 'POINT', 'PULL', 'PUSH' 등
  name_ko TEXT NOT NULL,                  -- 한국어 이름
  name_en TEXT NOT NULL,                  -- 영어 이름
  image_off_url TEXT,                     -- OFF 상태 이미지 URL
  image_on_url TEXT,                      -- ON 상태 이미지 URL
  category TEXT,                           -- 'upper', 'lower', 'full'
  intensity_default TEXT DEFAULT 'MID',    -- 기본 강도
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20가지 동작 기본 데이터
INSERT INTO play_motions (id, name_ko, name_en, category) VALUES
('POINT', '찌르기', 'Point', 'upper'),
('PULL', '당기기', 'Pull', 'upper'),
('PUSH', '밀기', 'Push', 'upper'),
('PUNCH', '펀치', 'Punch', 'upper'),
('CHOP', '가르기', 'Chop', 'upper'),
('TOUCH', '터치', 'Touch', 'upper'),
('CLAP', '박수', 'Clap', 'upper'),
('SWIPE', '훑기', 'Swipe', 'upper'),
('SNAP', '손가락 튕기기', 'Snap', 'upper'),
('GRAB', '움켜쥐기', 'Grab', 'upper'),
('DUCK', '웅크리기', 'Duck', 'lower'),
('JUMP', '점프', 'Jump', 'lower'),
('WALK', '제자리 걷기', 'Walk', 'lower'),
('SHRINK', '축소', 'Shrink', 'lower'),
('EXPLODE', '전신 펴기', 'Explode', 'full'),
('LEAN', '기울이기', 'Lean', 'full'),
('TURN', '회전', 'Turn', 'full'),
('SHUFFLE', '셔플', 'Shuffle', 'full'),
('BLOCK', '막기', 'Block', 'full'),
('TWIST', '비틀기', 'Twist', 'full')
ON CONFLICT (id) DO NOTHING;
```

### 3.2 scenario_templates 테이블

**목적**: 테마별 기본 설정값 (속도, 왜곡률 등)

```sql
CREATE TABLE IF NOT EXISTS scenario_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  target TEXT NOT NULL CHECK (target IN ('junior', 'senior', 'mixed')),
  
  -- Phase 1 설정
  binary_frequency INTEGER DEFAULT 12,    -- Hz
  transition_interval DECIMAL DEFAULT 1.0, -- 초
  
  -- Phase 2 설정
  think_rounds INTEGER DEFAULT 10,
  think_spawn_interval INTEGER DEFAULT 2000, -- ms
  think_object_lifetime INTEGER DEFAULT 3000, -- ms
  stroop_congruent_ratio DECIMAL DEFAULT 0.5, -- 0-1
  
  -- Phase 3 설정
  flow_base_speed DECIMAL DEFAULT 0.6,
  flow_distortion DECIMAL DEFAULT 0.3,     -- 0-1
  flow_box_rate_lv3 DECIMAL DEFAULT 0.40,  -- 0-1
  flow_box_rate_lv4 DECIMAL DEFAULT 0.45,  -- 0-1
  
  template_json JSONB,                     -- 전체 템플릿 JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scenario_templates_theme_difficulty 
  ON scenario_templates(theme, difficulty) 
  WHERE is_active = true;
```

### 3.3 rotation_schedule 테이블 (기존 확장)

**목적**: 주차별/기관별 배포 스케줄

```sql
-- 기존 테이블 확인 후 컬럼 추가
ALTER TABLE rotation_schedule
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id),
ADD COLUMN IF NOT EXISTS target_audience TEXT CHECK (target_audience IN ('junior', 'senior', 'mixed'));
```

### 3.4 telemetry_logs 테이블

**목적**: 전 세계에서 들어오는 인지/활동 데이터 로그

```sql
CREATE TABLE IF NOT EXISTS telemetry_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  week_key TEXT NOT NULL,
  program_id TEXT,
  
  -- 이벤트 타입
  event_type TEXT NOT NULL,                -- 'SESSION_START', 'PHASE_COMPLETE', 'INTERACTION_DATA' 등
  phase TEXT,                              -- 'play', 'think', 'flow'
  
  -- 페이로드
  payload JSONB NOT NULL,                  -- 이벤트별 상세 데이터
  
  -- 타임스탬프
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_telemetry_session ON telemetry_logs(session_id);
CREATE INDEX idx_telemetry_week_key ON telemetry_logs(week_key);
CREATE INDEX idx_telemetry_event_type ON telemetry_logs(event_type);
CREATE INDEX idx_telemetry_timestamp ON telemetry_logs(timestamp DESC);
CREATE INDEX idx_telemetry_user_week ON telemetry_logs(user_id, week_key);
```

---

## Part 4: 마스터 수치 테이블

### 4.1 Physics Constants

**파일**: `app/lib/admin/constants/physics.ts`

**목적**: 개발자가 직접 수정할 수 있는 마스터 수치 테이블

```typescript
/**
 * 마스터 수치 테이블
 * 개발자가 여기서 숫자를 직접 수정하여 전체 시스템에 반영
 */

// 타겟별 Hz 설정
export const TARGET_FREQUENCIES = {
  junior: 8,    // 아동: 느린 깜빡임
  senior: 12,   // 시니어: 표준 (거울 뉴런 최적)
  mixed: 10     // 혼합: 중간
} as const;

// 난이도별 속도 배율
export const DIFFICULTY_SPEED_MULTIPLIERS = {
  easy: 0.5,
  medium: 1.0,
  hard: 1.5
} as const;

// Flow Phase 공간 왜곡률
export const SPATIAL_DISTORTION_LEVELS = {
  easy: 0.1,    // 10% 왜곡
  medium: 0.3,  // 30% 왜곡
  hard: 0.5     // 50% 왜곡
} as const;

// Flow Phase 박스 등장률
export const BOX_SPAWN_RATES = {
  LV3: 0.40,
  LV4: 0.45
} as const;

// Think Phase 라운드 설정
export const THINK_PHASE_CONFIG = {
  totalRounds: 10,
  objectSpawnInterval: 2000,  // ms
  objectLifetime: 3000         // ms
} as const;

// 동작 간 전이 시간 (초)
export const TRANSITION_INTERVALS = {
  junior: 0.5,
  senior: 1.5,
  mixed: 1.0
} as const;

// 난이도별 매핑 테이블
export const DIFFICULTY_MAPPING = {
  1: { 
    hz: 8, 
    boxRate: { lv3: 0.30, lv4: 0.35 },
    speed: 0.5,
    distortion: 0.1,
    stroopCongruentRatio: 0.8
  },
  2: { 
    hz: 12, 
    boxRate: { lv3: 0.40, lv4: 0.40 },
    speed: 1.0,
    distortion: 0.3,
    stroopCongruentRatio: 0.5
  },
  3: { 
    hz: 15, 
    boxRate: { lv3: 0.45, lv4: 0.45 },
    speed: 1.5,
    distortion: 0.5,
    stroopCongruentRatio: 0.3
  }
} as const;
```

---

## Part 5: 비즈니스 로직 분리

### 5.1 generateScenarioJSON 함수

**파일**: `app/lib/admin/logic/generateScenarioJSON.ts`

```typescript
import { TARGET_FREQUENCIES, DIFFICULTY_MAPPING, TRANSITION_INTERVALS } from '../constants/physics';
import { generateActions } from './parametricEngine';

export interface GeneratorConfig {
  target: 'junior' | 'senior' | 'mixed';
  difficulty: 1 | 2 | 3;  // Easy/Medium/Hard
  theme: string;
}

export interface GeneratedScenario {
  play: {
    frequency: number;
    actions: ActionConfig[];
    transitionInterval: number;
  };
  think: {
    roundDuration: number;
    totalRounds: number;
    objectSpawnInterval: number;
    objectLifetime: number;
    congruentRatio: number;
  };
  flow: {
    baseSpeed: number;
    distortion: number;
    boxRate: {
      lv3: number;
      lv4: number;
    };
  };
}

export function generateScenarioJSON(config: GeneratorConfig): GeneratedScenario {
  const mapping = DIFFICULTY_MAPPING[config.difficulty];
  const frequency = TARGET_FREQUENCIES[config.target];
  const transitionInterval = TRANSITION_INTERVALS[config.target];
  
  return {
    play: {
      frequency: mapping.hz,
      actions: generateActions(config, transitionInterval),
      transitionInterval
    },
    think: {
      roundDuration: (120 * 1000) / THINK_PHASE_CONFIG.totalRounds,
      totalRounds: THINK_PHASE_CONFIG.totalRounds,
      objectSpawnInterval: THINK_PHASE_CONFIG.objectSpawnInterval,
      objectLifetime: THINK_PHASE_CONFIG.objectLifetime,
      congruentRatio: mapping.stroopCongruentRatio
    },
    flow: {
      baseSpeed: 0.6 * mapping.speed,
      distortion: mapping.distortion,
      boxRate: mapping.boxRate
    }
  };
}
```

### 5.2 parametricEngine

**파일**: `app/lib/admin/logic/parametricEngine.ts`

```typescript
import { ACTION_TYPES, ACTION_NAMES } from '@/app/components/admin/iiwarmup/constants';
import { GeneratorConfig } from './generateScenarioJSON';

export function generateActions(
  config: GeneratorConfig,
  transitionInterval: number
): ActionConfig[] {
  const targetActions = {
    junior: ['POINT', 'TOUCH', 'CLAP', 'JUMP', 'WALK'],
    senior: ['CHOP', 'PUNCH', 'SWIPE', 'EXPLODE', 'LEAN'],
    mixed: ACTION_TYPES
  };
  
  const preferred = targetActions[config.target];
  const count = config.difficulty === 1 ? 8 : config.difficulty === 2 ? 12 : 15;
  const totalDuration = 120;
  const actionDuration = (totalDuration - (transitionInterval * (count - 1))) / count;
  
  const actions: ActionConfig[] = [];
  
  for (let i = 0; i < count; i++) {
    const actionType = preferred[Math.floor(Math.random() * preferred.length)];
    const startTime = i * (actionDuration + transitionInterval);
    
    actions.push({
      id: `action_${String(i + 1).padStart(3, '0')}`,
      type: actionType,
      startTime,
      duration: actionDuration,
      position: {
        x: Math.random() * 100,
        y: Math.random() * 100
      },
      intensity: config.difficulty === 1 ? 'LOW' : config.difficulty === 3 ? 'HIGH' : 'MID',
      images: { off: '', on: '' },
      introText: {
        en: actionType,
        ko: ACTION_NAMES[actionType] || actionType
      }
    });
  }
  
  return actions;
}
```

---

## Part 6: Visual Reward Scheduler

### 6.1 시각적 보상 스케줄러

**파일**: `app/lib/admin/logic/visualRewardScheduler.ts`

```typescript
export interface VisualReward {
  timestamp: number; // ms
  type: 'particle' | 'camera_shake' | 'color_flash';
  intensity: number;
  actionVector?: { x: number; y: number };
}

export class VisualRewardScheduler {
  private rewards: Map<number, VisualReward[]> = new Map();
  
  /**
   * 시나리오 타이밍에 동기화된 보상 스케줄 생성
   */
  scheduleReward(timestamp: number, reward: VisualReward) {
    const key = Math.floor(timestamp / 100) * 100;
    if (!this.rewards.has(key)) {
      this.rewards.set(key, []);
    }
    this.rewards.get(key)!.push(reward);
  }
  
  /**
   * 특정 시간에 보상 트리거
   */
  triggerReward(currentMs: number, actionVector?: { x: number; y: number }) {
    const key = Math.floor(currentMs / 100) * 100;
    const rewards = this.rewards.get(key);
    
    if (rewards) {
      rewards.forEach((reward) => {
        switch (reward.type) {
          case 'particle':
            triggerParticleEffect(reward.intensity, actionVector || reward.actionVector);
            break;
          case 'camera_shake':
            triggerCameraShake(reward.intensity);
            break;
          case 'color_flash':
            triggerColorFlash(reward.intensity);
            break;
        }
      });
    }
  }
}
```

---

## Part 7: Admin 페이지 통합

### 7.1 기존 Admin 페이지에 Generator/Analytics 탭 추가

**파일**: `app/admin/iiwarmup/page.tsx`

**변경사항**:
- 탭 타입 확장: `'theme' | 'program' | 'scheduler' | 'generator' | 'analytics'`
- Generator 탭: Split-view 저작 도구
- Analytics 탭: BI 대시보드

---

## 구현 체크리스트

### Week 1: 데이터베이스 스키마
- [ ] play_motions 테이블 생성
- [ ] scenario_templates 테이블 생성
- [ ] telemetry_logs 테이블 생성
- [ ] rotation_schedule 테이블 확장

### Week 2: 마스터 수치 테이블
- [ ] physics.ts 파일 생성
- [ ] 모든 상수 정의

### Week 3: 엔진 모듈화
- [ ] StroboscopicEngine 확장 (정밀 Hz 제어)
- [ ] stroopLogic.ts 분리
- [ ] SpatialDistortionEngine.ts 구축

### Week 4: 비즈니스 로직
- [ ] generateScenarioJSON.ts
- [ ] parametricEngine.ts
- [ ] visualRewardScheduler.ts

### Week 5: Generator UI
- [ ] ParameterPanel.tsx
- [ ] ScenarioSimulator.tsx
- [ ] Split-view 레이아웃

### Week 6: BI Dashboard
- [ ] Analytics 페이지
- [ ] CognitiveTelemetry 통합
- [ ] 리포트 생성

### Week 7: Admin 페이지 통합
- [ ] 탭 추가
- [ ] 라우팅 설정
- [ ] 통합 테스트
