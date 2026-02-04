# I.I.Warm-up 전체 시스템 리팩토링 계획 (최종)

## 🎯 리팩토링 목적 (한 줄)

**"Asset → Template → Schedule"을 끊김 없이 만들고, 배포된 결과물이 절대 깨지지 않게 한다.**

## 시스템 구조 개요

```
[재료 준비] → [공장 조립] → [매장 배송]
Asset Hub  → Creator Studio → Global Scheduler
```

## 🔒 최종 설계 규칙 (현장용)

### Rule A) 배포된 것은 절대 깨지면 안 된다
- 배포(Published)된 주차는 `program_snapshot`이 진실
- Asset이 바뀌어도 published 스냅샷은 그대로 유지되어야 함
- 템플릿 수정 시 배정된 프로그램은 영향 없음

### Rule B) Asset 삭제는 "Hard block + Soft delete"
- 사용 중이면 삭제 버튼 비활성화 (하드 블록)
- 삭제 = 즉시 제거가 아니라 "비활성/아카이브"로 운영
- 운영상 필요하면 "교체(Replace)"는 허용 (새 버전 업로드 후 참조 업데이트)

### Rule C) Think는 랜덤이 아니라 "재현 가능한 랜덤"
- Snapshot에 `seed` 고정
- QA, 버그 재현, 난이도 관리 가능

## 🔴 Phase 0: Foundation "최소 안전장치" (1-2일)

### 목표
"운영 깨짐 방지에 필요한 최소조건"만 확정하고 출발

### 최소 필수 확정 사항 (절대 양보 불가)

**1. Asset Pack 구조 분리 (play_scenarios 테이블)**

**문제**: 현재 `scenario_json.actions[].images`에 묻으면 재사용/추적/최적화가 어려움

**해결**: `scenario_json` 내부에 `assets` 객체로 분리

```typescript
// play_scenarios.scenario_json 구조
// ⚠️ type은 DB 컬럼으로만 사용, JSON 내부에는 없음
{
  theme: "kitchen",  // 주차 무관
  assets: {  // ← 시나리오와 분리
    actions: {
      POINT: { off: "storage_path", on: "storage_path" },
      JUMP: { off: "storage_path", on: "storage_path" },
      // ... 15개 동작
    },
    backgrounds: {
      play: "storage_path",
      think: "storage_path",
      flow: "storage_path"
    },
    objects: [
      "storage_path_apple",
      "storage_path_banana",
      // ... Think Phase용 객체
    ]
  },
  // 기존 시나리오 데이터는 별도 필드로
  scenario_data: { ... }  // 필요시
}

// DB 구조:
// id: "kitchen_v1"  -- 주차 없음, 안정적 ID
// type: "asset_pack"  -- DB 컬럼
// week_id: NULL  -- Asset Pack은 주차 무관
// scenario_json: { theme: "kitchen", assets: {...} }
```

**Storage Path 규칙**: URL이 아닌 Storage path 저장
- 형식: `/iiwarmup/themes/{themeId}/{action}/{state}.webp`
- CDN/도메인 변경 시에도 안전
- DB에는 path만 저장, URL은 런타임에 생성

**2. Snapshot 강제 저장 (rotation_schedule)** ⚠️ 필수

```sql
-- ✅ 3단계 Migration (기존 데이터 보호)
-- Step 1: Nullable로 추가
ALTER TABLE rotation_schedule 
ADD COLUMN IF NOT EXISTS program_snapshot JSONB;

-- Step 2: 기존 데이터 백필
UPDATE rotation_schedule
SET program_snapshot = '{}'::jsonb
WHERE program_snapshot IS NULL;

-- Step 3: NOT NULL 적용
ALTER TABLE rotation_schedule
ALTER COLUMN program_snapshot SET NOT NULL;

-- ✅ week_key UNIQUE 제약 추가 (필수)
ALTER TABLE rotation_schedule
ADD CONSTRAINT IF NOT EXISTS rotation_schedule_week_key_unique 
UNIQUE (week_key);

-- 왜 필수인가:
-- - BulkAssign에서 중복 삽입 시도 시 에러 발생 (의도된 동작)
-- - 드래그 앤 드롭 중복 방지
-- - DB 레벨에서 강제하므로 애플리케이션 로직 누락 방지

-- 배정 시 무조건 Snapshot 저장
-- 템플릿 수정 시 배정된 프로그램은 영향 없음
```

**3. Template 버전 필드 (warmup_programs_composite)** ⚠️ 필수

```sql
ALTER TABLE warmup_programs_composite
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN parent_version_id TEXT REFERENCES warmup_programs_composite(id),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- version 또는 updated_at 중 하나는 있어야 충돌을 잡습니다
-- changelog는 선택사항 (나중에 추가 가능)
```

**4. Asset Soft Delete 가능하게 설계** ⚠️ 필수

```sql
ALTER TABLE play_scenarios
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN deleted_at TIMESTAMPTZ;

-- 삭제 = 즉시 제거가 아니라 비활성/아카이브
-- 사용 중이면 삭제 불가 (하드 블록)
-- 교체(Replace)는 허용 (새 버전 업로드 후 참조 업데이트)
```

**5. BulkAssign 배치 insert/upsert 설계 확정** ⚠️ 필수

- 52개 개별 쿼리 금지
- 배치 크기 10개씩 묶어서 처리
- 배치 간 100ms 지연

**6. Think 재현 가능한 랜덤 (seed 고정)** ⚠️ 필수

```sql
-- rotation_schedule.program_snapshot에 seed 포함
-- Snapshot에 seed 고정하여 QA/버그 재현/난이도 관리 가능
```

**7. owner_id / org_id 필드 추가 가능한 형태로만 설계** (2순위, 구현은 안 함)

```sql
-- 필드만 추가 (RLS 적용은 안 해도 됨)
ALTER TABLE play_scenarios
ADD COLUMN owner_id UUID REFERENCES auth.users(id),
ADD COLUMN org_id UUID;

ALTER TABLE warmup_programs_composite
ADD COLUMN owner_id UUID REFERENCES auth.users(id),
ADD COLUMN org_id UUID;

-- 실제 RLS 정책은 다음 분기에 구현
```

**8. Lock 기능 추가 (rotation_schedule)** (선택사항, 가능하면)

```sql
ALTER TABLE rotation_schedule
ADD COLUMN is_locked BOOLEAN DEFAULT false;

-- Lock된 주차는 드래그 드롭 불가
-- 실수로 덮어쓰기 방지
```

**감사 로그 테이블은 3순위 (다음 분기)**

**7. play_scenarios.type 필드 추가** (DB 컬럼만 사용, JSON 내부 type 제거)

```sql
ALTER TABLE play_scenarios
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'scenario';

-- type 값:
-- 'asset_pack': Asset Hub에서 관리하는 에셋 팩
-- 'think_scenario': Think Phase 시나리오
-- 'play_scenario': Play Phase 시나리오 (기존)

-- ⚠️ 중요: scenario_json 내부에 type 필드 사용 안 함
-- DB 컬럼만 사용하여 중복 제거

-- 쿼리 기준 고정:
-- Asset Hub 조회: WHERE type = 'asset_pack'
-- Template 조회: WHERE week_id IS NULL
-- 배정 조회: rotation_schedule.week_key
```

**새 파일**: `sql/17_iiwarmup_refactor_schema.sql`
- 최소 필수 스키마 변경사항만 통합
- **3단계 Migration** (기존 데이터 보호):
  1. `program_snapshot` Nullable로 추가
  2. 기존 데이터 백필 (`'{}'::jsonb`)
  3. NOT NULL 적용
- **week_key UNIQUE 제약** (필수)
  - `ADD CONSTRAINT rotation_schedule_week_key_unique UNIQUE (week_key)`
  - BulkAssign 중복 방지
  - 드래그 앤 드롭 중복 방지
- `scenario_ids` 배열 컬럼 + GIN 인덱스 (성능 개선)
- `type` 컬럼 (DB만 사용, JSON 내부 type 제거)
- `version`, `parent_version_id`, `updated_at`
- `is_active`, `deleted_at` (soft delete)
- `owner_id`, `org_id` (필드만 추가, RLS는 안 함)
- themeId 규칙: `{theme}_v{version}` (주차 제거)
- 마이그레이션 스크립트

## 🗑️ 1단계: 과거 유산 삭제 (Clean Up)

### 삭제 대상 파일/코드

**파일**: `app/admin/iiwarmup/page.tsx`
- ❌ `handleCreateProgram` 함수 및 관련 로직 완전 삭제
- ❌ 하드코딩된 24개 액션 생성 코드 삭제
- ✅ 주석만 남기고 실제 코드는 모두 제거

**파일**: `app/components/admin/iiwarmup/ThemeManager.tsx`
- ❌ Local State로 관리하던 이미지 상태 관리 로직 삭제
- ✅ 모든 이미지는 DB(Supabase)에서 직접 관리
- ✅ 컴포넌트는 DB 조회/저장만 담당

**파일**: `app/admin/iiwarmup/page.tsx`
- ❌ "프로그램 생성" 탭 메뉴 삭제 (Creator Studio로 완전 분리)

**상수 통일 작업**
- ❌ `app/components/admin/iiwarmup/constants.ts`의 `ACTION_NAMES` 삭제
- ❌ 다른 파일의 중복 상수 정의 삭제
- ✅ 모든 상수는 `app/lib/admin/constants/physics.ts`로 통일
- ✅ 다른 파일에서는 `import { ACTION_NAMES, TARGET_FREQUENCIES, ASSET_VARIANTS } from '@/app/lib/admin/constants/physics'` 사용
- ✅ `ASSET_VARIANTS = ["off", "on"]` 추가 (향후 확장 가능: "hit" 등)

## 🏗️ 2단계: Asset Hub (재료 창고) 리팩토링

### 목표
테마별 이미지 에셋을 체계적으로 관리하고, 이미지 최적화 및 검증 기능 추가

### 변경 사항

**파일**: `app/admin/iiwarmup/page.tsx`
- "테마 관리" 탭을 "Asset Hub"로 명칭 변경
- Asset Hub 설명 카드 추가: "프로그램 제작 전 모든 시각적 재료를 테마별로 저장하는 곳"

**파일**: `app/components/admin/iiwarmup/ThemeManager.tsx` → `AssetHub.tsx`로 리네임
- Local State 제거, DB 직접 관리로 전환
- 저장 데이터 구조 명확화:
  - 테마명: 주방, 우주, 정글, 바다 등
  - 동작 에셋: `ACTION_NAMES` 기반 동적 계산 (확장 가능)
  - 상태 변형: `ASSET_VARIANTS = ["off", "on"]` (향후 "hit" 등 확장 가능)
  - 배경 에셋: 각 페이즈별 배경 이미지
  - 객체 에셋: Think Phase용 인지 이미지 (사과, 바나나 등)
- **DB 저장 위치 변경**: `play_scenarios.scenario_json.assets` 객체로 분리
  - `scenario_json.type = "asset_pack"`
  - `scenario_json.assets.actions`, `assets.backgrounds`, `assets.objects`
  - 시나리오 데이터와 완전 분리
- Storage Path 규칙: `/iiwarmup/themes/{themeId}/{action}/{state}.webp`
  - 주차 제거: `/iiwarmup/themes/kitchen_v1/run/on.webp`
  - 주차별 배정은 `rotation_schedule`에서만 관리
- 테마별 ID 규칙: `{theme}_v{version}` (예: `kitchen_v1`)
  - 주차 무관한 안정적 ID
  - 주차별 복제 방지
  - `week_id: NULL` (Asset Pack은 주차 무관)

**새 파일**: `app/lib/admin/assets/imageOptimizer.ts`
- **클라이언트 우선 + 조건부 서버** (절충안)
  - 1차: 클라이언트에서 리사이징/압축 (빠름, UX 좋음)
    - Canvas 기반 리사이징 (최대 1920×1080px)
    - 파일 크기 체크
  - 2차: 500KB 초과 또는 특정 조건에서만 서버로 WebP 변환
    - `/api/admin/iiwarmup/optimize-image` 엔드포인트
    - WebP 변환 및 압축 (500KB 목표)
- **입력 포맷 가드**
  - png/jpg/webp 외 파일 업로드 차단
- **해시 기반 중복 방지** (선택사항)
  - 같은 파일 반복 업로드 방지 (저장비용/혼란 감소)
- Storage Path 저장: URL이 아닌 path 저장
  - 형식: `/iiwarmup/themes/{themeId}/{action}/{state}.webp`
  - CDN/도메인 변경 시에도 안전

**새 파일**: `app/lib/admin/assets/loadThemeAssets.ts`
- Asset Hub에서 저장한 이미지를 불러오는 유틸리티 함수
- `play_scenarios`에서 `type = 'asset_pack'` 조회 (DB 컬럼 사용)
- `scenario_json.assets` 객체에서 이미지 매핑 추출
- Storage path를 런타임 URL로 변환
- 동작 타입별 이미지 매핑 반환
- themeId 규칙: `{theme}_v{version}` (주차 무관)

**새 파일**: `app/components/admin/iiwarmup/AssetReadinessIndicator.tsx`
- 동작 매칭 검증 컴포넌트 (확장 가능 구조)
- 필수 슬롯 자동 계산: `ACTION_NAMES.length × ASSET_VARIANTS.length`
  - 현재: 15개 동작 × 2장(off/on) = 30개
  - 확장 시: 20개 동작 × 3장(off/on/hit) = 60개로 자동 반영
- `ASSET_VARIANTS` 상수: `["off", "on"]` (향후 확장 가능)
- 미등록 이미지가 있으면 경고 표시
- 준비 완료율: "30개 중 28개 등록됨 (93%)"

**새 파일**: `app/lib/admin/assets/checkAssetUsage.ts`
- Asset Hub 이미지가 어느 템플릿에서 사용되는지 조회
- **성능 개선**: `scenario_ids` 배열 컬럼 사용 (JSONB 검색 대신)
- GIN 인덱스로 배열 검색 최적화
- 사용 중인 템플릿 및 발행된 프로그램 목록 반환

**DB 스키마 확장**:
```sql
-- scenario_ids 컬럼 추가 (옵션 A)
ALTER TABLE warmup_programs_composite
ADD COLUMN IF NOT EXISTS scenario_ids TEXT[];

-- 인덱스 추가 (GIN 인덱스로 배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_warmup_programs_scenario_ids 
ON warmup_programs_composite USING GIN(scenario_ids);
```

**템플릿 저장 시 자동 추출**:
```typescript
// phases에서 scenario_id 추출하여 배열로 저장
const scenarioIds = template.phases
  .map(phase => phase.scenario_id)
  .filter(Boolean);

// 빠른 사용처 조회 (JSONB 검색 대신 배열 검색)
const { data } = await supabase
  .from('warmup_programs_composite')
  .select('id, title')
  .contains('scenario_ids', [assetId]);
```

**새 파일**: `app/lib/admin/assets/checkAssetDeletion.ts`
- **Hard block + Soft delete**
  - 사용 중이면 삭제 버튼 비활성화 (하드 블록)
  - `checkAssetUsage()` 호출하여 사용처 확인
  - 템플릿 또는 발행된 프로그램에서 사용 중이면 삭제 불가
  - 삭제 불가 메시지: "Cannot delete: N templates use this asset"
- **Soft delete 구현**
  - 삭제 = 즉시 제거가 아니라 `is_active = false`, `deleted_at = NOW()`
  - 비활성/아카이브로 운영

**새 파일**: `app/lib/admin/assets/replaceAsset.ts`
- **교체(Replace) 규칙 명확화**
  - Template에는 Replace 허용 (미래에 영향)
  - Published Snapshot에는 Replace 금지 (과거 보호)
- **완전한 Replace 구현** (phases JSON도 업데이트):
  ```typescript
  export async function replaceAsset(
    oldAssetId: string,
    newAssetId: string
  ) {
    const usage = await checkAssetUsage(oldAssetId);
    const templates = usage.filter(t => t.week_id === null);
    
    for (const template of templates) {
      // 1. scenario_ids 배열 업데이트
      const newScenarioIds = template.scenario_ids.map(id =>
        id === oldAssetId ? newAssetId : id
      );
      
      // 2. phases JSON 내부도 업데이트 ✅ (필수!)
      const newPhases = JSON.parse(JSON.stringify(template.phases));
      
      // phases 내부의 모든 scenario_id 교체
      Object.values(newPhases).forEach((phase: any) => {
        if (phase.scenario_id === oldAssetId) {
          phase.scenario_id = newAssetId;
        }
      });
      
      // 3. 동시 업데이트
      await supabase
        .from('warmup_programs_composite')
        .update({ 
          scenario_ids: newScenarioIds,
          phases: newPhases,  // ✅ phases도 업데이트
          updated_at: new Date().toISOString(),
          version: template.version + 1,  // 버전 증가
        })
        .eq('id', template.id);
    }
    
    // 4. Published Snapshot은 건드리지 않음
    // 5. 기존 Asset Soft Delete
    await supabase
      .from('play_scenarios')
      .update({ is_active: false, deleted_at: new Date() })
      .eq('id', oldAssetId);
  }
  ```
- **왜 필수인가**: scenario_ids만 바꾸면 검색은 되는데 렌더링은 안 됨 (실제 버그 발생 확률 100%)

## 🏭 3단계: Creator Studio (제작 공장) 리팩토링

### 목표
3개 독립 탭으로 분리하여 각 페이즈를 독립적으로 제작

### 변경 사항

**파일**: `app/admin/iiwarmup/generator/page.tsx`
- 전체 구조를 3개 탭으로 재구성:
  - Tab 1: Play Studio
  - Tab 2: Think Studio  
  - Tab 3: Flow Studio
- 각 탭은 독립적인 상태 관리 및 시뮬레이션
- 최종 통합: 3개 탭의 결과를 합쳐서 프로그램 템플릿 생성

**새 파일**: `app/admin/iiwarmup/generator/tabs/PlayStudio.tsx`
- 목적: 12Hz 등 정밀 주파수와 동작 전환 훈련
- 조절 파라미터:
  - 주파수 (Hz): 슬라이더 또는 직접 입력
  - 전환 간격: 동작 간 전환 시간
  - 테마 이미지 선택: Asset Hub에서 저장한 테마 선택 드롭다운
- UI: 전체 화면 캔버스 + 좌측 정밀 물리 엔진 설정창
- 시뮬레이션: **독립 `PlaySimulator.tsx` 사용** (HybridSimulator 아님)
- Asset Hub 연동: 선택한 테마의 이미지를 `generateActions()`에 전달

**새 파일**: `app/admin/iiwarmup/generator/tabs/ThinkStudio.tsx`
- 목적: 가변 레이아웃을 통한 인지 자극
- 조절 파라미터:
  - 레이아웃 시퀀스 설계: 타임라인 기반 UI
    - 예: 0~30초: 4분할 / 30~60초: 전체 / 60~120초: 3분할
  - 각 레이아웃 구간별 설정
- 레이아웃 엔진 규격 (확장):
  - `scenario_json` 내부에 `layout_sequence` 배열 추가
  - 각 구간 구조:
    ```typescript
    {
      startTime: 0,
      endTime: 30,
      layout_type: '2x2',
      pool: 'actions' | 'objects',  // 사용할 이미지 풀
      max_active: 1 | 2 | 3 | 4,   // 동시 활성 객체 수
      tempo_ms?: number,            // 랜덤 속도 (ms)
      rule: 'random' | 'sequence' | 'memory',  // 배치 규칙
      // seed는 구간마다 없음 (프로그램 단위 seed 사용)
      transition: {
        duration: 300,  // ms
        easing: 'ease-in-out' | 'linear'
      },
      objectPlacement: 'preserve' | 'reset' | 'random'
    }
    ```
  - **재현 가능한 랜덤**: `seed` 고정으로 QA/버그 재현/난이도 관리 가능
  - `layout_type`: `'1x1' | '1x2' | '1x3' | '2x2' | '2x3' | '3x3' | '4x4'`
  - 엔진은 실시간으로 화면 분할 계산: `3분할 = 100% / 3`
- 레이아웃 전환 애니메이션:
  - `transition.duration`: 300ms (기본값)
  - `transition.easing`: 'ease-in-out' | 'linear'
  - 전환 시 깜빡임 방지 (fade transition)
- 객체 유지 전략:
  - `objectPlacement`: 'preserve' (기존 위치 유지) | 'reset' (초기화) | 'random' (랜덤 재배치)
  - 레이아웃 변경 시 기존 객체 위치 재계산
- 타임라인 검증:
  - 시퀀스 구간이 겹치거나 누락되면 에러
  - 첫 시작이 0초인지 확인
  - 시간 순서 정렬 및 연속성 검증
- 특징: 레이아웃마다 Asset Hub의 객체 이미지가 랜덤 자동 배정
- 시뮬레이션: **독립 `ThinkSimulator.tsx` 사용** (HybridSimulator 아님)

**새 파일**: `app/lib/admin/logic/layoutEngine.ts`
- `LayoutSequence` 인터페이스 정의 (pool, max_active, tempo_ms, rule 포함)
  - ⚠️ seed는 구간마다 없음 (프로그램 단위 seed 사용)
- `validateLayoutSequence()` 함수: 타임라인 검증
- 레이아웃 전환 애니메이션 로직
- 객체 위치 재계산 로직
- 풀(pool) 기반 이미지 선택 로직
- 규칙(rule) 기반 배치 로직 (random/sequence/memory)
- **재현 가능한 랜덤**: 전역 seed + 구간별 offset 사용
  - `seededRandom(globalSeed + sequence.startTime)`

**새 파일**: `app/admin/iiwarmup/generator/tabs/FlowStudio.tsx`
- 목적: 3D 몰입 환경에서의 전신 반응
- 조절 파라미터:
  - 우주선 속도: `baseSpeed` 슬라이더
  - 장애물(Box) 생성률: `boxRate` (LV3, LV4별)
  - 공간 왜곡 정도: `distortion` 슬라이더
- UI: Three.js 뷰포트 + 우측 물리 파라미터 제어 패널
- 시뮬레이션: **독립 `FlowSimulator.tsx` 사용** (HybridSimulator 아님)

**수정 파일**: `app/lib/admin/logic/parametricEngine.ts`
- `generateActions()` 함수에 테마 이미지 로딩 로직 추가
- `loadThemeAssets()` 호출하여 Asset Hub 이미지 불러오기
- 불러온 이미지를 actions에 적용: `images: { off: url1, on: url2 }`

**수정 파일**: `app/lib/admin/logic/generateScenarioJSON.ts`
- 3개 탭의 결과를 통합하는 함수 추가
- 각 탭에서 생성된 설정을 `GeneratedScenario`로 병합
- Think Studio의 `layout_sequence`를 `think.layout_sequence`에 추가

**새 파일**: `app/admin/iiwarmup/generator/components/TemplateSaveModal.tsx`
- 3개 탭의 결과를 통합하여 템플릿으로 저장
- 저장 시: `warmup_programs_composite` 테이블에 `week_id = null`로 저장 (템플릿)
- 템플릿 제목, 설명 입력 필드

## 📅 4단계: Global Scheduler (배포 센터) 리팩토링

### 목표
52주 슬롯 시스템으로 단순화된 편성표 UI + 대량 배정 기능

### 변경 사항

**파일**: `app/admin/iiwarmup/page.tsx`
- "주간 스케줄 배정" 탭을 "Global Scheduler"로 명칭 변경
- 설명 카드 추가: "만들어진 템플릿을 실제 날짜(주차)에 할당하는 편성표"

**파일**: `app/components/admin/iiwarmup/WeeklyScheduler.tsx` → `GlobalScheduler.tsx`로 리네임
- 전체 UI를 52주 슬롯 시스템으로 재구성
- 레이아웃:
  - 좌측: Creator Studio에서 만든 템플릿 리스트 (드래그 가능)
  - 우측: 52주 슬롯 그리드 (1월 1주차 ~ 12월 4주차)
- 드래그 앤 드롭:
  - 템플릿을 슬롯에 드롭하면 `rotation_schedule` 테이블에 저장
  - `week_key` 형식: `{year}-{month}-W{week}` (예: `2026-01-W1`)
- 발행(Publish) 기능:
  - 각 슬롯에 "발행" 토글 버튼
  - `rotation_schedule.is_published = true`로 설정
  - 발행된 프로그램은 구독자 페이지(`/iiwarmup`)에 노출
- **Lock 기능**:
  - 각 슬롯에 "잠금" 토글 버튼
  - `rotation_schedule.is_locked = true`로 설정
  - Lock된 주차는 드래그 드롭 불가
  - 실수로 덮어쓰기 방지
- 삭제 기능:
  - 슬롯에서 프로그램 삭제 시 `rotation_schedule` 삭제
  - 관련 `warmup_programs_composite`는 삭제하지 않음 (템플릿 보존)

**새 파일**: `app/lib/admin/scheduler/dragAndDrop.ts`
- 드래그 앤 드롭 로직 유틸리티
- 템플릿 ID와 슬롯 week_key 매핑

**새 파일**: `app/components/admin/iiwarmup/BulkAssignWizard.tsx`
- 대량 배정 마법사 컴포넌트
- **배치 모드 선택**:
  - Random: 완전 랜덤 배정
  - 균등분배: 테마별 균등 분배
  - 패턴(Sequence): 홀수 주 = 우주/정글/바다, 짝수 주 = 주방/도시/스포츠
  - 분기별 테마 묶음: 분기마다 테마 그룹 순환
- 클릭 시 Asset Hub의 테마들을 골고루 섞어 1년 치 스케줄 자동 생성
- **배치 처리 필수**: 52번 개별 쿼리 금지
- 로직:
  1. Asset Hub에서 사용 가능한 테마 목록 조회
  2. 선택한 모드에 따라 52주 슬롯에 배정
  3. 배치 크기 10개씩 묶어서 `rotation_schedule` 배치 삽입
  4. 진행 상황 표시 (52개 중 N개 완료)
  5. 배치 간 100ms 지연 (DB 부하 방지)

**새 파일**: `app/lib/admin/scheduler/bulkAssign.ts`
- 배치 처리 로직 구현
- `BATCH_SIZE = 10` 상수 정의
- 프로그레스 추적 및 콜백
- **upsert 패턴 사용** (중복 방지):
  ```typescript
  // ✅ upsert (덮어쓰기)
  await supabase
    .from('rotation_schedule')
    .upsert(batch, { 
      onConflict: 'week_key',
      ignoreDuplicates: false  // 덮어쓰기
    });
  ```
- 단일 배치 삽입으로 DB 부하 최소화
- week_key UNIQUE 제약으로 DB 레벨 중복 방지

### Template vs Scheduled Program의 분리 (버전 관리)

**문제**: 템플릿 수정 시 이미 배정된 프로그램도 변경되는 문제

**해결 방안**: **Snapshot 강제 저장** (옵션이 아님)
- `warmup_programs_composite`는 **원본(Template)**으로 관리
- `rotation_schedule`에 배정될 때:
  - **무조건 Snapshot 저장**: `rotation_schedule.program_snapshot` JSONB 필드에 해당 시점의 설정 저장
  - 템플릿 수정 시 배정된 프로그램은 영향 없음 (운영 안정성 필수)
  - 템플릿을 고치면 "미래 주차 배정"에만 반영
  - "기존 배정도 바꿀까요?" 옵션 제거 (사고 확률 높음)

**새 파일**: `app/lib/admin/scheduler/createSnapshot.ts`
- 템플릿을 Snapshot으로 변환하는 함수
- **완전한 Snapshot 구조** (운영 필수 메타데이터 포함):
  ```typescript
  interface ProgramSnapshot {
    // 메타 정보 (디버깅/고객 대응)
    template_id: string;
    template_version: number;
    asset_pack_id: string;  // 또는 scenario_ids
    seed: number;
    generated_at: string;  // ISO timestamp
    
    // 실제 데이터
    phases: {
      play: PlayPhaseData;
      think: ThinkPhaseData;
      flow: FlowPhaseData;
    };
    
    // 빠른 참조용
    scenario_ids: string[];
  }
  ```
- **프로그램 단위 seed 생성** (전체 프로그램의 seed 1개)
  - 구간마다 seed가 아닌 프로그램 단위 seed
  - `seed: Math.floor(Math.random() * 1000000)` (또는 사용자 지정)
  - Think Phase에서 전역 seed 사용: `seededRandom(globalSeed + sequence.startTime)`
- 배정 시 무조건 Snapshot 저장 (옵션 아님)
- `scenario_ids` 배열도 Snapshot에 포함
- **고객 문의 대응**: "1월 1주차 프로그램이 왜 이렇게 나왔나요?" 즉시 답변 가능

**수정 파일**: `app/lib/admin/logic/handleSaveToDatabase.ts`
- 템플릿 저장 시 `week_id = null`로 저장
- `scenario_ids` 배열 자동 추출 및 저장
- 템플릿 수정 시 기존 배정은 영향 없음 (Snapshot 보호)
- **감사 로그 코드 제거** (다음 분기에 정식 도입)
  - 콘솔 로그 + 토스트만 사용
  - `console.log('Template saved:', template.id)`
  - `toast.success('Template saved successfully')`

## 🔄 5단계: 데이터 흐름 통합

### Asset Hub → Creator Studio 연동

**파일**: `app/lib/admin/logic/quickGenerator.ts`
- `quickGenerate()` 함수 수정
- 선택한 테마의 이미지를 Asset Hub에서 자동 불러오기
- `loadThemeAssets(theme, weekId)` 호출

**파일**: `app/lib/admin/logic/generateScenarioJSON.ts`
- `generateScenarioJSON()` 함수에 `theme` 파라미터 추가
- Asset Hub 이미지 로딩 후 actions에 적용

### Creator Studio → Global Scheduler 연동

**파일**: `app/lib/admin/logic/handleSaveToDatabase.ts`
- 템플릿 저장 시 `week_id = null`로 저장
- Global Scheduler에서 조회 가능하도록 `is_active = true` 유지

**파일**: `app/components/admin/iiwarmup/GlobalScheduler.tsx`
- 템플릿 목록 조회: `warmup_programs_composite`에서 `week_id IS NULL` 조회
- 드롭 시 `rotation_schedule`에 `week_key`와 `program_id` 매핑
- **Snapshot 무조건 저장**: `createSnapshot()` 호출하여 `program_snapshot` 저장
- Lock 기능: `is_locked = true`인 슬롯은 드래그 드롭 비활성화

### React Query를 이용한 탭 간 데이터 동기화 (수동 refetch)

**주의**: "실시간 동기화" 표현 제거 - 오해 유발 방지

**새 파일**: `app/lib/admin/hooks/useTemplates.ts`
- React Query로 템플릿 목록 조회
- `useQuery`로 `warmup_programs_composite` 조회
- `staleTime: 5 * 60 * 1000` (5분) - 실시간 아님
- `refetchOnWindowFocus: true` - 포커스 시에만 갱신
- 폴링 제거 - 수동 트리거만
- `useMutation`으로 템플릿 저장/수정/삭제
- 낙관적 업데이트 + 에러 시 롤백 로직

**새 파일**: `app/lib/admin/hooks/useThemeAssets.ts`
- React Query로 Asset Hub 이미지 조회
- 테마별 이미지 캐싱
- `staleTime: 10 * 60 * 1000` (10분)

**새 파일**: `app/lib/admin/hooks/useRotationSchedule.ts`
- React Query로 스케줄 조회
- 52주 슬롯 데이터 캐싱
- 수동 refetch만 지원

**새 파일**: `app/lib/admin/hooks/useOptimisticTemplateUpdate.ts`
- 낙관적 업데이트 패턴
- `onMutate`에서 이전 데이터 백업
- `onError`에서 롤백 (`queryClient.setQueryData`)
- 동시 편집 충돌 감지 및 에러 처리

## 🎨 6단계: UI/UX 개선

### 각 탭 상단 설명 카드

**파일**: `app/admin/iiwarmup/page.tsx`
- Asset Hub 탭: "프로그램 제작 전 모든 시각적 재료를 테마별로 저장하는 곳"
- Creator Studio 탭: "Asset Hub의 재료를 가져와 10분짜리 시나리오를 만드는 곳"
- Global Scheduler 탭: "만들어진 템플릿을 실제 날짜(주차)에 할당하는 편성표"

### 데이터 흐름 다이어그램

**새 파일**: `app/admin/iiwarmup/components/DataFlowDiagram.tsx`
- Mermaid 또는 SVG로 데이터 흐름 시각화
- Asset Hub → Creator Studio → Global Scheduler → 구독자 페이지

## 🛡️ 7단계: DB 무결성 및 에러 처리

### 에러 복구 전략

**새 파일**: `app/lib/admin/assets/loadAssetWithFallback.ts`
- Asset 로딩 실패 시 Fallback 이미지 제공
- `AssetLoadError` 커스텀 에러 클래스
- `loadAssetWithFallback(url, fallbackUrl)` 함수
- 로직:
  1. 원본 URL로 fetch 시도
  2. 실패 시 fallback URL 사용
  3. 콘솔 경고 로그
  4. 기본 이미지 반환

**수정 파일**: `app/lib/admin/logic/parametricEngine.ts`
- `generateActions()`에서 `loadAssetWithFallback()` 사용
- Asset Hub 이미지 로딩 실패 시 기본 이미지로 대체
- 런타임 에러 방지

### 버전 관리 시스템

**DB 스키마 확장**: `warmup_programs_composite` 테이블
- `version` INTEGER 필드 추가 (기본값: 1)
- `parent_version_id` TEXT 필드 추가 (NULL 허용)
- `changelog` TEXT 필드 추가

**새 파일**: `app/lib/admin/versioning/createVersion.ts`
- 템플릿 버전 생성 함수
- `createNewVersion(templateId, changes)` 함수
- 로직:
  1. 현재 템플릿 조회
  2. 새 버전 생성 (version + 1)
  3. parent_version_id에 이전 버전 ID 저장
  4. changelog 기록
  5. 새 버전 반환

**새 파일**: `app/lib/admin/versioning/getVersionHistory.ts`
- 템플릿 버전 히스토리 조회
- `parent_version_id` 체인을 따라 모든 버전 조회
- 버전별 changelog 표시

### 성능 모니터링

**새 파일**: `app/lib/admin/monitoring/performanceTracker.ts`
- `PhasePerformanceMonitor` 클래스
- **FPS 추적** (렌더링 상태):
  - `frameTimestamps` 배열로 최근 60프레임 저장
  - 평균 delta 계산
  - `getCurrentFPS()` 메서드
- **Tick Drift 측정** (플레이 리듬 품질) ⚠️ 핵심 추가
  - `tickDrift` 배열로 각 프레임의 drift 저장
  - 예상 간격: `1000 / targetHz` (12Hz = 83.33ms)
  - 실제 간격과 예상 간격의 차이 계산
  - 5ms 이상 drift면 경고
  - `getAverageDrift()` 메서드
- 성능 검증:
  - `isQualityAcceptable()`: FPS (58fps 이상) + Drift (3ms 미만) 둘 다 확인
  - 12Hz 정밀도 보장을 위한 프레임 드롭 + tick drift 감지
- 경고 시스템:
  - FPS가 58 미만이면 콘솔 경고
  - Drift가 5ms 이상이면 콘솔 경고
  - `getDebugInfo()`: FPS, avgDrift, maxDrift, quality 표시
  - UI에 성능 인디케이터 표시 (선택사항)

**수정 파일**: `app/admin/iiwarmup/generator/tabs/PlayStudio.tsx`
- `PhasePerformanceMonitor` 통합
- 시뮬레이션 중 FPS 추적
- 성능 저하 시 경고 표시

## 🛡️ 8단계: DB 무결성 및 에러 처리 (기존 7단계 확장)

### Asset Hub 이미지 삭제 시 완전 차단 (하드 블록)

**파일**: `app/components/admin/iiwarmup/AssetHub.tsx`
- 이미지 삭제 전 확인: `checkAssetDeletion()` 호출
- **하드 블록**: 사용 중이면 삭제 불가 (경고만으로 부족)
- 에러 메시지: "Cannot delete: N templates use this asset"
- 삭제 버튼 비활성화 또는 에러 토스트 표시
- 데이터 무결성 보장: 배포된 프로그램의 이미지 깨짐 방지

### 엔진 독립성 보장

**새 파일**: `app/admin/iiwarmup/generator/simulators/PlaySimulator.tsx`
- Play Studio 전용 독립 Simulator
- Play Phase만 렌더링
- **메모리 누수 방지**: cleanup 로직 필수
  - `useEffect` return에서 Canvas 리소스 정리
  - 이미지 캐시 정리

**새 파일**: `app/admin/iiwarmup/generator/simulators/ThinkSimulator.tsx`
- Think Studio 전용 독립 Simulator
- Think Phase만 렌더링
- 레이아웃 엔진 통합
- **메모리 누수 방지**: cleanup 로직

**새 파일**: `app/admin/iiwarmup/generator/simulators/FlowSimulator.tsx`
- Flow Studio 전용 독립 Simulator
- Flow Phase만 렌더링 (Three.js)
- **메모리 누수 방지**: cleanup 로직 필수
  - `useEffect` return에서 Three.js 리소스 정리
  - `renderer.dispose()` 호출
  - `scene.traverse()`로 geometry/material dispose
  - WebGL 컨텍스트 정리

**수정 파일**: `app/admin/iiwarmup/generator/components/HybridSimulator.tsx`
- **통합 미리보기용으로만 사용** (선택사항)
- 3개 페이즈 통합 미리보기 시에만 사용
- 각 탭에서는 독립 Simulator 사용

## 📋 구현 우선순위 (수정된 최종)

### Phase 0: Foundation "최소 안전장치" (1-2일) ⚠️ 최우선

**목표**: "운영 깨짐 방지에 필요한 최소조건"만 확정

- **DB 스키마 초안** (최소 필드만)
  - `rotation_schedule.program_snapshot` (NOT NULL) - 무조건 Snapshot
  - `warmup_programs_composite.version`, `parent_version_id`, `updated_at`
  - `play_scenarios.is_active`, `deleted_at` (soft delete 가능하게)
  - `play_scenarios.type` 필드 추가
  - `owner_id`, `org_id` 필드만 추가 (RLS는 안 함, 다음 분기)
  - Storage Path 규칙 확정
  - **마이그레이션 스크립트**: `sql/17_iiwarmup_refactor_schema.sql`
- **Asset 삭제 정책**: soft delete + 사용중 하드블록
- **BulkAssign 배치 insert/upsert 설계 확정** (52개 개별 쿼리 금지)
- **Three.js/Simulator cleanup** (raf cancel + dispose)

### Phase 1: Clean Up (0.5일)
- `handleCreateProgram` 제거
- 중복 상수 `physics.ts` 통일
- 탭 구조 정리 (Program 생성 탭 제거)

### Phase 2: Asset Hub MVP (1-2일)
- 업로드 → 최적화 (클라 우선 + 조건부 서버)
  - 입력 포맷 가드 (png/jpg/webp만)
  - 해시 기반 중복 방지 (선택사항)
- `AssetReadinessIndicator` (동적 계산: `ACTION_NAMES.length × ASSET_VARIANTS.length`)
- `checkAssetUsage` 함수
- `checkAssetDeletion` 함수 (Hard block + Soft delete)
- 에러 복구: Fallback 이미지 로직

### Phase 3: Creator Studio - Play 먼저 "프로덕션급" (2-3일)
- PlayStudio UI + 액션 적용
- 독립 `PlaySimulator.tsx` 사용
- Performance Monitor (최소 FPS + tick drift)
- cleanup 로직 (메모리 누수 방지)
- 저장 → Template 생성 (`week_id = null`)

### Phase 4: Think & Flow 확장 (3-4일)
- Think Studio: 레이아웃 엔진 (`layoutEngine.ts`)
  - `layout_sequence` + transition/validation
  - 재현 가능한 랜덤 (seed 고정)
  - pool, max_active, tempo_ms, rule 포함
- Flow Studio: 3D 파라미터 제어
- 독립 `ThinkSimulator.tsx`, `FlowSimulator.tsx` 사용
- Play Studio 패턴 복제 (cleanup, 성능 모니터링)

### Phase 5: Global Scheduler (2일)
- 52주 슬롯 UI
- 드래그 앤 드롭 로직
- 배정 시 Snapshot 생성 (무조건)
- publish 토글
- Lock 기능 (가능하면)

### Phase 6: BulkAssign (1일)
- Batch insert/upsert
- 패턴 배치 모드 (Random/균등분배/Sequence/분기별)
- Lock/skip locked 옵션 (가능하면)

### Phase 7: React Query (0.5-1일)
- "실시간 동기화" 표현 삭제
- `staleTime` + `invalidateQueries` 중심
- optimistic update는 최소화 (필요한 곳만)
- useTemplates, useThemeAssets, useRotationSchedule 훅

**총 예상: 11-14일** (실전적 압축 버전)

## 파일 구조 변경 요약

### 새로 생성할 파일
- `sql/17_iiwarmup_refactor_schema.sql` (DB 스키마 마이그레이션)
- `app/components/admin/iiwarmup/AssetHub.tsx` (ThemeManager 리네임 및 리팩토링)
- `app/components/admin/iiwarmup/AssetReadinessIndicator.tsx`
- `app/components/admin/iiwarmup/GlobalScheduler.tsx` (WeeklyScheduler 리네임)
- `app/components/admin/iiwarmup/BulkAssignWizard.tsx`
- `app/admin/iiwarmup/generator/tabs/PlayStudio.tsx`
- `app/admin/iiwarmup/generator/tabs/ThinkStudio.tsx`
- `app/admin/iiwarmup/generator/tabs/FlowStudio.tsx`
- `app/admin/iiwarmup/generator/simulators/PlaySimulator.tsx` (독립 Simulator)
- `app/admin/iiwarmup/generator/simulators/ThinkSimulator.tsx` (독립 Simulator)
- `app/admin/iiwarmup/generator/simulators/FlowSimulator.tsx` (독립 Simulator)
- `app/admin/iiwarmup/generator/components/TemplateSaveModal.tsx`
- `app/admin/iiwarmup/components/DataFlowDiagram.tsx`
- `app/lib/admin/assets/imageOptimizer.ts`
- `app/lib/admin/assets/loadThemeAssets.ts`
- `app/lib/admin/assets/checkAssetUsage.ts` (scenario_ids 배열 사용)
- `app/lib/admin/assets/checkAssetDeletion.ts` (하드 블록)
- `app/lib/admin/assets/replaceAsset.ts` (교체 규칙 명확화)
- `app/lib/admin/assets/loadAssetWithFallback.ts` (에러 복구)
- `app/lib/admin/logic/layoutEngine.ts` (레이아웃 검증)
- `app/lib/admin/scheduler/dragAndDrop.ts`
- `app/lib/admin/scheduler/createSnapshot.ts`
- `app/lib/admin/scheduler/bulkAssign.ts` (배치 처리)
- `app/lib/admin/hooks/useTemplates.ts`
- `app/lib/admin/hooks/useThemeAssets.ts`
- `app/lib/admin/hooks/useRotationSchedule.ts`
- `app/lib/admin/hooks/useOptimisticTemplateUpdate.ts` (낙관적 업데이트)
- `app/lib/admin/monitoring/performanceTracker.ts` (FPS 추적)
- `app/lib/admin/versioning/createVersion.ts` (버전 관리)
- `app/lib/admin/versioning/getVersionHistory.ts` (버전 히스토리)
- `app/lib/admin/assets/loadAssetWithFallback.ts` (에러 복구)
- `app/api/admin/iiwarmup/optimize-image/route.ts` (서버 WebP 변환 API)

### 수정할 파일
- `app/admin/iiwarmup/page.tsx` - 탭 구조, 설명 추가, 하드코딩 로직 삭제
- `app/admin/iiwarmup/generator/page.tsx` - 3개 탭으로 재구성
- `app/components/admin/iiwarmup/ThemeManager.tsx` → `AssetHub.tsx` (리네임 및 리팩토링)
- `app/components/admin/iiwarmup/WeeklyScheduler.tsx` → `GlobalScheduler.tsx` (리네임 및 리팩토링)
- `app/lib/admin/logic/parametricEngine.ts` - Asset Hub 이미지 로딩
- `app/lib/admin/logic/generateScenarioJSON.ts` - 테마 파라미터, layout_sequence 추가
- `app/lib/admin/logic/quickGenerator.ts` - Asset Hub 연동
- `app/lib/admin/logic/handleSaveToDatabase.ts` - 템플릿 저장, scenario_ids 추출, Snapshot 로직
- `app/admin/iiwarmup/generator/components/HybridSimulator.tsx` - 통합 미리보기용으로만 사용
- `app/api/admin/iiwarmup/optimize-image/route.ts` - 서버 WebP 변환 API
- `app/lib/admin/constants/physics.ts` - 모든 상수 통일
  - `ASSET_VARIANTS = ["off", "on"]` 추가 (확장 가능)

### 삭제할 파일/코드
- `app/admin/iiwarmup/page.tsx`의 `handleCreateProgram` 함수
- `app/components/admin/iiwarmup/ThemeManager.tsx`의 Local State 관리 로직
- `app/components/admin/iiwarmup/constants.ts`의 중복 상수 정의
- 다른 파일의 중복 상수 정의 (ACTION_NAMES, TARGET_FREQUENCIES 등)
- "실시간 동기화" 표현 (오해 유발)
- Asset 삭제 시 "확인" 옵션 (하드 블록으로 대체)
- 52번 개별 쿼리 방식 (배치 처리로 대체)

## 🎯 최종 권장사항

### 수용할 것 (그대로 실행)
- ✅ Asset → Creator → Scheduler 흐름
- ✅ Snapshot 무조건 저장
- ✅ 클라 기반 이미지 최적화 + 조건부 서버
- ✅ Asset 삭제 하드 블록 (경고 후 삭제 금지) + Soft delete
- ✅ Think 엔진 transition/validation 포함
- ✅ 재현 가능한 랜덤 (seed 고정)
- ✅ BulkAssign 배치 처리
- ✅ Three.js cleanup
- ✅ 버전 필드 최소 도입 (version, parent_version_id, updated_at)
- ✅ 독립 Simulator (PlaySimulator, ThinkSimulator, FlowSimulator)

### 수정할 것
- ⚠️ Asset 삭제 → Hard block + Soft delete (교체는 허용)
- ⚠️ React Query → 폴링 제거, 수동 refetch만, optimistic update 최소화
- ⚠️ Bulk Assign → 배치 처리 필수
- ⚠️ HybridSimulator → 독립 Simulator 사용 (cleanup 로직 필수)
- ⚠️ DB 스키마 → 완벽하지 않아도 "최소 필드만" 확정하고 출발
- ⚠️ RLS/감사 로그 → 다음 분기로 미루고 필드만 추가 가능한 형태로 설계

### 추가할 것
- ➕ DB 스키마 초안 (최소 필드만, 완벽하지 않아도 됨)
- ➕ Asset Pack 구조 분리 (`scenario_json.assets`)
- ➕ Storage Path 저장 (URL이 아닌 path)
- ➕ Snapshot 강제 저장 (무조건)
- ➕ Soft delete (is_active, deleted_at)
- ➕ 재현 가능한 랜덤 (프로그램 단위 seed 고정, 구간별 offset)
- ➕ Tick Drift 측정 (FPS + Drift 둘 다 검증)
- ➕ scenario_ids 배열 컬럼 (성능 개선)
- ➕ Replace 규칙 명확화 (Template 허용, Published 금지)
- ➕ Replace 시 phases JSON도 업데이트 (scenario_ids만 바꾸면 렌더링 안 됨)
- ➕ week_key UNIQUE 제약 (BulkAssign/드래그앤드롭 중복 방지)
- ➕ Snapshot 메타데이터 (template_id, version, asset_pack_id, seed, generated_at)
- ➕ 입력 포맷 가드 (png/jpg/webp만)
- ➕ 해시 기반 중복 방지 (선택사항)
- ➕ Lock 기능 (Scheduler, 가능하면)
- ➕ 패턴 배치 모드 (Random/균등분배/Sequence/분기별)
- ➕ 버전 필드 최소 도입 (version, parent_version_id, updated_at)
- ➕ owner_id, org_id 필드만 추가 (RLS는 안 함, 다음 분기)
- ➕ 성능 모니터링 (FPS 추적, 12Hz 정밀도 검증)
- ➕ 에러 복구 전략 (Fallback 이미지)
- ➕ 레이아웃 전환 애니메이션 (300ms, ease-in-out)
- ➕ 타임라인 검증 로직 (겹침/누락 체크)
- ➕ Think Studio 확장 (pool, max_active, tempo_ms, rule, seed)
- ➕ 독립 Simulator (PlaySimulator, ThinkSimulator, FlowSimulator)

### 제거할 것
- ❌ "실시간 동기화" 표현 (오해 유발)
- ❌ Asset 삭제 시 "확인" 옵션 (Hard block)
- ❌ 52번 개별 쿼리 (배치 처리 필수)
- ❌ Asset을 `scenario_json.actions[].images`에 묻는 구조
- ❌ Snapshot 옵션 (무조건 저장)
- ❌ HybridSimulator를 탭에서 직접 사용 (독립 Simulator 사용)
- ❌ 15×2 강제 (확장 가능 구조로 변경)
- ❌ 완벽한 DB 스키마 확정 (최소 필드만으로 출발)
- ❌ RLS 정책 구현 (필드만 추가, 다음 분기)
- ❌ 감사 로그 테이블 (다음 분기)
- ❌ scenario_json 내부 type 필드 (DB 컬럼만 사용)
- ❌ 주차별 themeId 복제 (주차 무관한 안정적 ID)
- ❌ 구간마다 seed (프로그램 단위 seed만)
- ❌ JSONB 검색 (scenario_ids 배열 사용)
- ❌ scenario_ids만 업데이트 (phases JSON도 함께 업데이트 필수)
- ❌ week_key 중복 허용 (UNIQUE 제약 필수)
- ❌ Snapshot에 메타데이터 없음 (운영 필수)
