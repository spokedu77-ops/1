# I.I.Warm-up 코드 전체 참조 문서

> 이 문서는 iiwarmup 관련 모든 코드를 폴더별로 정리한 참조 문서입니다. Gemini 등 AI 도구에게 질문할 때 참고 자료로 사용할 수 있습니다.

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [폴더 구조](#폴더-구조)
3. [사용자 페이지](#사용자-페이지)
4. [프로그램 실행](#프로그램-실행)
5. [Phase 컴포넌트](#phase-컴포넌트)
6. [관리자 페이지](#관리자-페이지)
7. [관리자 컴포넌트](#관리자-컴포넌트)
8. [API 라우트](#api-라우트)
9. [유틸리티](#유틸리티)
10. [아키텍처 다이어그램](#아키텍처-다이어그램)

---

## 프로젝트 개요

I.I.Warm-up은 10분 복합 웜업 프로그램 시스템입니다. Play → Think → Flow 3단계를 한 번의 START로 연속 실행하는 구조입니다.

### 주요 기능
- 주차별 웜업 프로그램 제공
- Play Phase: 몰입형 게임형 웜업 (2분)
- Think Phase: 인지 훈련 (2분)
- Flow Phase: 유동성 웜업 (5분)
- 관리자 대시보드를 통한 프로그램 관리

---

## 폴더 구조

```
app/
├── iiwarmup/                    # 사용자 메인 페이지
│   ├── page.tsx                 # 랜딩 페이지
│   └── program/                 # 프로그램 실행
│       ├── [weekId]/
│       │   └── page.tsx         # 동적 라우트
│       ├── layout.tsx           # 레이아웃
│       ├── components/
│       │   └── ProgramOrchestrator.tsx
│       ├── phases/
│       │   ├── play/
│       │   │   ├── PlayPhase.tsx
│       │   │   └── types/
│       │   │       ├── scenario.ts
│       │   │       └── types.ts
│       │   ├── think/
│       │   │   └── ThinkPhase.tsx
│       │   └── flow/
│       │       └── FlowPhase.tsx
│       ├── types.ts             # Phase 타입 정의
│       └── constants.ts         # 상수 정의
│
├── admin/
│   └── iiwarmup/
│       └── page.tsx             # 관리자 대시보드
│
├── components/
│   └── admin/
│       └── iiwarmup/            # 관리자 컴포넌트
│           ├── ProgramPreviewModal.tsx
│           ├── SportsVideoManager.tsx
│           ├── WeeklyScheduler.tsx
│           ├── ProgramCreator.tsx
│           ├── ThemeManager.tsx
│           ├── ConfirmDialog.tsx
│           ├── types.ts
│           └── constants.ts
│
├── api/
│   └── admin/
│       └── iiwarmup/
│           └── create-week2/
│               └── route.ts     # API 라우트
│
└── lib/
    ├── iiwarmup/
    │   └── createWeek2Program.ts
    └── utils.ts                 # 공통 유틸리티
```

---

## 사용자 페이지

### `app/iiwarmup/page.tsx`

**기능**: 사용자 메인 랜딩 페이지

**주요 기능**:
- 현재 주차 프로그램 조회 및 표시
- 사용자 정보 표시
- 추천 놀이체육 영상 표시 (최대 4개)
- 전문가 지시사항 표시
- 프로그램 시작 버튼

**핵심 코드**:

```typescript
// 현재 주차 계산
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const week = getWeekOfMonth(date);
  return `${year}-${month.toString().padStart(2, '0')}-W${week}`;
}

// 프로그램 시작
const handleStart = () => {
  if (!currentSchedule?.warmup_programs_composite) return;
  const weekKey = currentSchedule.week_key;
  window.location.href = `/iiwarmup/program/${weekKey}`;
};
```

**데이터 페칭**:
- `rotation_schedule` 테이블에서 현재 주차 프로그램 조회
- `sports_videos` 테이블에서 활성 영상 조회
- `users` 테이블에서 사용자 이름 조회

---

## 프로그램 실행

### `app/iiwarmup/program/[weekId]/page.tsx`

**기능**: 동적 라우트 페이지 - 주차별 프로그램 실행

**핵심 로직**:

```typescript
export default async function ProgramPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = await params;
  
  // DB에서 복합 프로그램 조회
  const { data: program, error } = await supabase
    .from('warmup_programs_composite')
    .select('*')
    .eq('week_id', weekId)
    .eq('is_active', true)
    .single();

  if (error || !program) {
    redirect('/iiwarmup');
  }

  const phases = (program.phases || []) as Phase[];

  return (
    <ProgramOrchestrator 
      phases={phases || []} 
      programTitle={program.title}
    />
  );
}
```

### `app/iiwarmup/program/layout.tsx`

**기능**: 프로그램 레이아웃 (추가 스타일링 없음)

```typescript
export default function ProgramLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### `app/iiwarmup/program/components/ProgramOrchestrator.tsx`

**기능**: 3단계 Phase 오케스트레이터 - 전체 프로그램 실행 관리

**주요 기능**:
- Phase 전환 관리
- 600초(10분) 엄격 타이머
- PostMessage 통신 (Phase ↔ Orchestrator)
- Phase 미리 로드 (Zero-Loading Hack)
- 일시정지 기능 (ESC 키)

**핵심 코드**:

```typescript
export function ProgramOrchestrator({ phases, programTitle }: ProgramOrchestratorProps) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionToken] = useState(() => generateOneTimeToken());
  
  const totalDuration = TOTAL_DURATION_SECONDS; // 600초

  // PostMessage 리스너
  useEffect(() => {
    const handleMessage = (event: MessageEvent<PhaseMessage>) => {
      if (!isValidOrigin(event.origin)) return;
      
      const { type, phase, progress } = event.data;
      
      if (type === 'PHASE_COMPLETE') {
        if (currentPhaseIndex < phases.length - 1) {
          setCurrentPhaseIndex(prev => prev + 1);
          setElapsedTime(0);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentPhaseIndex, phases.length]);

  // 600초 엄격 타이머
  useEffect(() => {
    if (isPaused) return;
    
    totalTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      if (elapsed >= totalDuration) {
        router.push('/iiwarmup');
        return;
      }
      
      const phaseElapsed = Math.floor((Date.now() - phaseStartTimeRef.current) / 1000);
      setElapsedTime(Math.min(phaseElapsed, currentPhase.duration));
    }, 100);
    
    return () => {
      if (totalTimerRef.current) {
        clearInterval(totalTimerRef.current);
      }
    };
  }, [isPaused, currentPhaseIndex, currentPhase.duration, phases, router, totalDuration]);
}
```

**Phase URL 생성**:

```typescript
const getPhaseUrl = useCallback((phase: Phase, index: number) => {
  const baseUrl = `/${phase.type}-phase/index.html`;
  const params = new URLSearchParams();
  
  if (phase.scenario_id) {
    params.set('scenarioId', phase.scenario_id);
  }
  params.set('token', sessionToken);
  params.set('phaseIndex', index.toString());
  
  return `${baseUrl}?${params.toString()}`;
}, [sessionToken]);
```

### `app/iiwarmup/program/types.ts`

**타입 정의**:

```typescript
export interface Phase {
  type: 'play' | 'think' | 'flow';
  duration: number;
  scenario_id?: string;
  content_type?: 'placeholder' | 'url' | 'html';
  content_url?: string;
}

export interface PhaseMessage {
  type: 'PHASE_READY' | 'PHASE_PROGRESS' | 'PHASE_COMPLETE' | 'PHASE_ERROR';
  phase: 'play' | 'think' | 'flow';
  progress?: number;
  elapsedTime?: number;
  error?: string;
}

export interface InitPhaseMessage {
  type: 'INIT_PHASE';
  phase: 'play' | 'think' | 'flow';
  data: {
    scenarioId?: string;
    duration: number;
    token: string;
  };
}

export const ALLOWED_ORIGINS = [
  typeof window !== 'undefined' ? window.location.origin : '',
  'http://localhost:3000',
  'https://localhost:3000',
].filter(Boolean);

export function isValidOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return ALLOWED_ORIGINS.some(allowed => {
    try {
      const allowedUrl = new URL(allowed);
      const originUrl = new URL(origin);
      return allowedUrl.origin === originUrl.origin;
    } catch {
      return allowed === origin;
    }
  });
}
```

### `app/iiwarmup/program/constants.ts`

```typescript
export const TOTAL_DURATION_SECONDS = 600; // 10분 (600초)
```

---

## Phase 컴포넌트

### `app/iiwarmup/program/phases/play/PlayPhase.tsx`

**기능**: Play Phase iframe 래퍼

**핵심 코드**:

```typescript
export function PlayPhase({ phase, token }: PlayPhaseProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // PostMessage 리스너 (자식 → 부모 전달)
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object' && 'type' in event.data) {
        const targetOrigin = typeof window !== 'undefined' ? window.location.origin : '*';
        window.parent.postMessage(event.data, targetOrigin);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      const baseUrl = '/play-phase/index.html';
      const params = new URLSearchParams();
      if (phase.scenario_id) {
        params.set('scenarioId', phase.scenario_id);
      }
      params.set('token', token);
      iframe.src = `${baseUrl}?${params.toString()}`;
      
      // INIT_PHASE 메시지 전송
      iframe.onload = () => {
        const targetOrigin = typeof window !== 'undefined' ? window.location.origin : '*';
        iframe.contentWindow?.postMessage({
          type: 'INIT_PHASE',
          phase: 'play',
          data: {
            scenarioId: phase.scenario_id,
            duration: phase.duration,
            token: token
          }
        }, targetOrigin);
      };
    }
  }, [phase, token]);

  return (
    <div className="w-full h-full relative bg-black">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}
```

### `app/iiwarmup/program/phases/play/types/scenario.ts`

**시나리오 타입 정의**:

```typescript
export type TriggerType = 'FLICKER' | 'SWEEP' | 'BURST' | 'APPROACH' | 'EXPLODE' | 'PULSE' | 'ROTATE';
export type ObjectType = 'flame' | 'pan' | 'popcorn' | 'wall' | 'rope' | 'knife' | 'steam' | 'spark';

export interface TriggerConfig {
  type: TriggerType;
  interval?: number;
  random_delay?: [number, number];
  count?: number;
  speed?: number;
  intensity?: 'LOW' | 'MID' | 'HIGH';
}

export interface VisualEffect {
  object_type: ObjectType;
  position: { x: number; y: number; z?: number };
  scale?: number;
  animation_key: string;
  color?: string;
  rotation?: { x?: number; y?: number; z?: number };
}

export interface TimelineEvent {
  start: number;
  end: number;
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

export interface Episode {
  id: string;
  name: string;
  theme: string;
  total_time: number;
  background: BackgroundConfig;
  timeline: TimelineEvent[];
}
```

### `app/iiwarmup/program/phases/play/types.ts`

```typescript
export type ActionType = 
  | 'POINT' | 'PULL' | 'PUSH' | 'TURN' | 'DUCK' 
  | 'JUMP' | 'CLAP' | 'PUNCH' | 'SHUFFLE' | 'BLOCK'
  | 'SWIPE' | 'TWIST' | 'BALANCE' | 'GRAB' | 'LEAN';

export type Intensity = 'LOW' | 'MID' | 'HIGH';

export interface ActionPoint {
  id: string;
  type: ActionType;
  startTime: number;
  duration: number;
  position?: { x: number; y: number };
  intensity: Intensity;
}
```

### `app/iiwarmup/program/phases/think/ThinkPhase.tsx`

**기능**: Think Phase iframe 래퍼 (PlayPhase와 동일한 구조)

```typescript
export function ThinkPhase({ phase, token }: ThinkPhaseProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      const baseUrl = '/think-phase/index.html';
      const params = new URLSearchParams();
      params.set('token', token);
      iframe.src = `${baseUrl}?${params.toString()}`;
      
      iframe.onload = () => {
        const targetOrigin = typeof window !== 'undefined' ? window.location.origin : '*';
        iframe.contentWindow?.postMessage({
          type: 'INIT_PHASE',
          phase: 'think',
          data: {
            duration: phase.duration,
            token: token
          }
        }, targetOrigin);
      };
    }
  }, [phase, token]);

  return (
    <div className="w-full h-full relative bg-black">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}
```

### `app/iiwarmup/program/phases/flow/FlowPhase.tsx`

**기능**: Flow Phase iframe 래퍼 (PlayPhase와 유사한 구조, scenario_id 지원)

```typescript
export function FlowPhase({ phase, token }: FlowPhaseProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      const baseUrl = '/flow-phase/index.html';
      const params = new URLSearchParams();
      params.set('token', token);
      if (phase.scenario_id) {
        params.set('scenarioId', phase.scenario_id);
      }
      iframe.src = `${baseUrl}?${params.toString()}`;
      
      iframe.onload = () => {
        const targetOrigin = typeof window !== 'undefined' ? window.location.origin : '*';
        iframe.contentWindow?.postMessage({
          type: 'INIT_PHASE',
          phase: 'flow',
          data: {
            scenarioId: phase.scenario_id,
            duration: phase.duration,
            token: token
          }
        }, targetOrigin);
      };
    }
  }, [phase, token]);

  return (
    <div className="w-full h-full relative bg-black">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}
```

---

## 관리자 페이지

### `app/admin/iiwarmup/page.tsx`

**기능**: 관리자 대시보드 - 웜업 프로그램 관리

**주요 탭**:
1. **테마 관리**: 주차별 테마와 15개 동작 이미지 관리
2. **프로그램 생성**: 빠른 프로그램 생성 및 템플릿 관리
3. **주간 스케줄 배정**: 프로그램을 특정 주차에 배정
4. **놀이체육 영상 관리**: 추천 영상 관리

**핵심 기능**:

```typescript
// 빠른 프로그램 생성
const handleCreateProgram = async (targetYear: number, targetMonth: number, targetWeek: number) => {
  // 1단계: 시나리오 생성
  const scenarioJson = {
    theme: 'kitchen',
    duration: 120,
    actions: actions.map((action, index) => ({
      id: `action_${String(index + 1).padStart(3, '0')}`,
      type: action.type,
      startTime: action.startTime,
      duration: action.duration,
      position: action.position,
      intensity: action.intensity,
      images: { off: '', on: '' },
      introText: {
        en: action.type,
        ko: ACTION_NAMES[action.type] || action.type
      }
    }))
  };

  await supabase.from('play_scenarios').upsert({
    id: scenarioId,
    name: `${targetMonth}월 ${targetWeek}주차 주방 테마`,
    theme: 'kitchen',
    duration: 120,
    scenario_json: scenarioJson
  }, { onConflict: 'id' });

  // 2단계: 프로그램 생성
  const phases = [
    { type: 'play', scenario_id: scenarioId, duration: 120 },
    { type: 'think', content_type: 'placeholder', duration: 120 },
    { type: 'flow', content_type: 'placeholder', duration: 300 }
  ];

  await supabase.from('warmup_programs_composite').upsert({
    id: programId,
    week_id: weekId,
    title: `${targetMonth}월 ${targetWeek}주차 웜업 프로그램`,
    description: '상체 → 하체 → 전신으로 진행하는 웜업 프로그램',
    total_duration: 540,
    phases: phases,
    is_active: true
  }, { onConflict: 'id' });

  // 3단계: 스케줄 배정
  await supabase.from('rotation_schedule').upsert({
    week_key: weekId,
    program_id: programId,
    expert_note: expertNote,
    is_published: true
  }, { onConflict: 'week_key' });
};
```

---

## 관리자 컴포넌트

### `app/components/admin/iiwarmup/ProgramPreviewModal.tsx`

**기능**: 프로그램 미리보기 모달

**주요 기능**:
- 프로그램 정보 표시
- Phase별 정보 표시
- Play Phase 시나리오 상세 정보 표시
- 액션 목록 테이블

### `app/components/admin/iiwarmup/SportsVideoManager.tsx`

**기능**: 놀이체육 영상 관리 컴포넌트

**주요 기능**:
- 영상 목록 조회 및 표시
- 영상 추가/수정/삭제
- 활성 영상 관리 (최대 4개 제한)
- 썸네일, 태그, 재생 시간 관리

**핵심 코드**:

```typescript
const handleSave = async () => {
  const tagsArray = tags.trim() 
    ? tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
    : [];

  const videoData: any = {
    title: title.trim(),
    description: description.trim() || null,
    video_url: videoUrl.trim(),
    thumbnail_url: thumbnailUrl.trim() || null,
    duration: duration.trim() ? parseInt(duration.trim(), 10) : null,
    tags: tagsArray,
    is_active: true
  };

  if (editingVideo) {
    await supabase
      .from('sports_videos')
      .update(videoData)
      .eq('id', editingVideo.id);
  } else {
    await supabase
      .from('sports_videos')
      .insert([videoData]);
  }
};
```

### `app/components/admin/iiwarmup/WeeklyScheduler.tsx`

**기능**: 주간 스케줄 배정 컴포넌트

**주요 기능**:
- 연도/월/주차 선택
- 프로그램 템플릿 선택
- 전문가 지도 노트 입력
- 발행 상태 관리
- 구독자 미리보기

**핵심 코드**:

```typescript
const handleSave = async () => {
  await supabase
    .from('rotation_schedule')
    .upsert({
      week_key: weekKey,
      program_id: selectedProgram,
      expert_note: expertNote || null,
      is_published: isPublished,
    }, {
      onConflict: 'week_key'
    });
};
```

### `app/components/admin/iiwarmup/ProgramCreator.tsx`

**기능**: 프로그램 템플릿 생성 컴포넌트

**주요 기능**:
- 프로그램 템플릿 생성/수정/삭제
- Play Phase 시나리오 선택
- Think/Flow Phase 콘텐츠 타입 설정
- Phase별 시간 설정

**핵심 코드**:

```typescript
const handleSave = async () => {
  const phases: Phase[] = [
    { 
      type: 'play', 
      scenario_id: playPhase.scenario_id, 
      duration: playPhase.duration 
    },
    { 
      type: 'think', 
      content_type: thinkPhase.content_type,
      ...(thinkPhase.content_url ? { content_url: thinkPhase.content_url } : {}),
      duration: thinkPhase.duration 
    },
    { 
      type: 'flow', 
      content_type: flowPhase.content_type,
      ...(flowPhase.content_url ? { content_url: flowPhase.content_url } : {}),
      duration: flowPhase.duration 
    }
  ];
  
  const totalDuration = phases.reduce((sum, p) => sum + (p.duration || 0), 0);
  
  await supabase
    .from('warmup_programs_composite')
    .upsert({
      id: programId,
      week_id: weekId,
      title,
      description: description || null,
      total_duration: totalDuration,
      phases: phases,
      is_active: true
    }, {
      onConflict: 'id'
    });
};
```

### `app/components/admin/iiwarmup/ThemeManager.tsx`

**기능**: 테마 및 액션 이미지 관리 컴포넌트

**주요 기능**:
- 15개 액션 타입별 이미지 관리 (OFF/ON)
- 이미지 URL 입력 및 미리보기
- 시나리오 JSON 업데이트

**핵심 코드**:

```typescript
const handleSave = async () => {
  const scenarioData = {
    theme: 'kitchen',
    actions: ACTION_TYPES.map(type => ({
      type,
      startTime: ACTION_TYPES.indexOf(type) * 13,
      duration: 10,
      introText: { en: type, ko: ACTION_NAMES[type] },
      images: actionImages[type] || { off: '', on: '' }
    }))
  };

  await supabase
    .from('play_scenarios')
    .upsert({
      id: `week${week}_kitchen`,
      name: `${week}주차 주방 테마`,
      theme: 'kitchen',
      duration: 120,
      scenario_json: scenarioData
    });
};
```

### `app/components/admin/iiwarmup/ConfirmDialog.tsx`

**기능**: 확인 다이얼로그 컴포넌트

```typescript
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  variant = 'default'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* ... */}
      </div>
    </div>
  );
}
```

### `app/components/admin/iiwarmup/types.ts`

```typescript
export type { Phase } from '@/app/iiwarmup/program/types';

export interface ActionImage {
  off: string;
  on: string;
}

export interface WarmupProgram {
  id: string;
  week_id: string;
  title: string;
  description?: string;
  total_duration?: number;
  phases: Phase[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PlayScenario {
  id: string;
  name: string;
  theme?: string;
  duration: number;
  scenario_json: {
    theme: string;
    duration: number;
    actions: Array<{
      id: string;
      type: string;
      startTime: number;
      duration: number;
      position?: { x: number; y: number };
      intensity?: string;
      images?: ActionImage;
      introText?: { en: string; ko: string };
    }>;
  };
  created_at?: string;
  updated_at?: string;
}

export interface RotationSchedule {
  id: string;
  week_key: string;
  program_id: string;
  expert_note?: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}
```

### `app/components/admin/iiwarmup/constants.ts`

```typescript
export const ACTION_TYPES = [
  'POINT', 'KNOCK', 'CHOP', 'TOUCH', 'PUSH',
  'CLAP', 'PULL', 'SWIPE', 'SNAP', 'GRAB',
  'WALK', 'JUMP', 'LEAN', 'SHRINK', 'EXPLODE'
] as const;

export const ACTION_NAMES: Record<string, string> = {
  'POINT': '찌르기', 
  'KNOCK': '두드리기', 
  'CHOP': '가르기', 
  'TOUCH': '터치', 
  'PUSH': '살짝 밀기',
  'CLAP': '박수', 
  'PULL': '당기기', 
  'SWIPE': '훑기', 
  'SNAP': '손가락 튕기기', 
  'GRAB': '움켜쥐기',
  'WALK': '제자리 걷기', 
  'JUMP': '가벼운 점프', 
  'LEAN': '기울이기', 
  'SHRINK': '웅크리기', 
  'EXPLODE': '전신 펴기'
};

export const TOTAL_DURATION_SECONDS = 600; // 10분
```

---

## API 라우트

### `app/api/admin/iiwarmup/create-week2/route.ts`

**기능**: 주차별 웜업 프로그램 생성 API

**엔드포인트**: `POST /api/admin/iiwarmup/create-week2`

**요청 Body**:
```typescript
{
  year: number;
  month: number;
  week: number;
}
```

**응답**:
```typescript
{
  success: boolean;
  message: string;
  data?: {
    scenarioId: string;
    programId: string;
    weekKey: string;
  };
  error?: string;
}
```

**핵심 로직**:

```typescript
async function createWeekProgram(year: number, month: number, week: number, accessToken: string | null) {
  const weekId = `${year}-${String(month).padStart(2, '0')}-W${week}`;
  const scenarioId = `week${week}_kitchen`;
  const programId = `program_${year}_${String(month).padStart(2, '0')}_w${week}`;

  // 1단계: 시나리오 생성
  const scenarioJson = {
    theme: 'kitchen',
    duration: 120,
    actions: actions.map((action, index) => ({
      id: `action_${String(index + 1).padStart(3, '0')}`,
      type: action.type,
      startTime: action.startTime,
      duration: action.duration,
      position: action.position,
      intensity: action.intensity,
      images: { off: '', on: '' },
      introText: {
        en: action.type,
        ko: ACTION_NAMES[action.type] || action.type
      }
    }))
  };

  await supabase.from('play_scenarios').upsert({
    id: scenarioId,
    name: `${month}월 ${week}주차 주방 테마`,
    theme: 'kitchen',
    duration: 120,
    scenario_json: scenarioJson
  }, { onConflict: 'id' });

  // 2단계: 프로그램 생성
  const phases = [
    { type: 'play', scenario_id: scenarioId, duration: 120 },
    { type: 'think', content_type: 'placeholder', duration: 120 },
    { type: 'flow', content_type: 'placeholder', duration: 300 }
  ];

  await supabase.from('warmup_programs_composite').upsert({
    id: programId,
    week_id: weekId,
    title: `${month}월 ${week}주차 웜업 프로그램`,
    description: '상체 → 하체 → 전신으로 진행하는 웜업 프로그램',
    total_duration: 540,
    phases: phases,
    is_active: true
  }, { onConflict: 'id' });

  // 3단계: 스케줄 배정
  await supabase.from('rotation_schedule').upsert({
    week_key: weekId,
    program_id: programId,
    expert_note: expertNote,
    is_published: true
  }, { onConflict: 'week_key' });
}
```

---

## 유틸리티

### `app/lib/iiwarmup/createWeek2Program.ts`

**기능**: Week2 프로그램 생성 함수 (통합 실행)

**주요 함수**:
- `createWeek2Scenario()`: 시나리오 생성
- `createWeek2Program()`: 프로그램 생성
- `createWeek2Schedule()`: 스케줄 배정
- `createCompleteWeek2Program()`: 통합 실행

**핵심 코드**:

```typescript
export async function createCompleteWeek2Program() {
  // 1단계: 시나리오 생성
  const scenarioResult = await createWeek2Scenario();
  if (!scenarioResult.success) {
    return { success: false, errors: [scenarioResult.error] };
  }

  // 2단계: 프로그램 생성
  const programResult = await createWeek2Program();
  if (!programResult.success) {
    return { success: false, errors: [programResult.error] };
  }

  // 3단계: 스케줄 배정
  const scheduleResult = await createWeek2Schedule();
  if (!scheduleResult.success) {
    return { success: false, errors: [scheduleResult.error] };
  }

  return {
    success: true,
    message: '1월 2주차 프로그램 생성 완료!',
    data: {
      scenarioId: 'week2_kitchen',
      programId: 'program_2026_01_w2',
      weekKey: '2026-01-W2'
    }
  };
}
```

### `app/lib/utils.ts`

**공통 유틸리티 함수**:

```typescript
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

## 아키텍처 다이어그램

### 데이터 흐름

```
사용자 접속
    ↓
/iiwarmup (page.tsx)
    ↓
현재 주차 프로그램 조회 (rotation_schedule)
    ↓
프로그램 시작 버튼 클릭
    ↓
/iiwarmup/program/[weekId] (동적 라우트)
    ↓
ProgramOrchestrator
    ├── Play Phase (2분)
    │   └── /play-phase/index.html (iframe)
    ├── Think Phase (2분)
    │   └── /think-phase/index.html (iframe)
    └── Flow Phase (5분)
        └── /flow-phase/index.html (iframe)
    ↓
10분 완료 → /iiwarmup으로 리다이렉트
```

### 관리자 워크플로우

```
관리자 대시보드 (/admin/iiwarmup)
    ↓
[테마 관리 탭]
    └── ThemeManager
        └── play_scenarios 테이블 업데이트
    ↓
[프로그램 생성 탭]
    ├── 빠른 생성 버튼
    │   └── 시나리오 + 프로그램 + 스케줄 한 번에 생성
    └── ProgramCreator
        └── warmup_programs_composite 테이블 관리
    ↓
[주간 스케줄 배정 탭]
    └── WeeklyScheduler
        └── rotation_schedule 테이블 관리
    ↓
[놀이체육 영상 관리 탭]
    └── SportsVideoManager
        └── sports_videos 테이블 관리
```

### 데이터베이스 스키마

```
play_scenarios
├── id (PK)
├── name
├── theme
├── duration
└── scenario_json (JSONB)
    ├── theme
    ├── duration
    └── actions[]
        ├── id
        ├── type
        ├── startTime
        ├── duration
        ├── position
        ├── intensity
        ├── images { off, on }
        └── introText { en, ko }

warmup_programs_composite
├── id (PK)
├── week_id
├── title
├── description
├── total_duration
├── phases (JSONB)
│   ├── type: 'play' | 'think' | 'flow'
│   ├── duration
│   ├── scenario_id (play만)
│   ├── content_type (think/flow)
│   └── content_url (think/flow)
└── is_active

rotation_schedule
├── id (PK)
├── week_key (UNIQUE)
├── program_id (FK → warmup_programs_composite)
├── expert_note
└── is_published

sports_videos
├── id (PK)
├── title
├── description
├── thumbnail_url
├── video_url
├── duration
├── tags (TEXT[])
└── is_active
```

### PostMessage 통신 구조

```
ProgramOrchestrator (부모)
    ↓ INIT_PHASE 메시지 전송
Phase Component (iframe 래퍼)
    ↓ iframe.src 설정
/public/{phase}-phase/index.html (자식)
    ↓ PHASE_READY, PHASE_PROGRESS, PHASE_COMPLETE 메시지 전송
Phase Component
    ↓ 부모로 전달
ProgramOrchestrator
    ↓ Phase 전환 또는 완료 처리
```

---

## 주요 상수 및 설정

### Phase 기본 시간
- Play Phase: 120초 (2분)
- Think Phase: 120초 (2분)
- Flow Phase: 300초 (5분)
- 총 시간: 600초 (10분)

### 액션 타입
- 총 15개 액션 타입 지원
- 각 액션은 OFF/ON 이미지 필요
- 위치 좌표: x, y (0-100%)

### 보안
- PostMessage origin 검증
- 개발 환경에서는 모든 origin 허용
- 프로덕션에서는 ALLOWED_ORIGINS만 허용

---

## 참고사항

1. **iframe 기반 구조**: 각 Phase는 독립적인 HTML 파일로 `/public/{phase}-phase/index.html`에 위치
2. **PostMessage 통신**: Phase와 Orchestrator 간 통신은 PostMessage API 사용
3. **엄격한 타이머**: 600초(10분) 정확히 지키는 타이머 시스템
4. **미리 로드**: 다음 Phase를 50% 진행 시점에 미리 로드하여 전환 지연 최소화
5. **일시정지**: ESC 키로 일시정지 가능 (Play Phase에서만 표시)

---

**문서 생성일**: 2026-01-25
**프로젝트**: I.I.Warm-up
**버전**: 1.0
