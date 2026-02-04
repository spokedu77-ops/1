# I.I.Warm-up Scheduler 모듈화 및 48주 고도화 — 보강 반영

이 문서는 기존 Scheduler 모듈화 계획에 **8가지 추가 요구(실제 버그 방지·UX·성능·일관성)** 를 반영한 보강 사항입니다. 구현 시 아래 항목을 **필수**로 적용합니다.

---

## 1) week_key 정규식/검증 (실제 버그 방지) — 필수

### 요구

- **parseWeekKey**에서 주차는 **1~4만** 유효. 그 외는 무조건 null.
- 구현 선택지:
  - 정규식을 **W([1-4])** 로 변경 (권장), 또는
  - 기존 **W(\d)** 유지하되, 파싱 후 **week가 1~4가 아니면 null 반환** (스펙 “필수”로 고정).

### DoD

- **2026-01-W9** 같은 입력이 들어오면 **무조건 null** 처리.
- 유효한 week_key는 YYYY-MM-W1 ~ YYYY-MM-W4 만 허용.

### 적용 위치

- [dragAndDrop.ts](app/lib/admin/scheduler/dragAndDrop.ts) (또는 공용 week_key 유틸): `parseWeekKey` 수정.  
- `parseWeekKey`를 사용하는 모든 호출처에서 null 반환 시 잘못된 주차로 간주하고 처리(표시 제외/에러 처리 등).

---

## 2) Light 쿼리의 .in() 길이 리스크 (Supabase 제한/성능)

### 배경

- Light 쿼리가 **48개 week_key**를 `.in('week_key', weekKeys)` 로 전달.  
- Supabase/Postgres는 대부분 문제 없으나, 쿼리 플랜/URL 길이/캐시 효율에서 불안 요소 가능.

### 요구 (권장)

- **rotation_schedule에 year 컬럼이 없는 경우:**
  - **옵션 A:** `week_key like 'YYYY-%'` + **client-side**에서 월/주(1~12, 1~4)로 48개만 필터.  
    → DB는 해당 연도 행만 가져오고, 48슬롯 매칭은 클라이언트에서.
  - **옵션 B:** DB 스키마 변경 가능 시 — **rotation_schedule.year (int)** 추가 (generated 또는 저장 시 함께 기록).  
    → `where year = ?` 로 연도 필터 후 48개만 사용.
- **스키마 변경 불가 시:**  
  - 현 `.in('week_key', weekKeys)` 유지하되, **“48개 고정”**임을 주석으로 명시 (향후 리팩터 시 참고).

### Cursor 지시 (선택지)

- **DB 스키마 변경 가능:** rotation_schedule.year 추가 후 `where year = ?` 사용 (최선).
- **스키마 변경 불가:** 현 .in() 유지 + 주석: “48 slots fixed; week_keys for selected year only”.

---

## 3) Detail 로딩 트리거 정의 (UX/성능의 기준점) — 강제

### 요구

- **“클릭/편집 시”** 를 다음처럼 **명확히** 정의:
  - **ScheduleSlotCard 클릭 시:**  
    → 상세 패널/모달 오픈 → **그때만** `useRotationScheduleDetail(week_key, enabled: true)` 호출.
  - **토글(Publish/Lock) 시:**  
    → **기본 경로는 Light 데이터만 사용. Detail fetch 금지.**  
    → 단, “Snapshot 유지/생성”이 필요할 때만:  
      **slot에 snapshot이 없을 때만** detail fetch 시도 → 그래도 없으면 **createSnapshot**으로 새로 생성 후 저장.

### DoD

- **토글만 누르면 detail fetch가 발생하지 않음** (기본 경로).
- **상세보기 UI를 열 때만** detail fetch 발생.

### 적용

- SchedulerContainer(또는 상세 패널 소유 컴포넌트):  
  - “상세 패널 열림” 상태 = 해당 week_key에 대해 detail 쿼리 enabled.  
  - 토글 핸들러: slot.programSnapshot 있으면 그대로 사용; 없을 때만 detail fetch 또는 createSnapshot 호출.

---

## 4) createSnapshot 시나리오 ID 정책 (삭제 차단이 실제로 먹히게) — 강제

### 요구

- **checkAssetDeletion**이 “어떤 테이블/필드”를 보고 사용 중인지 **명확히** 하고, **둘 다** 커버:
  - **rotation_schedule.asset_pack_id** — 항상 저장 시 채움.
  - **program_snapshot.scenario_ids** — asset_pack_id(및 필요 시 think pack id) **항상 포함**.

### 구현

- **저장 경로:**  
  - rotation_schedule upsert 시 **asset_pack_id** 필드 반드시 설정.  
  - createSnapshot 반환값의 **scenario_ids** 에 **asset_pack_id** (및 think_asset_pack id 사용 시 해당 id) 포함.
- **checkAssetDeletion(assetId) 조회:**
  - **rotation_schedule:**  
    - (A) `program_snapshot.scenario_ids` 배열에 assetId 포함 여부, 또는  
    - (B) `asset_pack_id = assetId`  
    - **둘 중 하나라도 만족하면 “사용 중”** 으로 판단하여 삭제 차단.
  - 기존 warmup_programs_composite.scenario_ids 등도 유지.

### DoD

- **published인 주차가 하나라도 해당 asset_pack을 쓰면**, Asset Hub에서 그 asset_pack 삭제 시도 시 **반드시 차단** (rotation_schedule.asset_pack_id 또는 snapshot.scenario_ids 중 어느 경로로든 감지).

### 적용 위치

- [checkAssetUsage.ts](app/lib/admin/assets/checkAssetUsage.ts) (또는 checkAssetDeletion에서 사용하는 조회): rotation_schedule에서 **asset_pack_id** 컬럼 및 **program_snapshot.scenario_ids** 둘 다 검사.
- [createSnapshot.ts](app/lib/admin/scheduler/createSnapshot.ts): snapshot.scenario_ids에 asset_pack_id(및 think pack id) 포함 보장.
- save mutation: rotation_schedule 저장 시 asset_pack_id 항상 전달.

---

## 5) 드롭 배정 시 “템플릿 → DraftTemplate 변환”의 단일 소스화 — 필수

### 요구

- GlobalScheduler 등에 흩어져 있던 **“템플릿(program row) 로드 후 DraftTemplate 구성”** 로직이  
  **드롭 / 벌크배정 / 스냅샷** 등 여러 곳에서 중복되지 않도록 **한 곳**으로 통합.

### 구현

- **buildDraftTemplateFromProgram(programRow, asset_pack_id): DraftTemplate**  
  - 유틸 함수로 분리 (예: `app/lib/admin/scheduler/buildDraftTemplate.ts` 또는 기존 scheduler 폴더 내).
  - 인자: warmup_programs_composite 행(또는 동일 구조 객체), asset_pack_id.
  - 반환: DraftTemplate (play/think/flow 등 phases 구성).
- **사용처:**
  - 드롭 배정: 템플릿 로드 후 `buildDraftTemplateFromProgram` → createSnapshot(week_key, draft, asset_pack_id).
  - 벌크배정: 동일.
  - 스냅샷 생성이 템플릿에서 Draft를 만드는 경로가 있으면 동일 함수 사용.

### DoD

- **DraftTemplate 생성 로직이 1곳에만 존재.**  
- 드롭/벌크배정/스냅샷 모두 이 함수를 사용.

---

## 6) Optimistic 충돌 처리 (동시 업데이트/탭 이동) — 강제

### 요구

- Optimistic + React Query 사용 시 **레이스/덮어쓰기** 방지:
  - **mutation payload에 week_key를 항상 포함.**
  - **onMutate에서 patch 시 “해당 week_key만” 정확히 교체** (전체 배열을 새로 만들더라도, **map으로 해당 week_key 슬롯만 업데이트**).
  - **onSettled 시 invalidate:**
    - `invalidateQueries(['rotation-schedule','light', year])`
    - `invalidateQueries(['rotation-schedule','detail', week_key])` — **해당 주만** (다른 week_key의 detail은 건드리지 않음).

### DoD

- **빠르게 연속 드롭/토글해도 다른 슬롯이 덮어써지지 않음.**  
- Optimistic patch는 “해당 week_key에 해당하는 슬롯”만 갱신.

### 적용

- useSaveSchedule / useDeleteSchedule (또는 래퍼 mutation):  
  - onMutate에서 getQueryData로 light 캐시 읽은 뒤, **week_key 기준으로 해당 항목만** 교체한 새 배열로 setQueryData.  
  - onSettled에서 detail은 **해당 week_key**만 invalidate.

---

## 7) 다크 UI 혼재 제거 범위 확정 — 강제

### 요구

- Scheduler 관련 **신규/이동 컴포넌트는 전부** 다크 테마로 통일.
- **적용 범위:** `app/components/admin/iiwarmup/scheduler/` 디렉터리 내 모든 컴포넌트.
- **규칙:**
  - **bg-slate-900** 기준 (배경).
  - 카드/패널: **bg-slate-800** 등 slate 계열.
  - **gray-* 클래스 사용 금지** (스케줄러 폴더 내부):  
    - `bg-white`, `text-gray-*`, `bg-gray-*`, `border-gray-*` 등 **0건**.

### DoD

- **scheduler/** 디렉터리 내에서  
  `bg-white`, `text-gray-*`, `bg-gray-*` 검색 시 **0건**.

### 적용

- SchedulerContainer, TemplateSidebar, QuarterlyGrid, ScheduleSlotCard, AssetPackPickerModal, ConfirmModal, BulkAssignWizard(이동 시) — 모두 slate-900/slate-800 기준, gray-* 미사용.

---

## 8) AssetPackPicker UX 디테일 (Cursor가 놓치기 쉬운 것) — 필수

### 요구

- **window.prompt 완전 제거** 후, **마우스만으로** 배정 가능한 모달:
  - **검색 입력** + **리스트 필터** (입력 시 목록 실시간 필터).
  - **“선택 후 적용”** 버튼 (선택만 하고 적용은 버튼으로 명시).
  - **“최근 선택”** 을 상단에 고정 표시 (선택값 유지로 반복 드롭이 빨라짐).

### DoD

- **prompt 없이** 마우스만으로 배정 가능.  
- 선택값 유지로 **반복 드롭이 빨라짐** (최근 선택 상단 노출).

### 적용

- AssetPackPickerModal (또는 동일 역할 컴포넌트):
  - 상단: 최근 선택한 asset_pack_id 1~3개 (또는 N개) 버튼/칩으로 표시, 클릭 시 해당 id 선택.
  - 검색 input + 하단 리스트 필터.
  - 리스트에서 항목 선택 후 **“선택 후 적용”** 버튼 클릭 시 선택 확정 + onApply(asset_pack_id) 콜백.

---

## 요약 체크리스트 (구현 시 확인)

| # | 항목 | DoD 요약 |
|---|------|----------|
| 1 | week_key 검증 | 2026-01-W9 → null, W1~W4만 유효 |
| 2 | Light 쿼리 | like 'YYYY-%' 또는 year 컬럼 권장; 불가 시 .in() + 48 고정 주석 |
| 3 | Detail 트리거 | 토글만 → detail fetch 없음; 상세 패널 열 때만 detail fetch |
| 4 | scenario_ids + asset_pack_id | rotation_schedule.asset_pack_id + snapshot.scenario_ids 둘 다 채우고, checkAssetDeletion이 둘 다 검사 |
| 5 | DraftTemplate 단일 소스 | buildDraftTemplateFromProgram 한 곳, 드롭/벌크/스냅샷 공용 |
| 6 | Optimistic | payload에 week_key, patch는 해당 week_key만, onSettled는 해당 detail만 invalidate |
| 7 | 다크 UI | scheduler/ 내 bg-white, gray-* 0건 |
| 8 | AssetPackPicker | 검색+필터, “선택 후 적용” 버튼, 최근 선택 상단 고정 |

이 보강 사항은 기존 “Scheduler 모듈화 및 48주 고도화” 계획과 함께 구현 시 **필수**로 적용합니다.
