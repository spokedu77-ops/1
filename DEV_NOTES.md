# DEV_NOTES

## 작업 날짜

- 2026-05-19 (SPOMOVE 전면 오류 수정 + 라이브러리 필터 개선: store loadDrills 병합, EngineRouter 폴백, session 가드, LibraryView 필터 count + ProgramSheet 중복 제거)
- 2026-05-19 (전 페이지 감사 — 4건 버그/UX 수정: parent 링크 오류, director 플랜 배너, report 잠금 카드, plan 저장 버튼 비활성화)
- 2026-05-13 (Phase 1 방향 정리 + 깨진 데이터 기반 수정 + 주요 화면 UX 완성)
- 2026-05-14 (코드 현황 재점검 + 세부 UX 개선 + 상용화 완성도 강화 작업)
- 2026-05-14 (모바일 반응형 QA — safe-area, 터치 타겟, 스크롤 전수 점검)
- 2026-05-14 (콘텐츠 통합 — 3레이어 아키텍처 구축: SQL 마이그레이션 + API routes + store 동적 로딩 + Admin 편집 UI)
- 2026-05-15 (SPOMOVE 엔진 통합 — EngineRouter + 세션 페이지 통합 + Admin UI 완성)
- 2026-05-15 (결제 흐름 완성 — Stripe Checkout + 구독 동기화 + 결제 페이지 UX + 썸네일/대시보드 리디자인)
- 2026-05-15 (전환율 강화 — Pro 잠금 CTA 전수 결제 직결 + 온보딩/트라이얼 배너 개선 + 라이브러리 상세 히어로 리디자인)
- 2026-05-16 (전면 디자인 리디자인 — Dashboard 히어로 썸네일 풀블리드 + StatsBand + Payment 플랜 토글 + 사업자 정보 + SpomoveHub 그래디언트 + Library FeaturedRail 강화)
- 2026-05-16 (상용화 완성 — Stripe 고객 포털 + 구독 관리 페이지 + 사업자 정보 실데이터 + 전 페이지 카피 정비)
- 2026-05-16 (UX 마무리 — SEO/robots/sitemap + 온보딩 리턴유저 리다이렉트 + 알림 배지 + SPOMOVE 전체화면 토글 + report aside 스크롤 + plan 반 입력 자유화)
- 2026-05-16 (학생 관리 — store addStudent/removeStudent + students 페이지 추가/삭제 UI)
- 2026-05-16 (결제 PG 교체 — Stripe 전면 제거 → 토스페이먼츠, confirm API 신규, SQL 스키마 교체, 법적 고지 전수 수정)
- 2026-05-17 (전체 감사(audit) + 버그 수정 6건 + director 하드코딩 제거)
- 2026-05-17 (programsLoaded 버그 수정 + static PROGRAMS 제거 + 브랜드 카피 전면 통일 + LibraryDetail 개선 + PlanView 주간 네비게이션 + Pro features 업데이트)
- 2026-05-18 (Dashboard TodayHero 계획 연동 + Report 프로그램 검색 필터 + 온보딩 Pro 카드 features 통일)

---

## 수정한 파일 (2026-05-19 — SPOMOVE 전면 오류 수정 + 라이브러리 개선)

### 원인 분석
- **SPOMOVE 전부 오류**: 인증된 사용자는 `/api/spokedu-master/drills`(200) → core5Catalog 드릴이 static 드릴을 **완전 교체** → 대부분 드릴이 `engine.mode: 'basic'` → `EngineRouter`에 'basic' 핸들러 없음 → `UnknownModeHandler`가 즉시 `onComplete()` 호출 → 0데이터 세션 "완료" 화면 (오류처럼 보임)
- **큰화면 실행 오류**: 하드코딩된 `drill=speed-track` 링크가 교체된 API 드릴에서 못 찾혀 `drills[0]!` 폴백 → 같은 문제
- **태그 동일 문제**: `spokedu_master_program_meta` 테이블 데이터 미입력 → grade/duration/space 모두 기본값('전학년'/20/'실내') → 필터 칩 다수가 0개 결과

### 수정 내용

#### `app/spokedu-master/store/index.ts`
- `loadDrills()`: API 드릴에서 EngineRouter 미지원 모드('basic' 등) 필터링
- `loadDrills()`: static 드릴을 **교체 대신 병합** (static이 base, API가 추가)
- `loadDrills()`: API 401 포함 실패 시 `drillsLoaded: true` 설정 (무한 재시도 방지)

#### `app/spokedu-master/spomove/session/EngineRouter.tsx`
- `UnknownModeHandler`: `onComplete()` 즉시 호출 → `onExit()` 호출로 변경 (SPOMOVE 허브로 안전 복귀)

#### `app/spokedu-master/spomove/session/page.tsx`
- `SUPPORTED_ENGINE_MODES` 상수 추출 (컴포넌트 외부)
- `drill` null 가드: `useEffect`에 null 체크 + redirect, beginRunning 옵셔널 체이닝
- EngineRouter 조건: `drill?.engine && SUPPORTED_ENGINE_MODES.has(drill.engine.mode)` — 지원 모드만 라우팅

#### `app/spokedu-master/library/LibraryView.tsx`
- 필터 칩: 0개 결과 필터 숨기기 (`filterCounts` 계산 후 0이면 미표시)
- 필터 칩: 결과 수 표시 (몇 개 프로그램이 해당되는지)
- `ProgramSheet`: description === coachScript일 때 중복 제거
- `ProgramSheet`: 코치 포인트 잠금 시 blur 처리 + 단계 수 표시

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과
- 한자/깨진 문자 없음

### 남은 DB 작업 (코드 외)
- `spokedu_master_program_meta` 테이블에 각 프로그램별 sm_grade, sm_duration, sm_space, sm_tags 입력 필요
- 입력 전까지는 LibraryView 필터가 동작하는 칩만 표시됨

---

## 수정한 파일 (2026-05-17 — class-record 정적 데이터 의존성 제거)

### 핵심 수정
- `app/spokedu-master/class-record/page.tsx`
  - `import { PROGRAMS } from '../lib/data'` 제거 — 정적 배열(string ID)이 API 숫자 ID와 불일치해서 항상 `PROGRAMS[0]` 폴백으로 떨어지는 버그였음
  - `RecordListView`: `useMasterStore((s) => s.programs)` 추가, 미완료 수업 링크 수정
  - `RecordEntryView`: `useMasterStore((s) => s.programs)` 추가, `program` 조회를 store 기반으로 교체
  - 이제 Class Mode "수업 기록 남기기" → `?program=123` → 올바른 프로그램 정보가 연결됨

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과

---

## 수정한 파일 (2026-05-17 — Class Mode 수업 완료 화면 + 기록 연결)

### 핵심 기능
- `app/spokedu-master/components/ui/ClassModeView.tsx` — 완료 흐름 추가
  - "수업 완료" 버튼 → 타이머 자동 정지 + `done=true`
  - **완료 화면**: CheckCircle 아이콘 + 수업 제목 + 소요 시간(timer > 0일 때) + 완료 단계 수 통계 카드
  - **"수업 기록 남기기"** CTA → `/class-record?program={id}` 로 직결 (기록 입력 페이지)
  - **"나가기"** → `router.back()`
  - 기존 header(X 버튼)는 완료 화면에서도 유지되어 언제든 탈출 가능

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과

---

## 수정한 파일 (2026-05-17 — Class Mode 카드 생성 로직 개선)

### 핵심 수정
- `app/spokedu-master/components/ui/ClassModeView.tsx` — 카드 생성 전면 개선
  - **steps 있음**: 기존과 동일 (steps → coachScript 카드 → fieldTip 카드)
  - **steps 없음**: `description + fieldTips` 를 통일된 step 카드로 프로모트. extraCards 없음. 이전엔 amber/green 팁 카드로 분절됐으나 이제 동일 스타일의 흐름으로 연결됨
  - **버그 수정**: `description === coachScript` (API 구조상 항상 같음) → 코치 포인트 extra 카드가 항상 스킵되던 dead code 제거
  - **텍스트 길이 적응**: 50자 초과 텍스트는 좌정렬 + 소형 폰트(`clamp(1rem,3.2vw,1.3rem)`)로 자동 전환. 이전엔 긴 설명도 초대형 폰트로 렌더링

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과

---

## 수정한 파일 (2026-05-17 — Class Mode 단계별 타이머)

### 핵심 기능
- `app/spokedu-master/components/ui/ClassModeView.tsx` — 단계별 카운트다운 타이머 추가
  - **StepTimerRing**: SVG 원형 진행 호(arc). 잔여 시간 비율에 따라 indigo→amber→red로 색상 전환
  - **preset chips**: `1분 / 3분 / 5분` 탭으로 즉시 시작. 단계 이동 시 자동 초기화
  - **만료 알림**: 종료 시 카드 테두리가 빨간색으로 전환 + "종료" 텍스트 표시
  - 글로벌 수업 타이머(누적 스톱워치)와 단계 타이머(카운트다운) 완전 분리

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과

---

## 수정한 파일 (2026-05-17 — 브랜드 일관성: "수업 도구" 전면 통일)

### 핵심 수정
- `app/spokedu-master/landing/page.tsx` — FEATURES[2] "수업 설명 도구" → "수업 도구" (Timer 아이콘, 타이머·팀·뽑기 설명으로 교체), FLOW step 3 "설명 문구 복사" → "수업 도구 활용", pricing includes 2개 플랜 수정, 히어로 설명문·Final CTA·메타데이터 전부 통일
- `app/spokedu-master/payment/page.tsx` — PLANS.pro includes "수업 설명 도구 전체" → "수업 도구 전체", PLANS.team includes "센터용 설명 도구" → "센터용 수업 도구"
- `app/spokedu-master/onboarding/page.tsx` — step 3 "설명 문구 복사" → "수업 도구 활용", Pro 플랜 설명 "수업 설명 도구 전체" → "수업 도구 전체", 130번째줄 "수업 설명 도구" → "수업 도구" (이전 세션 완료분 포함)

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과
- CJK 문자 검색 결과 없음

---

## 수정한 파일 (2026-05-17 — UX 실행 경험 완성: Persistent Timer + Class Mode)

### 핵심 기능
- **Persistent Timer** — `classTimerMs / classTimerRunning / classTimerStartedAt` + 3개 액션을 Zustand store에 추가 (미persist). StopwatchTab 로컬 state → store 기반으로 교체. 탭 이동해도 타이머 유지.
- **FloatingTimerPill** — `AppShell.tsx`에 추가. 타이머 켜진 상태에서 어떤 탭이든 TabBar 위에 `MM:SS` floating pill 표시. 탭 → class-tools 이동. × → 타이머 리셋.
- **Class Mode** — `/spokedu-master/class-mode/[id]` 신규 라우트. AppShell이 session과 동일하게 크롬 완전 숨김. 풀스크린 수업 실행 UI: 타이머 strip + 단계 dot indicator + 스텝 카드(큰 글씨) + 이전/다음 네비게이션. 코치 포인트·현장 팁을 마지막 단계 이후 amber/green 카드로 추가 표시. SPOMOVE 연결 버튼 상단 우측.

### CTA 전면 통일 — "수업 시작" 프라이머리 원칙
- `DashboardView.tsx` TodayHero: "수업안 보기" → "수업 시작" (class-mode 직결)
- `LibraryView.tsx` ProgramSheet: "SPOMOVE 실행" → "수업 시작" (primary) + "큰 화면" / "수업안 전체" 보조 2열
- `LibraryDetailView.tsx`: "수업 시작" 풀폭 primary + 보조 3버튼 (큰 화면 실행 / 영상 보기 또는 설명 문구 / 문구 복사)

### 수정 파일 목록
- `app/spokedu-master/store/index.ts` — timer state + actions + `useClassTimerState` export
- `app/spokedu-master/components/ui/ClassToolsView.tsx` — StopwatchTab store 기반 교체
- `app/spokedu-master/components/layout/AppShell.tsx` — FloatingTimerPill + isSession 확장 (class-mode 포함) + useState 추가
- `app/spokedu-master/components/ui/ClassModeView.tsx` — **신규** 수업 모드 뷰
- `app/spokedu-master/class-mode/[id]/page.tsx` — **신규** class-mode 라우트
- `app/spokedu-master/dashboard/DashboardView.tsx` — TodayHero CTA 교체
- `app/spokedu-master/library/LibraryView.tsx` — ProgramSheet CTA 교체
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx` — CTA 재편

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과
- CJK 문자 검색 결과 없음

---

## 수정한 파일 (2026-05-17 — 수업 도구 통합 + 구독 전환율 강화)

### 핵심 수정
- `app/spokedu-master/store/index.ts` — `useIsPro` 수정: 체험 기간(plan='free', trialEndsAt > now) 중에도 true 반환. 기존엔 체험 중 Pro 콘텐츠가 잠겨 구독 전환 동기가 없었음.
- `app/api/spokedu-master/programs/route.ts` — 서버 side `isPaidActive` 게이팅 제거 → 인증된 사용자에게 `lessonDetail` 항상 반환. UI 잠금은 클라이언트 `isPro + isTrialExpired`가 담당.

### 신규 파일
- `app/spokedu-master/class-tools/page.tsx` — 수업 도구 페이지 (TrialGateWall feature="class-tools" 적용)
- `app/spokedu-master/components/ui/ClassToolsView.tsx` — 5개 탭 수업 도구 (스톱워치 / 점수판 / 학생 뽑기 / 팀 나누기 / 순서 정하기). spokedu-pro AssistantToolsView 이식, useMasterStore students 사용.

### 기존 파일 수정
- `app/spokedu-master/components/layout/TabBar.tsx` — '설명 도구(FileText, report)' → '수업 도구(Timer, class-tools)' 탭 교체
- `app/spokedu-master/dashboard/DashboardView.tsx` — QUICK_ACTIONS '설명 도구' → '수업 도구' (Timer 아이콘, `/spokedu-master/class-tools`, 캡션 '타이머·팀·뽑기')
- `app/spokedu-master/components/ui/TrialGateWall.tsx` — `class-tools` feature 버킷 추가 (Timer, Users 아이콘), 타입에 `'class-tools'` 추가, 만료 문구 보강

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과
- CJK 문자 검색 결과 없음

---

## 수정한 파일 (2026-05-18 — Dashboard 계획 연동 + Report 검색 + 온보딩)

### 핵심 수정
- `app/spokedu-master/dashboard/DashboardView.tsx` — TodayHero에 plan 연동 추가
  - 오늘 Plan에 미완료 수업이 있으면 Hero가 해당 프로그램 표시 + 배지 "3학년 A반 · 3교시" 형태로 변경
  - Plan이 없거나 매칭 프로그램을 못 찾으면 기존 dayOfYear 알고리즘 폴백
  - `Lesson` 타입 import 추가

- `app/spokedu-master/report/page.tsx` — aside 프로그램 선택에 검색 필터 추가
  - `programSearch` state + `filteredPrograms` 계산
  - 검색 input (이름·태그 대조) + 결과 없음 상태 처리
  - 기존 선택 프로그램 이름 표시 p 태그 → 검색 input으로 교체

- `app/spokedu-master/onboarding/page.tsx` — 마지막 단계 Pro 카드 features 통일
  - '전체 라이브러리 · SPOMOVE 무제한 · 수업 도구 전체' → '· 설명 문구' 추가

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과

---

## 수정한 파일 (2026-05-18 — 화면 간 연결 강화 + report URL param)

### 핵심 수정

- `app/spokedu-master/report/page.tsx` — `useSearchParams`로 `?program=` URL 파라미터 지원
  - `ReportContent` 분리 + `Suspense` 래핑
  - URL에서 `programId` 읽어 초기 선택 프로그램으로 사용
  - 기존 최근 기록 기반 폴백 유지

- `app/spokedu-master/class-record/page.tsx`
  - `todayLesson = lessons[0]` → `isSameDay` 기반 오늘 날짜 필터링 (오래된 수업이 기본값 되던 버그 수정)
  - Play 버튼 `/spomove/session?mode=class` → `/class-mode/${program.id}` (수업 시작 플로우 통일)
  - `RecordCard` "설명 문구에서 보기" 링크에 `?program=${record.programId}` 전달

- `app/spokedu-master/dashboard/DashboardView.tsx` — `TodayPlan` 개선
  - 각 수업 카드에 "수업 시작" Play 버튼 추가 (program 매칭 → class-mode, 미매칭 → class-record)
  - `programs` prop 추가로 프로그램 매칭 지원

- `app/spokedu-master/plan/PlanView.tsx` — `LessonItem` CTA 재편
  - 2버튼(수업안/기록 시작) → 3버튼(수업안 / 수업 시작class-mode primary / 기록ClipboardList)
  - 플로우: 계획 → 수업 시작 → class-mode 완료 → 수업 기록으로 자연 연결

- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
  - "설명 문구" 링크에 `?program=${program.id}` 전달 (report 페이지 자동 선택)

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과
- CJK 문자 검색 결과 없음

---

## 수정한 파일 (2026-05-18 — 전 페이지 점검 + 플로우 마무리)

### 핵심 수정

- `app/spokedu-master/spomove/session/page.tsx` — class 모드 완료 후 수업 기록 연결
  - `ClipboardList` 아이콘 import 추가
  - `searchParams.get('program')` 파싱 추가 (ClassModeView가 `?program=ID`로 이미 넘기고 있었음)
  - done 화면 버튼 그리드: class 모드 + programId 있을 때 2열 → 3열로 확장
  - "수업 기록" 버튼 추가 → `/class-record?program=${programId}` 직결
  - mobile·projector 모드는 기존 2열 유지 (변경 없음)

- `app/spokedu-master/class-record/page.tsx` — 저장 후 다음 단계 링크 추가
  - "기록만 저장" 후 성공 메시지를 p 태그 → div + 내부 링크 2개 구조로 교체
  - "기록 목록 보기" → `/class-record` (기록 목록으로 복귀)
  - "설명 문구 보기" → `/report?program=${program.id}` (해당 프로그램 설명 문구 바로 이동)

### 전 페이지 점검 결과 (변경 없음)
다음 파일은 점검 완료, 추가 수정 불필요:
- `spomove/session/EngineRouter.tsx` — solid
- `students/page.tsx` — solid
- `components/ui/ClassModeView.tsx` — solid (이전 세션에서 완성)
- `payment/page.tsx`, `payment/success/page.tsx`, `payment/cancel/page.tsx` — solid
- `shop/page.tsx` — solid
- `onboarding/page.tsx` — solid
- `subscription/page.tsx` — solid (이전 세션에서 브랜드 수정 완료)
- `parent/[studentId]/page.tsx` — solid (이전 세션에서 에러 메시지 개선)

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과 (spokedu-master 내부 에러 없음)
- `npx eslint app/spokedu-master --max-warnings 0` 통과
- CJK 문자 검색 결과 없음

---

## 수정한 파일 (2026-05-19 — 전 페이지 감사: 4건 수정)

### 핵심 수정

- `app/spokedu-master/parent/[studentId]/page.tsx` — footer 링크 버그 수정
  - `/spokedu-master/dashboard` → `/spokedu-master/landing`
  - 이유: 부모에게 공유된 링크에서 footer를 누르면 인증 필요한 dashboard로 이동해 에러 발생

- `app/spokedu-master/director/page.tsx` — Center 플랜 배너 조건부 분기
  - `profile?.plan === 'team'`이면 기존 "사용 중" 배너
  - 그 외 플랜(pro/free)이면 "Center 플랜으로 전환하기" 업그레이드 CTA
  - 이유: 이전에는 plan과 무관하게 항상 "센터 플랜 사용 중" 표시 → 오해 소지

- `app/spokedu-master/report/page.tsx` — 잠금 audience 카드 클릭 영역 확대
  - 오버레이 `<div>` → `<Link href="/payment?plan=pro">` 로 교체
  - 이유: 이전에는 작은 "PRO" 배지만 클릭 가능. 카드 전체 영역이 결제 링크여야 전환율이 높음

- `app/spokedu-master/plan/PlanView.tsx` — AddLessonSheet 저장 버튼 비활성화
  - `disabled={!classId.trim() || !program}` + `disabled:opacity-50` 추가
  - 이유: classId 미입력 시 저장 버튼을 눌러도 아무 반응 없어 UX 혼란

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과
- CJK 문자 검색 결과 없음

---

## 수정한 파일 (2026-05-17 — programsLoaded 버그 + static PROGRAMS 제거 + 개선)

### 버그 수정
- `app/spokedu-master/store/index.ts` — `loadPrograms`: API 실패·빈 응답 시 `programsLoaded: true` 미설정 버그 수정. 모든 분기 끝에 폴백 추가 → Dashboard/Library 영구 스켈레톤 현상 해결
- `app/spokedu-master/dashboard/DashboardView.tsx` — `programsLoaded` guard 추가 (mounted && programsLoaded가 모두 true여야 DashboardSkeleton 해제)
- `app/spokedu-master/library/LibraryView.tsx` — `programsLoaded` guard 추가 (동일)
- `app/spokedu-master/parent/[studentId]/page.tsx` — `ShieldCheck` → `ShieldAlert` (에러 화면에 성공 아이콘 쓰던 semantic 버그)

### static PROGRAMS 의존성 제거
- `app/spokedu-master/plan/PlanView.tsx` — `import { PROGRAMS } from '../lib/data'` 제거. programs를 `useMasterStore` 에서 읽어 `LessonItem`, `AddLessonSheet`에 전달. `getProgramForLesson`에 programs 파라미터 추가
- `app/spokedu-master/shop/page.tsx` — 동일하게 static import 제거 → store programs 기반으로 교체

### 브랜드 카피 전면 통일 (8개 파일)
- "수업 설명 도구" / "설명 도구" → "설명 문구" (report 페이지 용어) 또는 "수업 도구" (class-tools 용어)로 전면 통일
- 수정 파일: `dashboard/DashboardView.tsx`, `profile/page.tsx`, `report/page.tsx`, `spomove/SpomoveHubView.tsx`, `class-record/page.tsx`, `layout.tsx`, `terms/page.tsx`, `components/ui/ClassToolsView.tsx`

### LibraryDetailView 개선 (5가지)
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
  - 수업 횟수 배지 추가: "N회 수업함 · 마지막 M월 d일" (classRecords 기반)
  - 태그 chips 표시 추가
  - steps/variations/safetyNotes/relatedSpomoveIds — 빈 배열일 때 섹션 자체 숨김 (API 프로그램은 이 필드가 비어 있는 경우 많음)

### class-record 개선
- `app/spokedu-master/class-record/page.tsx` — 하드코딩 '초등 A반' → `students[0]?.group ?? '수업'` 교체. 프로그램 tags에서 스킬 목록 자동 추출 (2개 이상 tag 있으면 사용, 없으면 DEFAULT_SKILLS 폴백)

### PlanView 주간 네비게이션
- `app/spokedu-master/plan/PlanView.tsx` — `weekOffset` state 추가. `addWeeks` 기반 동적 weekStart. 이전/다음 주 ChevronLeft/ChevronRight 버튼 + "이번 주로" 리셋 링크

### Pro 플랜 features 업데이트
- `app/spokedu-master/payment/page.tsx` — Pro includes: '즐겨찾기와 최근 사용 기록' → '설명 문구 (학부모·기관·학교용)'
- `app/spokedu-master/landing/page.tsx` — 동일
- `app/spokedu-master/profile/page.tsx` — Pro includes에 '설명 문구' 추가 (3→4개)

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과
- CJK 문자 검색 결과 없음

---

## 수정한 파일 (2026-05-17 — 전체 감사 및 버그 수정)

### 버그 수정
- `app/spokedu-master/store/index.ts` — `resetProfile` 액션 추가 (logout 시 name/school 등 잔류 데이터 문제 해결)
- `app/spokedu-master/profile/page.tsx` — `handleLogout`에서 `setProfile({ plan:'free' })` → `resetProfile()` 교체; 체험 만료 시 색상+텍스트 수정 (0일 남음 → 빨간색 "체험 종료")
- `app/spokedu-master/dashboard/DashboardView.tsx` — TodayPlan 섹션 신규 추가 (오늘 날짜 수업 계획 카드); PlanChip "Trial 0일" → "체험 종료"로 수정
- `app/spokedu-master/report/page.tsx` — `recentProgramId` 배열 인덱스 버그: `classRecords[classRecords.length - 1]` (가장 오래된) → `classRecords[0]` (가장 최근)
- `app/spokedu-master/payment/page.tsx` — 이미 구독 중인 사용자가 `/payment` 접근 시 관리 페이지로 안내하는 guard UI 추가
- `app/spokedu-master/payment/cancel/page.tsx` — Suspense 래퍼 누락 수정; `orderId` 파라미터(`spm-{plan}-{ts}`)에서 플랜 추출해 올바른 재시도 링크 제공

### 하드코딩 데이터 제거
- `app/spokedu-master/director/page.tsx` — `recordRate` 하드코딩(82/68) → 실제 `records.length / lessons.length` 비율로 교체; 강사 목록 (김선생/이코치/박강사) → 실제 사용자 이름 1행 + "초대 대기 중" 플레이스홀더 2행으로 교체; `myName` 변수 추가 (`profile?.name ?? '나'`)

### 확인 완료 (수정 불필요)
- `api/spokedu-master/og/route.tsx` — 이미 구현됨 (Noto Sans KR 폰트 + 한국어 헤드라인)
- `spomove/session/page.tsx`, `library/[id]/LibraryDetailView.tsx`, `class-record/page.tsx`, `students/page.tsx`, `shop/page.tsx`, `onboarding/page.tsx`, `parent/[studentId]/page.tsx`, `SpomoveHubView.tsx`, `LibraryView.tsx`, `AppShell.tsx`, `PlanView.tsx`, `TrialGateWall.tsx` 전체 감사 완료 — 이상 없음

### 검증 결과
- `npx tsc --noEmit --pretty false` 통과
- `npx eslint app/spokedu-master --max-warnings 0` 통과
- CJK 문자 검색 결과 없음

---

## 수정한 파일 (2026-05-16 — UX 마무리)

### 신규 파일
- `public/robots.txt` — 크롤러 규칙: 앱 내부 차단, landing 허용, sitemap 경로 선언
- `app/sitemap.ts` — Next.js 사이트맵 (landing URL만 포함, NEXT_PUBLIC_SITE_URL 기반)

### 기존 파일 수정
- `app/spokedu-master/landing/page.tsx` — "로그인" 링크를 `/onboarding` → `/dashboard`로 변경 (AppShell이 온보딩 미완료자를 자동 리다이렉트)
- `app/spokedu-master/onboarding/page.tsx` — `useEffect` 추가: `profile.onboardingDone === true`이면 `/dashboard`로 즉시 리다이렉트 (리턴 유저 온보딩 반복 방지)
- `app/spokedu-master/components/layout/StatusBar.tsx` — Bell 버튼에 `useUnreadCount` 연결 + 미읽음 배지(빨간 점) 추가 + 링크를 profile → dashboard로 변경
- `app/spokedu-master/spomove/session/page.tsx` — `isFullscreen` 상태 추가 + `fullscreenchange` 이벤트 구독 → 전체화면 버튼 아이콘 `Maximize`/`Minimize` 실시간 전환
- `app/spokedu-master/report/page.tsx` — aside 프로그램 목록에 `max-h-[340px] overflow-y-auto scrollbar-hide` 적용 + 현재 선택 프로그램 이름 고정 표시
- `app/spokedu-master/plan/PlanView.tsx` — 반 선택 고정 칩('3학년 A반' 등) → 자유 입력 텍스트 필드로 교체 + 빈 값 저장 방지

---

## 수정한 파일 (2026-05-16 — 상용화 완성)

### 신규 파일
- `app/api/spokedu-master/payment/portal/route.ts` — **신규** Stripe Customer Portal 세션 생성 API (POST). `stripe_customer_id` 조회 → `stripe.billingPortal.sessions.create` → URL 반환. 401/404/503 오류 처리 포함.
- `app/spokedu-master/subscription/page.tsx` — **신규** 구독 관리 페이지 (`/spokedu-master/subscription`). 활성 구독: "결제 수단 변경" + "구독 취소" 버튼 → Stripe 포털 리디렉트. 미구독: "플랜 시작하기" CTA. 청약철회·환불 고지, 사업자 정보, 법적 링크 포함.

### 기존 파일 수정
- `app/spokedu-master/profile/page.tsx` — "플랜과 도입 방식" → "구독 관리" (href: /subscription), 플랜 카드 설명 문구 개선, Lite 안내 문구 개선, 배지 '시작 검증' → '무료 체험', "운영 확장 프리뷰" → "운영 확장", ExpansionLink 프리뷰 표시 제거
- `app/spokedu-master/report/page.tsx` — 헤더 설명 문구 개선 (수업 흐름 중심), aside 카드 카피 개선 (복사 버튼 중심)
- `app/spokedu-master/store/index.ts` — 기본 알림 n2 body 카피 개선
- `app/spokedu-master/class-record/page.tsx` — 헤더 설명 "첫 상용 버전..." 문구 제거, 공유 섹션 "자동 발송..." 문구 제거
- `app/spokedu-master/director/page.tsx` — 헤더 "센터 확장 기능..." 문구 제거, Center 플랜 카드 설명 개선, 기록 링크 "프리뷰" 제거
- `app/spokedu-master/students/page.tsx` — 헤더 설명 개선, 빈 상태 "프리뷰" 표현 제거

### 사업자 정보 — 실데이터 반영 (3개 파일)
- `app/spokedu-master/payment/page.tsx`
- `app/spokedu-master/subscription/page.tsx`
- `app/spokedu-master/landing/page.tsx`

실제 사업자 정보:
- 상호: 스포케듀
- 대표자: 최지훈
- 사업자등록번호: 311-63-00356
- 통신판매업신고: 신청 중 (번호 발급 후 교체 필요)
- 주소: 서울특별시 강동구 성내동 430-2, 7층 2호

### 남은 작업
- 통신판매업신고번호 발급 후 위 3개 파일 "신청 중" → 실제 번호로 교체
  - `app/spokedu-master/payment/page.tsx`
  - `app/spokedu-master/subscription/page.tsx`
  - `app/spokedu-master/landing/page.tsx`

---

## 수정한 파일 (2026-05-16 — 디자인 리디자인)

- `app/spokedu-master/dashboard/DashboardView.tsx` — TodayHero 풀블리드 썸네일 지원 + min-h-224 + StatsBand(3종 통계) 신규 + PlanChip 유료 플랜 그래디언트 배지 + QuickActions 아이콘 커짐(20px) + DrillTile 3단계 그래디언트 + 더 짙은 그림자
- `app/spokedu-master/library/LibraryView.tsx` — FeaturedRail minHeight 180→250 + boxShadow 강화 + 설명 문구 제거 → 등급/시간/공간 부제목으로 교체 + 제목 30px/44px로 커짐
- `app/spokedu-master/spomove/SpomoveHubView.tsx` — DrillCard 3단계 그래디언트 + flex justify-between 레이아웃 + rounded-[16px] + boxShadow 추가
- `app/spokedu-master/payment/page.tsx` — 세션 프리체크(이미 로그인 시 OTP 스킵) + PlanToggle 컴포넌트(Pro/Center 카드 선택) + 사업자 정보 섹션(전자상거래법 필수 기재) + Trust 배너 + h-13 버그 수정
- `app/spokedu-master/profile/page.tsx` — Sparkles 개발 노트 footer 텍스트 제거 + 미사용 Sparkles 아이콘 import 제거
- `app/spokedu-master/onboarding/page.tsx` — Pro 시작하기 버튼 h-10(40px) → h-11(44px) 터치 타겟 수정

---

## 수정한 파일 (2026-05-15 — 결제 흐름)

- `app/spokedu-master/payment/page.tsx` — import 경로 수정 (`@/app/lib/supabase/browser`)
- `app/spokedu-master/payment/success/page.tsx` — **신규** 결제 성공 확인 페이지, syncSubscription 호출
- `app/spokedu-master/payment/cancel/page.tsx` — **신규** 결제 취소 페이지, 재시도 CTA
- `app/spokedu-master/store/index.ts` — `syncSubscription()` 추가: `/api/spokedu-master/subscription` 호출 후 plan 동기화
- `app/spokedu-master/components/layout/AppShell.tsx` — payment 경로 chrome 제외 + syncSubscription 마운트 호출
- `app/spokedu-master/profile/page.tsx` — Pro/Center 플랜 선택 시 `router.push('/spokedu-master/payment?plan=...')` 리다이렉트

### 결제 흐름 요약 (토스페이먼츠)

1. 사용자가 프로필의 "플랜 선택" 바텀시트에서 Pro 또는 Center를 선택
2. `/spokedu-master/payment?plan=pro` (또는 `team`)으로 이동
3. 이메일 OTP 인증 (Supabase magic link)
4. 인증 완료 후 "카드로 결제" → `/api/spokedu-master/payment/create-checkout` POST → `orderId` 반환
5. 프론트에서 `window.TossPayments(clientKey).requestPayment('카드', { orderId, ... })` 호출
6. 토스 결제 완료 → `/spokedu-master/payment/success?paymentKey=...&orderId=...&amount=...`로 리다이렉트
7. 성공 페이지에서 `/api/spokedu-master/payment/confirm` POST → 토스 API 검증 + Supabase upsert
8. `syncSubscription()` 호출 → Zustand profile.plan 업데이트

### 적용 전 필요 작업

#### 1. .env.local 키 추가 (프로젝트 루트)
```
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...   # 토스페이먼츠 대시보드 > 내 상점 > 클라이언트 키
TOSS_SECRET_KEY=test_sk_...               # 토스페이먼츠 대시보드 > 내 상점 > 시크릿 키
```
테스트 키로 먼저 검증 후 실서비스 키로 교체.
successUrl/failUrl은 `payment/page.tsx` 클라이언트에서 `window.location.origin`으로 자동 구성되므로 별도 환경변수 불필요.

#### 2. Supabase SQL 적용
```
Supabase 대시보드 → SQL Editor → New query
→ sql/71_spokedu_master_subscriptions.sql 내용 붙여넣기 → Run
```

#### 3. 토스페이먼츠 대시보드 설정
- 결제창 > 가맹점 도메인: 실제 배포 도메인 등록
- successUrl 허용: `{배포도메인}/spokedu-master/payment/success`
- failUrl 허용: `{배포도메인}/spokedu-master/payment/cancel`

---

## 수정한 파일 (2026-05-13)

- `app/spokedu-master/lib/data.ts`
- `app/spokedu-master/store/index.ts`
- `app/spokedu-master/shop/page.tsx`
- `app/spokedu-master/components/ui/BottomSheet.tsx`
- `app/spokedu-master/components/layout/AppShell.tsx`
- `app/spokedu-master/components/layout/StatusBar.tsx`
- `app/spokedu-master/components/layout/TabBar.tsx`
- `app/spokedu-master/components/operations/OperationsPanel.tsx`
- `app/spokedu-master/onboarding/page.tsx`
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/spomove/SpomoveHubView.tsx`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/spokedu-master/report/page.tsx`
- `app/spokedu-master/profile/page.tsx`
- `app/spokedu-master/students/page.tsx`
- `app/spokedu-master/class-record/page.tsx`
- `app/spokedu-master/director/page.tsx`
- `app/spokedu-master/parent/[studentId]/page.tsx`

## 수정한 파일 (2026-05-14)

### 세부 UX 개선 (1차)
- `app/spokedu-master/dashboard/DashboardView.tsx` — 시간대별 인사말, 빈 상태 처리, 스켈레톤
- `app/spokedu-master/report/page.tsx` — 최근 사용 프로그램 자동 연결, Pro 잠금 표시
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx` — 연결 SPOMOVE 드릴 이름 표시
- `app/spokedu-master/spomove/SpomoveHubView.tsx` — 빈 통계 상태 메시지
- `app/spokedu-master/profile/page.tsx` — School 플랜 상담 안내 문구
- `app/spokedu-master/components/layout/AppShell.tsx` — TrialCountdownBanner, ErrorBoundary 통합

### 상용화 완성도 강화 (2차)
- `app/spokedu-master/components/ui/TrialGateWall.tsx` — **신규** 트라이얼 만료 게이트 + 카운트다운 배너
- `app/spokedu-master/components/ui/ErrorBoundary.tsx` — **신규** 에러 바운더리
- `app/spokedu-master/components/ui/Skeleton.tsx` — **신규** 스켈레톤 컴포넌트 (DashboardSkeleton, LibrarySkeleton)
- `app/spokedu-master/library/page.tsx` — TrialGateWall 적용
- `app/spokedu-master/library/LibraryView.tsx` — 스켈레톤 + scrollbar-hide
- `app/spokedu-master/spomove/page.tsx` — TrialGateWall 적용
- `app/spokedu-master/spomove/session/page.tsx` — 트라이얼 만료/PRO 드릴 접근 차단
- `app/spokedu-master/onboarding/page.tsx` — 마지막 스텝 강화 + 완료 시 라이브러리로 이동
- `app/globals.css` — spmSkeleton 애니메이션 추가
- `CLAUDE.md` — **신규** 프로젝트 규칙 (커밋/푸시 금지 포함)

---

## 해결한 문제 (2026-05-13)

- 작업 기준을 `SPOKEDU MASTER`로 고정했다.
  - 기존 대화에서 `subscription-new`, `spokedu-pro`와 혼선이 있었으나, 현재 작업 대상은 `app/spokedu-master`만이다.
  - `subscription-new`와 기존 `spokedu-pro`는 장점만 참고하고, 실제 구현/수정은 MASTER에 반영한다.

- Phase 1 제품 방향을 정리했다.
  - Phase 1은 거대한 운영/관리 플랫폼이 아니라 `라이브러리 + SPOMOVE + 수업 설명 도구 + 최근 사용/즐겨찾기 + 안심형 플랜 화면` 중심이다.
  - 수업 기록, 원생/반, 카카오 발송, 학부모 웹뷰, 원장 대시보드, 학교 관리자 기능은 Phase 2/3 성격으로 본다.
  - 홈은 관리자 대시보드가 아니라 수업 시작점이어야 한다.

- 깨진 한글 데이터의 주요 원천을 정리했다.
  - `lib/data.ts`의 프로그램, SPOMOVE 드릴, 수업 상세 샘플 문구를 정상 한글로 다시 작성했다.
  - `store/index.ts`의 기본 프로필, 기본 수업, 기본 학생, 기본 알림 문구를 정상 한글로 정리했다.
  - 기존 localStorage에 깨진 데이터가 남아 있을 수 있어 `persist` version을 8로 올리고 migration에서 깨진 데이터가 감지되면 기본값으로 교체하도록 했다.

- 교구 스토어의 의미를 명확히 했다.
  - `shop/page.tsx`를 학생/기록 저장소처럼 보이지 않게, 프로그램 라이브러리와 연결되는 교구 구매 흐름으로 재구성했다.
  - `store`라는 표현이 학생 데이터 저장소와 헷갈리지 않도록 화면 카피는 `교구 스토어`, `장바구니`, `주문 요청` 중심으로 정리했다.
  - 실제 결제 완료가 아니라 견적/배송 확인 전 단계의 `주문 요청`으로 표현했다.

- 공통 바텀시트 접근성 라벨의 깨진 문구를 수정했다.
  - `BottomSheet`의 닫기 버튼 aria-label을 정상 한글 `닫기`로 수정했다.

- 공통 상단/온보딩을 Phase 1 구독 플랫폼 관점으로 정리했다.
  - 상단 상태바의 `SPOKEDU MASTER / 운영 콘솔` 느낌을 `SPOKEDU PRO / 수업 준비와 SPOMOVE 실행 구독 플랫폼`으로 바꿨다.
  - 공통 배너에서 카카오, PDF, 수업 기록 재처리 같은 Phase 2/3 기능 언급을 제거했다.
  - 온보딩 첫 문장을 `수업 준비는 쉽게, 수업은 더 몰입감 있게`로 맞췄다.
  - 온보딩의 첫 경험을 `라이브러리 / SPOMOVE / 설명 도구` 중심으로 정리했다.
  - `원장 대시보드`, `학생 이력`, `카카오 공유`처럼 초기 사용자에게 관리앱으로 보일 수 있는 문구는 낮췄다.

- 홈 화면의 Phase 1 흐름을 강화했다.
  - 기존 홈에서 Hero CTA와 Quick Actions가 사실상 같은 기능을 반복하고 있어 중복을 줄였다.
  - `오늘 수업 루프` 섹션을 추가해 `고르기(라이브러리) -> 움직이기(SPOMOVE) -> 설명하기(수업 설명 도구)` 흐름이 바로 보이게 했다.
  - 홈은 관리자 지표가 아니라 구독자가 오늘 수업을 시작하는 첫 화면이라는 원칙을 유지한다.

- 라이브러리 UX를 수업 선택 화면에 가깝게 다듬었다.
  - 필터 순서를 `전체 / 유아 / 초등 / SPOMOVE / 간편 준비 / 좁은 공간 / 협동 / 민첩성`으로 정리했다.
  - `유아`, `협동`, `간편 준비` 필터가 실제 샘플 데이터와 맞게 작동하도록 로직을 고쳤다.
  - `오늘 바로 쓸 수업`, `큰 화면과 연결`, `준비물까지 연결` 선택 가이드를 추가했다.
  - 즐겨찾기한 수업이 있으면 라이브러리 상단에 별도 레일로 노출한다.
  - 검색/필터 결과가 없을 때 전체 보기로 되돌아갈 수 있게 했다.

- SPOMOVE를 독립 차별화 엔진처럼 보이도록 정리했다.
  - 허브에 `수업 전 3분 집중 전환`, `16:9 큰 화면 활동`, `라이브러리와 연결` 사용 맥락을 추가했다.
  - Projector/Class Mode 실행 중에는 하단 측정 카드와 반응시간 배지를 숨기고, 얇은 진행선만 남겨 학생용 큰 화면에 가깝게 만들었다.
  - 모바일 모드는 기존처럼 개인 반응 측정 지표를 보여준다.
  - 실행 완료 문구를 모드별로 분리해 `세션 완료`, `큰 화면 실행 완료`, `수업 실행 완료`로 다르게 보이게 했다.

- 수업 설명 도구를 Phase 1 결과물답게 확장했다.
  - 단일 문구 복사 화면에서 대상별 템플릿 세트 화면으로 바꿨다.
  - 대상은 `학부모용`, `기관용`, `학교 기록용`, `홍보용`이다.
  - 각 대상별로 기본 문구, 짧은 문구, 상담/운영/기록용 문구를 분리해 복사할 수 있게 했다.
  - 카카오 자동 발송, PDF 리포트, 학기말 리포트는 계속 Phase 2/3로 남겨두고 Phase 1에서는 복사 가능한 문구를 실제 결과물로 둔다.

- 내 정보/플랜 화면을 결제 확정형보다 도입 방식 안내에 가깝게 정리했다.
  - 플랜 카드에 대상 사용자를 추가했다.
  - `플랜과 결제` 표현을 `플랜과 도입 방식`으로 바꿔 실제 결제 연동 전 상태와 맞췄다.
  - Lite는 가격 테스트/관심 등록 성격으로 표현하고, School은 상담 문의 성격으로 표현했다.
  - Trial/Pro/Center의 CTA 문구를 각각 `체험 유지`, `Pro 적용`, `Center 적용`처럼 더 명확히 했다.

- Phase 2/3 성격의 화면은 보존하되 과장 문구를 낮췄다.
  - `students`, `class-record`, `director` 라우트는 삭제하거나 막지 않는다.
  - 학생 이력, 수업 기록, 센터 대시보드는 장기 락인에 중요한 기능이므로 구현 흐름은 유지한다.
  - 다만 첫 상용 버전에서 `카카오 무제한`, `PDF 일괄 생성`, `자동 이탈 감지`처럼 확정 제공으로 보이는 문구는 제거했다.
  - 카카오/자동 리포트/센터 상세 운영은 준비 중 또는 이후 검증 대상으로 표현한다.
  - 원칙: 중요한 기능은 보존하고, 메인 탭과 판매 메시지에서는 Phase 1 가치가 흐려지지 않게 노출을 조절한다.

- `보존 + 과장 제거` 기준을 추가로 정리했다.
  - `class-record`의 사용자 노출 문구에서 `카카오 요약`, `발송 완료`, `리포트에서 보기`를 `보호자 안내`, `공유 준비`, `설명 도구에서 보기`로 낮췄다.
  - 내부 서비스/타입 이름은 아직 `kakao`가 남아 있을 수 있지만, 고객 화면에서는 외부 자동 발송이 이미 완성된 것처럼 보이지 않게 했다.
  - `parent` 공유 화면의 `성장 리포트 자동 반영` 문구를 제거하고, `안내 자료와 성장 기록을 구체화하는 데 활용`으로 바꿨다.
  - 운영 패널의 재시도 항목도 `카카오 요약` 대신 `보호자 안내 공유`로 표시한다.
  - 화면에 직접 보이는 `Phase 1` 표현을 `첫 상용 버전`으로 바꿔 문서/개발 용어 느낌을 낮췄다.

- 확장 기능 진입 구조를 정리했다.
  - `내 정보` 화면에 `운영 확장 프리뷰` 섹션을 추가했다.
  - `수업 기록`, `학생 이력`, `센터 운영`, `교구 스토어`로 이동할 수 있게 했다.
  - 메인 탭은 계속 `홈 / 라이브러리 / SPOMOVE / 설명 / 내 정보`로 유지한다.
  - 판단 기준: 장기 락인 기능은 삭제하지 않되, 첫 화면에서는 구독 서비스의 즉시 가치가 흐려지지 않게 낮은 우선순위로 배치한다.

- 검증을 완료했다.
  - `npx.cmd tsc --noEmit --pretty false` 통과
  - `npx.cmd eslint app/spokedu-master --max-warnings 0` 통과
  - `rg "[\x{4E00}-\x{9FFF}\x{F900}-\x{FAFF}\x{FFFD}]" app\spokedu-master -n` 결과 없음
  - `rg "[ㅏ-ㅣㄱ-ㅎ]{2,}|\?[^\s\n<>{}()]*[가-힣ㅏ-ㅣㄱ-ㅎ]|[가-힣ㅏ-ㅣㄱ-ㅎ][^\s\n<>{}()]*\?" app\spokedu-master -n` 결과 없음

---

## 해결한 문제 (2026-05-14)

- 코드 기준으로 현재 상태를 재점검했다.
  - DEV_NOTES 다음 작업 순서 7단계 중 1~6번은 모두 코드로 구현 완료 상태다.
  - 7번 반응형 QA는 아직 미완성이다.

- 완성도 높은 기능 목록:
  - 탭 구조: 홈/라이브러리/SPOMOVE/설명/내 정보 5탭 (TabBar + DesktopRail)
  - 홈(DashboardView): Hero + 오늘 수업 루프 + 오늘 추천 수업 + 최근/즐겨찾기 + SPOMOVE 빠른 실행 + 수업 설명 도구 진입
  - 라이브러리(LibraryView): 검색, 필터 칩, 포스터 레일 (즐겨찾기/SPOMOVE연결/18분이내), 전체 프로그램 목록
  - 라이브러리 상세(LibraryDetailView): 준비물+장바구니, 코치 스크립트, 보호자 설명 문구, 현장 팁, 변형 수업, 안전 체크, 연결 SPOMOVE
  - SPOMOVE 허브(SpomoveHubView): 3가지 사용 맥락 카드, 3가지 LaunchCard, 훈련 모드 그리드, 최근 실행 기록
  - SPOMOVE 세션(spomove/session/page.tsx): 모드별 UI 분리 (projector/class/mobile), 완료 문구 모드별 분리
  - 수업 설명 도구(report/page.tsx): 4가지 대상별 템플릿 + 복사 기능
  - 내 정보(profile/page.tsx): 5가지 플랜 선택 + 확장 기능 진입점

- 세부 UX 개선 항목을 처리했다.
  - DashboardView: `좋은 아침이에요` 고정 인사를 시간대별(아침/오후/저녁)로 바꿨다.
  - ReportPage: 페이지 진입 시 classRecords에서 최근 사용한 프로그램을 초기값으로 불러오도록 했다.
  - LibraryDetailView: 연결 SPOMOVE 칩에 drill ID 문자열 대신 실제 드릴 이름(DRILLS 조회)을 표시했다.
  - SpomoveHubView: 통계가 모두 0일 때 "아직 기록이 없습니다" 안내를 추가했다.
  - ProfilePage: School 플랜 "상담 문의" 클릭 시 이메일 안내 문구를 표시하도록 했다.

---

## 해결한 문제 (2026-05-14 2차)

- 트라이얼 만료 게이트를 실제로 구현했다.
  - `TrialGateWall` 컴포넌트: 라이브러리/SPOMOVE 진입 시 트라이얼 만료면 업그레이드 CTA 화면으로 대체
  - `TrialCountdownBanner`: 잔여 5일 이하일 때 상단에 카운트다운 배너 표시 (2일 이하는 빨간색)
  - SPOMOVE 세션: 트라이얼 만료 또는 PRO 드릴 비구독 접근 시 허브로 리다이렉트
  - 수업 설명 도구: 트라이얼 만료/비Pro일 때 학부모용 외 대상에 PRO 잠금 오버레이

- 에러 바운더리를 구현했다.
  - `ErrorBoundary` 클래스 컴포넌트: AppShell main 영역 전체를 감쌈
  - 크래시 발생 시 "다시 시도" + "홈으로" 버튼으로 복구 가능

- 로딩/스켈레톤 상태를 구현했다.
  - `DashboardSkeleton`, `LibrarySkeleton`: hydration 전 깜빡임 방지
  - Dashboard와 Library 첫 렌더링에 스켈레톤 표시 후 마운트 완료 시 실제 UI 전환

- 빈 상태 처리를 강화했다.
  - Dashboard "최근 사용과 즐겨찾기": 첫 방문자에게 라이브러리로 유도하는 빈 상태 카드
  - SPOMOVE Hub 통계: 세션이 없을 때 "아직 기록 없음" 안내

- 온보딩 → 첫 수업 흐름을 강화했다.
  - 온보딩 4번째 스텝(완료)을 3단계 수업 루프 설명 + 14일 체험 안내로 교체
  - 완료 시 대시보드가 아닌 라이브러리로 바로 이동 (핵심 가치 첫 경험)

- 수평 스크롤 레일에 `scrollbar-hide` 적용 (라이브러리 필터 칩, 포스터 레일)

---

## 해결한 문제 (2026-05-14 3차 — 모바일 반응형 QA)

- **TabBar iOS 홈 바 대응** (가장 중요)
  - `viewport-fit=cover`가 루트 레이아웃에 설정되어 있음에도 TabBar에 safe-area-inset-bottom이 없어 iPhone 홈 바 영역과 겹치는 문제를 수정했다.
  - `nav` 요소에 `style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}` 적용.
  - 기존 `py-2 sm:pb-4` → `pt-2` + inline style로 변경.

- **터치 타겟 크기 일괄 교정 (44px 기준)**
  - `StatusBar` 프로필/알림 버튼: `h-9 w-9` (36px) → `h-11 w-11` (44px)
  - `DashboardView` 알림 버튼: `h-[38px] w-[38px]` → `h-11 w-11` (44px)
  - `BottomSheet` 닫기 버튼: `h-9 w-9` → `h-11 w-11` (44px)
  - `ReportPage` 복사 버튼: `h-9` → `h-11` (44px)
  - `LibraryView` PosterCard 즐겨찾기 버튼: `h-8 w-8` (32px) → `h-10 w-10` (40px)
  - `SpomoveSession` 전체화면/나가기 버튼: `h-9 w-9` → `h-11 w-11` (44px)

- **BottomSheet 모바일 safe-area 패딩 추가**
  - 바텀시트가 모바일 화면 하단에 표시될 때 iOS 홈 바에 콘텐츠가 가려지지 않도록 `paddingBottom: 'max(20px, env(safe-area-inset-bottom))'` 적용.

- **SPOMOVE 세션 bottom 오버레이 safe-area 대응**
  - 실행 중 하단 지표 오버레이의 `pb-7` (28px) → `paddingBottom: 'max(28px, env(safe-area-inset-bottom))'` 로 변경.
  - iOS 홈 바(~34px)가 지표를 가리는 문제 해결.

- 검증: `npx tsc --noEmit` 통과 (pre-existing deprecation 경고만 존재, 실제 에러 없음)

---

## 남은 문제

- 아직 전체 MASTER 화면이 상용화 수준으로 100% 완성된 것은 아니다.
- **현재 솔직한 완성도: 결제/콘텐츠 제외 약 45-50%** (이전 28% 대비 개선)

- **반응형 QA 코드 수정 완료 — 실기기 검증 필요.**
  - safe-area-inset-bottom, 터치 타겟, BottomSheet safe-area, 세션 오버레이 safe-area 코드 수정 완료.
  - 실제 iOS 기기(iPhone 14/15 등)에서 홈 바 영역과 겹침이 없는지 직접 확인 필요.
  - 320px(iPhone SE) 너비에서의 카드/텍스트 줄바꿈은 코드상 문제 없으나, 실기기 확인 권장.

- **실제 결제/신청 흐름이 없다.**
  - Pro/Center 플랜 선택은 setProfile만 하고 실제 결제 연동이 없다.
  - Lite는 "관심 등록" 상태로만 두고 있다.
  - School은 이메일 안내 문구만 있다.
  - Phase 1 상용화 전에 최소한 외부 결제 링크(토스페이먼츠, 아임포트 등)나 신청 폼(구글 폼, 타입폼 등)을 연결해야 한다.

- **샘플 데이터는 실제 운영 데이터가 아니다.**
  - `lib/data.ts`의 프로그램과 교구는 제품 방향을 보여주기 위한 샘플이다.
  - 실제 상용화 전에는 프로그램 품질, 태그, 연령, 공간, 준비물, 안전 문구, SPOMOVE 연결을 더 촘촘히 검수해야 한다.

- **교구 스토어는 아직 견적 요청 UI 수준이다.**
  - 실제 주문, 결제, 배송, 재고, 관리자 처리 로직은 없다.
  - Phase 1에서는 구독 제품의 보조 수익/준비물 연결 정도로만 두는 편이 안전하다.

- **`class-record`, `students`, `director`, `parent` 같은 Phase 2/3 성격의 화면은 코드에 남아 있다.**
  - 당장 삭제하기보다는 MASTER 안에서 노출 우선순위를 낮추고, Phase 1 네비게이션에서는 전면 노출하지 않는 방향이 맞다.
  - 나중에 제품 정책이 확정되면 `숨김`, `실험실`, `Phase 2`, `삭제` 중 하나로 정리해야 한다.
  - 단, 장기 락인에 필요한 기능은 섣불리 지우지 않는다.

- **SPOMOVE 세션 전체화면 API 동작 미확인.**
  - F키 힌트는 있으나 실제 `document.documentElement.requestFullscreen()` 구현이 세션 페이지에 있는지 확인 필요.

- **수업 설명 도구 - 프로그램 목록이 많아지면 aside 스크롤 처리 필요.**
  - 현재는 PROGRAMS가 적어서 문제없지만, 프로그램이 30개 이상이 되면 aside 패널이 길어진다.

---

## 해결한 문제 (2026-05-14 4차 — 콘텐츠 통합 3레이어 아키텍처)

- **SQL 마이그레이션** (`sql/70_spokedu_master_meta.sql`)
  - `spokedu_master_program_meta`: curriculum.id 기반 오버레이 (tags, theme, grade, space, duration, isPro, isNew, isHot, displayOrder, colors)
  - `spokedu_master_drill_meta`: Core5Catalog programId 기반 오버레이 (displayName, tags, isPro, isVisible, displayOrder, engineMode, engineLevel)
  - 두 테이블 모두 RLS + updated_at 자동 갱신 트리거
  - **Supabase SQL Editor에서 실행 필요** (`sql/70_spokedu_master_meta.sql` 참고)

- **types/index.ts 확장**
  - `Drill` 인터페이스: `engine?: { mode: string; level: number }` 추가
  - `Program` 인터페이스: `curriculumId?: number`, `lessonDetail.videoUrl?: string` 추가
  - `SmProgramMeta`, `SmDrillMeta` 인터페이스 신규 추가

- **API Routes 신규 생성**
  - `app/api/spokedu-master/programs/route.ts`: curriculum + spokedu_master_program_meta 오버레이 → Program[] 반환
  - `app/api/spokedu-master/drills/route.ts`: spokedu_master_drill_meta + Core5Catalog → Drill[] 반환
  - 두 routes 모두 PATCH 엔드포인트로 메타 upsert 지원

- **Zustand store 동적 로딩**
  - `programs: Program[]`, `drills: Drill[]` 상태 추가 (초기값: static lib/data.ts 데이터)
  - `loadPrograms()`, `loadDrills()` 액션 추가 (각 1회만 로드, API 실패 시 static fallback 유지)
  - AppShell mount 시 자동 트리거

- **UI 컴포넌트 업데이트**
  - `LibraryView`: static PROGRAMS → store `programs` 사용
  - `LibraryDetailView`: store `programs`/`drills` 사용, `videoUrl` 있으면 "영상 보기" 링크 표시
  - `SpomoveHubView`: store `drills` 사용
  - `spomove/session/page.tsx`: store `drills` 사용

- **Admin 편집 UI 신규 생성**
  - `app/admin/spokedu-master/page.tsx`: 진입점 (프로그램 메타 / 드릴 메타 링크)
  - `app/admin/spokedu-master/programs/page.tsx`: curriculum 목록 + 슬라이드오버 편집 (태그, 테마, 대상, 공간, PRO/NEW/HOT, 순서)
  - `app/admin/spokedu-master/drills/page.tsx`: Core5Catalog 시리즈별 드릴 목록 + 슬라이드오버 편집 (이름 오버라이드, 태그, PRO, 가시성, 엔진 연결)

---

## 다음 작업 순서

1. ~~**실제 기기 반응형 QA** (완료 2026-05-14)~~
   - safe-area-inset-bottom, 터치 타겟 44px, BottomSheet safe-area, 세션 오버레이 safe-area 모두 처리됨
   - 실제 기기(iPhone, 안드로이드) 최종 확인은 빌드/배포 후 QA 단계에서 진행

2. ~~**콘텐츠 통합 3레이어** (완료 2026-05-14)~~
   - SQL 마이그레이션, API routes, store 동적 로딩, Admin 편집 UI 모두 완료
   - **Supabase에서 sql/70_spokedu_master_meta.sql 실행 필요** (아직 미실행 상태)

3. ~~**SPOMOVE 엔진 통합** (완료 2026-05-15)~~
   - `EngineRouter.tsx`: mode/level → VisualReactionTraining/DiagonalReactionTraining/MemoryGame 동적 dispatch
   - 세션 페이지: drill.engine 있으면 EngineRouter, 없으면 기존 큐 UI
   - 엔진 컴포넌트들은 admin 의존성 없음 확인 (SignalDisplay만 admin 의존, MemoryGameApp에서만 사용)

4. **결제/신청 흐름 최소 연결**
   - Pro/Center: 외부 결제 페이지 링크 또는 신청 폼 연결
   - Lite: 관심 등록 폼 또는 이메일 수집 연결
   - School: 상담 문의 이메일/채널 연결

3. **SPOMOVE 세션 전체화면 버튼 구현 확인**
   - F키 전체화면 동작 실제 코드 확인
   - 전체화면 진입/해제 버튼을 Maximize/Minimize 아이콘으로 세션 화면에 배치

4. **수업 설명 도구 - aside 프로그램 목록 개선**
   - 프로그램이 많아질 때를 대비해 aside를 max-height + overflow-y-auto로 처리
   - 현재 활동(program) 이름을 상단에 고정 표시

5. **실제 운영 데이터로 교체**
   - 샘플 프로그램을 실제 검수된 콘텐츠로 교체
   - SPOMOVE 드릴 이름과 설명도 실제 운영 기준으로 정비

6. **최종 TypeScript/ESLint 검증**
   - `npx tsc --noEmit --pretty false`
   - `npx eslint app/spokedu-master --max-warnings 0`
   - 깨진 한글 재검증

---

## 주의할 점

- **커밋이나 푸시를 절대 하지 않는다.**
  - 코드 수정만 진행한다.
  - git commit, git push 명령을 실행하지 않는다.

- 반드시 `app/spokedu-master`를 기준으로 작업한다.
  - `subscription-new`에 새로 구현하지 말 것.
  - 기존 `spokedu-pro`를 직접 확장하지 말 것.
  - 참고할 장점만 MASTER에 흡수한다.

- 문서를 정답처럼 그대로 구현하지 않는다.
  - 사용자는 공동대표/제품 파트너 관점의 판단을 원한다.
  - 해외 레퍼런스와 문서는 방향성 재료다.
  - 제품 성공에 필요한 장점만 골라 반영하고, 과한 기능은 뒤로 미룬다.

- Phase 1에서 제품이 강사용 기록 앱처럼만 보이면 안 된다.
  - 핵심은 넷플릭스식 `아동청소년 체육 프로그램 라이브러리 기반 구독 서비스`다.
  - SPOMOVE는 라이브러리 안의 작은 카테고리가 아니라 독립 차별화 엔진이어야 한다.
  - 기록/리포트/부모/센터 기능은 장기 락인 요소지만, 지금 전면에 과하게 올리면 제품 신뢰를 깎을 수 있다.

- `store`라는 단어를 조심한다.
  - 화면에서 `store`는 교구 판매/장바구니 의미다.
  - 학생 데이터 저장소나 Zustand store와 헷갈리게 만들지 않는다.

- 한글 깨짐을 다시 만들지 않는다.
  - 파일 인코딩과 복붙 문자열을 조심한다.
  - 수정 후 아래 검색을 꼭 돌린다.
  - `rg "[\x{4E00}-\x{9FFF}\x{F900}-\x{FAFF}\x{FFFD}]" app/spokedu-master -n`
  - `rg "[ㅏ-ㅣㄱ-ㅎ]{2,}|\?[^\s\n<>{}()]*[가-힣ㅏ-ㅣㄱ-ㅎ]|[가-힣ㅏ-ㅣㄱ-ㅎ][^\s\n<>{}()]*\?" app/spokedu-master -n`

- 검증 명령은 계속 유지한다.
  - `npx tsc --noEmit --pretty false`
  - `npx eslint app/spokedu-master --max-warnings 0`

- 현재 작업트리에 다른 변경이 있을 수 있다.
  - 사용자가 만든 변경을 되돌리지 말 것.
  - 불필요한 대규모 리팩토링보다 MASTER 상용화 흐름에 직접 필요한 수정부터 한다.

- 대화 기록이 사라져도 이 파일을 기준으로 이어받을 수 있도록 항상 DEV_NOTES를 최신 상태로 유지한다.

---

## 수업관리 안전 변경 체크리스트 (admin/classes-v2, teachers-classes)

- 변경 전 범위 고정
  - 기능 추가/리팩터링이 아니라, 문구/미사용 코드/경로 정합성 같은 저위험 변경인지 먼저 확인
  - `useClassManagement`, postpone/undo, group_id/round_* 계산 로직은 요청 없으면 수정 금지

- 변경 중 확인
  - destructive 액션(연기/취소/회차 삭제)은 확인 문구가 대상/영향(정산, 숨김 여부)을 설명하는지 점검
  - 상태 판정(`opened`/`finished`/`verified`)은 기존 규칙을 재사용하고, 화면별 로직을 새로 분기하지 않기
  - 공용 유틸의 export를 줄일 때는 `rg`로 외부 사용처 0건 확인 후 내부화

- 변경 후 검증
  - 변경 파일 기준 `ReadLints`로 신규 진단 유입 여부 확인
  - 삭제/내부화한 심볼은 `rg`로 잔여 참조 없는지 확인
  - 문서 경로 수정 시 실제 파일 경로와 일치하는지 재확인
