# Spokedu Admin 전체 리팩토링 분석 보고서 v2

> **목적**: 대기업 제안용 품질 수준의 유지보수·개선 가이드  
> **범위**: admin 영역 전체 페이지 (iiwarmup 포함)  
> **원칙**: 기존 기능·로직 100% 보장, 필요한 범위 내에서만 수정

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [리스크 매트릭스](#2-리스크-매트릭스)
3. [페이지별 상세 분석](#3-페이지별-상세-분석)
4. [API·데이터 레이어](#4-apidata-레이어)
5. [Before/After 수정 예시](#5-beforeafter-수정-예시)
6. [구체적 수정 명세 체크리스트](#6-구체적-수정-명세-체크리스트)
7. [공통 이슈 및 권장사항](#7-공통-이슈-및-권장사항)
8. [우선순위별 개선 로드맵](#8-우선순위별-개선-로드맵)
9. [참조 문서](#9-참조-문서)

---

## 1. Executive Summary

### 1.1 현황 요약

| 구분 | 페이지 수 | 주요 이슈 |
|------|-----------|-----------|
| 운영 관리 | 6 | 대시보드 PC 레이아웃, 공통공지–Common Task 미연동 |
| 수업 자료 | 2 | curriculum/inventory 클라이언트 패칭 패턴 |
| 강사 관리 | 3 | users/mileage 에러 피드백 부족 |
| 센터 | 2+7 | centers/[id] 탭 반응형, 버튼 cursor |
| iiwarmup | 7 | Overview cursor, Play 에셋 로딩·에러 메시지 |

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

## 2. 리스크 매트릭스

| 이슈 | 발생 가능성 | 영향도 | 등급 | 조치 Phase |
|------|-------------|--------|------|------------|
| session_count_logs teacher_id FK (auth.users) | 중 | 높음 | High | Phase 5 |
| 공통공지 Common Task 미표시 | 높음 | 중 | High | Phase 1 |
| memos.single() error 미처리 (openNoteModal) | 중 | 중 | Medium | Phase 2 |
| fetch 에러 시 사용자 안내 없음 | 중 | 중 | Medium | Phase 2 |
| notice handleDelete error 시 피드백 없음 | 중 | 낮음 | Medium | Phase 1 |
| profiles .single() error 미분기 (layout) | 낮음 | 중 | Medium | Phase 2 |
| centers 탭/모달 cursor 누락 | 높음 | 낮음 | Low | Phase 1 |
| IIWarmup Overview Link cursor 누락 | 높음 | 낮음 | Low | Phase 1 |

---

## 3. 페이지별 상세 분석

### 3.1 Admin Layout (`app/admin/layout.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | pt-16 md:pt-0로 모바일 상단 여백 처리 | 유지 |
| Cursor | 버튼/클릭 영역 없음 | 해당 없음 |
| 로딩 | checkAdmin 중 "권한 확인 중..." 표시 | 유지 |
| 위험 요소 | 매 페이지 마운트마다 checkAdmin 실행 | Auth 캐시(Phase 3) 검토 |

**코드 위치·이슈**

- **파일**: `app/admin/layout.tsx`
- **라인 21-26**: `profiles` 조회 `.single()` 사용, `error` 미분기

```tsx
// 현재 (21-26행)
const { data: profile } = await getSupabaseBrowserClient()
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();
const userRole = profile?.role;
```

- **이슈**: `error`가 있어도 `profile?.role`이 undefined → 리다이렉트만 됨. 에러 원인 파악·로깅 권장.

---

### 3.2 대시보드 (`app/admin/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | max-w-4xl (222행) | PC에서 max-w-6xl |
| Cursor | 버튼·Link에 cursor-pointer 다수 | 일부 div 클릭 영역 보강 |
| 로딩 | "HQ INITIALIZING..." 전체 화면 (222행) | 스켈레톤 또는 섹션별 로딩 |
| 위험 요소 | memos.single() error 미처리, fetch 에러 시 사용자 안내 없음 | error 분기·Toast 추가 |

**코드 위치·이슈**

| 이슈 | 파일:라인 | 현재 코드 |
|------|-----------|-----------|
| fetchData catch | page.tsx:152-155 | `catch (err) { console.error('Fetch Error:', err); }` |
| openNoteModal memos | page.tsx:164-169 | `const { data } = await supabase...single(); setNoteContent(data?.content \|\| '');` |
| 공통공지 Common Task 미표시 | page.tsx:368-398 | 공통 공지 카드에 `vacationRequests`만, `tasks.filter(t => t.assignee === 'Common')` 없음 |
| 휴가 날짜 포맷 | page.tsx:381-383 | `dateStr = MM/DD` (예: 02/07) |

---

### 3.3 일정 (`app/admin/schedules/`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | p-4 sm:p-6, overflow-x-auto 테이블 | PC에서 테이블 풀폭 활용 |
| Cursor | Link, ViewToolbar 버튼 등 | ScheduleTable 행 클릭 시 cursor-pointer |
| 로딩 | page 스피너, SchedulesClient Loader2 | 유지 |
| 위험 요소 | getSchedules 실패 시 initialSchedules null → 무한 스피너 | 에러 UI·재시도 버튼 |

**페이지 구조**: Server Action `getSchedules` → Client `SchedulesClient`. 초기 데이터 없을 때만 스피너.

---

### 3.4 센터 관리 (`app/admin/centers/`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 테이블 overflow-x-auto, 모달 반응형 | centers/[id] 탭: 모바일 overflow-x-auto |
| Cursor | Link, button 대부분 있음 | 탭·모달 버튼에 cursor-pointer 명시 |
| 로딩 | page 스피너, CentersClient Loader2 | 유지 |
| 위험 요소 | createCenter/deleteCenter 실패 시 alert만 | Toast 또는 인라인 에러 통일 |

**코드 위치·이슈**

- **파일**: `app/admin/centers/[id]/page.tsx`
- **라인 282-296**: 탭 버튼에 `cursor-pointer` 미명시

```tsx
// 현재 (282-296행)
<button
  key={tab.id}
  type="button"
  onClick={() => setTab(tab.id)}
  className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium ${...}`}
>
```

- **개선**: `className`에 `cursor-pointer` 추가

- **라인 324-328**: 모달 닫기 버튼에도 `cursor-pointer` 추가 권장

---

### 3.5 수업 관리 (`app/admin/classes/`)

> ⚠️ **원칙**: 기존 비즈니스 로직·데이터 흐름 변경 금지. 방어 코드·UX 보완만 권장.

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | FullCalendar, 모바일 터치 | classes.css 유지 |
| Cursor | cursor-pointer 전역 (classes.css) | 유지 |
| 로딩 | useClassManagement fetch 중 | 스켈레톤 추가 시 로직 변경 최소화 |
| 위험 요소 | [admin_classes_오류분석_및_수업로그.md](admin_classes_오류분석_및_수업로그.md) 참조 | 아래 요약 |

**적용 현황** (일부 이미 반영됨)

- `handleEventClick` (177-184행): startObj/endObj 없을 때 alert ✅
- `handleUpdate` (266-269행): Invalid Date 검사 ✅

**추가 권장** (로직 비변경)

- `handleCloneGroup`: baseSession Date 생성 후 `Number.isNaN(date.getTime())` 검사
- `autoFinishSessions`: teacherId 빈 문자열/null 스킵
- `updateStatus('finished')`: logError 23503 처리 시 사용자 안내 (Auth 미등록 강사)

**session_count_logs FK**: [admin_classes_오류분석_및_수업로그.md](admin_classes_오류분석_및_수업로그.md) 2.5절 참조. DB 마이그레이션 별도.

---

### 3.6 수업 관련 검수 (`app/admin/teachers-classes/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | max-w-6xl, 탭·테이블 | 모바일 가로 스크롤 확인 |
| Cursor | 탭·버튼 다수 cursor-pointer | 클릭 가능 div 보강 |
| 로딩 | loading 스피너, error 메시지 | 유지 |
| 위험 요소 | fetchListData 에러 시 setError, UI 표시 | "다시 시도" 버튼 권장 |

---

### 3.7 공지사항 (`app/admin/notice/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | max-w-2xl, 모바일 FAB | 유지 |
| Cursor | 카드, 버튼 cursor-pointer | 유지 |
| 로딩 | "불러오는 중..." + 스피너 | 유지 |
| 위험 요소 | handleDelete error 시 UI 갱신·피드백 없음 | 실패 시 alert/Toast 추가 |

**코드 위치·이슈**

- **파일**: `app/admin/notice/page.tsx`
- **라인 96-102**: `handleDelete`에서 error 분기 없음

```tsx
// 현재 (96-102행)
const handleDelete = async (id: number, e: React.MouseEvent) => {
  e.stopPropagation();
  if (!supabase || !confirm('정말 삭제하시겠습니까?')) return;
  const { error } = await supabase.from('notices').delete().eq('id', id);
  if (!error) setNotices(prev => prev.filter(n => n.id !== id));
};
```

- **이슈**: error가 있으면 사용자에게 아무 피드백 없음.

---

### 3.8 연간 커리큘럼 (`app/admin/curriculum/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | max-w-4xl, md:cols-2 | 유지 |
| Cursor | 월/주차 버튼, 카드 | select, button cursor-pointer 확인 |
| 로딩 | fetchItems 중 로딩 UI 없음 | 로딩 스피너 추가 |
| 위험 요소 | fetchItems 에러 시 console.error만 | Toast 또는 인라인 에러 |

---

### 3.9 교구/재고 관리 (`app/admin/inventory/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 사이드바 모바일 슬라이드, 그리드 | 유지 |
| Cursor | 버튼, 카탈로그 cursor-pointer | 드래그 영역 cursor-grab 유지 |
| 로딩 | fetchCatalog/fetchTeachers 마운트 시 로딩 UI 없음 | 초기 로딩 스피너 |
| 위험 요소 | process.env.NODE_ENV console.log 다수 | 프로덕션 제거 또는 조건부 로깅 |

---

### 3.10 강사 정보 관리 (`app/admin/users/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 검색·카드 반응형 | 유지 |
| Cursor | 버튼, 카드 cursor-pointer | 유지 |
| 로딩 | fetchUsers 시 setIsLoading | UI 반영 검증 |
| 위험 요소 | fetchUsers catch에서 사용자 안내 없음 | "다시 시도" 또는 Toast |

---

### 3.11 강사 카운팅 관리 (`app/admin/mileage/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 모달, 테이블 | 유지 |
| Cursor | 강사 행, 버튼 | 유지 |
| 로딩 | fetchData 중 로딩 UI 없음 | 초기 로딩 표시 |
| 위험 요소 | Fetch error 시 console.error만 | 사용자 에러 안내 |

---

### 3.12 정산 리포트 (`app/admin/master/reports/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 차트·테이블 | 모바일 가로 스크롤 확인 |
| Cursor | 버튼·링크 | cursor-pointer 확인 |
| 로딩 | 데이터 fetch 중 | 로딩 UI 확인 |
| 위험 요소 | .single() 등 에러 미처리 가능 | error 분기 추가 |

---

### 3.13 IIWarmup 상세 분석

#### 3.13.1 Overview (`app/admin/iiwarmup/page.tsx`)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | grid sm:cols-2 lg:cols-3 | 유지 |
| Cursor | `<a>`, `<Link>`에 cursor-pointer 미명시 | 모든 링크에 `cursor-pointer` 추가 |
| 로딩 | 정적 페이지 | 해당 없음 |

**코드 위치**

- **라인 14-92**: 6개 카드 링크 (구독자 미리보기 `<a>`, Play/Think/Flow/AssetHub/Scheduler `<Link>`)
- **현재**: `className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600"`
- **개선**: `cursor-pointer` 추가

---

#### 3.13.2 Play Studio (`app/admin/iiwarmup/play/page.tsx`)

**주요 컴포넌트·데이터 흐름**

- `usePlayAssetPack(year, month, week)` → `state.images`, `state.bgmPath`, `getImageUrl`
- `buildPlayAssetIndex()` → `assetIndex`
- `compile()` → `buildTimeline()` → `RuntimePlayer`
- `RuntimePlayer`: 타임라인 재생, 오디오 이벤트

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | grid lg:cols-[280px_1fr] | 유지 |
| Cursor | 버튼에 cursor-pointer, disabled 시 cursor-not-allowed | 유지 |
| 로딩 | packStatus 'loading' → "에셋 로딩 중…" | 유지 |
| 에러 | tableMissing/error → "에러 또는 테이블 미존재" | 사용자 친화적 메시지로 개선 |

**에지케이스**

- 에셋 20슬롯+BGM 없을 때: "에셋이 부족합니다. (20슬롯 이미지 + BGM 필요)" ✅
- compile 에러: `compileError` 표시 ✅

**성능**: RuntimePlayer, 타임라인·에셋 무거움 → dynamic import 검토 (Phase 3)

---

#### 3.13.3 Think Studio (`app/admin/iiwarmup/think/page.tsx`)

**주요 컴포넌트·데이터 흐름**

- `useThink150Pack()`, `useThinkBGM()`, `useUpsertThink150Program()`
- `Think150Player` (config: audience, week, month, seed, thinkPack, bgmPath)

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | grid lg:cols-[280px_1fr] | 유지 |
| Cursor | select, button cursor-pointer | 유지 |
| 에러 | upsertThink150.isError → 인라인 메시지 | 유지 |

---

#### 3.13.4 Flow Studio (`app/admin/iiwarmup/flow/page.tsx`)

**구조**: 단순 리다이렉트

```tsx
// 전체 (12행)
export default function AdminFlowPage() {
  redirect('/flow-phase?admin=true');
}
```

- 실제 Flow 3D 환경은 `/flow-phase`에서 제공
- Admin Flow 페이지는 접근용 리다이렉트만 수행
- 로딩·에러·cursor 해당 없음

---

#### 3.13.5 AssetHub (`app/admin/iiwarmup/assets/page.tsx`)

**주요 컴포넌트**

- `AssetHubTabs`: Think/Play/Flow 탭
- `AssetHubHeader`: 연도·월·주차 선택
- `ThinkAssetPanel`, `PlayAssetPanel`, `FlowBgmPanel`

**데이터 흐름**

- `activeTab`에 따라 `ThinkAssetPanel` 또는 `PlayAssetPanel` 렌더
- `week === 1 && activeTab === 'think'` → `setWeek(2)` (19행): Think는 주 2–4만 지원

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | 탭·헤더 반응형 | 유지 |
| Cursor | 탭·버튼 | 확인 |
| 로딩 | 각 패널별 usePlayAssetPack/useThink150Pack | 초기 로딩 UI 확인 |
| 에지케이스 | week 1 + Think 탭 시 자동 week→2 | 사용자에게 안내 메시지 권장 |

---

#### 3.13.6 Scheduler (`app/admin/iiwarmup/scheduler/page.tsx`)

**주요 컴포넌트·데이터 흐름**

- `useRotationScheduleMonth(year, month)` → `scheduleRows`
- `useQuery(['warmup-programs-list'])` → `programs`
- `useSaveSchedule()` → `saveSchedule.mutateAsync`
- `SchedulerMonthAccordion`: 월별 아코디언, 슬롯별 드롭다운

| 항목 | 현황 | 개선 제안 |
|------|------|-----------|
| 반응형 | flex, space-y | 유지 |
| Cursor | select에 cursor-pointer (81행) | 유지 |
| 에러 | useQuery error 미처리 가능 | error 분기·재시도 UI 검토 |

---

## 4. API·데이터 레이어

### 4.1 .single() 사용처 및 에러 처리 현황

| 파일 | 라인 | 테이블 | error 분기 | 비고 |
|------|------|--------|------------|------|
| admin/page.tsx | 168 | memos | ❌ | openNoteModal |
| admin/layout.tsx | 25 | profiles | ❌ | profile?.role fallback |
| admin/notice/page.tsx | - | notices | select * (single 아님) | - |
| admin/classes/page.tsx | 297, 352, 373, 412 | users, sessions | 일부 | 23505 처리 |
| admin/users/page.tsx | 74 | users | 확인 필요 | - |
| admin/mileage/page.tsx | 172, 213, 226, 248 | users 등 | ❌ | - |
| admin/schedules/actions/schedules.ts | 42, 69, 98, 115 | schedules | Server Action | - |
| admin/centers/actions/* | 다수 | centers, programs 등 | Server Action | - |

### 4.2 권장

- 클라이언트 호출 `.single()`: `const { data, error } = await ...` 후 `error` 분기 필수
- Server Action 내부: 호출부에서 `error` 전달·처리 확인

---

## 5. Before/After 수정 예시

### 5.1 공통공지 + Common Task 표시

**위치**: `app/admin/page.tsx` 368–398행

**Before**: 공통 공지 카드에 vacationRequests만 표시, Common Task 없음

**After (예시)**:

```tsx
{/* 공통 공지 카드 */}
<div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
  <div className="flex items-center gap-2 border-b-4 border-slate-400 pb-3 mb-4">
    ...
    <h3 className="text-base font-black text-slate-900 uppercase">공통 공지</h3>
    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
      {tasks.filter((t) => t.assignee === 'Common' && t.status !== 'Done').length} Active Tasks
    </p>
  </div>
  {/* Common Task 목록 추가 */}
  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
    {tasks.filter((t) => t.assignee === 'Common').map((task) => (
      <div key={task.id} onClick={() => { setEditingTask(task); setTaskForm({ ...task }); setIsTaskModalOpen(true); }}
        className="py-3 px-3 flex items-start gap-3 rounded-xl border border-slate-100 hover:border-slate-200 cursor-pointer transition-all">
        ...
      </div>
    ))}
  </div>
  {vacationRequests.length > 0 && (...)}
</div>
```

---

### 5.2 openNoteModal memos.single() error 처리

**위치**: `app/admin/page.tsx` 164–169행

**Before**:

```tsx
const { data } = await supabase.from('memos').select('content').eq('assignee', boardId).single();
setNoteContent(data?.content || '');
```

**After**:

```tsx
const { data, error } = await supabase.from('memos').select('content').eq('assignee', boardId).single();
if (error) {
  setNoteContent('메모를 불러올 수 없습니다. 다시 시도해 주세요.');
  return;
}
setNoteContent(data?.content || '');
```

---

### 5.3 notice handleDelete 에러 피드백

**위치**: `app/admin/notice/page.tsx` 96–102행

**Before**:

```tsx
const { error } = await supabase.from('notices').delete().eq('id', id);
if (!error) setNotices(prev => prev.filter(n => n.id !== id));
```

**After**:

```tsx
const { error } = await supabase.from('notices').delete().eq('id', id);
if (error) {
  alert('삭제 실패: ' + (error.message || '알 수 없는 오류'));
  return;
}
setNotices(prev => prev.filter(n => n.id !== id));
```

---

### 5.4 centers [id] 탭 버튼 cursor-pointer

**위치**: `app/admin/centers/[id]/page.tsx` 286행

**Before**:

```tsx
className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium ${...}`}
```

**After**:

```tsx
className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium cursor-pointer ${...}`}
```

---

### 5.5 IIWarmup Overview Link cursor-pointer

**위치**: `app/admin/iiwarmup/page.tsx` 14–92행

**Before**:

```tsx
className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600"
```

**After**:

```tsx
className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
```

---

## 6. 구체적 수정 명세 체크리스트

### Phase 1: 즉시 적용

- [ ] `admin/page.tsx` 공통 공지 카드에 Common Task 목록 추가 (368–398행)
- [ ] `admin/page.tsx` max-w-4xl → max-w-6xl (222행)
- [ ] `admin/page.tsx` 휴가 날짜 `YYYY년 M월 D일` 포맷 (381행)
- [ ] `admin/notice/page.tsx` handleDelete error 분기 (96–102행)
- [ ] `admin/iiwarmup/page.tsx` Link/a에 cursor-pointer (14–92행)
- [ ] `admin/centers/[id]/page.tsx` 탭 버튼에 cursor-pointer (286행)
- [ ] `admin/centers/[id]/page.tsx` 모달 닫기 버튼 cursor-pointer (325행)

### Phase 2: 에러 핸들링

- [ ] admin/page.tsx fetchData catch → Toast 또는 인라인 에러 메시지
- [ ] admin/page.tsx openNoteModal memos error 분기 (164–169행)
- [ ] admin/layout.tsx profiles .single() error 분기 (21–26행)
- [ ] schedules 초기 fetch 실패 시 에러 UI
- [ ] centers 초기 fetch 실패 시 에러 UI

### Phase 3: 로딩·성능

- [ ] curriculum, inventory 초기 로딩 스피너
- [ ] admin layout auth 캐시
- [ ] FullCalendar dynamic import (classes)
- [ ] Play Studio RuntimePlayer dynamic import 검토

### Phase 4: admin/classes 방어 코드

- [ ] handleCloneGroup Date NaN 검사
- [ ] autoFinishSessions teacherId 빈 값 스킵
- [ ] updateStatus 23503 사용자 안내

### Phase 5: DB·스키마

- [ ] session_count_logs teacher_id FK → public.users 참조 검토
- [ ] session_count 중복 방지 (autoFinishSessions)

---

## 7. 공통 이슈 및 권장사항

### 7.1 반응형

| 이슈 | 영향 페이지 | 권장 |
|------|-------------|------|
| max-w-4xl 고정 | 대시보드 | PC에서 max-w-6xl |
| 테이블 가로 스크롤 | schedules, centers, teachers-classes | min-w 유지, PC 컬럼 확장 |
| 모바일 탭 overflow | centers/[id] | flex gap-4, overflow-x-auto |

### 7.2 Cursor

| 규칙 | 적용 |
|------|------|
| button, a | cursor-pointer |
| onClick 있는 div | cursor-pointer 필수 |
| disabled 버튼 | cursor-not-allowed |

### 7.3 로딩·에러

| 패턴 | 현재 | 권장 |
|------|------|------|
| fetch 에러 | console.error | Toast 또는 인라인 메시지 |
| .single() 실패 | data만 사용 | error 분기, fallback UI |
| 무한 로딩 | fetch 실패 시 null 유지 | 에러 상태 + "다시 시도" |

### 7.4 데이터 패칭

| 패턴 | 파일 예시 | 권장 |
|------|-----------|------|
| useEffect + fetch | curriculum, inventory, notice | React Query 또는 Server Component |
| set-state-in-effect | inventory (eslint-disable) | eslint-disable 유지 또는 queryFn 전환 |
| Promise.all | 대시보드 | 유지 |

---

## 8. 우선순위별 개선 로드맵

### Phase 1: 즉시 적용 (기능 변경 최소)

1. 공통공지 + Common Task 연동 (admin/page.tsx)
2. 대시보드 PC max-w 확장
3. 휴가 날짜 포맷 개선
4. notice handleDelete 에러 피드백
5. 클릭 영역 cursor-pointer 보강 (iiwarmup Overview, centers [id])

### Phase 2: 에러 핸들링 강화

6. fetch 에러 시 Toast 또는 메시지 표시
7. .single() error 분기 (memos, profiles)
8. schedules/centers 초기 fetch 실패 시 에러 UI

### Phase 3: 로딩·성능

9. curriculum, inventory 초기 로딩 스피너
10. admin auth 캐시
11. FullCalendar dynamic import (classes)

### Phase 4: admin/classes 방어 코드

12. handleCloneGroup Date NaN 검사
13. autoFinishSessions teacherId 빈 값 스킵
14. updateStatus 23503 사용자 안내

### Phase 5: DB·스키마 (사용자 실행)

15. **session_count_logs teacher_id FK → public.users**  
    - 마이그레이션: `sql/36_session_count_logs_fk_to_public_users.sql`  
    - 가이드: [docs/PHASE5_DB_마이그레이션_가이드.md](PHASE5_DB_마이그레이션_가이드.md)
16. session_count 중복 방지: `sql/33_session_count_logs_unique_and_cleanup.sql` 적용 시 해결됨

---

## 9. 참조 문서

- [admin_classes_오류분석_및_수업로그.md](admin_classes_오류분석_및_수업로그.md) — 수업 관리·session_count_logs 상세
- [session_count_logs_analysis.md](session_count_logs_analysis.md) — 로그 경로·중복 분석
- [PWA_및_전체_개선_보고서.md](PWA_및_전체_개선_보고서.md) — PWA·ESLint·세션
- `.cursor/plans/coach_app_전반_개선_보완.plan.md` — 전반 개선 계획

---

*문서 버전: v2 | 작성일: 2025-02 | v1 대비: 코드 위치·스니펫, IIWarmup 상세, 리스크 매트릭스, Before/After 예시, 체크리스트 추가*
