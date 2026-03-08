# 스포키듀 구독(히든카드) 보완 설계 및 변경 목록

## 0. 목표 재정리

| 구분 | 경로 | 요약 |
|------|------|------|
| 구독자(view) | `/spokedu-pro` | 읽기 전용, 사이드바 숨김, 전체 화면. 데이터는 API GET만. **접근 제어 필수** |
| Admin(edit) | `/admin/spokedu-pro` | 동일 UI + 블록별 편집, DB draft 저장 → Publish로만 구독자 반영. `requireAdmin` 보호 |

---

## 1. 치명적 리스크 보완 요약

| ID | 리스크 | 조치 |
|----|--------|------|
| 1-1 | 링크 은닉만으로 방치 | **접근 정책**: 로그인 필수 + (옵션) 구독 권한. RLS로 공용/테넌트 읽기 명확 분리. 임시로 public read 금지. |
| 1-2 | 공용/개별 데이터 혼재 | **테이블 분리**: `spokedu_pro_content`(공용), `spokedu_pro_tenant_content`(owner_id별). 원생/로드맵/즐겨찾기는 테넌트 전용. |
| 1-3 | 저장 즉시 노출 | **Draft/Publish**: draft_value / published_value(또는 draft_updated_at, published_at). 게시 버튼으로만 구독자 반영. |
| 1-4 | 동시 편집 덮어쓰기 | **낙관적 락**: PATCH 시 `version` 또는 `updated_at` 기반 If-Match. 충돌 시 409 반환. |
| 1-5 | pathname 조건 누적 | **Route group**: `app/(pro)/spokedu-pro/` 사용, 해당 layout에서 sidebar 미렌더. root layout의 hideSidebar 조건 추가하지 않음. |

---

## 2. 데이터/테이블 설계 (MVP 최소 안전)

### 2.1 공용 테이블 `spokedu_pro_content`

- **역할**: 프로그램 카탈로그, 태그 카탈로그, 테마 정의 등 **글로벌(공용)** 데이터만.
- **금지**: 원생, 즐겨찾기, 로드맵, 리포트 상태 등 개별 데이터 저장 금지.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| key | TEXT PRIMARY KEY | 예: catalog_programs, catalog_tags, catalog_themes, report_tags_catalog |
| draft_value | JSONB | Admin이 편집하는 초안 |
| published_value | JSONB | 구독자에게 노출되는 게시본 |
| draft_updated_at | TIMESTAMPTZ | draft 저장 시각 |
| published_at | TIMESTAMPTZ | 마지막 게시 시각 |
| version | INT NOT NULL DEFAULT 0 | 낙관적 락용 (draft 저장 시 증가) |

- **읽기**: 구독자/Admin 모두 **published_value**만 조회. Admin 편집 UI는 **draft_value** 사용.
- **쓰기**: Admin만 PATCH(draft), POST publish(draft → published, version 정합성).

### 2.2 테넌트 테이블 `spokedu_pro_tenant_content`

- **역할**: 로드맵(이번 주 4개 등), 즐겨찾기, 원생 목록/기록, 리포트 설정 등 **사용자(또는 센터)별** 데이터.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PRIMARY KEY | gen_random_uuid() |
| owner_id | UUID NOT NULL | auth.uid() 또는 center_id (MVP는 user id 권장) |
| key | TEXT NOT NULL | tenant_roadmap, tenant_favorites, tenant_students, tenant_report_config 등 |
| draft_value | JSONB | |
| published_value | JSONB | |
| draft_updated_at | TIMESTAMPTZ | |
| published_at | TIMESTAMPTZ | |
| version | INT NOT NULL DEFAULT 0 | |

- **UNIQUE**: (owner_id, key).
- **RLS**: owner_id = auth.uid() (또는 소속 center)로 read/write 제한.

### 2.3 RLS 정책 요약

- **spokedu_pro_content**
  - SELECT: 로그인 사용자만 published_value 읽기 가능 (또는 구독 권한 있는 사용자만). **Public read 금지.**
  - UPDATE/INSERT: service_role 또는 admin 전용 API에서만. (RLS에서 admin 체크 가능하면 admin만)
- **spokedu_pro_tenant_content**
  - SELECT: owner_id = auth.uid() 인 행만.
  - INSERT/UPDATE: owner_id = auth.uid() 인 행만.

---

## 3. API 설계 (필요한 만큼만 로드)

- **한 번에 다 받기 금지**. 뷰별로 필요한 keys만 요청.

| 메서드 | 경로 | 권한 | 용도 |
|--------|------|------|------|
| GET | /api/spokedu-pro/content?scope=public&keys=hero,theme,roadmap | 로그인(또는 구독 권한) | 홈/대시보드용 공용 published |
| GET | /api/spokedu-pro/content?scope=catalog&keys=programs,tags,themes | 로그인 | 뱅크/라이브러리 진입 시 |
| GET | /api/spokedu-pro/tenant?keys=roadmap,favorites,students,report | 로그인(본인) | 테넌트 published |
| PATCH | /api/spokedu-pro/content | requireAdmin | 공용 draft 저장. body: { key, value?, version? } |
| PATCH | /api/spokedu-pro/tenant | 로그인(본인) | 테넌트 draft 저장 (owner_id = auth) |
| POST | /api/spokedu-pro/publish | requireAdmin | 공용 draft → published 반영 |
| POST | /api/spokedu-pro/tenant/publish | 로그인(본인) | 테넌트 draft → published |

- **PATCH**: If-Match 또는 body에 `expectedVersion` 포함. 서버에서 version 불일치 시 409 Conflict.
- **스키마 검증**: key별로 서버에서 Zod 등으로 value 검증 후 저장.

---

## 4. 클라이언트 구조 (거대 단일 state 방지)

- **SpokeduProClient** 하나에 모든 state를 두지 않음.
- **훅 분리**:
  - `useSpokeduProContent(scope, keys)`: GET/PATCH, 로딩/에러, 캐시. (공용)
  - `useSpokeduProTenant(keys)`: 테넌트 데이터, 본인만.
  - `useSpokeduProUI()`: viewId, drawer 열림, toast 등 UI 상태.
- **Admin isEditMode**: true일 때만 편집 버튼/입력/모달 표시. View 모드에서는 전부 제거.
- **지연 로딩**: 홈에서는 roadmap/theme/hero만; 뱅크 진입 시 programs; 원생 진입 시 students.

---

## 5. 접근 제어 (/spokedu-pro)

- **최소 1개 적용** (현재: A 적용)
  - **A) 로그인 + 구독 권한 체크**: `/spokedu-pro` 진입 시 세션 확인. 없으면 `/login` 리다이렉트. (구독 권한은 profiles 플래그 또는 별도 테이블로 추후 확장)
  - B) 서명 토큰: 추후 초대 링크 방식 시 선택 적용.
- **RLS**: 공용 테이블도 “authenticated” 이상에서만 read. Public read 금지.

---

## 6. 구현 우선순위 (갈아엎기 방지)

1. **레이아웃 분리**: Route group `(pro)` 생성, `app/(pro)/spokedu-pro/layout.tsx`에서 sidebar 미렌더. root layout의 hideSidebar에 pathname 추가하지 않음.
2. **데이터 구조**: SQL 마이그레이션 — spokedu_pro_content, spokedu_pro_tenant_content, RLS, draft/publish, version.
3. **Draft/Publish + 낙관적 락**: API에서 PATCH(draft), POST(publish), version 검사 및 409 처리.
4. **접근 제어**: /spokedu-pro 미들웨어 또는 레이아웃에서 로그인 체크, 미인증 시 /login.
5. **API**: GET scoped (public/catalog/tenant), PATCH/POST, key별 스키마 검증(Zod).
6. **클라이언트**: 훅 분리 후 컴포넌트/스타일/편집 UI.

---

## 7. 변경 목록 (체크리스트)

### 보안/권한
- [x] `/spokedu-pro` 접근 정책 구현 (로그인 필수. (pro)/layout에서 세션 체크 후 /login 리다이렉트)
- [x] RLS: 공용/테넌트 테이블 정책 없음 → API 전용(service_role만). public read 금지.
- [x] 테넌트 API: owner_id = auth.uid() 로만 조회/수정

### 데이터 분리
- [x] 프로그램/태그/테마 = 공용 테이블(spokedu_pro_content)만
- [x] 로드맵/즐겨찾기/원생/리포트 = 테넌트 테이블(spokedu_pro_tenant_content, owner_id)
- [x] 공용 스키마에 tenant 전용 key 없음 (schemas.ts allowlist)

### 운영 안정성
- [x] Draft/Publish 동작 (draft_value / published_value, POST content/publish, tenant/publish)
- [x] PATCH 충돌 감지 (version 기반 expectedVersion), 409 응답
- [x] key별 스키마 검증 (Zod: contentKeySchema, tenantKeySchema, contentValueSchema)

### 성능
- [x] GET content: scope=public | catalog, keys=... 로 필요한 키만 요청
- [x] GET tenant: keys=... 로 필요한 키만 요청
- [ ] 클라이언트: 홈/뱅크/원생 진입별 지연 로딩 (훅은 준비됨, 뷰 연동 시 적용)

### 유지보수
- [x] Sidebar 숨김: fullscreen-paths.ts 단일 목록 + isFullscreenPath(), (pro) route group 사용
- [x] SpokeduProClient 비대화 방지: useSpokeduProContent, useSpokeduProUI, useSpokeduProTenant 훅 분리

---

## 8. 파일/폴더 변경 목록

| 작업 | 경로 |
|------|------|
| 신규 | `app/(pro)/spokedu-pro/layout.tsx` — sidebar 미렌더, 로그인 리다이렉트(또는 미들웨어) |
| 신규 | `app/(pro)/spokedu-pro/page.tsx` — 구독자 view 페이지 |
| 신규 | `app/admin/spokedu-pro/page.tsx` — Admin 편집 페이지 (기존 admin layout 사용) |
| 신규 | `sql/49_spokedu_pro_content.sql` — 공용 + 테넌트 테이블, RLS, draft/publish, version |
| 신규 | `app/api/spokedu-pro/content/route.ts` — GET(scoped), PATCH(admin), POST publish(admin) |
| 신규 | `app/api/spokedu-pro/tenant/route.ts` — GET, PATCH(본인) |
| 신규 | `app/api/spokedu-pro/tenant/publish/route.ts` — POST(본인) |
| 신규 | `app/lib/spokedu-pro/schemas.ts` — key별 Zod 스키마 |
| 신규 | 훅: `useSpokeduProContent`, `useSpokeduProUI`, `useSpokeduProTenant` |
| 수정 | root layout: pathname으로 hideSidebar 조건 **추가하지 않음** (pro는 (pro) layout에서 처리) |

이 순서대로 구현하면 상용화 단계 리스크를 최소화할 수 있습니다.
