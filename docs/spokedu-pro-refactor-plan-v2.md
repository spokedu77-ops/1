# 스포키듀 구독 v2 설계 (Center 기반 멀티테넌트)

v1(owner_id)에서 v2(center_id)로 승격, free/pro 게이팅, 데이터 분리(센터 vs 유저) 반영.

---

# Decision Log (v2 고정 정책)

D1. **activeCenter 쿠키 정책**
- cookie name: `spokedu_active_center_id`
- httpOnly: true
- sameSite: lax
- secure: production에서 true
- path: `'/'` 로 고정 (API 및 향후 pro 영역 확장 고려)
- 검증 규칙: 쿠키 값이 있어도, 반드시 `spokedu_center_members` 소속 검증 후 사용.
  - 검증 실패 시: 사용자의 첫 센터로 재설정 + 쿠키 갱신

D2. **인증/리다이렉트 일원화**
- context API는 인증 실패 시 항상 **401만** 반환한다.
- `/login` 리다이렉트는 **(pro) layout에서만** 처리한다. (다른 곳에서 redirect 금지)
- 클라이언트는 401을 받으면 "로그아웃 상태"로 간주하고 layout 흐름에 따른다.

D3. **Draft/Publish 버전 정책(Optimistic Lock)**
- `version`은 **"draft PATCH에서만"** 증가한다.
- publish는 `published_value` / `published_at`만 갱신한다. (version 증가 없음)
- 409 Conflict는 **draft PATCH에서만** 발생한다.
- publish 충돌이 필요해지면 v3에서 `published_version`을 별도로 도입한다.

D4. **Free일 때 view/center 응답 형태(403 vs 200)**
- 읽기 API(view/center)는 free일 때 **200**을 반환하되,  
  `{ reason: 'pro_required', data: null }` 형태로 통일한다.
- 쓰기 API(PATCH/PUT)는 free일 때 **403**을 반환한다.
- UI는 `reason`을 보고 PaywallPanel을 표시한다.

D5. **Free 뱅크 샘플 정의 방식**
- 단순 limit N이 아니라, "무료 공개 프로그램"은 운영이 선택 가능해야 한다.
- catalog에 **`free_sample_program_ids`** 키를 추가하고, free일 때는 해당 ID만 반환한다.
- pro일 때는 전체 programs 반환.

D6. **Row2 teaser 스키마(Free)**
- 대시보드 Row2는 free에서 "잠금 카드"로 노출한다.
- API 응답 형태(권장):  
  `row2: { items: Array<{ id: string|number, title: string, theme: string, role: string, locked: true }>, label: 'PRO 추천' }`
- pro일 때는 `locked` 없이 동일 스키마로 반환한다(locked 필드 생략 또는 false).

D7. **v1 tenant API 호환/폐기 정책**
- v2 출시 직후에는 v1 endpoint를 유지하되 내부적으로 activeCenter 기반 v2 로직으로 라우팅(alias)한다.
- 문서에 deprecation 마감일을 명시한다:  
  **Deprecated: 2026-06-01 이후 v1 tenant API 제거**
- 클라이언트는 즉시 v2(view/center, view/user)로 전환한다.

D8. **Lazy migration key 매핑 표(고정)**
- v1(owner_id) tenant_content → v2(center_id) center_content로 이관할 때 key 매핑은 아래로 고정한다.
  - `tenant_roadmap` → center_content.`roadmap`
  - `tenant_students` → center_content.`students`
  - `tenant_reports` → center_content.`reports`
  - `tenant_report_config` → center_content.`report_config`
  - `tenant_favorites` → user_data.`favorites`
- 이관은 "처음 center 생성 시 1회" lazy migration으로 수행하며, 원본 삭제는 하지 않는다.

D9. **센터 전환 시 캐시 무효화 규칙(중요)**
- 모든 SWR/React Query/커스텀 캐시 키에 **activeCenterId를 포함**한다.
  - 예: `['center', activeCenterId, keys]` / `['dashboard', activeCenterId, keys]`
- activeCenter 변경 시 center-scope 데이터는 전부 리셋/재요청한다.
- 이를 문서 및 코드 주석에 명시한다.

D10. **전역 admin vs 센터 admin 권한 계층**
- 기본값:
  - **전역 requireAdmin**: 모든 센터의 blocks 수정/게시 가능(운영 대행/복구 필요)
  - **센터 owner/admin**: 자기 센터 blocks 수정/게시 가능
  - **센터 coach**: 운영 데이터(students/reports 입력)는 허용(권장), blocks publish는 불가
- 구현 시 권한 체크 함수로 일원화한다.

---

## v2 테이블 요약 (50, 51)

- **50**: `spokedu_centers`, `spokedu_center_members`, `spokedu_center_subscriptions` (RLS on, 정책 없음)
- **51**: `spokedu_pro_center_content`, `spokedu_pro_user_data` (RLS on, 정책 없음)

## v2 API 요약

- GET `/api/spokedu-pro/context` — activeCenter, centers, role, entitlement, billing (401 when unauthenticated)
- POST `/api/spokedu-pro/context/select-center` — body `{ centerId }`, 쿠키 갱신
- GET `/api/spokedu-pro/view/center?keys=...` — activeCenterId 검증, free 시 D4 응답
- PATCH `/api/spokedu-pro/center/blocks` — owner/admin 또는 전역 admin
- POST `/api/spokedu-pro/center/publish` — 동일
- GET `/api/spokedu-pro/view/user?keys=favorites`
- PATCH `/api/spokedu-pro/user` — favorites 등

---

## 변경 이력 (Decision Log 반영 시)

- **문서**: Decision Log D1–D10 추가. v1 tenant deprecation 2026-06-01 명시.
- **spokeduProContext.ts**: 쿠키 옵션(path='/'), getActiveCenterIdFromCookie, getCenterMemberRole, requireCenterMember, requireCenterAdmin, V1_TO_V2_KEY_MAP, copyV1TenantToV2 추가.
- **context API**: GET 401만 반환. select-center POST 쿠키 path='/' 적용.
- **content/tenant**: POST publish에 D3 주석(version 증가 없음). tenant 라우트에 D7 deprecation 주석.
- **layout**: D2 주석(리다이렉트는 layout에서만).
- **schemas**: free_sample_program_ids 추가(D5).
- **useSpokeduProContent**: activeCenterId 의존성 및 D9 주석.

---

## v4 대시보드 큐레이션 (2025-03)

**정체성**: 대시보드 2줄(4+4) + 테마 1개(4개 묶음) + 카드 태그 2개 + 전체보기 + Admin 5분 발행(저장 즉시 반영).

### 변경 파일 목록

- `app/lib/spokedu-pro/schemas.ts` — TENANT_KEYS에 `dashboard_v4` 추가.
- `app/lib/spokedu-pro/dashboardDefaults.ts` — 신규: THEME_KEYS, THEME_LABELS, ROW1_ROLES, DashboardV4 타입, DEFAULT_DASHBOARD_V4, PROGRAM_BANK, getProgramTitle.
- `app/api/spokedu-pro/dashboard/route.ts` — 신규: GET owner_id 기준 `spokedu_pro_tenant_content.dashboard_v4` published_value 반환, 없으면 기본값.
- `app/(pro)/spokedu-pro/hooks/useSpokeduProDashboard.ts` — 신규: useSpokeduProDashboard(), fetchDashboard.
- `app/(pro)/spokedu-pro/views/RoadmapView.tsx` — 2줄(4+4), Hero(테마 1개), 태그 2개, 전체보기, `spokedu-pro-dashboard-saved` 이벤트 리스너.
- `app/(pro)/spokedu-pro/SpokeduProClient.tsx` — drawerContext/libraryPreset 상태, onOpenDetail(id, context), onGoToLibrary(themeKey, preset), Drawer에 role/themeKey 전달, LibraryView에 initialPreset.
- `app/(pro)/spokedu-pro/components/SpokeduProDrawer.tsx` — role, themeKey props 추가, 상단에 역할·테마 표시.
- `app/(pro)/spokedu-pro/views/LibraryView.tsx` — initialPreset 적용, 테마 탭 활성화(themeKey/preset=best), onOpenDetail(id, context?) 시그니처.
- `app/admin/spokedu-pro/page.tsx` — DashboardCurationEditor 상단 배치.
- `app/admin/spokedu-pro/components/DashboardCurationEditor.tsx` — 신규: 테마 제목/부제/themeKey, Row1 4슬롯(programId, role, tag2), Row2 4슬롯, 저장 시 PATCH tenant + 이벤트 발행.

### 동작 확인 방법

1. **Admin에서 저장**  
   `/admin/spokedu-pro` 접속 → 큐레이션 편집(테마 제목, themeKey, Row1/Row2 프로그램·태그) → 저장 버튼 클릭 → "저장되었습니다" 메시지 확인.
2. **구독자에서 반영**  
   `/spokedu-pro`(또는 동일 브라우저에서 구독자 보기) 새로고침 → 대시보드 Row1/Row2에 방금 저장한 내용 표시.
3. **전체보기 필터**  
   대시보드 Row1 또는 Row2 "전체보기" 클릭 → 프로그램 뱅크 뷰로 이동 후 해당 테마 탭(또는 베스트) 활성화 여부 확인.
4. **Drawer 역할/테마**  
   Row1 카드 클릭 → Drawer 상단에 "역할: Intro · 테마: speed-reaction" 등 표시 확인.

### 남은 TODO

- 프로그램 목록: 현재 PROGRAM_BANK(1~100 더미) 사용. 실제 catalog/DB 연동 시 교체.
- 태그 자동 추천: 프로그램별 tags에서 상위 2개 자동 채우기(Admin 편집 시 선택).
- center_id 기반 전환: 현재 dashboard_v4는 owner_id(테넌트) 기준. 센터별 발행이 필요하면 API/훅에서 center_id 조건으로 변경.
- Paywall/read-only: isReadOnly일 때 Admin publish 비활성화 등 UI 정책은 v4 범위 외; 필요 시 추가.
