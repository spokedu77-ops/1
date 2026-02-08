---
name: ""
overview: ""
todos: []
isProject: false
---

# Coach App 전반 개선 계획 (보완판)

## 사용자 질문에 대한 핵심 답변

### 1. 영향력이 큰 수정은 기능/동작에 영향 없이 어떻게 할 것인가?

**안전 적용 원칙**

- **한 번에 넓은 범위 건드리지 않음**: 페이지/라우트 단위로 적용 후 동작 확인
- **롤백 가능한 방식**: DB 스키마 변경은 마이그레이션 SQL을 분리하고, 되돌리기 스크립트 준비
- **기존 동작 유지 우선**: 새 FK/테이블 추가 → 앱 전환 → 기존 제거 순서로 진행

**영향력 큰 수정별 전략**


| 수정 항목                 | 기존 동작 유지 전략                                                                               | 적용 순서                              |
| --------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| session_count_logs FK | ① `teacher_id` nullable 또는 별도 컬럼 추가 ② `public.users(id)` 참조 새 FK ③ 앱에서 새 FK 사용 ④ 기존 FK 제거 | 단계적 마이그레이션                         |
| Admin auth 캐시         | Layout의 checkAdmin 유지, 성공 시 context에 캐시 → 하위 페이지는 context 먼저 확인                           | 앱 추가, 기존 로직 fallback               |
| SSR 전환                | Server Component에서 fetch, 클라이언트에서는 hydration만. 실패 시 기존 클라이언트 fetch fallback               | 페이지별 점진 전환                         |
| PWA 세션 통일             | `getSupabaseBrowserClient()`로 한 페이지씩 교체 후 로그인·데이터 로드 수동 확인                                | class/create → report → iiwarmup 순 |


### 2. 개선안 전부 제안했는가? → **아니오. 누락된 항목이 많습니다.**

이전 계획에 없던 항목을 아래 "추가 누락 개선안"에 정리했습니다.

### 3. 실제 사용 시 오류/에러를 최소화할 수 있는가?

**이 계획만으로는 불충분합니다.** 에러 최소화를 위해 아래 "오류 최소화 방안" 섹션의 추가 작업이 필요합니다.

---

## 추가 누락 개선안 (기존 계획에 없던 것들)

### A. 품질·빌드 기반


| 항목                           | 현황                                                      | 개선                                       |
| ---------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| TypeScript ignoreBuildErrors | [next.config.ts](next.config.ts) `true` → 빌드 시 타입 에러 무시 | 점진적으로 해제, 에러 수정 후 false                  |
| ESLint ignoreDuringBuilds    | 빌드 시 린트 스킵                                              | 빌드에 린트 포함하여 배포 전 검증                      |
| 테스트                          | 테스트 파일 0개                                               | 핵심 플로우(로그인, 수업 등록, 카운팅) E2E 또는 유닛 테스트 도입 |


### B. PWA·세션 (docs/PWA_및_전체_개선_보고서.md)


| 항목                 | 영향                        | 개선                                                                               |
| ------------------ | ------------------------- | -------------------------------------------------------------------------------- |
| Supabase 클라이언트 혼용  | PWA에서 데이터 안 나옴            | 쿠키 기반 `getSupabaseBrowserClient()`로 class/create, report, iiwarmup, lib/admin 통일 |
| Storage exists API | 서버에서 anon만 사용, RLS로 실패 가능 | service role 또는 인증된 세션 사용 검토                                                     |


### C. ESLint·코드 품질


| 항목                  | 위치                                                         | 위험                          |
| ------------------- | ---------------------------------------------------------- | --------------------------- |
| set-state-in-effect | inventory, page.tsx, teacher/curriculum, teacher/inventory | 연쇄 렌더·버벅거림                  |
| .single() 에러 미처리    | report/[id], admin/page memos, 여러 actions                  | PGRST116 등 시 null 반환·크래시 가능 |
| alert() 일관 사용       | 전역                                                         | Toast 컴포넌트 있으나 미사용, UX 불일치  |


### D. 에러 핸들링·사용자 피드백


| 항목                | 현황                                                                              | 개선                     |
| ----------------- | ------------------------------------------------------------------------------- | ---------------------- |
| fetch 실패 시 사용자 안내 | report, teacher/report 등 error만 console                                         | "다시 시도" 버튼 + 에러 메시지 표시 |
| .single() 결과      | error 체크 없이 data만 사용하는 곳 다수                                                     | error 분기 + fallback UI |
| notice delete     | [app/admin/notice/page.tsx](app/admin/notice/page.tsx) 101행: error 시 사용자 피드백 없음 | 실패 시 alert/toast       |


### E. 방어 코드·유효성 검사


| 항목                  | 참고 문서                                                                  | 개선                           |
| ------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| handleUpdate 날짜 파싱  | [docs/admin_classes_오류분석_및_수업로그.md](docs/admin_classes_오류분석_및_수업로그.md) | Invalid Date 시 저장 차단 + alert |
| handleCloneGroup 날짜 | 동일                                                                     | getTime() NaN 체크             |
| autoFinishSessions  | 동일                                                                     | teacherId 빈 문자열/null 스킵      |


---

## 오류 최소화 방안 (실제 사용 시)

### 1. 즉시 적용 가능 (리스크 낮음)

- **Error Boundary**: `app/admin`, `app/teacher` 등 레이아웃에 Error Boundary 추가 → 예기치 못한 크래시 시 "오류가 발생했습니다" + 새로고침 유도
- **.single() / .maybeSingle() 보강**: error 시 분기, fallback UI 또는 재시도
- **alert → Toast 통일**: `useToast` 훅 도입, 성공/실패 메시지를 Toast로 표시

### 2. 중기 (점진 적용)

- **유효성 검사 유틸**: 날짜·UUID·필수 필드 검증 함수 공통화
- **fetch 래퍼**: `supabase.from().select()` 호출 시 error 로깅 + 사용자 노출 옵션
- **로딩/에러 상태 일관화**: 각 페이지에 loading, error 상태 + "다시 시도" 버튼

### 3. 장기 (인프라)

- **에러 모니터링**: Sentry 등으로 프로덕션 에러 수집
- **E2E 테스트**: 로그인 → 대시보드 → 수업 등록 등 핵심 플로우 자동화
- **타입·린트 단계적 강화**: ignoreBuildErrors/ignoreDuringBuilds 해제 후 에러 해소

---

## 수정된 전체 우선순위

### Phase 0: 오류 최소화 (먼저)

1. Error Boundary 추가 (admin, teacher layout)
2. .single() 등 호출부 error 분기 보강 (핵심 페이지만)
3. notice delete 등 "실패 시 사용자 피드백 없음" 수정

### Phase 1: 즉시 적용 (기능 변경 없음)

1. 공통공지 + Common Task 표시
2. 대시보드 PC 레이아웃
3. 휴가 날짜 포맷 개선
4. set-state-in-effect eslint-disable (동작 유지)
5. console.log NODE_ENV 감싸기

### Phase 2: DB·스키마 (신중)

1. session_count_logs FK 변경 (단계적 마이그레이션)
2. session_count 중복 방지

### Phase 3: 성능·품질

1. Admin auth 캐시
2. SSR 전환 (대시보드·센터·일정)
3. FullCalendar dynamic import
4. PWA 세션 통일 (페이지별)

### Phase 4: 기반 강화

1. TypeScript/ESLint 빌드 포함
2. 테스트 도입
3. Toast 통일, 에러 모니터링 검토

---

## 결론

- **영향력 큰 수정**: 페이지/라우트 단위 적용, 롤백 가능한 마이그레이션, 기존 동작 유지 우선.
- **개선안**: 이전 계획에 PWA 세션, ESLint, .single() 처리, Error Boundary, 테스트 부재 등이 누락되어 있었음. 보완 반영.
- **오류 최소화**: 계획만으로는 부족. Error Boundary, 에러 분기, Toast 통일, 모니터링 등 추가 작업이 필요함.

**권장 순서**: Phase 0(오류 최소화) → Phase 1(즉시 적용) → 이후 Phase 2~4를 단계별로 진행.