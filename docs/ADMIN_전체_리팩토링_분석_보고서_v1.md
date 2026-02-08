# Spokedu Admin 전체 리팩토링 분석 보고서 v1

> **목적**: 대기업 제안용 품질 수준의 유지보수·개선 가이드  
> **범위**: admin 영역 전체 페이지 (iiwarmup 포함)  
> **원칙**: 기존 기능·로직 100% 보장, 필요한 범위 내에서만 수정

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [페이지별 상세 분석](#2-페이지별-상세-분석)
3. [공통 이슈 및 권장사항](#3-공통-이슈-및-권장사항)
4. [우선순위별 개선 로드맵](#4-우선순위별-개선-로드맵)
5. [참조 문서](#5-참조-문서)

---

## 1. Executive Summary

### 1.1 현황 요약

| 구분 | 페이지 수 | 주요 이슈 |
|------|-----------|-----------|
| 운영 관리 | 6 | 대시보드 PC 레이아웃, 공통공지–Common Task 미연동 |
| 수업 자료 | 2 | curriculum/inventory 클라이언트 패칭 패턴 |
| 강사 관리 | 3 | users/mileage 에러 피드백 부족 |
| 센터 | 2+7 | centers/[id] 탭 반응형, 버튼 cursor |
| iiwarmup | 7 | 별도 분석 (본 보고서에 포함) |

### 1.2 위험도 분류

| 수준 | 내용 | 영향 |
|------|------|------|
| **Critical** | session_count_logs FK, 공통공지 미표시 | 데이터 정합성·기능 누락 |
| **High** | fetch 에러 시 사용자 안내 없음, .single() 미처리 | 사용자 경험·디버깅 어려움 |
| **Medium** | 반응형·cursor 누락, 클라이언트 패칭 | UX 일관성 |
| **Low** | console.log, deprecated 옵션 | 프로덕션 품질 |

### 1.3 채팅 관련

- **상태**: 채팅 페이지·기능 제거 완료 (app 내 chat 참조 없음)
- **redirects**: `/admin/chat`, `/teacher/chat` → 각각 `/admin`, `/teacher`로 301 리다이렉트
- **사이드바**: 채팅 메뉴 미포함 (삭제된 상태 유지)

---

## 2. 페이지별 상세 분석

### 2.1 Admin Layout (`app/admin/layout.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | pt-16 md:pt-0로 모바일 상단 여백 처리 | 유지 |
| Cursor | 버튼/클릭 영역 없음 | 해당 없음 |
| 로딩 | checkAdmin 중 "권한 확인 중..." 표시 | 유지 |
| 위험 요소 | 매 페이지 마운트마다 checkAdmin 실행 | Auth 캐시(Phase 2) 검토 |

**에러 처리**: profile 조회 실패 시 `profile?.role` undefined → admin/master 아님 → 리다이렉트. 에러 분기 추가 권장.

---

### 2.2 대시보드 (`app/admin/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | max-w-4xl, md:cols-2 업무 노트 | PC에서 max-w-6xl 검토 (일정 테이블 넓게) |
| Cursor | 버튼·Link에 cursor-pointer 다수 적용 | 일부 div 클릭 영역에 cursor-pointer 보강 |
| 로딩 | "HQ INITIALIZING..." 전체 화면 | 스켈레톤 또는 섹션별 로딩 검토 |
| 위험 요소 | memos.single() error 미처리, fetch 에러 시 사용자 안내 없음 | error 분기 및 Toast/메시지 추가 |

**시한폭탄**
- **공통공지–Common Task 미연동**: assignee='Common'인 task는 화면에 표시되지 않음. 공통 공지 카드에 `tasks.filter(t => t.assignee === 'Common')` 추가 필요.
- **휴가 날짜 포맷**: `MM/DD`만 표시. `YYYY년 M월 D일` 등 개선 가능.
- **openNoteModal**: memos.single() 실패 시 `data` undefined → "로딩 중..." 그대로. error 분기 필요.

---

### 2.3 일정 (`app/admin/schedules/`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | p-4 sm:p-6, overflow-x-auto 테이블 | PC에서 테이블 풀폭 활용 검토 |
| Cursor | Link, ViewToolbar 버튼 등 | ScheduleTable 행 클릭 시 cursor-pointer 확인 |
| 로딩 | page: 스피너, SchedulesClient: Loader2 | 유지 |
| 위험 요소 | getSchedules 실패 시 initialSchedules null → 무한 스피너 | 에러 UI·재시도 버튼 추가 |

**페이지 구조**: Server Action `getSchedules` → Client `SchedulesClient`. 초기 데이터 없을 때만 스피너이므로, fetch 실패 시 사용자 피드백 필요.

---

### 2.4 센터 관리 (`app/admin/centers/`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 테이블 overflow-x-auto, 모달 반응형 | centers/[id] 탭: 모바일에서 스크롤·터치 영역 확인 |
| Cursor | Link, button에 cursor 대부분 있음 | centers/[id] 수정/삭제 버튼에 cursor-pointer 명시 |
| 로딩 | page 스피너, CentersClient Loader2 | 유지 |
| 위험 요소 | createCenter/deleteCenter 실패 시 alert만, 에러 메시지 일부만 표시 | Toast 또는 인라인 에러 메시지로 통일 |

**센터 상세 (`centers/[id]/page.tsx`)**
- 탭 버튼: `cursor-pointer` 미명시 (hover 시 border 변경으로 클릭 가능 인지)
- 모달 버튼(취소, 저장): `cursor-pointer` 없을 수 있음 — 확인 후 보강

---

### 2.5 수업 관리 (`app/admin/classes/`)

> ⚠️ **원칙**: 기존 비즈니스 로직·데이터 흐름 변경 금지. 방어 코드·UX 보완만 권장.

| 항목 | 현황 | 개선 제안 (로직 유지 범위 내) |
|------|------|------------------------------|
| 반응형 | FullCalendar, 모바일 터치 지원 | classes.css 등 스타일 유지 |
| Cursor | `cursor-pointer` 전역 스타일 (classes.css) | 유지 |
| 로딩 | useClassManagement fetch 중 | 스켈레톤 없음 — 추가 시 렌더 로직 변경 최소화 |
| 위험 요소 | [docs/admin_classes_오류분석_및_수업로그.md](admin_classes_오류분석_및_수업로그.md) 참조 | 아래 요약 적용 |

**수정 제안 (로직 비변경)**
- `handleEventClick`: startObj/endObj 없을 때 `alert('이 수업은 편집할 수 없습니다.')` 추가
- `handleUpdate`: 날짜 파싱 후 Invalid Date 검사, 저장 차단 + alert
- `handleCloneGroup`: baseSession Date 생성 후 `Number.isNaN(date.getTime())` 검사
- `autoFinishSessions`: teacherId 빈 문자열/null 스킵
- `updateStatus('finished')`: logError 23503 처리 시 사용자 안내 (Auth 미등록 강사)

**session_count_logs FK 이슈**: [docs/admin_classes_오류분석_및_수업로그.md](admin_classes_오류분석_및_수업로그.md) 2.5절 해결 방향 참조. DB 스키마 변경 시 별도 마이그레이션 필요.

---

### 2.6 수업 관련 검수 (`app/admin/teachers-classes/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | max-w-6xl, 탭·테이블 반응형 | 모바일에서 테이블 가로 스크롤 확인 |
| Cursor | 탭·버튼 다수 cursor-pointer | 클릭 가능 div에 cursor 보강 |
| 로딩 | loading 시 스피너, error 시 메시지 | 유지 |
| 위험 요소 | fetchListData 에러 시 setError, UI 표시 | "다시 시도" 버튼 추가 권장 |

---

### 2.7 공지사항 (`app/admin/notice/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | max-w-2xl, 모바일 하단 FAB | 유지 |
| Cursor | 카드, 버튼에 cursor-pointer | 유지 |
| 로딩 | "불러오는 중..." + 스피너 | 유지 |
| 위험 요소 | handleDelete: error 시 UI 갱신 없음, 사용자 피드백 없음 | 실패 시 alert 또는 Toast 추가 |

---

### 2.8 연간 커리큘럼 (`app/admin/curriculum/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | max-w-4xl, 그리드 md:cols-2 | 유지 |
| Cursor | 월/주차 버튼, 카드, 모달 버튼 | select, button에 cursor-pointer 확인 |
| 로딩 | fetchItems 중 로딩 UI 없음 | 로딩 스피너 또는 스켈레톤 추가 |
| 위험 요소 | fetchItems 에러 시 console.error만 | Toast 또는 인라인 에러 표시 |

**데이터 패칭**: useEffect + fetchItems. React Query 도입 시 select 옵션으로 formattedData 변환 유지.

---

### 2.9 교구/재고 관리 (`app/admin/inventory/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 사이드바 모바일 슬라이드, 그리드 반응형 | 유지 |
| Cursor | 버튼, 카탈로그 아이템 등 cursor-pointer | 드래그 영역에 cursor-grab 유지 |
| 로딩 | fetchCatalog/fetchTeachers 마운트 시, 로딩 UI 없음 | 초기 로딩 스피너 추가 |
| 위험 요소 | process.env.NODE_ENV console.log 다수 | 프로덕션 제거 또는 조건부 로깅 |

---

### 2.10 강사 정보 관리 (`app/admin/users/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 검색·카드 레이아웃 반응형 | 유지 |
| Cursor | 버튼, 카드 등 cursor-pointer | 유지 |
| 로딩 | fetchUsers 시 setIsLoading, UI 반영 여부 확인 | 로딩 표시 검증 |
| 위험 요소 | fetchUsers catch에서 사용자 안내 없음 | "다시 시도" 또는 Toast 추가 |

---

### 2.11 강사 카운팅 관리 (`app/admin/mileage/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 모달, 테이블 반응형 | 유지 |
| Cursor | 강사 행, 버튼 등 cursor-pointer | 유지 |
| 로딩 | fetchData 중 로딩 UI 없음 | 초기 로딩 표시 추가 |
| 위험 요소 | Fetch error 시 console.error만 | 사용자 에러 안내 |

---

### 2.12 정산 리포트 (`app/admin/master/reports/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 차트·테이블 | 모바일 가로 스크롤 확인 |
| Cursor | 버튼·링크 | cursor-pointer 확인 |
| 로딩 | 데이터 fetch 중 | 로딩 UI 확인 |
| 위험 요소 | .single() 등 에러 미처리 가능 | error 분기 추가 |

---

### 2.13 IIWarmup (`app/admin/iiwarmup/`)

#### 2.13.1 Overview (`page.tsx`)
- 링크들: cursor-pointer 없음 (Link는 기본 hover). `cursor-pointer` 명시 권장.
- 반응형: grid sm:cols-2 lg:cols-3. 유지.

#### 2.13.2 Play Studio (`play/page.tsx`)
- usePlayAssetPack 로딩, 에러 처리 있음. cursor-pointer 다수 적용.
- 무거운 에셋·타임라인 — dynamic import 검토.

#### 2.13.3 Think Studio (`think/page.tsx`)
- 훅·에러 처리 존재. cursor 확인.

#### 2.13.4 Flow Studio (`flow/page.tsx`)
- 3D 환경. 로딩·에러 처리 확인 필요.

#### 2.13.5 AssetHub (`assets/page.tsx`)
- 탭·헤더 반응형. Think/Play/Flow 패널별 로딩 확인.

#### 2.13.6 Scheduler (`scheduler/page.tsx`)
- useRotationSchedule, React Query 사용. cursor-pointer 확인.

---

## 3. 공통 이슈 및 권장사항

### 3.1 반응형

| 이슈 | 영향 페이지 | 권장 |
|------|-------------|------|
| max-w-4xl 고정 | 대시보드 | PC에서 max-w-6xl 또는 lg:max-w-7xl |
| 테이블 가로 스크롤 | schedules, centers, teachers-classes | min-w 유지, PC에서 컬럼 확장 |
| 모바일 탭 overflow | centers/[id] | flex gap-4, overflow-x-auto |

### 3.2 Cursor

| 규칙 | 적용 |
|------|------|
| button, a | cursor-pointer (Tailwind 기본 일부 있음) |
| onClick 있는 div | cursor-pointer 필수 |
| disabled 버튼 | cursor-not-allowed |

### 3.3 로딩·에러

| 패턴 | 현재 | 권장 |
|------|------|------|
| fetch 에러 | console.error | Toast 또는 인라인 메시지 |
| .single() 실패 | data만 사용 | error 분기, fallback UI |
| 무한 로딩 | fetch 실패 시 null 유지 | 에러 상태 + "다시 시도" |

### 3.4 데이터 패칭

| 패턴 | 파일 예시 | 권장 |
|------|-----------|------|
| useEffect + fetch | curriculum, inventory, notice | React Query 또는 Server Component |
| set-state-in-effect | inventory (eslint-disable) | eslint-disable 유지 또는 queryFn 전환 |
| Promise.all | 대시보드 | 유지 (병렬 fetch 적절) |

---

## 4. 우선순위별 개선 로드맵

### Phase 1: 즉시 적용 (기능 변경 최소)

1. **공통공지 + Common Task 연동** (admin/page.tsx)
2. **대시보드 PC max-w 확장** (admin/page.tsx)
3. **휴가 날짜 포맷 개선** (admin/page.tsx)
4. **notice handleDelete 에러 피드백** (admin/notice/page.tsx)
5. **클릭 영역 cursor-pointer 누락 보강** (페이지별 점검)

### Phase 2: 에러 핸들링 강화

6. fetch 에러 시 Toast 또는 메시지 표시 (공통)
7. .single() error 분기 (memos, profiles 등)
8. schedules/centers 초기 fetch 실패 시 에러 UI

### Phase 3: 로딩·성능

9. curriculum, inventory 초기 로딩 스피너
10. admin auth 캐시 (layout)
11. FullCalendar dynamic import (classes)

### Phase 4: admin/classes 방어 코드 (로직 유지)

12. handleEventClick startObj/endObj 없을 때 alert
13. handleUpdate Invalid Date 검사
14. handleCloneGroup Date NaN 검사
15. autoFinishSessions teacherId 빈 값 스킵
16. updateStatus 23503 사용자 안내

### Phase 5: DB·스키마 (별도 마이그레이션)

17. session_count_logs teacher_id FK → public.users 참조 검토
18. session_count 중복 방지 (autoFinishSessions)

---

## 5. 참조 문서

- [admin_classes_오류분석_및_수업로그.md](admin_classes_오류분석_및_수업로그.md) — 수업 관리·session_count_logs 상세
- [session_count_logs_analysis.md](session_count_logs_analysis.md) — 로그 경로·중복 분석
- [PWA_및_전체_개선_보고서.md](PWA_및_전체_개선_보고서.md) — PWA·ESLint·세션
- `.cursor/plans/coach_app_전반_개선_보완.plan.md` — 전반 개선 계획

---

*문서 버전: v1 | 작성일: 2025-02*
