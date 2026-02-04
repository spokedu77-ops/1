---
name: ""
overview: ""
todos: []
isProject: false
---

# 150초 SPOKEDU Think Studio 구현 계획 (개선본)

---

## Part A: admin/iiwarmup 페이지 전반 구상

### 라우트 구조 (Play / Think / Flow 3단계)

```
/admin/iiwarmup                    → Overview (대시보드)
/admin/iiwarmup/play               → Play Studio (이전 play-test)
/admin/iiwarmup/think              → Think Studio (150s SPOKEDU Think)
/admin/iiwarmup/flow               → Flow Studio
/admin/iiwarmup/assets             → AssetHub (에셋 관리)
/admin/iiwarmup/scheduler          → 주차별 스케줄 배정
```

### 대시보드 (Overview) 구성

- 3단계 + 에셋 + 스케줄러 **5개 진입 카드**로 구성
- 레이아웃: 2x3 또는 3x2 그리드

```
┌─────────────┬─────────────┬─────────────┐
│   Play      │   Think     │   Flow      │
│   Studio    │   Studio    │   Studio    │
│   [진입]    │   [진입]    │   [진입]    │
├─────────────┼─────────────┼─────────────┤
│  AssetHub   │  Scheduler  │             │
│  [진입]     │  [진입]     │             │
└─────────────┴─────────────┴─────────────┘
```

### 데이터 흐름 (재료 → 조립 → 배송)

```
[AssetHub]          →    [Play | Think | Flow Studio]    →    [Scheduler]
에셋 업로드·관리          각 Phase별 제작·미리보기               주차별 week 배정
                         저장 시 program_snapshot
```

### 각 페이지 역할


| 페이지           | 역할                                                     |
| ------------- | ------------------------------------------------------ |
| **Overview**  | 대시보드: Play / Think / Flow / AssetHub / Scheduler 5개 카드 |
| **Play**      | Play 엔진 제작·테스트 (기존 play-test 내용 이관)                    |
| **Think**     | Think Studio = 150s SPOKEDU Think 프로그램 제작·미리보기         |
| **Flow**      | Flow Studio (3D 몰입 환경 제어)                              |
| **AssetHub**  | Play/Think 에셋 업로드·관리                                   |
| **Scheduler** | 주차별 워밍업 배정, program_snapshot                           |


### layout.tsx (공통)

- 상단: "IIWARMUP Admin" 헤더
- nav: Overview | Play | Think | Flow | AssetHub | Scheduler
- `max-w-6xl` 컨테이너, 다크 배경

### 우선 작업: 페이지 껍데기 구성

1. `play-test` → `play` 폴더로 이동/리네임 (또는 redirect)
2. `creator` → `think` 폴더로 이동/리네임
3. `flow` 페이지 신규 생성 (placeholder)
4. layout.tsx nav 수정
5. Overview 대시보드: 5개 카드 레이아웃

### Think 페이지 (Think Studio) 구상

```
┌─────────────────────────────────────────────────────────────────┐
│ Think Studio (150초 SPOKEDU Think)                               │
├──────────────────────┬──────────────────────────────────────────┤
│ [설정 패널]           │ [캔버스 / 미리보기]                        │
│                      │                                          │
│ audience: [드롭다운]   │  ┌─────────────────────────────────────┐ │
│ week: [1][2][3][4]   │  │                                     │ │
│ think pack: [선택]    │  │    StageA/B/C / Intro/Ready/Rest     │ │
│ seed: [12345] (표시)  │  │    Progress bar                      │ │
│ [디버그 토글]         │  │    Rule label (Rest + StageC)        │ │
│                      │  └─────────────────────────────────────┘ │
│ [Play] [Pause] [Reset]│  [▶ Play] [⏸ Pause] [⟲ Reset]           │
└──────────────────────┴──────────────────────────────────────────┘
│ [디버그 오버레이] (토글 시)                                        │
│ PAD 검증 | weekRules | setA/setB | duration | Week4 state         │
└─────────────────────────────────────────────────────────────────┘
```

### AssetHub 페이지 (Think Pack 부분)

- Think Pack 섹션: 주차(Week)별 setA/setB 8장 업로드
- `ThinkPackSets` 스키마: setA/setB 각 4색(RED/GREEN/YELLOW/BLUE)
- Think 페이지에서 이 Pack을 선택해 150s 타임라인 생성

### 구현 우선순위 (이번 작업)

**1단계: 페이지 껍데기 (우선)**

- play-test → play 이동, creator → think 이동, flow 신규
- layout nav 수정, Overview 대시보드 5개 카드

**2단계: Think Studio 실체**

1. **lib/constants + engines**: padGrid, thinkTiming, scheduler, weekRules, assetLoader, validate
2. **components/admin/think150**: StageA/B/C, ProgressBar, DebugOverlay, Think150Player
3. **Think 페이지**: Think Studio UI (설정 + 플레이어)
4. **AssetHub**: Think Pack setA/setB UI는 2단계(기본 mock 데이터로 Think 먼저 완성)

---

## 핵심 변경사항 요약

- **Scheduler 출력**: Segment list → **TimelineEvent 리스트** (필수)
- **WeekRulesEngine**: 입출력 Contract 확정 + **Week4 state machine** 명시
- **Asset schema**: 주차당 8장 고정, `Record<Color, string>` (배열 금지)
- **set 결정**: cue 이벤트 생성 시점에 고정, payload에 저장
- **Sound**: WebAudio **deadline 기반** 스케줄링 (setTimeout 금지)
- **DebugOverlay**: `validateThinkPlan()` lib 분리 + UI는 렌더만
- **layoutEngine**: `getThink150Timeline(config)` 별도, LayoutSequence 끼워맞추기 금지
- **Seeded RNG**: Creator에서 seed 표시/고정 (디버깅 필수)

---

## 0) TimelineEvent 기반 설계 (필수)

### 문제

- Segment + cueBlankPairs만으로는 **cue별 상태**(slotCount, slotColors, isRecallPhase, imageUrl) 없음
- WeekRulesEngine, AssetLoader, Renderer가 cue별 frame을 확정할 수 없음

### 해결: TimelineEvent 단위 스케줄링

```typescript
type ThinkPhase = 'intro'|'ready'|'stageA'|'rest1'|'stageB'|'rest2'|'stageC'|'rest3'|'outro';
type ThinkFrameType = 'cue'|'blank'|'hold';

interface ThinkTimelineEvent {
  t0: number;      // ms from 0
  t1: number;      // ms from 0
  phase: ThinkPhase;
  frame: ThinkFrameType;
  payload?: ThinkPayload;  // cue/blank에서만 의미 있음
}

// Stage별 Payload union
type ThinkPayload =
  | StageABPayload
  | StageCPayload
  | RestPayload
  | OutroPayload;

interface StageABPayload {
  type: 'stageA'|'stageB';
  color: Color;
  imageUrl: string;
  set: 'setA'|'setB';   // cue 생성 시점에 확정
}

interface StageCPayload {
  type: 'stageC';
  slotCount: 1|2|3;
  slotColors: Color[];   // length = slotCount
  images: string[];
  week: 1|2|3|4;
  set: 'setA'|'setB';
  isRecallPhase?: boolean;
  stepCount?: 2|3;
  subPhase?: string;
  memory?: { sequence: Color[] };
}

interface RestPayload {
  type: 'rest';
  ruleLabel: string;
}

interface OutroPayload {
  type: 'outro';
  summaryText: string;
}

type Color = 'red'|'green'|'yellow'|'blue';
```

**데이터 흐름**:

- Scheduler → `ThinkTimelineEvent[]` (정렬된 이벤트 리스트)
- WeekRulesEngine → StageC cue의 payload 생성 (slotCount, slotColors, memory 등)
- AssetLoader → imageUrl 주입 (set + color → lookup)
- Renderer → event 그대로 렌더

---

## 1) Scheduler (think150Scheduler.ts)

### 출력

- `ThinkTimelineEvent[]` (Segment list 아님)

### 규칙

- 9개 phase의 고정 구간(Intro 6s, Ready 4s, StageA 24s, ...)에서 cue→blank pair 반복 생성
- 다음 pair가 segment end를 넘기면 중단, 남는 시간은 `frame: 'hold'` 이벤트로 채움
- **set 결정**: cue 이벤트 생성 시점에 `elapsedInStageC < 30000 ? 'setA' : 'setB'`
- 결정된 set은 **그 cue + blank payload에 저장**, blank에서 재계산 금지

### 고정 세그먼트 (ms)


| Phase  | Start  | End    |
| ------ | ------ | ------ |
| Intro  | 0      | 6000   |
| Ready  | 6000   | 10000  |
| StageA | 10000  | 34000  |
| Rest1  | 34000  | 40000  |
| StageB | 40000  | 70000  |
| Rest2  | 70000  | 76000  |
| StageC | 76000  | 136000 |
| Rest3  | 136000 | 142000 |
| Outro  | 142000 | 150000 |


---

## 2) WeekRulesEngine Contract (필수)

### 입력 (고정)

```typescript
interface WeekRulesEngineInput {
  week: 1|2|3|4;
  audience: 'preschool'|'senior'|'elementary'|'teen'|'adult';
  t: number;           // StageC 내부 elapsed ms
  mode: 'setA'|'setB'; // cue 생성 시점에 이미 결정된 값
  rng: SeededRNG;      // 디버그 재현 필수
  memoryState?: Week4MemoryState;  // Week4에서만
}
```

### Week4 State Machine (필수)

```typescript
interface Week4MemoryState {
  roundId: number;
  stepCount: 2|3;
  phase: 'present'|'present_gap'|'recall';
  presentStepIndex: 1|2|3;  // 1..stepCount
  sequence?: Color[];       // presentation에서 보여준 순서
}
```

### 출력 (고정)

```typescript
interface StageCCueSpec {
  slotCount: 1|2|3;
  slotColors: Color[];      // length = slotCount
  memory?: {
    isPresentation: boolean;
    isRecall: boolean;
    stepCount: 2|3;
    sequence?: Color[];
  };
}
```

### Week4 라운드 구조

- 전반 30s: 2-step rounds
- 후반 30s: 3-step rounds
- 2-step: cue1(t)→blank(t)→cue2(t)→blank(t)→recallBlank(2t)
- 3-step: cue1(t)→blank(t)→cue2(t)→blank(t)→cue3(t)→blank(t)→recallBlank(2t)
- state machine이 round boundary에서 끊기지 않아야 함

---

## 3) Think Pack 에셋 스키마 (고정)

### 규칙

- **주차당 8장 고정**: setA 4장 + setB 4장
- 색당 1개 (배열 금지)
- 4주 합계 32장

### 스키마

```typescript
type Color = 'red'|'green'|'yellow'|'blue';
type SetKey = 'setA'|'setB';

interface ThinkPackSets {
  setA: Record<Color, string>;  // url 1개씩, 총 4개
  setB: Record<Color, string>;  // url 1개씩, 총 4개
}
```

### AssetLoader

- Intro에서 setA + setB **8개 URL 전체** preload + decode
- `getImageUrl(set, color)` → 단순 lookup (pickImage 불필요)

---

## 4) Sound (deadline 기반, 필수)

### 규칙

- setTimeout 누적 금지
- `tick` / `recall-start`는 `event.t0`(cue 시작 ms)에 맞춰 스케줄

### 구현

```typescript
// WebAudio 예약 재생
const scheduleTime = audioCtx.currentTime + (event.t0 - nowMs) / 1000;
tickBufferSource.start(scheduleTime);
```

- cue마다 tick 1회
- Week4 recall 시작 시 recall-start 1회

---

## 5) Renderer

### 2패널 L/R 표시 (강추)

- slotCount=2일 때만 각 패널 하단에 **작은 L / R 아이콘(또는 점)** 표시
- 디버그가 아니라 **실제 UI** (동시 착지 혼선 방지)

### 렌더 흐름

- event를 그대로 소비
- cue/blank/hold에 따라 opacity/transform + 이미지 교체

---

## 6) DebugOverlay (분리 필수)

### 구조

- `**validateThinkPlan(timeline, config)**`: `app/lib/admin/engines/think150Validate.ts`
- **Overlay 컴포넌트**: 검증 결과만 렌더

### 검증 항목

1. PAD mapping 검증 (TOP_LEFT=RED 등)
2. weekRules 위반 검출
3. setA/setB 전환 타이밍 (30s 경계)
4. Week4 phase/step 표시
5. **segment duration 합 = 150000ms**
6. **StageA/B/C cue/blank 쌍 규칙** (cue==blank, Week4 recallBlank==2t)
7. **Week4 state machine** round boundary 끊김 없음

---

## 7) layoutEngine 통합

- `**getThink150Timeline(config)**` 신규 생성
- 기존 `getDefaultThinkSequence150()` / LayoutSequence에 **끼워맞추지 않음**
- Think150는 별도 플레이어로만 소비

---

## 8) Think Page

### Seeded RNG (필수급 강추)

- seed 입력 필드 (기본: Date.now(), 화면에 표시)
- seed 고정 시 동일 타임라인 재생성
- 디버깅 시 "왜 그 cue가 그렇게 나왔지?" 재현 가능

---

## 9) 파일 구조


| 파일                                             | 역할                                    |
| ---------------------------------------------- | ------------------------------------- |
| `app/lib/admin/constants/padGrid.ts`           | PAD_GRID, diagonal, assert            |
| `app/lib/admin/constants/thinkTiming.ts`       | AUDIENCE_CUE_BLANK_MS                 |
| `app/lib/admin/engines/think150Scheduler.ts`   | ThinkTimelineEvent[] 생성               |
| `app/lib/admin/engines/weekRulesEngine.ts`     | StageC payload, Week4 state machine   |
| `app/lib/admin/engines/think150AssetLoader.ts` | 8장 preload, getImageUrl               |
| `app/lib/admin/engines/think150Validate.ts`    | validateThinkPlan()                   |
| `app/lib/admin/audio/think150Audio.ts`         | WebAudio deadline 스케줄링                |
| `app/components/admin/think150/*`              | StageA/B/C, ProgressBar, DebugOverlay |
| `app/admin/iiwarmup/think/page.tsx`            | Think Studio UI, seed 표시              |


---

## 체크리스트 (구현 시 필수)

- Scheduler 출력 = TimelineEvent 리스트 (Segment 아님)
- WeekRulesEngine 입출력 Contract 확정 + Week4 state machine
- setA/setB 결정 = cue 생성 시점, payload 저장
- AssetLoader: ThinkPackSets (Record, 8장), preload 정책
- Sound: WebAudio deadline 스케줄링
- validateThinkPlan() lib 분리 + Overlay는 렌더만
- Seeded RNG + Think 페이지에서 seed 표시
- 2패널 L/R 최소 표시
- getThink150Timeline() 별도, LayoutSequence 억지 통합 금지

