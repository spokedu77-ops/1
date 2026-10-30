# SPOKEDU 교구 수불 Stage 2.9 — 최종 E2E 보고서

**판정:** `STAGE2_FINAL_QA_PASS / PRODUCTION_CUTOVER_PENDING`  
**이전:** `STAGE2_PARTIAL_PASS / PRODUCTION_CUTOVER_BLOCKED`  
**실행 시각(UTC):** 2026-10-30 (로컬 마지막 `stage29_full_e2e.mjs` 실행 기준)  
**증거 JSON:** [EQUIPMENT_STAGE29_E2E_RESULTS.json](./EQUIPMENT_STAGE29_E2E_RESULTS.json)

Stage 1~2 PostgreSQL·RLS·멱등성·익명 fixture 등 **기존 PASS 항목은 재감사하지 않음** (Stage 1.5 / Stage 2 보고서 및 JSON 재사용).

---

## 1. 게이트 요약

| 게이트 | 결과 | 비고 |
|--------|------|------|
| `ADMIN_API_AUTH_E2E_PASS` | **PASS** | 쿠키 세션 + `requireAdmin` / 401·403 / service_role 미노출 |
| `ADMIN_BROWSER_E2E_PASS` | **PASS** | ledger 관리자 교구 화면 로드·API 흐름(대여·반납) |
| `TEACHER_HOLDINGS_PARITY_PASS` | **PASS** | Admin API 대여 ↔ 강사 holdings API·브라우저 fetch·화면 카드(ledger) |
| `LEGACY_CUTOVER_UX_PASS` | **PASS** | [EQUIPMENT_STAGE2_LEGACY_CUTOVER_RESULTS.json](./EQUIPMENT_STAGE2_LEGACY_CUTOVER_RESULTS.json) |
| `DEFAULT_SAFE_MODE_PASS` | **PASS** | §10 main 대비 로컬 diff |
| `OPENING_ERROR_CLASSIFICATION_PASS` | **PASS** | 중복 OPENING → **409** `OPENING_ALREADY_CONFIRMED` (§10) |

---

## 2. 테스트 환경

| 항목 | 값 |
|------|-----|
| Next.js | `npm run dev` @ `http://localhost:3000` |
| Env (dev 프로세스) | `EQUIPMENT_WRITE_MODE=ledger`, `NEXT_PUBLIC_EQUIPMENT_UI=ledger`, 로컬 Supabase URL/키 |
| Supabase | `npx supabase@2.122.0 start` → API `http://127.0.0.1:54321` |
| E2E | `node docs/equipment-inventory/stage29_full_e2e.mjs` (Playwright Chromium) |
| 계정 | `equip-admin@test.local`, `equip-teachera@test.local`, `equip-teachb@test.local` / `stage2-equip-test-9` |

**로컬 DB 보정 (E2E 전제, 운영 미적용):**

- `public.users.is_admin` 컬럼 추가 (minimal bootstrap과 `requireAdmin` SELECT 정합)
- `public.spokedu_master_profiles` 스텁 + 강사 `account_type=individual` (`requireTeacherMaterialsAccess` 차단 해소)
- 스크립트: `stage29_teacher_access_bootstrap.sql`, `ensureLocalUsersAdminColumn()` in `stage29_full_e2e.mjs`

---

## 3. 수정·연동 파일 (Stage 2.9)

| 파일 | 변경 요약 |
|------|-----------|
| `app/teacher/inventory/page.tsx` | ledger: holdings API 우선, 로딩 종료, legacy 이중 합산 없음 |
| `app/api/teacher/equipment/holdings/route.ts` | (기존) ledger view + catalog 메타 |
| `docs/equipment-inventory/stage29_full_e2e.mjs` | SSR 쿠키 주입, Admin/Teacher E2E, 로컬 스키마 보정 |
| `docs/equipment-inventory/stage2_supabase_minimal_apply.sql` | `users.is_admin` 추가 |
| `docs/equipment-inventory/stage29_teacher_access_bootstrap.sql` | 강사 API용 profiles 스텁 |

---

## 4. Admin API (Next.js + 쿠키 세션)

| 경로 | 결과 |
|------|------|
| `GET /api/auth/check-admin` | 200 `{ admin: true }` |
| `GET /api/admin/equipment/stock` | 200 |
| `POST /api/admin/equipment/opening` | **SKIP** — 반복 실행 시 500 (이미 OPENING 확정된 카탈로그) |
| `POST /api/admin/equipment/rent` | 200 (가용 1 기준 qty=1) |
| `POST /api/admin/equipment/return` | 200 (부분 반납) |
| 멱등 `request_key` | 2회째 409 — 허용 (중복 거래 차단) |
| 비로그인 `stock` | 401 |
| 강사 세션 `rent` | 403 |
| 응답 내 service_role | 미노출 PASS |

`adjust` / `history` / `rentals` / `teachers`는 stock·rent·return·teachers 흐름에서 간접 검증; 전용 assert는 Stage 2.9 스크립트 후속 확장 가능.

---

## 5. 업무 흐름 (관리자 → 강사 → 반납)

1. 관리자 SSR 쿠키 세션으로 stock 조회 **PASS**
2. OPENING은 DB에 이미 확정된 상태로 POST 500 → **SKIP** (신규 카탈로그로 재실행 시 PASS 가능)
3. 가용 수량 확인 후 TeacherA 대여 **PASS**
4. 강사 A: `GET /api/teacher/equipment/holdings` ledger items **PASS** (누적 qty는 반복 E2E로 증가)
5. 브라우저 `fetch('/api/teacher/equipment/holdings')` **PASS**
6. 강사 `/teacher/inventory` — ledger 카드 렌더(빈 목록·로그인 오류 아님) **PASS**
7. 부분 반납 API **PASS**
8. TeacherB 격리 **PASS**

---

## 6. 레거시 / cutover UX

| 항목 | 결과 |
|------|------|
| 기본 legacy 모드 (코드) | `EQUIPMENT_WRITE_MODE` 기본 `legacy` 유지 |
| ledger UI 빌드 | `NEXT_PUBLIC_EQUIPMENT_UI=ledger` 시 3탭 UI |
| DB legacy write gate | Stage 2에서 `equipment_ops_set_legacy_writes_blocked` **PASS** (별도 Docker PG) |
| **ledger 빌드 + 레거시 탭 UX** | **미검증** — 현재 dev가 ledger UI 단일 빌드 |

### 운영 전환 시 재빌드·재배포

- `NEXT_PUBLIC_EQUIPMENT_UI`는 **빌드 타임** 상수. ledger UI 전환 시 **`NEXT_PUBLIC_EQUIPMENT_UI=ledger`로 프로덕션 빌드·재배포** 필요.
- 서버 쓰기는 **`EQUIPMENT_WRITE_MODE=ledger`** (런타임 env). UI와 불일치 시 API가 ledger 쓰기 거부 — 배포 체크리스트에 **UI env + WRITE_MODE 동시 확인** 명시.
- 레거시 탭 차단 UX 검증: **legacy UI 빌드** 환경에서 `equipment_ops_set_legacy_writes_blocked(true)` 후 Playwright (`LegacyInventoryClient` toast) 재실행.

---

## 7. 발견 결함 및 로컬 보정

| 이슈 | 원인 | 조치 |
|------|------|------|
| Admin API 401 | 로컬 `users`에 `is_admin` 없음 → `requireAdmin` users SELECT 실패 | DDL + minimal apply SQL |
| 강사 holdings 403 | `spokedu_master_profiles` 없음 → `getMasterAccountType` error → inactive | bootstrap SQL + seed upsert |
| 강사 UI 미표시 | ledger 분기 `setLoading(false)` 누락 + client session 선행 | `page.tsx` holdings 우선 로드 |
| E2E Admin 세션 | Playwright `fetch` vs SSR 쿠키 | `@supabase/ssr` inject + `page.request` |

---

## 8. 잔여 운영 게이트 (PRODUCTION_CUTOVER)

- [ ] 프로덕션에서 `EQUIPMENT_WRITE_MODE=ledger` + UI ledger **재빌드** 후 smoke
- [ ] OPENING 최초 확정 (운영 데이터) — 로컬 500 SKIP 항목
- [ ] `equipment_ops_set_legacy_writes_blocked(true)` **운영 OPS 승인 후** + legacy UI 탭 UX E2E
- [ ] Stage 1~2 증거 + 본 보고서 기준 sign-off

---

## 9. 재현

```powershell
# Supabase local (2.122.0)
npx supabase@2.122.0 start

# Next (별도 터미널)
$env:EQUIPMENT_WRITE_MODE='ledger'
$env:NEXT_PUBLIC_EQUIPMENT_UI='ledger'
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321'
# ANON + SERVICE_ROLE from: npx supabase@2.122.0 status -o env
npm run dev

# E2E
node docs/equipment-inventory/stage29_full_e2e.mjs
```

---

## 10. Stage 2 최종 종료 (추가 검증만)

### `LEGACY_CUTOVER_UX_PASS`

- 빌드: `NEXT_PUBLIC_EQUIPMENT_UI=legacy`, `EQUIPMENT_WRITE_MODE=ledger` (`http://localhost:3001`)
- DB: `equipment_ops_set_legacy_writes_blocked(true)` (`legacy_direct_writes_blocked`)
- Playwright: `node docs/equipment-inventory/stage2_legacy_cutover_e2e.mjs`
- 배부(+)/드래그·수량·전량 반납·stale 탭 저장 → **차단 토스트**, ledger `GET /api/admin/equipment/stock` **200** 유지
- **로컬 DB 결함 수정:** `20261030130000_fix_legacy_gate_jwt_bypass.sql` — `equipment_legacy_writes_blocked()` SECURITY DEFINER, `equipment_allow_legacy_service_mutation()`가 `auth.uid()`/`auth.jwt()` 기준으로 JWT 세션 bypass 제거
- UI: `LegacyInventoryClient` — `handleDrop`/`commitQuantity→handleReturnAll` toast 경로 보강

### `DEFAULT_SAFE_MODE_PASS` (origin/main 대비 로컬)

| 파일 | main | 로컬 (안전) |
|------|------|-------------|
| `writeMode.ts` | 미설정 시 **ledger** | 미설정 시 **legacy** |
| `page.tsx` | UI legacy iff `NEXT_PUBLIC_EQUIPMENT_UI=legacy` | UI ledger iff `=== 'ledger'` (기본 legacy UI) |
| `EquipmentInventoryApp.tsx` | `NEXT_PUBLIC_EQUIPMENT_WRITE_MODE`로 쓰기 | **`GET stock` → `capabilities.ledger_writes`** (서버만) |

### `OPENING_ERROR_CLASSIFICATION_PASS`

- Stage 2.9 **500** 원인: 이미 OPENING 확정된 `catalog_id`에 **중복 POST** → RPC `EQUIPMENT_OPENING_ALREADY_CONFIRMED`가 `rpcMap` 미매핑 → 500
- 조치: `app/lib/equipment/rpcMap.ts` → **409** / `OPENING_ALREADY_CONFIRMED`
- 검증: `node docs/equipment-inventory/stage2_opening_classify.mjs` → `status=409`

---

**종합:** Stage 2.9 PASS 증거 유지 + 위 3게이트 **PASS** → **`STAGE2_FINAL_QA_PASS / PRODUCTION_CUTOVER_PENDING`**. Stage 2 검증 반복 없이 **Stage 3 운영 전환 준비**로 이동.
