# 스포키듀 구독 — 수정 이력

배포·검증 시 참고용. **수정한 파일**과 **내용**만 기록한다.

---

## 2025-03 (전문가 로드맵 1단계: 내실)

### 1. Error Boundary

**파일**: `app/(pro)/spokedu-pro/components/SpokeduProErrorBoundary.tsx` (신규)

| 구분 | 내용 |
|------|------|
| **추가** | 클래스 컴포넌트 `SpokeduProErrorBoundary`: `getDerivedStateFromError`로 에러 시 fallback UI. 메시지 "일시적인 오류가 났어요", "새로 고침" 버튼(`window.location.reload()`). 개발 시에만 에러 메시지 `pre` 노출. |

**파일**: `app/(pro)/spokedu-pro/SpokeduProClient.tsx`

| 구분 | 내용 |
|------|------|
| **추가** | Aside·main·Toolkit·Drawer 등 본문 전체를 `SpokeduProErrorBoundary`로 감싸서 뷰에서 throw 시 fallback 표시. |

---

### 2. 대시보드(RoadmapView) 로드 실패·빈 상태

**파일**: `app/(pro)/spokedu-pro/views/RoadmapView.tsx`

| 구분 | 내용 |
|------|------|
| **변경** | `error` 시: "이번 주 추천을 불러오지 못했어요." + **다시 시도** 버튼(`fetchDashboard()`). |
| **변경** | 로딩 문구는 `loading && !data`일 때만 표시. |
| **추가** | `data` 있고 `weekTheme.items`·`row2.items` 둘 다 0개일 때 빈 상태 메시지: "이번 주 추천이 아직 없어요. 곧 업데이트될 예정이에요." |
| **변경** | Row1/Row2 그리드는 `!error`이고 (로딩 중이면 data 있을 때만) items가 하나라도 있을 때만 렌더. |

---

### 3. 원생 관리(DataCenterView) syncError + 다시 시도

**파일**: `app/(pro)/spokedu-pro/hooks/useStudentStore.ts`

| 구분 | 내용 |
|------|------|
| **추가** | `refetch()`: `apiFetchStudents()` + `apiFetchAttendance(today)` 재호출 후 상태 갱신. 실패 시 `setSyncError`. 반환 객체에 `refetch` 노출. |

**파일**: `app/(pro)/spokedu-pro/views/DataCenterView.tsx`

| 구분 | 내용 |
|------|------|
| **변경** | `syncError` 배너에 **다시 시도** 버튼 추가. 클릭 시 `refetch()` 호출. |

---

### 4. AI 리포트 이전 리포트 목록 로드 실패

**파일**: `app/(pro)/spokedu-pro/views/AIReportView.tsx`

| 구분 | 내용 |
|------|------|
| **추가** | `historyLoadError`, `historyRetryKey` 상태. GET 목록 요청 시 `!data.ok` 또는 catch 시 `setHistoryLoadError`. |
| **추가** | 이전 리포트 탭에서 `historyLoadError`일 때 "목록을 불러오지 못했어요." + **다시 시도** 버튼(`setHistoryRetryKey(k => k+1)`로 effect 재실행). |

---

### 5. 수업 보조 출석 0명 시 원생 관리 이동

**파일**: `app/(pro)/spokedu-pro/views/AssistantToolsView.tsx`

| 구분 | 내용 |
|------|------|
| **추가** | 메인 컴포넌트에 optional prop `onGoToDataCenter?: () => void`. |
| **추가** | `PickerTab`, `TeamsTab`에 optional `onGoToDataCenter`. 출석 0명일 때 안내 문구 아래 **"원생 관리에서 출석 처리하기"** 버튼 노출. 클릭 시 `onGoToDataCenter()`. |

**파일**: `app/(pro)/spokedu-pro/SpokeduProClient.tsx`

| 구분 | 내용 |
|------|------|
| **변경** | `AssistantToolsView`에 `onGoToDataCenter={() => switchView('data-center')}` 전달. |

---

## 2025-03 (전문가 로드맵 2단계: 1번 고도화 — 주간 수업 자료)

### 1. 주차 기준 및 라벨

**파일**: `app/lib/spokedu-pro/weekUtils.ts` (신규)

| 구분 | 내용 |
|------|------|
| **추가** | `getMondayOfWeek(d)`: 주의 월요일 반환(일요일은 전주 월요일로 간주). |
| **추가** | `getCurrentWeekLabel()`: "Y년 M월 N주차" 문자열(월요일 기준 주, N = 해당 월 내 주 번호). |

**파일**: `app/api/spokedu-pro/dashboard/route.ts`

| 구분 | 내용 |
|------|------|
| **변경** | GET 응답에 `weekLabel: string` 추가(서버에서 `getCurrentWeekLabel()` 호출). |

**파일**: `app/(pro)/spokedu-pro/hooks/useSpokeduProDashboard.ts`

| 구분 | 내용 |
|------|------|
| **변경** | 응답에서 `weekLabel` 저장, 반환. `getCurrentWeekLabel()`을 의존성에 넣어 **주가 바뀌면 자동 refetch**. |

**파일**: `app/(pro)/spokedu-pro/views/RoadmapView.tsx`

| 구분 | 내용 |
|------|------|
| **변경** | Hero 블록에 주차 라벨 노출(배지 옆). 훅에서 `weekLabel` 사용, 중복 mount fetch 제거. |

---

### 2. "이번 주 수업 가이드" 고정 및 부분 상태

**파일**: `app/(pro)/spokedu-pro/views/RoadmapView.tsx`

| 구분 | 내용 |
|------|------|
| **변경** | Row1 섹션 제목을 **"이번 주 수업 가이드"**로 고정. 제목 옆에 주차 라벨("· Y년 M월 N주차") 표시. |
| **추가** | Row1이 1~3개일 때 그리드 아래 "나머지 추천은 곧 채워질 예정이에요." 문구. |

---

### 3. 카드/드로어 액션

**파일**: `app/(pro)/spokedu-pro/components/SpokeduProDrawer.tsx`

| 구분 | 내용 |
|------|------|
| **추가** | 제목·태그 아래 **"영상 보기"** 버튼: `videoUrl` 있으면 새 탭에서 열기. |
| **추가** | **"체크리스트 보기"** 버튼: `checklist` 있으면 클릭 시 체크리스트 섹션으로 스크롤. 체크리스트 섹션에 `ref` 부여. |

---

### 4. 풀·갱신 주기 문서화

**파일**: `app/lib/spokedu-pro/dashboardDefaults.ts`

| 구분 | 내용 |
|------|------|
| **변경** | 상단 주석: 주간 4개 선정 풀(PROGRAM_BANK + catalog API), 큐레이션 정책은 docs 참고. |

**파일**: `docs/spokedu-pro-dashboard-pool.md` (신규)

| 구분 | 내용 |
|------|------|
| **추가** | "매주 4개" 후보 풀 정의, 큐레이션 편집 정책(풀 내 선택 권장), 갱신 주기(주차 = 월요일 시작, 주 변경 시 refetch). |

---

## 2025-03 (Week 5 데이터 영속성 + 실행 정리)

### 1. 원생·출결: localStorage 제거 및 API 전용 + 마이그레이션

**파일**: `app/(pro)/spokedu-pro/hooks/useStudentStore.ts`

| 구분 | 내용 |
|------|------|
| **삭제** | `LS_STUDENTS`, `LS_ATTENDANCE`, `lsGetStudents`, `lsSaveStudents`, `lsGetAttendance`, `lsSaveAttendance` 및 이들을 호출하던 모든 코드. |
| **추가** | `LEGACY_STUDENT_KEYS` = `['spokedu-pro:students:v2', 'spokedu-pro:students:v1', 'spokedu-pro:students']`, `ATTENDANCE_MIGRATED_KEY` = `'spokedu-pro:attendance:migrated'`. |
| **추가** | `migrateStudentsFromLS()`: 첫 로드 시 위 키 순서로 localStorage 확인 → 배열이 있으면 각 항목을 `POST /api/spokedu-pro/students`로 추가 → **전부 res.ok일 때만** LEGACY_STUDENT_KEYS 삭제 (유실 방지). |
| **추가** | `migrateAttendanceFromLS()`: `localStorage` 키 중 `spokedu-pro:attendance:*` 수집 → 각 날짜별로 `POST /api/spokedu-pro/attendance` 호출 → **res.ok인 항목만** 해당 키 삭제 → **전부 성공했을 때만** `spokedu-pro:attendance:migrated` = `'1'` 저장 (유실 방지). |
| **변경** | 초기 로드: `useEffect`에서 `migrateStudentsFromLS()` → `migrateAttendanceFromLS()` 순 실행 후 `apiFetchStudents()` + `apiFetchAttendance(today)`만 호출해 상태 설정. localStorage 복원 제거. |
| **변경** | `addStudent`, `removeStudent`, `updatePhysical` 내부에서 `lsSaveStudents` 제거. |
| **변경** | `cycleStatus`, `markAllPresent` 내부에서 `lsSaveAttendance` 제거. 출결 변경 시 `apiSaveAttendance(today, next)`만 호출. |

**의도**: 원생·출결 데이터는 DB(API) 단일 소스. 첫 로그인 시 기존 LS 데이터는 1회 마이그레이션 후 삭제.

---

### 2. AI 리포트: 생성 후 DB 저장 + 이전 리포트 보기

**파일**: `app/api/spokedu-pro/ai-report/route.ts`

| 구분 | 내용 |
|------|------|
| **요청 타입** | `ReportRequest.student`에 `id?: string` 추가 (tenant 학생 id, 저장 시 매핑용). |
| **추가** | `getActiveCenterId(supabase, userId)`: 소유 센터 1개 또는 멤버십 1개 반환. |
| **추가** | `ensureStudentRow(supabase, centerId, tenantStudentId, { name, classGroup })`: `spokedu_pro_students`에서 `center_id` + `tenant_student_id` 조회, 없으면 INSERT 후 `id` 반환. |
| **추가** | POST 성공 후: `centerId`·`body.student.id` 있으면 `ensureStudentRow` → `spokedu_pro_ai_reports` insert. **실패해도 200 응답 유지**. 응답에 **`savedToHistory: boolean`** 포함 (저장 성공 시 true). |
| **추가** | `GET` 핸들러: `?studentId=xxx`(tenant id) 받아 `spokedu_pro_students`에서 해당 행 조회 후 `spokedu_pro_ai_reports` 목록 `created_at` 내림차순 최대 100건 반환 (`id`, `goal`, `content`, `created_at`). |

**의도**: AI 리포트 생성 시 이력 저장, “이전 리포트 보기”에서 학생별 목록·내용 조회. DB/마이그레이션 미적용 환경에서도 저장 실패 시 500 내지 않음.

---

**파일**: `app/(pro)/spokedu-pro/views/AIReportView.tsx`

| 구분 | 내용 |
|------|------|
| **추가** | POST 요청 body에 `student.id: selectedStudent.id` 포함. |
| **추가** | `tab` 상태 `'create' \| 'history'`, 탭 UI "새 리포트 만들기" / "이전 리포트 보기". |
| **추가** | `historyReports`, `historyLoading`, `selectedHistoryReport`, `viewingReport`, `viewingMeta` 상태. |
| **추가** | `tab === 'history'` && `selectedStudentId`일 때 `GET /api/spokedu-pro/ai-report?studentId=...` 호출해 목록 설정. |
| **추가** | "이전 리포트 보기" 왼쪽: 학생 선택 시 목록 표시, 항목 클릭 시 `selectedHistoryReport` 설정. 오른쪽: 선택 항목의 `content` JSON 파싱 후 `ReportCard`로 읽기 전용 표시 (`showRadar={false}`, `readOnly`). |
| **추가** | `ReportCard`에 `showRadar`, `readOnly` prop. 읽기 전용일 때 "다시 작성" 버튼만 숨김. |
| **추가** | 복사/PDF/카카오 공유 시 `tab === 'history'`이면 `viewingReport`/`viewingMeta` 사용. |
| **추가** | `selectedHistoryReport` 변경 시 `content` 파싱해 `viewingReport`/`viewingMeta` 설정. |
| **추가** | `savedToHistory` 상태: 생성 응답의 `savedToHistory` 저장. `savedToHistory === false`일 때 "이전 리포트 목록에 저장되지 않았을 수 있습니다. 복사·PDF로 보관해 주세요." 배너 표시. `handleReset` 시 `savedToHistory` null로 초기화. |

**의도**: 이전 리포트 목록·상세 열람, 복사/PDF/공유는 과거 리포트 기준으로 동작. 저장 실패 시 사용자 안내로 유실 방지.

---

### 3. DB 마이그레이션 (AI 리포트·학생 매핑)

**파일**: `supabase/migrations/20260315000000_spokedu_pro_students_tenant_id.sql`

| 구분 | 내용 |
|------|------|
| **추가** | `spokedu_pro_students`에 `tenant_student_id UUID NULL` 컬럼. |
| **추가** | `(center_id, tenant_student_id)` 유니크 부분 인덱스 (`WHERE tenant_student_id IS NOT NULL`). |
| **추가** | 해당 컬럼 COMMENT. |

**의도**: tenant_content 학생 id와 `spokedu_pro_students.id` 1:1 매핑으로 AI 리포트 저장·목록 조회 시 FK 만족.

**배포 시**: Supabase에 해당 마이그레이션 적용 필요. 미적용 시 리포트 저장만 실패하고 API는 200 유지.

---

### 4. 상용화 전 필수 수정 (마이그레이션 유실 방지 + 저장 실패 안내)

**파일**: `app/(pro)/spokedu-pro/hooks/useStudentStore.ts`

| 구분 | 내용 |
|------|------|
| **변경** | `migrateStudentsFromLS()`: 각 POST 후 **res.ok** 확인. **전부 성공했을 때만** LEGACY_STUDENT_KEYS 삭제. 한 건이라도 실패하면 LS 유지 → 다음 로드 시 재시도. |
| **변경** | `migrateAttendanceFromLS()`: 날짜별 POST 후 **res.ok일 때만** 해당 키 `removeItem`. **전부 성공했을 때만** `ATTENDANCE_MIGRATED_KEY` = `'1'` 설정. 일부 실패 시 실패한 키는 LS에 남아 재시도 가능. |

**파일**: `app/api/spokedu-pro/ai-report/route.ts`

| 구분 | 내용 |
|------|------|
| **변경** | POST 응답에 **`savedToHistory: boolean`** 추가. insert 성공 시 true, 실패 또는 center/student 없으면 false. |

**파일**: `app/(pro)/spokedu-pro/views/AIReportView.tsx`

| 구분 | 내용 |
|------|------|
| **추가** | `savedToHistory` 상태 (boolean \| null). 생성 성공 시 `data.savedToHistory` 반영. |
| **추가** | 리포트 표시 시 `savedToHistory === false`이면 "이전 리포트 목록에 저장되지 않았을 수 있습니다. 복사·PDF로 보관해 주세요." 배너 노출. |
| **변경** | `handleReset`에서 `setSavedToHistory(null)` 호출. |

**의도**: LS 마이그레이션 시 응답 성공 여부 확인 후 삭제해 데이터 유실 방지. AI 리포트 저장 실패 시 사용자에게 안내해 복사/PDF 보관 유도.

---

## 5. 배포 안전 보강 (실행 정리 시)

**파일**: `app/api/spokedu-pro/ai-report/route.ts`

| 구분 | 내용 |
|------|------|
| **변경** | `spokedu_pro_ai_reports` insert를 try/catch로 감싸고, `insert` 결과로 `savedToHistory` 설정. 실패 시 `console.error`만 남기고 응답은 200 + report + `savedToHistory: false`. |

**의도**: 마이그레이션 미적용·RLS 등으로 저장이 실패해도 사용자에게는 리포트 생성 성공으로 보이게 하며, `savedToHistory`로 안내.

---

## 점검만 수행(코드 변경 없음)

| 항목 | 결과 |
|------|------|
| **2번 수업 보조** | 술래 정하기·팀 나누기는 수업 보조도구 뷰에서 1탭 + 1클릭으로 결과 도출, 한도 없음. 완료 정의 충족. 코드 수정 없음. |
| **1번 대시보드** | 추천 로드맵(RoadmapView)에 "이번 주 테마" Row1로 4개 노출 이미 구현됨. 배포 오류 원인 없음. 코드 수정 없음. |

---

## 문서 추가·수정 (동일 기간)

| 파일 | 내용 |
|------|------|
| `docs/spokedu-subscription-commercialization-checklist.md` | 상용화 체크리스트 (1번 수업 자료, 2번 수업 보조, 3번 리포트·리텐션, 실행 순서). |
| `docs/spokedu-subscription-development-direction.md` | 디벨롭 방향성 가이드라인. 1→2→3 계층, 의사결정 흐름, 완료 정의(4.5/5.5/6.4), 금지·타이브레이커. 섹션 A(현재 제품 상태 매핑), B(계층별 완료 정의), C(거절 템플릿), D(문서 버전·변경 이력) 추가. |
| `docs/CHANGELOG-SPOKEDU-SUBSCRIPTION.md` | 본 수정 이력 문서. |

---

## 배포 전 체크

- [ ] Supabase에 `20260315000000_spokedu_pro_students_tenant_id.sql` 적용 여부 확인.
- [ ] 스포키듀 프로 로그인 → 원생/출결 로드·저장이 API만으로 동작하는지 확인.
- [ ] AI 리포트 생성 → (마이그레이션 적용 시) `spokedu_pro_ai_reports`에 행 생성되는지 확인.
- [ ] "이전 리포트 보기" 탭에서 학생 선택 → 목록·상세 표시 및 복사/PDF 동작 확인.

---

*수정할 때마다 위 표와 배포 전 체크를 갱신한다.*
