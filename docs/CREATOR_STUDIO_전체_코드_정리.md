# 크리에이터 스튜디오 전체 코드 정리

## 📁 폴더 구조

```
app/admin/iiwarmup/generator/
├── page.tsx                    # 메인 페이지 (Play/Think/Flow 3개 탭)
├── components/
│   ├── BasicSettingsTab.tsx   # 파라미터 설정 및 자동 생성
│   ├── CodeEditorTab.tsx      # HTML 코드 에디터
│   ├── PlaySimulator.tsx      # Play Phase 시뮬레이터
│   ├── ThinkSimulator.tsx     # Think Phase 시뮬레이터
│   ├── FlowSimulator.tsx      # Flow Phase 시뮬레이터
│   ├── HybridSimulator.tsx    # 통합 시뮬레이터 (3개 Phase 모두)
│   ├── ParameterPanel.tsx     # 좌측 패널 (Basic/Code 탭)
│   ├── TemplateLibrary.tsx    # 저장된 템플릿 목록
│   ├── SandboxRenderer.tsx    # HTML 모드 렌더러
│   ├── PerformanceHUD.tsx     # 성능 모니터링 HUD
│   └── Toast.tsx              # 토스트 알림 컴포넌트
├── tabs/
│   ├── PlayStudio.tsx         # Play Studio 탭
│   ├── ThinkStudio.tsx        # Think Studio 탭
│   └── FlowStudio.tsx         # Flow Studio 탭
└── hooks/
    ├── usePlayTimelinePlayer.ts  # Play 타임라인 재생 훅
    └── usePreloadAssets.ts       # Asset 이미지 프리로드 훅
```

---

## 🔴 현재 문제점

### 1. 데이터 흐름 단절
- **PlayStudio**: `onScenarioUpdate`로 play 데이터만 전달
- **ThinkStudio**: `onScenarioUpdate`로 think 데이터만 전달
- **FlowStudio**: `onScenarioUpdate`로 flow 데이터만 전달
- **문제**: `generator/page.tsx`에서 이 3개 데이터를 통합하는 로직이 **없음**

### 2. 저장 로직 불일치
- `handleSaveToDatabase`는 `GeneratedScenario` 전체를 기대
- 하지만 Studio 탭들은 각각의 부분 데이터만 생성
- `BasicSettingsTab`은 `generateScenarioJSON`으로 전체 생성하지만 Studio 탭과 **연동 안 됨**

### 3. 실행 시 데이터 로드 문제
- **PlayPhase**: `scenario_id`로 `play_scenarios`에서 로드 ✅ 작동
- **ThinkPhase**: iframe만 로드, 시나리오 데이터 전달 안 됨 ❌
- **FlowPhase**: iframe만 로드, 시나리오 데이터 전달 안 됨 ❌

### 4. 데이터 구조 불일치
- Play Studio는 `timeline` 기반 (PlayBlock[])
- Think/Flow Studio는 `engine` 설정 기반 (파라미터)
- 두 방식이 통합되지 않음

---

## 📄 파일별 상세 설명

### 1. `page.tsx` - 메인 페이지

**역할**: Play/Think/Flow 3개 Studio 탭을 관리하는 메인 페이지

**현재 구조**:
```typescript
export default function GeneratorPage({ year, month, week, theme }: GeneratorPageProps) {
  const [activeTab, setActiveTab] = useState<'play' | 'think' | 'flow'>('play');
  
  // 각 Studio에 onScenarioUpdate 콜백 전달하지만...
  // 받은 데이터를 통합하는 로직이 없음!
}
```

**문제점**:
- 각 Studio의 `onScenarioUpdate`를 받지만 저장하지 않음
- 3개 데이터를 통합하는 로직 없음
- 저장 버튼 없음

---

### 2. `tabs/PlayStudio.tsx` - Play Studio

**역할**: 20개 Action 중 5개 선택 → 125초 타임라인 자동 생성

**주요 기능**:
- Action Catalog에서 5개 선택
- `generatePlayTimeline(selected)`로 타임라인 생성
- `PlaySimulator`로 프리뷰

**데이터 전달**:
```typescript
onScenarioUpdate({
  play: {
    content_type: 'timeline',
    timeline: newTimeline,
    selectedActions: selected,
  },
});
```

**문제점**:
- `timeline` 기반이지만 저장 시 `actions` 배열로 변환 필요
- `GeneratedScenario` 형식과 불일치

---

### 3. `tabs/ThinkStudio.tsx` - Think Studio

**역할**: 가변 레이아웃을 통한 인지 자극 설계

**주요 기능**:
- 레이아웃 시퀀스 설정 (2x2, 3x3 등)
- Stroop 엔진 파라미터 설정
- `ThinkSimulator`로 프리뷰

**데이터 전달**:
```typescript
onScenarioUpdate({
  think: {
    content_type: 'engine',
    roundDuration,
    totalRounds,
    objectSpawnInterval,
    objectLifetime,
    congruentRatio,
    staticDurationRatio,
    layout_sequence: layoutSequence
  }
});
```

**문제점**:
- 시나리오 ID 생성 로직 없음
- 저장 시 `think_scenarios` 테이블에 저장해야 하는데 로직 없음

---

### 4. `tabs/FlowStudio.tsx` - Flow Studio

**역할**: 3D 몰입 환경에서의 전신 반응 설계

**주요 기능**:
- 우주선 속도, 공간 왜곡, 박스 등장률 설정
- `FlowSimulator`로 프리뷰

**데이터 전달**:
```typescript
onScenarioUpdate({
  flow: {
    content_type: 'engine',
    baseSpeed,
    distortion,
    boxRate: {
      lv3: boxRateLv3,
      lv4: boxRateLv4
    }
  }
});
```

**문제점**:
- 시나리오 ID 생성 로직 없음
- 저장 시 `flow_scenarios` 테이블에 저장해야 하는데 로직 없음

---

### 5. `components/BasicSettingsTab.tsx` - 파라미터 설정

**역할**: Target/Difficulty/Theme 설정으로 전체 시나리오 자동 생성

**주요 기능**:
- `generateScenarioJSON()`으로 전체 시나리오 생성
- 템플릿 저장 / 주차 배정

**데이터 생성**:
```typescript
const scenario = await generateScenarioJSON({
  target,
  difficulty,
  theme,
  themeId,
  staticDurationRatio
});
```

**문제점**:
- Studio 탭과 독립적으로 동작
- Studio에서 생성한 데이터와 통합 불가

---

### 6. `components/PlaySimulator.tsx` - Play 시뮬레이터

**역할**: Play 타임라인을 Canvas로 재생

**주요 기능**:
- `usePlayTimelinePlayer` 훅으로 타임라인 재생
- `usePreloadAssets` 훅으로 이미지 프리로드
- Canvas에 현재 블록 렌더링

**렌더링 로직**:
- intro → explain → set (5회) → outro
- 각 set마다 off1/off2, on1/on2 이미지 번갈아 표시

---

### 7. `components/ThinkSimulator.tsx` - Think 시뮬레이터

**역할**: Stroop 엔진 기반 인지 자극 시뮬레이션

**주요 기능**:
- 레이아웃 시퀀스에 따른 그리드 렌더링
- Stroop 객체 스폰 및 생명주기 관리
- Canvas에 객체 렌더링

**렌더링 로직**:
- 현재 시간에 맞는 레이아웃 찾기
- `max_active` 개수만큼 객체 스폰
- 객체 생명주기 관리 (fade in/out)

---

### 8. `components/FlowSimulator.tsx` - Flow 시뮬레이터

**역할**: Three.js 기반 3D 공간 왜곡 환경

**주요 기능**:
- Three.js Scene/Camera/Renderer 초기화
- 별 배경, 박스 생성 및 이동
- 공간 왜곡 효과 (카메라 흔들림)

**렌더링 로직**:
- 박스 확률 기반 생성 (`boxRate`)
- 우주선 속도에 따른 이동
- 공간 왜곡에 따른 카메라 흔들림

---

### 9. `components/HybridSimulator.tsx` - 통합 시뮬레이터

**역할**: Play/Think/Flow 3개 Phase를 하나의 시뮬레이터에서 전환

**주요 기능**:
- Phase별 엔진 초기화 (싱글턴 패턴)
- Phase 전환 시 이전 엔진 정지
- 성능 HUD 표시

**엔진 관리**:
- `StroboscopicEngine` (Play)
- `ThinkEngine` (Think)
- `SpatialDistortionEngine` (Flow)

**문제점**:
- `BasicSettingsTab`에서 생성한 시나리오만 사용
- Studio 탭 데이터와 연동 안 됨

---

### 10. `hooks/usePlayTimelinePlayer.ts` - 타임라인 재생 훅

**역할**: Play 타임라인 블록을 시간 순서대로 재생

**주요 기능**:
- `requestAnimationFrame`으로 시간 추적
- 현재 블록 찾기 및 전환 콜백
- 재생/정지/리셋 제어

**반환값**:
```typescript
{
  isRunning: boolean;
  currentTime: number; // ms
  currentBlock: PlayBlock | null;
  totalDuration: number; // ms
  start: () => void;
  stop: () => void;
  reset: () => void;
}
```

---

### 11. `hooks/usePreloadAssets.ts` - Asset 프리로드 훅

**역할**: 선택된 Action의 4개 이미지(off1, off2, on1, on2) 프리로드

**주요 기능**:
- `ThemeAssets`에서 이미지 URL 추출
- `Image` 객체로 프리로드
- 캐시에 저장하여 재사용

**반환값**:
```typescript
{
  isLoading: boolean;
  loadedCount: number;
  totalCount: number;
  getImage: (url: string) => HTMLImageElement | null;
  imageCache: Map<string, HTMLImageElement>;
}
```

---

## 🔄 데이터 흐름 (현재)

### 생성 흐름
```
BasicSettingsTab
  → generateScenarioJSON()
  → GeneratedScenario
  → HybridSimulator

PlayStudio
  → generatePlayTimeline()
  → PlayBlock[]
  → onScenarioUpdate({ play: { timeline } })
  → ❌ 어디에도 저장 안 됨

ThinkStudio
  → 레이아웃 시퀀스 설정
  → onScenarioUpdate({ think: { layout_sequence, ... } })
  → ❌ 어디에도 저장 안 됨

FlowStudio
  → 파라미터 설정
  → onScenarioUpdate({ flow: { baseSpeed, ... } })
  → ❌ 어디에도 저장 안 됨
```

### 저장 흐름
```
BasicSettingsTab
  → handleSaveToDatabase(scenario, weekId)
  → save_warmup_program RPC
  → play_scenarios 저장 ✅
  → warmup_programs_composite 저장 ✅
  → rotation_schedule 저장 ✅
```

### 실행 흐름
```
/iiwarmup/program/[weekId]
  → warmup_programs_composite 조회
  → phases 배열 추출
  → ProgramOrchestrator
    → PlayPhase: scenario_id로 play_scenarios 조회 ✅
    → ThinkPhase: iframe만 로드, 데이터 없음 ❌
    → FlowPhase: iframe만 로드, 데이터 없음 ❌
```

---

## 🗄️ 데이터베이스 스키마

### `play_scenarios` 테이블
```sql
CREATE TABLE play_scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT,
  duration INTEGER DEFAULT 120,
  scenario_json JSONB NOT NULL,  -- { theme, duration, actions[] }
  type TEXT DEFAULT 'scenario',  -- 'scenario' | 'asset_pack' | 'think_scenario' | 'play_scenario'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `warmup_programs_composite` 테이블
```sql
CREATE TABLE warmup_programs_composite (
  id TEXT PRIMARY KEY,
  week_id TEXT,  -- NULL이면 템플릿
  title TEXT NOT NULL,
  description TEXT,
  total_duration INTEGER,
  phases JSONB NOT NULL,  -- [{ type, scenario_id, duration, content_type }]
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `rotation_schedule` 테이블
```sql
CREATE TABLE rotation_schedule (
  week_key TEXT PRIMARY KEY,  -- '2026-01-W1'
  program_id TEXT REFERENCES warmup_programs_composite(id),
  is_published BOOLEAN DEFAULT false,
  program_snapshot JSONB,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**✅ 올바른 구조**:
- `play_scenarios` 테이블 1개 통합 사용
- `type` 컬럼으로 구분: `'play_scenario' | 'think_scenario' | 'flow_scenario' | 'asset_pack'`
- `phases`에 `scenario_id`가 있으면 `type` 필터링으로 조회 가능

---

## 📊 타입 정의

### `GeneratedScenario` (표준 인터페이스 - 고정)

**Generator에서 관리하는 통합 State (단일 진실)**:
```typescript
export interface GeneratedScenario {
  play: {
    content_type: 'timeline' | 'engine';
    timeline?: PlayBlock[];           // PlayStudio에서 생성
    selectedActions?: ActionKey[];     // PlayStudio에서 생성
    asset_pack_id?: string;           // themeId
    // 또는 engine 모드
    frequency?: number;
    actions?: ActionConfig[];
    transitionInterval?: number;
  };
  think: {
    content_type: 'engine';
    layout_sequence: LayoutSequence[]; // ThinkStudio에서 생성
    roundDuration?: number;
    totalRounds?: number;
    objectSpawnInterval?: number;
    objectLifetime?: number;
    congruentRatio?: number;
    staticDurationRatio?: number;
    seed?: number;                     // 프로그램 단위 1개
  };
  flow: {
    content_type: 'engine';
    baseSpeed: number;
    distortion: number;
    boxRate: Record<string, number>;  // { lv3: 0.40, lv4: 0.45 }
  };
  eventTimeline?: EventTimelineItem[];
}
```

**warmup_programs_composite에 저장되는 형태**:
```typescript
export interface ProgramTemplate {
  id: string;
  title: string;
  phases: {
    play: { scenario_id: string };
    think: { scenario_id: string };
    flow: { scenario_id: string };
  };
  version: number;
}
```

**핵심**: 각 phase는 `scenario_id`만 가진다. 실제 내용은 `scenarios` 테이블에 JSONB로 있다.

### `PlayBlock` (타임라인 기반)
```typescript
export interface PlayBlock {
  type: 'intro' | 'explain' | 'set' | 'outro';
  action?: ActionKey;
  setIndex?: number;  // 1 또는 2
  duration: number;  // 초
}
```

### `LayoutSequence` (Think Studio)
```typescript
export interface LayoutSequence {
  startTime: number;  // 초
  endTime: number;   // 초
  layout_type: '1x1' | '1x2' | '1x3' | '2x2' | '2x3' | '3x3' | '4x4';
  pool: 'actions' | 'objects';
  max_active: 1 | 2 | 3 | 4;
  rule: 'random' | 'sequence' | 'memory';
  transition: { duration: number; easing: string };
  objectPlacement: 'preserve' | 'reset' | 'random';
}
```

---

## 🎯 해결 방안 요약 (프로덕션급 구조)

### ⚠️ 치명적 실수 방지 (5가지 터짐 포인트)

#### ❌ 터짐 1: think_scenarios / flow_scenarios 새 테이블 생성 금지
- **이유**: 이미 `play_scenarios`에 `type` 컬럼이 있음
- **결과**: 테이블 3개로 나누면 로딩/저장 코드 3배, RPC 3배, 유지보수 3배, 실수 확률 3배
- **✅ 정답**: `play_scenarios` 테이블 1개 통합 사용
  - `type` 값: `'asset_pack' | 'play_scenario' | 'think_scenario' | 'flow_scenario'`

#### ❌ 터짐 2: iframe에 URL 파라미터 전달 금지
- **이유**: 길이 제한, 브라우저마다 잘림, JSON 인코딩 지옥, 보안/노출 이슈
- **✅ 정답**: `postMessage` only

#### ❌ 터짐 3: "3개 모두 준비되면 자동 통합" 금지
- **이유**: UX에서 애매하게 꼬임
- **✅ 정답**: 저장 버튼 시점에 validate + save

#### ❌ 터짐 4: scenario_id 생성 로직을 탭에서 만들기 금지
- **이유**: 탭 나갔다 들어오면 id 바뀜, 저장 전 id 생성 시 실패하면 쓰레기 id 남음
- **✅ 정답**: `scenario_id`는 저장 시점(`handleSaveToDatabase`)에서만 생성/확정

#### ❌ 터짐 5: Phase 데이터 구조 표준화 필수
- **이유**: 구조가 느슨하면 통합 불가능
- **✅ 정답**: `GeneratedScenario` 표준 형태 고정

---

### 1. Generator 페이지 통합 로직 추가 (필수)

**파일**: `app/admin/iiwarmup/generator/page.tsx`

**해야 할 것 딱 3개**:
1. `playDraft`, `thinkDraft`, `flowDraft` state 관리
2. `unifiedScenario = {play, think, flow}`로 merge
3. Save 버튼에서 `validateDrafts()` 후 `handleSaveToDatabase` 호출

**구조**:
```typescript
const [playDraft, setPlayDraft] = useState<PlayDraft | null>(null);
const [thinkDraft, setThinkDraft] = useState<ThinkDraft | null>(null);
const [flowDraft, setFlowDraft] = useState<FlowDraft | null>(null);

// 통합 시나리오 (저장 시점에만 사용)
const unifiedScenario = useMemo(() => {
  if (!playDraft || !thinkDraft || !flowDraft) return null;
  return { play: playDraft, think: thinkDraft, flow: flowDraft };
}, [playDraft, thinkDraft, flowDraft]);
```

**자동 통합**: 해도 되고 안 해도 됨. 핵심은 "저장 버튼 시점에 3개가 합쳐져야 함"

---

### 2. Think/Flow Phase: DB 로드 → iframe postMessage (필수)

**파일**: 
- `app/iiwarmup/program/phases/think/ThinkPhase.tsx`
- `app/iiwarmup/program/phases/flow/FlowPhase.tsx`

**규칙**:
1. `phase.scenario_id` 있으면 `scenarios` 테이블에서 조회 (type 필터링)
2. iframe 로드 완료되면 `postMessage`로 데이터 전달
3. iframe 쪽은 "READY" handshake 보내고 받도록

**패턴**:
```typescript
// 부모(Next.js)
iframe.onLoad → "SEND_SCENARIO"
iframe이 READY 보내면 그때 SEND_SCENARIO

// 자식(iframe 페이지)
window message 받으면 scenario_json 세팅 후 실행
```

---

### 3. DB 스키마: 기존 play_scenarios 재활용 (신규 테이블 생성 금지)

**파일**: `sql/19_fix_scenarios_unified.sql` (신규)

**✅ 정답**:
- 기존 `play_scenarios` 테이블 재활용 (이미 `type` 컬럼 있음)
- `id TEXT PK`
- `type TEXT` (`'play_scenario' | 'think_scenario' | 'flow_scenario' | 'asset_pack'`)
- `scenario_json JSONB`
- `is_active / deleted_at`

**❌ 하지 말 것**: `think_scenarios`, `flow_scenarios` 테이블 생성

---

### 4. 저장 로직 통합: handleSaveToDatabase (핵심)

**파일**: `app/lib/admin/logic/handleSaveToDatabase.ts`

**저장 흐름**:
1. play scenario 저장 (`type='play_scenario'`)
2. think scenario 저장 (`type='think_scenario'`)
3. flow scenario 저장 (`type='flow_scenario'`)
4. `warmup_programs_composite` 저장 (phases에는 `scenario_id`만)

**⚠️ 중요**: 여기서만 `scenario_id`를 확정하고 저장한다.

**트랜잭션**:
- RPC로 한번에 처리 (권장)
- 또는 단일 관리자면 "부분 실패 시 rollback 수동 정리"로 MVP 가능

---

### 5. Studio 탭 개선 (단순해야 함)

**PlayStudio**:
- 지금처럼 timeline 기반 유지 OK
- `onScenarioUpdate`로 `playDraft`만 올림

**ThinkStudio / FlowStudio**:
- params만 관리하고 draft만 올림
- **❌ 하지 말 것**: `scenario_id` 생성 같은 헛짓

---

## 📝 참고 파일

### 관련 로직 파일
- `app/lib/admin/logic/generateScenarioJSON.ts` - 전체 시나리오 생성
- `app/lib/admin/logic/generatePlayTimeline.ts` - Play 타임라인 생성
- `app/lib/admin/logic/handleSaveToDatabase.ts` - 저장 로직
- `app/lib/admin/logic/layoutEngine.ts` - Think 레이아웃 엔진
- `app/lib/admin/logic/stroopLogic.ts` - Stroop 엔진

### 실행 파일
- `app/iiwarmup/program/[weekId]/page.tsx` - 프로그램 페이지
- `app/iiwarmup/program/components/ProgramOrchestrator.tsx` - Phase 오케스트레이터
- `app/iiwarmup/program/phases/play/PlayPhase.tsx` - Play Phase 실행
- `app/iiwarmup/program/phases/think/ThinkPhase.tsx` - Think Phase 실행
- `app/iiwarmup/program/phases/flow/FlowPhase.tsx` - Flow Phase 실행

### 데이터베이스 파일
- `sql/16_save_warmup_program_rpc.sql` - 저장 RPC 함수
- `sql/17_iiwarmup_refactor_schema.sql` - 스키마 리팩토링

---

## 🚨 핵심 문제 요약

1. **Studio 탭 데이터가 통합되지 않음** - 각각 독립적으로 동작
2. **Think/Flow 시나리오 저장 불가** - 저장 로직이 없음 (테이블은 이미 있음)
3. **실행 시 Think/Flow 데이터 로드 불가** - iframe만 로드, postMessage 전달 안 됨
4. **타임라인 vs 엔진 설정 불일치** - Play는 timeline, Think/Flow는 파라미터 (통합 인터페이스로 해결)

---

## ✅ 검증 방법 (현실적인 QA)

### Creator Studio에서
1. **PlayStudio**: 5개 선택 → 타임라인 생성 → 재생 (125초 완주)
2. **ThinkStudio**: layout_sequence 최소 1개라도 만들기
3. **FlowStudio**: baseSpeed/distortion 값 변경해보기
4. **Save 버튼**: 
   - `scenarios` 테이블에 3개 row 생성되는지 확인 (type 필터링)
   - `warmup_programs_composite`가 `scenario_id` 3개를 참조하는지 확인

### 실행 페이지에서
1. **play**: 정상 작동 확인
2. **think/flow**: iframe이 "READY" handshake 보내고 `scenario_json` 받고 실행하는지 확인
3. **전환**: phase duration 타이밍 정상인지 확인

---

## 🎯 우선순위 (지금 당장 해야 할 것)

**핵심 문제**: "탭은 있는데 저장이 안 되고 실행도 안 된다"

**✅ 1순위**: `generator/page.tsx`에서 통합 + 저장 버튼
**✅ 2순위**: think/flow iframe postMessage 전달

**❌ 하지 말 것**: 
- DB 확장은 이미 `type`을 넣어둔 순간 "끝난 게임"
- 테이블을 더 만들면 오히려 더 개판됨

---

**작성일**: 2026-01-26
**수정일**: 2026-01-26 (치명적 실수 방지 포인트 반영)
**상태**: 문제점 파악 완료, 프로덕션급 해결 방안 수립 완료
