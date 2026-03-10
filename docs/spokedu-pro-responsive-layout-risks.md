# 스포키듀 프로 · 반응형 레이아웃 위험 위치 정리

좁은 화면에서 **한 줄 flex + overflow-hidden** 등으로 버튼/클릭 영역이 잘리거나 눌리지 않는 패턴이 있을 수 있는 위치를 정리했습니다.

---

## 이미 수정한 곳

| 파일 | 위치 | 수정 내용 |
|------|------|-----------|
| `app/(pro)/spokedu-pro/views/DataCenterView.tsx` | 원생 카드 1행 | flex 한 줄 → **2행 구조**(정보 행 + 출결/∨/삭제 전용 행)로 변경. 좁은 화면에서도 버튼 클릭 가능. |
| `app/(pro)/spokedu-pro/views/DataCenterView.tsx` | 신체 기능 평가 패널 | 각 항목 행에 `flex-wrap`, `min-w-0`, 버튼 그룹에 `shrink-0` 추가. 하/중/상 버튼이 잘리지 않도록 함. |
| `app/(pro)/spokedu-pro/views/RoadmapView.tsx` | 이번 주 테마·선생님 베스트 헤더 | `flex-wrap`, 제목 `truncate`, 버튼 `shrink-0` 추가. "전체보기" 버튼이 잘리지 않도록 함. |
| `app/(pro)/spokedu-pro/views/AssistantToolsView.tsx` | 팀 나누기 균형도 행 | `flex-wrap`, `gap-3`, 막대에 `min-w-[120px]` 추가. |

---

## 위험 패턴 정리 (추가 점검 시 참고)

**위험한 조합**
- 부모: `overflow-hidden` 또는 `overflow: auto`로 잘림
- 자식: `flex` 한 줄(`flex-wrap` 없음) + 버튼/링크/인풋이 오른쪽에 있음  
→ 뷰포트가 줄면 오른쪽 요소가 잘려 클릭 불가.

**안전하게 만드는 방법**
- 버튼/액션을 담는 영역에 `flex-wrap` 또는 **전용 행**으로 분리.
- 버튼 그룹에 `shrink-0`.
- 필요 시 `min-w-0`으로 flex 자식이 줄어들 수 있게 해서, 버튼이 잘리지 않고 텍스트만 줄이기.

---

## 파일별·위치별 점검 목록

### 1. DataCenterView.tsx
- **카드 루트** (75행): `overflow-hidden` — 이미 카드 내부를 2행 + 신체 패널 wrap으로 수정함. 유지해도 됨.
- **툴바** (228행): `flex flex-wrap` 사용 중 → 위험 낮음.
- **원생 추가 폼** (275행): `flex flex-wrap` → 위험 낮음.

### 2. AIReportView.tsx
- **ReportCard 헤더** (200행): `flex items-start justify-between gap-3` — 좁을 때 "복사/다시 작성" 버튼이 잘릴 수 있음.  
  → 필요 시 `flex-wrap` + 버튼 그룹 `shrink-0`.
- **폼 패널** (398행~): `grid-cols-1 lg:grid-cols-[400px_1fr]` — lg 미만에서 단일 열이라 버튼이 아래로 쌓임. 위험 낮음.
- **신체 기능 태그** (438행): 이미 `flex flex-wrap` → 위험 낮음.

### 3. AssistantToolsView.tsx
- **탭 영역** (288행): `flex` + 탭 버튼들 — `whitespace-nowrap` 사용. 매우 좁으면 탭이 가로 스크롤될 수 있음.  
  → 현재도 동작은 하나, 필요 시 `flex-wrap` 검토.
- **팀 카드 내 이름 행** (168, 192행): `flex justify-between` — 인풋(w-20) + 점수 텍스트. 극단적으로 좁을 때만 문제.  
  → 필요 시 `flex-wrap` 또는 `min-w-0` 적용.
- **스코어보드/스톱워치** (306행): `overflow-hidden` — 탭 콘텐츠 영역. 내부에 한 줄 flex가 많으면 동일 패턴 가능.  
  → 내부 컴포넌트에서 wrap/shrink-0 확인.

### 4. RoadmapView.tsx
- **섹션 헤더 2곳**: 수정 완료 (flex-wrap + shrink-0).
- **ProgramCardRow1/2** (36, 85행): 카드에 `overflow-hidden` — 카드 내부는 대부분 그리드/스택.  
  → 카드 내부에 한 줄 flex + 오른쪽 버튼이 있다면 동일 패턴 점검.

### 5. LibraryView.tsx
- **필터/정렬** (132행): `flex flex-wrap gap-3` → 위험 낮음.
- **상단 버튼** (194행): `flex items-center gap-2 whitespace-nowrap` — 매우 좁으면 버튼이 잘릴 수 있음.  
  → 필요 시 부모에 `flex-wrap` 또는 버튼을 `shrink-0` + 부모 `min-w-0`.

### 6. SpokeduProDrawer.tsx
- **드로어 콘텐츠** (138행): `overflow-hidden` + `max-h-[90vh]`. 내부에 긴 한 줄 flex가 있으면 잘릴 수 있음.  
  → 모달 내 버튼/헤더 행에 `flex-wrap` 또는 `shrink-0` 적용 여부 확인.

### 7. SpokeduProClient.tsx
- **루트** (90행): `overflow-hidden` — 전체 레이아웃용. 뷰 전환이 display 토글이라 직접 원인은 아님.
- **큐레이션 드로어** (147행): `overflow-hidden` — 드로어 내부 스크롤/레이아웃만 점검하면 됨.

### 8. SettingsView.tsx
- **플랜 카드** (200행): `flex flex-wrap gap-4` → 위험 낮음.

### 9. SpokeduProAside.tsx
- **사이드/하단 nav**: 데스크톱은 넓은 사이드바, 모바일은 하단 탭으로 전환. `flex-1` 등으로 공간 나눠서 위험 낮음.

### 10. SpokeduProToolkit.tsx
- **플로팅 패널** (26행): 고정 위치 + 내부 flex. 화면이 줄어도 패널이 작은 영역이라 wrap 필요 시만 적용.

### 11. DashboardCurationEditor.tsx (Admin)
- **헤더** (124행): `flex flex-wrap` → 위험 낮음.

---

## 요약

- **반드시 수정한 곳**: DataCenterView(원생 카드 + 신체 기능 평가), RoadmapView(섹션 헤더), AssistantToolsView(팀 균형도).
- **같은 패턴으로 나중에 점검하면 좋은 곳**: AIReportView ReportCard 헤더, LibraryView 상단 버튼, SpokeduProDrawer 내부, AssistantToolsView 탭/팀 카드 내부.
- **공통 대응**: `flex` 한 줄에 버튼이 오른쪽에 있으면 `flex-wrap` 또는 액션 전용 행 분리 + 버튼 그룹 `shrink-0`, 부모에 `overflow-hidden`이 있으면 자식이 잘리지 않도록 wrap/min-width 조정.
