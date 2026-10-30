# SPOKEDU 교구 수불 — Stage 1.5 검증·보정 보고 (2026-10-30)

**기준:** [EQUIPMENT_DESIGN_FINAL_20261030.md](./EQUIPMENT_DESIGN_FINAL_20261030.md)  
**선행:** [EQUIPMENT_STAGE1_LOCAL_IMPLEMENTATION_REPORT.md](./EQUIPMENT_STAGE1_LOCAL_IMPLEMENTATION_REPORT.md)

## 최종 판정

**`LOCAL_DB_INTEGRATION_PASS` / `PRODUCTION_CUTOVER_BLOCKED`**

- 격리 Docker PostgreSQL에서 Expand 마이그레이션·RPC·6단계 수량 시나리오·멱등·동시성·OPENING 게이트 **PASS** (증거: [EQUIPMENT_STAGE15_DB_INTEGRATION_RESULTS.json](./EQUIPMENT_STAGE15_DB_INTEGRATION_RESULTS.json), 실행기: `stage15_db_integration.mjs`).
- 운영 Supabase 마이그레이션·ledger write·OPS_ACTIVATION·RLS E2E(역할별 JWT)·렌더 회귀 QA는 **미완** → cutover **차단** 유지.

---

## 1. 배포 안전장치 (코드 검증·로컬 보정)

| 항목 | 결과 | 근거 |
|------|------|------|
| 신규 원장 쓰기는 명시적 서버 설정 시만 | **PASS (보정 후)** | `EQUIPMENT_WRITE_MODE=ledger`일 때만 `isLedgerWriteMode()` true. 미설정·기타 값 → **legacy** (`app/lib/equipment/writeMode.ts`, `writeMode.test.ts`). |
| env 누락 시 legacy 운영 유지 | **PASS (보정 후)** | Stage 1은 기본값이 ledger였음 → **legacy 기본**으로 수정. POST `/api/admin/equipment/*` → 403. |
| 신규 UI는 준비된 env에서만 | **PASS (보정 후)** | `NEXT_PUBLIC_EQUIPMENT_UI=ledger`일 때만 3탭 UI. **미설정 시 LegacyInventoryClient** (`page.tsx`). |
| 브라우저 공개 env만으로 쓰기 통제 금지 | **PASS (보정 후)** | `NEXT_PUBLIC_EQUIPMENT_WRITE_MODE` UI 게이트 **제거**. `GET /api/admin/equipment/stock` → `capabilities.ledger_writes` (서버 `EQUIPMENT_WRITE_MODE`만). |
| OPENING 미확정 시 신규 대여 차단 | **PASS (보정 후)** | `admin_equipment_rent` → `EQUIPMENT_OPENING_NOT_CONFIRMED`. 기초 확정 RPC `admin_equipment_opening_balance` 추가 (마이그레이션). |
| `CatalogEditorModal` T/Q 직접 수정 | **PASS** | payload에 `qty_on_hand_total` / `qty_quarantine` **없음** — 메타·`mgmt_code`만 (`CatalogEditorModal.tsx`). |
| legacy `inventory` direct write 우회 | **위험 잔존 (설계대로 go-live 전)** | `LegacyInventoryClient`·`teacher/inventory`는 여전히 브라우저 `supabase.from('inventory')` INSERT/UPDATE 가능. ledger 전환 후 **inventory RLS/trigger deny 미구현** (설계 §9 이중 쓰기 방지). 신규 UI 기본 off → 운영 기본 경로는 legacy. |
| 서버·DB·기능 플래그 구분 | **PASS (문서화)** | **플래그:** `EQUIPMENT_WRITE_MODE`(서버 쓰기), `NEXT_PUBLIC_EQUIPMENT_UI`(UI만). **DB:** RPC EXECUTE → `service_role` only (DB 테스트 PASS). **API:** `requireAdmin()` + service RPC. |

---

## 2. 테스트 환경

| 수단 | 상태 |
|------|------|
| Docker Desktop | **사용** (초기 daemon off → 기동 후 성공) |
| Supabase CLI | **미설치** — 로컬 `supabase db` 대신 Docker `postgres:16-alpine` + bootstrap SQL |
| 운영 Supabase | **미접촉** (지시 준수) |

---

## 3. 마이그레이션 검증

| 항목 | 결과 |
|------|------|
| 깨끗한 DB + bootstrap + expand | **PASS** |
| 동일 DB 재적용 | **PASS** (`equipment_event_type` duplicate → DO block으로 idempotent 처리 추가) |
| legacy 테이블 보존 | **PASS** (bootstrap에 inventory 등 shell, DDL drop 없음) |
| RPC + REVOKE authenticated / GRANT service_role | **PASS** |
| CHECK·FK·UNIQUE | **정적 PASS** (마이그레이션 정의); rental outstanding 일관성 CHECK 포함 |
| RLS 정책 | **마이그레이션 적용 PASS**; **역할별 JWT E2E** → NOT_VERIFIED |
| 운영 48 catalog + 666 inventory expand | **NOT_VERIFIED** (minimal bootstrap만) |

---

## 4. 필수 수불 시나리오 (농구공 T=10)

6단계 표 — DB 스크립트 **전 단계 PASS**, 각 단계 `T = L + Q + A` assert.

| # | 작업 | 검증 |
|---|------|------|
| 1 | 기초재고 (`admin_equipment_opening_balance`) | PASS |
| 2–6 | 대여·반납·격리 | PASS |
| 재대여 별 `rental_id` | PASS |
| 부분 반납 | PASS |
| 초과 반납 | PASS |
| 종료 대여 중복 반납 | PASS |
| `request_key` replay / conflict | PASS |
| 동시 대여 가용 초과 | PASS (직렬 2 RPC; row lock 기반) |
| 트랜잭션 중 오류 전체 롤백 | **NOT_VERIFIED** (의도적 실패 주입 테스트 없음) |
| `RETURN_REQUESTED` | **N/A** (Phase 2 optional, 미구현) |
| 캐시 불일치 탐지·복구 | **NOT_VERIFIED** (`reconcile_catalog_cache` 미구현) |
| OPENING vs RENT ledger 구분 | PASS (event_type count) |

---

## 5. 권한 검증

| 항목 | 결과 |
|------|------|
| RPC EXECUTE authenticated 차단 | **PASS** (DB) |
| RPC EXECUTE service_role 허용 | **PASS** (DB) |
| API `requireAdmin` | **정적 PASS** (모든 equipment POST/GET admin routes) |
| 강사 holdings view RLS | **NOT_VERIFIED** (JWT role 시뮬레이션 없음) |
| `SUPABASE_SERVICE_ROLE_KEY` 브라우저 노출 | **PASS** (grep: 클라이언트 번들에 SERVICE_ROLE 패턴 없음; 서버 `adminAuth` only) |

---

## 6. 기존 기능 회귀

| 항목 | 결과 |
|------|------|
| legacy admin/teacher inventory | **NOT_VERIFIED** (수동·렌더 QA 미실시) |
| 신규 3탭 UI 반응형 | **NOT_VERIFIED** |
| 이미지 업로드 | **NOT_VERIFIED** (API 변경 없음 — 정적) |

---

## 7. Vitest

| suite | 결과 |
|-------|------|
| equipment (기존 + `writeMode.test.ts`) | **로컬 실행 생략** (지시: 9개 PASS만으로 대체 불가; DB 통합으로 보완) |

---

## 8. Stage 1.5 코드·SQL 변경 (로컬, 미커밋)

- `app/lib/equipment/writeMode.ts` — default **legacy**, explicit ledger
- `app/lib/equipment/writeMode.test.ts` — 신규
- `app/lib/equipment/rpcMap.ts` — OPENING / closed rental 매핑
- `app/api/admin/equipment/stock/route.ts` — `capabilities.ledger_writes`
- `app/admin/inventory/EquipmentInventoryApp.tsx` — 서버 capabilities 기반 UI
- `app/admin/inventory/page.tsx` — UI opt-in `NEXT_PUBLIC_EQUIPMENT_UI=ledger`
- `supabase/migrations/20261030120000_equipment_ledger_expand.sql` — OPENING RPC, rent gate, enum idempotent, opening balance
- `docs/equipment-inventory/stage15_*` — bootstrap, integration script, JSON 결과

---

## 9. 잔여 위험 (cutover 차단 사유)

1. **OPS_ACTIVATION** 미완 (실사·OPENING batch·4+19 orphan).
2. **inventory direct write** ledger go-live 시 deny 미구현.
3. **운영 스키마 expand** 실 DB smoke 미실시.
4. **RLS·강사 조회** JWT E2E 미실시.
5. **opening balance** 운영 API route 없음 — service RPC 직접/배치 전용 (의도적; UI에서 T+1 adjust는 OPENING 이후 운영 조정용).

---

## 10. 권장 env (로컬 ledger 개발)

```env
# 서버 — 쓰기 활성 (명시적)
EQUIPMENT_WRITE_MODE=ledger

# 클라이언트 — 3탭 UI (명시적)
NEXT_PUBLIC_EQUIPMENT_UI=ledger
```

`NEXT_PUBLIC_EQUIPMENT_WRITE_MODE` — **더 이상 사용하지 않음** (제거 권장).

---

## 11. 재현

```powershell
# Docker Desktop 실행 후
node docs/equipment-inventory/stage15_db_integration.mjs
```

**Commit / Push / Deploy / 운영 DB:** 수행하지 않음.
