# I.I.Warm-up 엔터프라이즈 리팩토링 완전 계획서 v2.0

## 목표

Binary-Cognitive-Immersive 철학을 완벽히 제어할 수 있는 하이브리드 관리자 저작 도구 구축. 파라메트릭 모드와 코드 전문가 모드를 모두 지원하는 몰입형 제작 환경.

---

## 핵심 설계 원칙

1. **Canvas 기반 직접 구현**: Iframe 제거, WebGL/Three.js로 실시간 렌더링
2. **별도 페이지**: `/admin/iiwarmup/generator` (전체 화면 Split-View)
3. **정밀 주파수 보정**: `f = Refresh Rate / (2 × N)` 공식 적용
4. **하이브리드 모드**: Parametric Mode + Code Expert Mode
5. **Sandbox 환경**: 주입된 HTML 코드 안전 실행

---

## Part 1: 엔진 정밀 제어 모듈화 (수정)

### 1.1 P1 Binary 엔진 - 정밀 주파수 보정

**파일**: `app/lib/admin/engines/StroboscopicEngine.ts` (기존 확장)

**치명적 맹점 수정**: 주파수는 반드시 60Hz의 약수/정수 배수로 Snap

**핵심 공식**:
```
f_sync = Refresh Rate / (2 × N)  (N은 자연수)
```

**구현**:
```typescript
import { DeviceFPSDetector } from '../cognitive/engines/DeviceFPSDetector';

export class StroboscopicEngine {
  private deviceFPS: number = 60;
  
  /**
   * 정밀 주파수 보정: Refresh Rate의 약수/정수 배수로 Snap
   * f_sync = Refresh Rate / (2 × N)
   */
  static snapToRefreshRate(requestedHz: number, refreshRate: number = 60): number {
    // N을 계산: N = Refresh Rate / (2 × requestedHz)
    const idealN = refreshRate / (2 * requestedHz);
    
    // 가장 가까운 정수 N 선택
    const N = Math.round(idealN);
    const clampedN = Math.max(1, Math.min(30, N)); // 1~30 범위 제한
    
    // 보정된 주파수 계산
    const snappedHz = refreshRate / (2 * clampedN);
    
    // 8-15Hz 범위로 클램핑
    return Math.max(8, Math.min(15, snappedHz));
  }
  
  /**
   * 정밀 Hz 제어 (수식 기반)
   * Interval = CurrentFPS / TargetHz
   * N프레임마다 정확히 이미지 교체
   */
  async setPreciseFrequency(targetHz: number) {
    const fps = await DeviceFPSDetector.detectFPSAsync();
    this.deviceFPS = fps;
    
    // 정밀 보정 적용
    const correctedHz = StroboscopicEngine.snapToRefreshRate(targetHz, fps);
    this.frequency = correctedHz;
    
    // N프레임 계산
    const N = Math.round(fps / (2 * correctedHz));
    this.targetFrameInterval = N;
    this.frameCounter = 0;
  }
  
  /**
   * 실시간 Hz 조정 (관리자 패널에서 사용)
   */
  async adjustFrequency(newHz: number) {
    await this.setPreciseFrequency(newHz);
  }
  
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

### 1.2 P2 Cognitive 엔진 - STATIC_DURATION_RATIO 추가

**파일**: `app/lib/admin/logic/stroopLogic.ts`

**Senior vs Junior 로직 강화**: 정지 상태 명확성 파라미터 추가

```typescript
export interface StroopConfig {
  congruentRatio: number;
  totalRounds: number;
  roundDuration: number;
  objectSpawnInterval: number;
  objectLifetime: number;
  staticDurationRatio: number;  // NEW: 정지 상태 비율 (0-1)
  // 0.3 = 30% 정지, 70% 액션 (시니어용)
  // 0.5 = 50% 정지, 50% 액션 (기본)
  // 0.7 = 70% 정지, 30% 액션 (아동용)
}

export class StroopEngine {
  /**
   * 정지 상태 지속 시간 계산
   */
  getStaticDuration(): number {
    const totalCycle = this.config.objectLifetime;
    return totalCycle * this.config.staticDurationRatio;
  }
  
  /**
   * 액션 상태 지속 시간 계산
   */
  getActionDuration(): number {
    const totalCycle = this.config.objectLifetime;
    return totalCycle * (1 - this.config.staticDurationRatio);
  }
}
```

### 1.3 P3 Immersive 엔진 (기존과 동일)

**파일**: `app/lib/admin/engines/SpatialDistortionEngine.ts`

(기존 계획과 동일)

---

## Part 2: 확장된 Scenario 스키마

### 2.1 하이브리드 스키마 정의

**파일**: `app/lib/admin/types/scenario.ts`

```typescript
export type ContentType = 'engine' | 'html';

export interface PhaseConfig {
  content_type: ContentType;
  raw_html?: string;        // content_type이 'html'일 때 실행될 코드
  config_vars?: Record<string, any>;  // 코드 내부에서 참조할 변수들
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
  eventTimeline: EventTimelineItem[];  // NEW: 명시적 이벤트 타임라인
}

export interface EventTimelineItem {
  timestamp: number;  // ms
  type: 'PARTICLE' | 'SHAKE' | 'COLOR_FLASH' | 'ACTION_START' | 'ACTION_END';
  intensity: 'LOW' | 'MID' | 'HIGH';
  direction?: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'CENTER';
  phase: 'play' | 'think' | 'flow';
  metadata?: Record<string, any>;
}
```

---

## Part 3: 하이브리드 관리자 페이지

### 3.1 Generator 페이지 구조

**파일**: `app/admin/iiwarmup/generator/page.tsx`

**레이아웃**: Split-View (좌측 40% 컨트롤, 우측 60% 시뮬레이터)

```typescript
'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ParameterPanel } from './components/ParameterPanel';
import { HybridSimulator } from './components/HybridSimulator';
import { GeneratedScenario } from '@/app/lib/admin/types/scenario';

export default function GeneratorPage() {
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [mode, setMode] = useState<'parametric' | 'code'>('parametric');
  
  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/iiwarmup"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft size={20} />
            <span>대시보드로 돌아가기</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Program Generator</h1>
        </div>
      </header>
      
      {/* Split-View */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 컨트롤 & 코드 패널 */}
        <div className="w-[40%] border-r border-slate-700 overflow-y-auto">
          <ParameterPanel
            mode={mode}
            onModeChange={setMode}
            onScenarioChange={setScenario}
          />
        </div>
        
        {/* 우측: 통합 시뮬레이터 */}
        <div className="flex-1 bg-black">
          <HybridSimulator scenario={scenario} />
        </div>
      </div>
    </div>
  );
}
```

### 3.2 Parameter Panel (하이브리드)

**파일**: `app/admin/iiwarmup/generator/components/ParameterPanel.tsx`

**기능**: Tab 1 (Basic Setting) + Tab 2 (Code Editor)

```typescript
'use client';

import { useState } from 'react';
import { Settings, Code } from 'lucide-react';
import { BasicSettingsTab } from './BasicSettingsTab';
import { CodeEditorTab } from './CodeEditorTab';
import { GeneratedScenario } from '@/app/lib/admin/types/scenario';

interface ParameterPanelProps {
  mode: 'parametric' | 'code';
  onModeChange: (mode: 'parametric' | 'code') => void;
  onScenarioChange: (scenario: GeneratedScenario) => void;
}

export function ParameterPanel({ mode, onModeChange, onScenarioChange }: ParameterPanelProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'code'>('basic');
  
  return (
    <div className="h-full flex flex-col bg-slate-800">
      {/* 탭 헤더 */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition ${
            activeTab === 'basic'
              ? 'bg-slate-700 text-white border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings size={18} />
          Basic Setting
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition ${
            activeTab === 'code'
              ? 'bg-slate-700 text-white border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code size={18} />
          Code Editor
        </button>
      </div>
      
      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'basic' && (
          <BasicSettingsTab onScenarioChange={onScenarioChange} />
        )}
        {activeTab === 'code' && (
          <CodeEditorTab onScenarioChange={onScenarioChange} />
        )}
      </div>
    </div>
  );
}
```

### 3.3 Basic Settings Tab

**파일**: `app/admin/iiwarmup/generator/components/BasicSettingsTab.tsx`

```typescript
'use client';

import { useState } from 'react';
import { generateScenarioJSON } from '@/app/lib/admin/logic/generateScenarioJSON';
import { GeneratedScenario } from '@/app/lib/admin/types/scenario';

export function BasicSettingsTab({ onScenarioChange }: Props) {
  const [target, setTarget] = useState<'junior' | 'senior' | 'mixed'>('mixed');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [theme, setTheme] = useState('kitchen');
  const [staticDurationRatio, setStaticDurationRatio] = useState(0.5);
  
  const handleGenerate = () => {
    const scenario = generateScenarioJSON({
      target,
      difficulty,
      theme,
      staticDurationRatio  // NEW
    });
    onScenarioChange(scenario);
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Target 선택 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Target Audience
        </label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as any)}
          className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg"
        >
          <option value="junior">Junior (아동)</option>
          <option value="senior">Senior (시니어)</option>
          <option value="mixed">Mixed (혼합)</option>
        </select>
      </div>
      
      {/* Difficulty 선택 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Difficulty
        </label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}
          className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg"
        >
          <option value="1">Easy</option>
          <option value="2">Medium</option>
          <option value="3">Hard</option>
        </select>
      </div>
      
      {/* Static Duration Ratio (NEW) */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Static Duration Ratio: {(staticDurationRatio * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.3"
          max="0.7"
          step="0.1"
          value={staticDurationRatio}
          onChange={(e) => setStaticDurationRatio(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-slate-400 mt-1">
          시니어: 30% (빠른 전환) | 기본: 50% | 아동: 70% (느린 전환)
        </p>
      </div>
      
      {/* Generate 버튼 */}
      <button
        onClick={handleGenerate}
        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
      >
        Generate Scenario
      </button>
    </div>
  );
}
```

### 3.4 Code Editor Tab (Monaco Editor)

**파일**: `app/admin/iiwarmup/generator/components/CodeEditorTab.tsx`

**의존성 추가 필요**: `npm install @monaco-editor/react`

```typescript
'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { GeneratedScenario } from '@/app/lib/admin/types/scenario';

export function CodeEditorTab({ onScenarioChange }: Props) {
  const [code, setCode] = useState(`<!-- Play Phase HTML 코드 -->
<canvas id="playCanvas"></canvas>
<script>
  const canvas = document.getElementById('playCanvas');
  const ctx = canvas.getContext('2d');
  
  // 시스템 변수 주입 (자동)
  const FREQUENCY = window.__IIW_CONFIG__.frequency; // Hz
  const BASE_SPEED = window.__IIW_CONFIG__.baseSpeed;
  
  // 사용자 코드...
</script>`);
  
  const [selectedPhase, setSelectedPhase] = useState<'play' | 'think' | 'flow'>('play');
  
  const handleApply = () => {
    const scenario: GeneratedScenario = {
      play: {
        content_type: 'html',
        raw_html: code,
        config_vars: {
          frequency: 12,
          baseSpeed: 0.6
        }
      },
      think: { content_type: 'engine' },
      flow: { content_type: 'engine' },
      eventTimeline: []
    };
    
    onScenarioChange(scenario);
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Phase 선택 */}
      <div className="flex border-b border-slate-700">
        {['play', 'think', 'flow'].map((phase) => (
          <button
            key={phase}
            onClick={() => setSelectedPhase(phase as any)}
            className={`px-4 py-2 font-medium ${
              selectedPhase === phase
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {phase.toUpperCase()}
          </button>
        ))}
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="html"
          value={code}
          onChange={(value) => setCode(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on'
          }}
        />
      </div>
      
      {/* Apply 버튼 */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleApply}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Apply to Simulator
        </button>
      </div>
    </div>
  );
}
```

---

## Part 4: Hybrid Simulator (Canvas + Sandbox)

### 4.1 Hybrid Simulator 컴포넌트

**파일**: `app/admin/iiwarmup/generator/components/HybridSimulator.tsx`

**기능**: content_type에 따라 Engine 또는 Sandbox 렌더링

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { StroboscopicEngine } from '@/app/lib/admin/engines/StroboscopicEngine';
import { StroopEngine } from '@/app/lib/admin/logic/stroopLogic';
import { SpatialDistortionEngine } from '@/app/lib/admin/engines/SpatialDistortionEngine';
import { SandboxRenderer } from './SandboxRenderer';
import { GeneratedScenario } from '@/app/lib/admin/types/scenario';

interface HybridSimulatorProps {
  scenario: GeneratedScenario | null;
}

export function HybridSimulator({ scenario }: HybridSimulatorProps) {
  const playCanvasRef = useRef<HTMLCanvasElement>(null);
  const thinkCanvasRef = useRef<HTMLCanvasElement>(null);
  const flowCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentPhase, setCurrentPhase] = useState<'play' | 'think' | 'flow'>('play');
  
  // Engine 인스턴스
  const stroboscopicRef = useRef<StroboscopicEngine | null>(null);
  const cognitiveRef = useRef<StroopEngine | null>(null);
  const spatialRef = useRef<SpatialDistortionEngine | null>(null);
  
  // Phase별 렌더링
  useEffect(() => {
    if (!scenario) return;
    
    const phase = scenario[currentPhase];
    
    if (phase.content_type === 'engine') {
      // Engine 모드: Canvas 직접 렌더링
      renderEnginePhase(currentPhase, phase);
    } else if (phase.content_type === 'html') {
      // HTML 모드: Sandbox 렌더링
      // SandboxRenderer가 처리
    }
  }, [scenario, currentPhase]);
  
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
      
      {/* Phase별 렌더링 */}
      {scenario && (
        <>
          {scenario[currentPhase].content_type === 'engine' ? (
            // Engine 모드: Canvas
            <canvas
              ref={currentPhase === 'play' ? playCanvasRef : currentPhase === 'think' ? thinkCanvasRef : flowCanvasRef}
              className="w-full h-full"
            />
          ) : (
            // HTML 모드: Sandbox
            <SandboxRenderer
              html={scenario[currentPhase].raw_html || ''}
              configVars={scenario[currentPhase].config_vars || {}}
              phase={currentPhase}
            />
          )}
        </>
      )}
      
      {/* 실시간 파라미터 표시 */}
      {scenario && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-sm">
          <div>Phase: {currentPhase}</div>
          <div>Mode: {scenario[currentPhase].content_type}</div>
          {scenario[currentPhase].content_type === 'engine' && (
            <>
              <div>Hz: {scenario.play.frequency}Hz</div>
              <div>Speed: {scenario.flow.baseSpeed?.toFixed(2)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

### 4.2 Sandbox Renderer (안전한 HTML 실행)

**파일**: `app/admin/iiwarmup/generator/components/SandboxRenderer.tsx`

**방식**: Shadow DOM 사용 (Iframe 대안)

```typescript
'use client';

import { useEffect, useRef } from 'react';

interface SandboxRendererProps {
  html: string;
  configVars: Record<string, any>;
  phase: 'play' | 'think' | 'flow';
}

export function SandboxRenderer({ html, configVars, phase }: SandboxRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Shadow DOM 생성 (격리된 환경)
    if (!shadowRootRef.current) {
      shadowRootRef.current = containerRef.current.attachShadow({ mode: 'closed' });
    }
    
    const shadowRoot = shadowRootRef.current;
    
    // HTML 주입
    shadowRoot.innerHTML = html;
    
    // 시스템 변수 주입 (Variable Injection)
    const script = shadowRoot.querySelector('script');
    if (script) {
      // window.__IIW_CONFIG__ 객체 생성
      const configScript = document.createElement('script');
      configScript.textContent = `
        window.__IIW_CONFIG__ = ${JSON.stringify(configVars)};
        ${script.textContent}
      `;
      shadowRoot.appendChild(configScript);
      script.remove();
    } else {
      // script 태그가 없으면 직접 주입
      const configScript = document.createElement('script');
      configScript.textContent = `window.__IIW_CONFIG__ = ${JSON.stringify(configVars)};`;
      shadowRoot.appendChild(configScript);
    }
    
    // Cleanup
    return () => {
      if (shadowRoot) {
        shadowRoot.innerHTML = '';
      }
    };
  }, [html, configVars]);
  
  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ isolation: 'isolate' }}
    />
  );
}
```

---

## Part 5: Physics Constants 수정

### 5.1 수정된 physics.ts

**파일**: `app/lib/admin/constants/physics.ts`

```typescript
import { DeviceFPSDetector } from '@/app/lib/cognitive/engines/DeviceFPSDetector';

/**
 * 마스터 수치 테이블
 * 개발자가 여기서 숫자를 직접 수정하여 전체 시스템에 반영
 */

/**
 * 정밀 주파수 보정 함수
 * f_sync = Refresh Rate / (2 × N)
 */
export async function snapToRefreshRate(requestedHz: number): Promise<number> {
  const refreshRate = await DeviceFPSDetector.detectFPSAsync();
  const idealN = refreshRate / (2 * requestedHz);
  const N = Math.round(idealN);
  const clampedN = Math.max(1, Math.min(30, N));
  const snappedHz = refreshRate / (2 * clampedN);
  return Math.max(8, Math.min(15, snappedHz));
}

// 타겟별 Hz 설정 (보정 전 원본 값)
export const TARGET_FREQUENCIES_RAW = {
  junior: 8,
  senior: 12,
  mixed: 10
} as const;

// 타겟별 Hz 설정 (보정 후 실제 사용 값)
// 실제 값은 snapToRefreshRate()로 계산됨
export const TARGET_FREQUENCIES = {
  junior: 8,    // 보정 후 실제 값
  senior: 12,   // 보정 후 실제 값
  mixed: 10     // 보정 후 실제 값
} as const;

// 정지 상태 비율 (NEW)
export const STATIC_DURATION_RATIOS = {
  junior: 0.7,   // 70% 정지, 30% 액션 (느린 전환)
  senior: 0.3,   // 30% 정지, 70% 액션 (빠른 전환)
  mixed: 0.5     // 50% 정지, 50% 액션 (균형)
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

## Part 6: Event Timeline 생성

### 6.1 generateEventTimeline 함수

**파일**: `app/lib/admin/logic/generateEventTimeline.ts`

```typescript
import { GeneratedScenario, EventTimelineItem } from '../types/scenario';

export function generateEventTimeline(scenario: GeneratedScenario): EventTimelineItem[] {
  const timeline: EventTimelineItem[] = [];
  
  // Play Phase 이벤트
  if (scenario.play.actions) {
    scenario.play.actions.forEach((action, index) => {
      const startTime = action.startTime * 1000; // 초 → ms
      const endTime = startTime + (action.duration * 1000);
      
      // 액션 시작
      timeline.push({
        timestamp: startTime,
        type: 'ACTION_START',
        intensity: action.intensity === 'HIGH' ? 'HIGH' : action.intensity === 'LOW' ? 'LOW' : 'MID',
        phase: 'play',
        metadata: { actionId: action.id, actionType: action.type }
      });
      
      // 액션 중간 지점에 파티클 효과
      const midTime = startTime + (action.duration * 500);
      timeline.push({
        timestamp: midTime,
        type: 'PARTICLE',
        intensity: 'MID',
        direction: 'CENTER',
        phase: 'play',
        metadata: { actionId: action.id }
      });
      
      // 액션 종료
      timeline.push({
        timestamp: endTime,
        type: 'ACTION_END',
        intensity: 'LOW',
        phase: 'play',
        metadata: { actionId: action.id }
      });
    });
  }
  
  // Think Phase 이벤트
  if (scenario.think.totalRounds) {
    for (let i = 0; i < scenario.think.totalRounds; i++) {
      const roundStartTime = i * (scenario.think.roundDuration || 18000);
      timeline.push({
        timestamp: roundStartTime,
        type: 'COLOR_FLASH',
        intensity: 'MID',
        phase: 'think',
        metadata: { round: i + 1 }
      });
    }
  }
  
  // Flow Phase 이벤트 (레벨 전환 시)
  // ...
  
  // 타임스탬프 기준 정렬
  return timeline.sort((a, b) => a.timestamp - b.timestamp);
}
```

---

## Part 7: 데이터베이스 스키마 (기존과 동일)

(기존 계획과 동일)

---

## 구현 체크리스트

### Phase 1: 핵심 엔진 수정
- [ ] `StroboscopicEngine.snapToRefreshRate()` 구현
- [ ] `STATIC_DURATION_RATIO` 추가 (StroopEngine)
- [ ] Physics Constants 수정 (`snapToRefreshRate` 함수 추가)

### Phase 2: 하이브리드 스키마
- [ ] `GeneratedScenario` 타입 확장 (`content_type`, `raw_html`, `config_vars`)
- [ ] `EventTimelineItem` 타입 정의
- [ ] `generateEventTimeline()` 함수 구현

### Phase 3: Generator 페이지
- [ ] `/admin/iiwarmup/generator/page.tsx` 생성
- [ ] `ParameterPanel` 컴포넌트 (Tab 구조)
- [ ] `BasicSettingsTab` 컴포넌트
- [ ] `CodeEditorTab` 컴포넌트 (Monaco Editor 통합)

### Phase 4: Hybrid Simulator
- [ ] `HybridSimulator` 컴포넌트
- [ ] `SandboxRenderer` 컴포넌트 (Shadow DOM)
- [ ] Variable Injection 브릿지 로직

### Phase 5: 데이터베이스
- [ ] play_motions 테이블
- [ ] scenario_templates 테이블 (하이브리드 스키마 반영)
- [ ] telemetry_logs 테이블

### Phase 6: 통합 테스트
- [ ] Parametric Mode 테스트
- [ ] Code Expert Mode 테스트
- [ ] Sandbox 환경 안전성 검증
- [ ] Variable Injection 검증

---

## 의존성 추가

```bash
npm install @monaco-editor/react
```
