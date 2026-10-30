# SPOKEDU 교구 재고 — 최종 설계 보정 (2026-10-30)

**상태:** 읽기 전용 조사·문서 보정 완료. **코드·DB·배포 변경 없음.**  
**문서 계층:** 1차 5건 + [보완](./EQUIPMENT_AUDIT_SUPPLEMENT_20261030.md) 유지 → **본 문서가 최신 설계 SSOT.**

---

## 0. 확인 종료 vs 미검증 (반복 보고 금지)

| 항목 | 상태 |
|------|------|
| ops Supabase ref `mwgvserdyflsqyhcqecp`, row count 48/666/1412/75 | **종료** (재실측 2026-10-30) |
| `teacher_inventory` 테이블 2행 | **종료** |
| 4 품목·19 user 예외 행级 | **종료** (§7) |
| `catalog`/`inventory`/`inventory_logs` RLS on + 관리자 정책 | **종료** (사용자 실측 확인) |
| 단일 ledger + T/Q 캐시 + rental_id 규칙 | **종료** (본 문서 §1–§6) |
| Vercel Production env ref | **종료 (간접)** — §8 |
| SECURITY DEFINER 함수·역할별 E2E | **미검증** |
| `teacher_inventory` FK/RLS pg_catalog | **미검증** (PostgREST 스키마만) |
| 창고 실사·기초잔액 sign-off | **운영 게이트 대기** — §9 |

---

## 1. SSOT: ledger vs catalog T/Q (이중 SSOT 방지)

### 1.1 유일한 수량 진실

**`equipment_ledger` (append-only)** — 모든 T·Q·L 변동의 **유일한 기록 원천**.

### 1.2 `catalog`의 T/Q는 캐시 (SSOT 아님)

| 필드 | 역할 | 갱신 규칙 |
|------|------|-----------|
| `qty_on_hand_total` | **T** 스냅샷 | ledger `OPENING_*` / `ADJUST_ON_HAND` / (간접) rent·return 트랜잭션 **같 TX**에서만 |
| `qty_quarantine` | **Q** 스냅샷 | ledger `QUARANTINE_*` **같 TX**에서만 |

**금지:** Admin UI·client·batch가 `catalog` T/Q를 ledger 없이 UPDATE.  
**검증:** 주기적 `reconcile_catalog_cache(catalog_id)` = ledger 재계 vs catalog 컬럼 diff → drift 시 alert.

### 1.3 별도 `equipment_stock_state` 테이블?

| | catalog T/Q | 별도 1:1 state 테이블 |
|--|-------------|------------------------|
| SSOT | ledger (동일) | ledger (동일) |
| 중복 | catalog 메타와 co-locate | catalog + state 2행 관리 |
| **권고** | **catalog T/Q 캐시** — 품목 메타와 재고가 한 SKU row |

**L, W, A:** DB에 **저장하지 않음** (파생). `teacher_equipment_holdings_v`·재고 API가 ledger에서 계산.

### 1.4 불변식 (유지)

```text
W = T − L ,  A = T − L − Q ,  Q ≤ W ,  L ≤ T
```

---

## 2. 대여 식별자·반복 대여·부분 반납

### 2.1 식별자

| ID | 용도 |
|----|------|
| `rental_id` (uuid, PK) | **대여 계약 단위** (한 번의 “대여 등록” 액션) |
| `ledger_id` | 원장 행 (rent/return/adjust) |
| `catalog_id` | SKU |
| `teacher_id` | users.id |

### 2.2 생성 규칙

- **신규 대여:** `RENT` ledger + **새 `rental_id`** + `qty_lent` = 이번 대여 수량.  
- **동일 교구·동일 강사 재대여:** **새 `rental_id`** (별 줄). 활성 줄 여러 개 허용.  
- **강사별 SKU 보유:** L_teacher,sku = Σ `rental.outstanding` (active rentals).

### 2.3 `equipment_rentals` (ledger와 1:1 또는 ledger FK)

| 컬럼 | 설명 |
|------|------|
| `rental_id` | PK |
| `catalog_id`, `teacher_id` | |
| `qty_lent` | 최초 대여 |
| `qty_returned` | 누적 반납 확인 |
| `qty_outstanding` | lent − returned (≥0) |
| `status` | `active` \| `closed` |
| `opened_at` | 대여 시각 |
| `closed_at` | outstanding=0 시 |

### 2.4 부분 반납

- `RETURN_CONFIRM` ledger: `rental_id`, `qty`, `confirmed_by`, `confirmed_at`.  
- `qty_returned += qty`; outstanding 감소; **rental row 삭제 금지**.  
- outstanding=0 → `status=closed`.  
- **초과 반납:** RPC reject (`RETURN_EXCEEDS_OUTSTANDING`).

### 2.5 ledger 연결

```text
RENT          → rental_id (create), ledger.qty = +qty_lent to L
RETURN_CONFIRM → rental_id (existing), ledger.qty = return qty
```

멱등: `(request_key, operation, payload_hash)` — Phase2 mileage 패턴.

---

## 3. 기초잔액 vs 신규 RENT

| event_type | 의미 | legacy 연결 |
|------------|------|-------------|
| **`OPENING_BALANCE_MIGRATION`** | cutover 실사·강사 확인 후 **기존 보유** 반영 | `metadata.legacy_inventory_id[]`, `legacy_teacher_inventory_id[]` |
| **`RENT`** | go-live 이후 **신규** 대여 | legacy 필드 없음 |

**규칙:**

- OPENING은 **운영 수불 활성화 배치**에서만 일괄 posting.  
- UI·CSV에 “기초잔액” / “대여” **구분 표시**.  
- 임의 `rented_at` 소급 **금지**; OPENING `occurred_at` = cutover 시각 + `note`.

**`teacher_inventory` 2행:** OPENING 시 `legacy_teacher_inventory_id` + `catalog_id` 매핑 (name match); **`inventory` 666행과 이중 반영 금지** — 매핑 정책 §7.

---

## 4. `teacher_equipment_holdings_v` · RLS · 접근

### 4.1 뷰 정의 (개념)

```sql
-- security_invoker = true (PostgreSQL 15+)
SELECT
  r.teacher_id,
  r.catalog_id,
  c.name,
  c.mgmt_code,
  SUM(r.qty_outstanding) AS qty_held,
  MIN(r.opened_at) FILTER (WHERE r.status = 'active') AS earliest_opened_at,
  COUNT(*) FILTER (WHERE r.status = 'active') AS active_rental_lines
FROM equipment_rentals r
JOIN catalog c ON c.id = r.catalog_id
WHERE r.qty_outstanding > 0
GROUP BY r.teacher_id, r.catalog_id, c.name, c.mgmt_code;
```

(go-live 전: legacy read fallback **별도 플래그** — §9)

### 4.2 RLS (기본 테이블 `equipment_rentals` / `equipment_ledger`)

| 역할 | SELECT | INSERT/UPDATE/DELETE |
|------|--------|----------------------|
| **authenticated teacher** | `teacher_id = (SELECT auth.uid())` | **deny** (API/RPC only) |
| **authenticated admin** | admin policy (기존 `users.role` / `is_admin` 패턴) | **deny direct** |
| **service_role** | all | RPC 내부 only |

**뷰:** `security_invoker` → underlying table RLS 적용.  
**Teacher app:** `/teacher/inventory` → SELECT on view **own rows only**.  
**Admin app:** service_role API or admin-bypass policy **전체 teacher/catalog** (PII는 users join 최소).

### 4.3 레거시 `inventory` / `teacher_inventory`

- cutover 전: 기존 RLS 유지 (사용자 확인).  
- cutover 후: **read-only**; 신규 write는 ledger path only.

---

## 5. `teacher_inventory` (사실관계 정정)

### 5.1 존재·규모 (재실측)

| id | user_id | name | category | count |
|----|---------|------|----------|------:|
| 2 | d86773c0-ff7f-4ade-9ef8-340f1a9bb4b0 | 스텝래더 | 기타 | 10 |
| 3 | d86773c0-ff7f-4ade-9ef8-340f1a9bb4b0 | 테니스공 | 기타 | 10 |

- **user:** 최지훈 (`spokedu77@gmail.com`, role **admin**, active).  
- **앱 코드 참조:** **0건** — `inventory`와 **병렬 레거시** 테이블.  
- **컬럼:** `count` (≠ `inventory.quantity`).

### 5.2 FK · RLS

- **FK:** pg_catalog 미조회 — **PostgREST 관례상 `user_id` → `users.id` 예상**.  
- **RLS:** 사용자 실측 범위는 §0; **`teacher_inventory` 정책 문구는 미검증** (catalog/inventory/logs trio는 확인됨).

### 5.3 cutover

- `inventory`와 **중복 합산 금지**; OPENING batch에서 **한쪽 SSOT만** 선택 (기본: **666 `inventory`**, TI 2행은 merge checklist).

---

## 6. RLS · 권한 (catalog / inventory / inventory_logs)

**사용자 확인 (종료):** 세 테이블 **RLS ENABLE** + **관리자 정책** 존재.

**미검증 (구현 QA 필수):**

- `admin_cas_inventory_image` 등 **SECURITY DEFINER** 함수 search_path·EXECUTE 역할.  
- teacher anon JWT로 **타 강사 inventory** SELECT 차단 E2E.  
- admin non-privilege **write** 차단 E2E.

**목표:** 수량·원장 write → **service_role RPC only** (centers 패턴).

---

## 7. 행级 예외 (원본 미변경)

### 7.1 품목 매핑 4행 — **M1 (trim/명칭 불일치)**

| inventory_id | user_id | name (DB literal) | qty | catalog |
|--------------|---------|-------------------|----:|---------|
| 27 | 3e84151e-0712-4b13-a192-260319ce7061 | `밸런스핏 ` (trailing space) | 1 | **0 match** |
| 58 | 9852c368-1534-463f-9195-bb94e13dab09 | `밸런스핏 ` | 1 | 0 |
| 67 | babac063-a848-491c-98c4-8ca79c5d9546 | `밸런스핏 ` | 2 | 0 |
| 44 | a4b51341-45d7-43ac-8a6b-f522097cc013 | `밸런스핏 ` | 1 | 0 |

- catalog 유사 품목: id **2** `밸런스 교구` only (`밸런스핏` 아님).  
- **cutover 매핑:** 수동 `catalog_id=2` + alias 기록 **또는** catalog 신규 row (merge 금지 정책下 사용자 결정). **자동 trim merge 금지.**

### 7.2 사용자 참조 19행 — **U1 (users·auth 모두 absent)**

`inventory.user_id` ∉ `users` (**19 rows**). **auth.admin.getUserById** → 4 distinct ids **모두 User not found**.

| user_id | rows | Σ qty |
|---------|-----:|------:|
| b1f19079-394e-4b63-afc5-d2de26022d9d | 14 | 40 |
| 3e84151e-0712-4b13-a192-260319ce7061 | 3 | 3 |
| aa0f7a48-e4d3-46f6-935d-fed4cb107a9b | 1 | 10 |
| 7334ef7b-56c0-4f66-bf7c-4f697c3ae4c5 | 1 | 10 |

**대표 inventory_id:** 461–473, 489 (b1f… cluster), 18/25/26/36 등.

**cutover:** OPENING posting **보류** — `legacy_orphan_user_id` 큐; **재배치·폐기·historical archive**는 운영 결정 (데이터 변경은 별도 승인).

---

## 8. Vercel Production ↔ Supabase ref

| 근거 | ref |
|------|-----|
| `.env.local` / 이번 read-only API | **mwgvserdyflsqyhcqecp** |
| `scripts/lib/inventory-image-migration.mjs` PRODUCTION_PROJECT_REF | 동일 |
| `docs/.../FINAL_COMMERCIAL_READINESS_AUDIT.md` Production snapshot | 동일 |
| `STAGE2_CUTOVER_PREFLIGHT.md` (spokedu.kr → Vercel) | 단일 ops DB 서술 |

**판정:** Production 앱이 repo 표준 env를 쓰면 **동일 Supabase** — **간접 확인 완료**.  
**Vercel Dashboard Production `NEXT_PUBLIC_SUPABASE_URL` 문자열:** 에이전트 직접 열람 **안 함** (로컬 read-only 쿼리 결과와 **일치**하는 것으로 종료).

---

## 9. 게이트: 운영 활성화 vs 로컬 구현

| 게이트 | 내용 | 차단 대상 |
|--------|------|-----------|
| **OPS_ACTIVATION** | SKU별 창고 실사 T,Q + 강사 L 확인 + OPENING batch sign-off + 4+19 큐 처리 | **운영 ledger write**, production cutover |
| **LOCAL_IMPLEMENTATION** | UI 3-tab, API contract, RPC stub, vitest, local Supabase seed | **차단하지 않음** |

**이중 쓰기 방지 (go-live):** `EQUIPMENT_WRITE_MODE=ledger` → legacy mutation UI off; `inventory`/`teacher_inventory` INSERT/UPDATE deny (trigger or RLS).

---

## 10. 1차·보완 대비 변경 요약

| 주제 | 보완 (2차) | 최종 (본 문서) |
|------|------------|----------------|
| teacher_inventory | “0 code ref, DB 미확인” | **테이블 2행·스키마·admin user** |
| RLS | NOT_RUN | **catalog trio 확인**; TI FK/RLS 문구 미검증 |
| SSOT | ledger 권고 | **T/Q = cache, ledger only SSOT** |
| Rental | 개념 | **`rental_id` + repeat + partial** |
| OPENING | OPENING_BALANCE | **`OPENING_BALANCE_MIGRATION` vs RENT** |
| View RLS | 개념 | **security_invoker + 표** |
| 예외 | count only | **행级 4+19** |
| Vercel | PARTIAL | **간접 종료** |
| DESIGN_READY | SPEC_READY | **`DESIGN_READY` (조건부)** — §11 |

---

## 11. 재판정 · 로컬 착수

| | |
|--|--|
| **판정** | **`DESIGN_READY (conditional)`** / **`FIX_NOT_STARTED`** |
| **로컬 구현 착수** | **가능** — Expand DDL·Admin API·UI·테스트 (더미/seed). **OPS_ACTIVATION 없이 production posting 금지.** |
| **실제 차단 (운영 수불 ON)** | ① 창고·강사 실사 sign-off ② 4행 catalog_id 결정 ③ 19행 orphan 처리 ④ SECURITY DEFINER·RLS E2E ⑤ `teacher_inventory` vs `inventory` OPENING 이중 합산 방지 |

---

## 부록: read-only 조사 스크립트 (비제품)

- `docs/equipment-inventory/_readonly_audit_query.mjs`  
- `docs/equipment-inventory/_readonly_auth_orphans.mjs`  

재현용; 제품 런타임 **미포함**.
