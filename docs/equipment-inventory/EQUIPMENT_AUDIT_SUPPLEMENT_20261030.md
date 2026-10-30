# SPOKEDU 교구 재고 — 감사 보완 (2026-10-30)

> **사실관계·설계 SSOT 갱신:** [EQUIPMENT_DESIGN_FINAL_20261030.md](./EQUIPMENT_DESIGN_FINAL_20261030.md) (teacher_inventory, 행级 4+19, T/Q 캐시, rental_id, RLS 확인 범위). 본 보완 §2.1「코드 0건=미존재」 등 **구식 서술은 최종 문서가 정정함.**

**목적:** 1차 감사 5건 문서를 **대체하지 않고** 보완.  
**금지 준수:** 제품 코드·DB·마이그레이션·Git·배포 **변경 없음**.  
**1차 대비:** `DESIGN_READY` **철회** → 본 문서 기준 재판정 (§10).

---

## A. 실측 데이터 (사용자 제공 — 에이전트 재쿼리 `NOT_RUN`)

| 객체 | 행 수 | 1차 문서 |
|------|------:|----------|
| `catalog` | **48** | `NOT_VERIFIED` |
| `inventory` | **666** | `NOT_VERIFIED` |
| `inventory_logs` | **1,412** | `NOT_VERIFIED` |
| `users` | **75** | `NOT_VERIFIED` |

| 예외 | 건수 | 의미 (가설) |
|------|-----:|-------------|
| 품목명 기준 매핑 불일치 | **4** | `inventory.name` ↔ `catalog.name` exact match 실패 |
| 사용자 참조 불일치 | **19** | `inventory.user_id` ∉ `users` 또는 auth canonical 불일치 |

**1차 문서 수정:** `EQUIPMENT_FORENSIC_AUDIT.md` §5.2 운영 row count → 위 표로 **사용자 실측으로 대체** (에이전트 독립 검증은 `NOT_RUN`).

---

## B. 연결 Supabase ↔ 운영 배포 동일성

### B.1 저장소·로컬 개발 기준 (확인됨)

| 근거 | project ref |
|------|-------------|
| `.env.local` → `NEXT_PUBLIC_SUPABASE_URL` | **`mwgvserdyflsqyhcqecp`** |
| `scripts/lib/inventory-image-migration.mjs` `PRODUCTION_PROJECT_REF` | 동일 |
| `ops/stage2a-single-apply`, `ops/stage2c-single-apply` README | Target **`mwgvserdyflsqyhcqecp`** |
| `docs/SPOKEDU_SECURITY_AUDIT_20261018.md` | “로컬 Supabase URL ref = ops” |

**별도 스테이징:** `stanouvgklynytjtlnif` — CI/QA용 (`STAGING_NEXT_PUBLIC_SUPABASE_*`). **48/666/1412 행은 스테이징이 아닌 ops 쪽과 일치하는 규모로 보는 것이 타당**하나, 스테이징 row count는 **`NOT_VERIFIED`**.

### B.2 Vercel Production 환경변수 (미확정)

- 문서(`VERCEL_배포_검수.md`): Production은 `NEXT_PUBLIC_SUPABASE_*` 사용.
- **에이전트:** Vercel Production env **값** 조회 **불가** (승인·도구 제한).
- **판정:** 실측 DB가 ops ref `mwgvserdyflsqyhcqecp`에 연결된 세션이면 **「운영 DB와 동일 프로젝트」 강한 추정**.  
  **「Vercel Production 배포가 동일 ref를 가리킨다」** 는 **`NOT_VERIFIED`** — 아래 교차 확인 필요.

### B.3 권장 교차 확인 (구현 전 게이트)

1. Vercel Dashboard → Production → `NEXT_PUBLIC_SUPABASE_URL` hostname ref = `mwgvserdyflsqyhcqecp`.  
2. Production `/admin/inventory` 로그인 후 catalog **48종** 노출 여부 (렌더 QA).  
3. (선택) Supabase `catalog` max(`created_at`) vs 앱 최신 교구 등록일 대조.

**동일성 결론:** **PARTIAL** — ops ref 정합 **OK** / Vercel Production env **NOT_VERIFIED**.

---

## 1. 수량 정의 및 불변식 (확정안)

교구 SKU = `catalog.id` (1 row = 1 관리 품목; 동명이어도 merge 금지).

| 기호 | 용어 | 정의 |
|------|------|------|
| **T** | **총보유** | 조직이 해당 SKU에 대해 소유권을 가진 **전체 단위 수** (창고·강사·격리 포함). |
| **L** | **강사보유** (대여 중) | 강사에게 **아직 반납 확인되지 않은** 단위 수의 합: Σ `outstanding_qty` (활성 대여). |
| **Q** | **점검·격리** | 총보유 중 **대여·일반 창고 가용에서 제외**된 단위 (파손·분실 조사·세척 등). **물리적으로는 창고**에 둔다고 가정. |
| **W** | **창고보유** | 조직 창고 구역에 있는 단위 수 (강사 휴대분 제외). |
| **A** | **창고 가용** (대여 가능) | 창고에서 **즉시 대여 가능**한 수량. |

### 1.1 구조 불변식

```text
W = T − L
T = L + W
A = W − Q = T − L − Q
```

### 1.2 도메인 제약 (CHECK / RPC)

```text
T ≥ 0, L ≥ 0, Q ≥ 0, W ≥ 0, A ≥ 0
Q ≤ W   (격리는 창고 재고에서만 차감)
L ≤ T   (강사보유는 총보유를 초과 불가)
```

### 1.3 1차 문서와의 차이

- 1차 `EQUIPMENT_DATA_MIGRATION_PLAN.md` §2.1: `qty_on_hand_total`, `qty_quarantine`만 명시.  
- **보완:** **창고보유 W**를 1급 파생량으로 정의하고 **W = T − L**을 명시 (HTML `getAvailableQty`는 T−rented만, Q 없음).

### 1.4 현행 `inventory.quantity` (레거시)

- 의미: **강사별·품목명별 스냅샷** (L의 일부를 name으로 분해 저장).  
- **T·W·A 없음** → 총보유 SSOT **아님**.  
- cutover 전: Σ_legacy `inventory.quantity` (catalog_id 매핑 후) vs 목표 **L** 비교용 **참고치**만.

---

## 2. 매핑 예외 · `teacher_inventory` · 참조

### 2.1 코드베이스 전수 (`teacher_inventory` 문자열)

- **결과: 0건** — 테이블/뷰/RPC/앱 코드 **미참조**.
- **해석:**  
  - (a) DB에만 `teacher_inventory` **뷰/구버전 테이블** 존재 가능 → **DB catalog 조회 `NOT_RUN` (에이전트)**. 사용자 실측에서 객체 확인 시 §2.4에 append.  
  - (b) 지시 의미가 **「강사 보유 데이터」** 일반 → **`public.inventory`** 가 사실상 teacher inventory.

### 2.2 확정 참조 (코드)

| From | To | 연결 |
|------|-----|------|
| `inventory.user_id` | `users.id` | SELECT/UPDATE; **19건 불일치 (실측)** |
| `inventory` | `catalog` | **FK 없음**; `name` 문자열 merge only |
| `inventory_logs.user_id` | `users.id` | 동일 |
| `sync-by-email` | inventory, inventory_logs | `user_id` 일괄 치환 |

### 2.3 품목 매핑 예외 (4행 — 실측)

**분류 (처리 정책):**

| 클래스 | 조건 | cutover |
|--------|------|---------|
| **M0** | name exact 1:1 → catalog | `catalog_id` 자동 |
| **M1** | name 0 match | UNMAPPED 큐; OPENING_BALANCE 보류 |
| **M2** | name >1 catalog | AMBIGUOUS; 수동 catalog_id |
| **M3** | name match but category/image drift | catalog_id only; 스냅샷 메타는 ledger 이후 catalog SSOT |

**4행** = M1/M2/M3 중 하나 — **행级 목록은 사용자 실측 export 필요** (에이전트 `NOT_RUN`).

### 2.4 사용자 참조 예외 (19행 — 실측)

| 클래스 | 조건 | cutover |
|--------|------|---------|
| **U0** | user_id ∈ users & is_active | 정상 |
| **U1** | user_id ∉ users | **고아** — `users` 복구 또는 `legacy_user_id` 보존 + admin only |
| **U2** | users 있으나 auth id merge 잔재 | `sync-by-email` 재실행 후보 |

**666 inventory 중 19 (~2.9%)** — cutover **차단 조건 후보** (고아 해소 전 OPENING_BALANCE 금지).

### 2.5 `inventory_logs` (1,412행)

- 구조화 원장 **아님**; cutover 후 **append-only archive**.  
- 50/30 UI limit은 **1,412 vs 표시** 불일치 — 기능 결함 **CONFIRMED**.

---

## 3. Service Role · RPC · RLS · SECURITY DEFINER

### 3.1 저장소에서 확인된 inventory 관련 RPC

| 함수 | EXECUTE | 용도 |
|------|---------|------|
| `admin_cas_inventory_image` | **service_role only** (REVOKE public/anon/authenticated) | catalog/inventory **image** CAS |

**교구 수불 rent/return RPC:** **없음** (1차와 동일).

### 3.2 클라이언트 쓰기 경로 (권한 경계)

| 경로 | 인증 | DB |
|------|------|-----|
| `app/admin/inventory/page.tsx` | Admin layout → `/api/auth/check-admin` | browser **anon JWT** + RLS |
| `app/teacher/inventory/page.tsx` | teacher session | SELECT only (코드상) |
| `POST /api/admin/inventory/images` | **`requireAdmin()`** + **service_role** storage | ✅ 패턴 |

**경계 결함:** catalog/inventory/logs **변경은 RLS에 의존** — 정책이 repo migration에 **없음** → **운영 RLS 실측 `NOT_RUN` (에이전트)**.  
**목표 경계:** 수량·원장 쓰기 = **API + service_role RPC only**; authenticated direct INSERT/UPDATE/DELETE **REVOKE**.

### 3.3 Service Role Key

- `getServiceSupabase()` — **서버 전용** (`adminAuth.ts`).  
- 클라이언트 번들 **금지** (1차 SECURITY와 동일).  
- Inventory image route는 준수.

### 3.4 SECURITY DEFINER (신규 RPC 설계 시)

- `search_path = ''` 또는 `pg_catalog, public` 고정 (기존 mileage RPC 패턴).  
- 함수 **내부** `requireAdmin` equivalent: `auth.uid()` 검사 **하지 않음** — API layer에서 admin 검증 후 service_role 호출.  
- **authenticated에 GRANT EXECUTE 금지**.

---

## 4. SSOT · 동시성 · 멱등 · 복구 (최종 권고)

### 4.1 후보 비교

| 접근 | SSOT | 동시성 | 멱등 | cutover | 판정 |
|------|------|--------|------|---------|------|
| **A. `inventory` 스냅샷만 확장** | inventory qty | row update race | weak | 쉬움 | **기각** — L/T 분리 불가, 1차 결함 재현 |
| **B. Rental header + return rows** | rental 테이블 | rental row lock | 가능 | 중간 | **차선** |
| **C. Append-only `equipment_ledger` + 파생 T/Q/L** | ledger | catalog `FOR UPDATE` + ledger insert | **request_key** | 중간 | **권고** |
| **D. Event sourcing 전체 재구축** | ledger | strong | strong | heavy | 과잉 |

### 4.2 **최종 권고: C — `equipment_ledger` (append-only) + catalog 집계**

**SSOT:** `equipment_ledger` 한 테이블 (모든 수량 변동의 유일 기록).

**event_type (enum):**

- `OPENING_BALANCE` — cutover 실사 확정  
- `RENT` — L↑, A↓  
- `RETURN_CONFIRM` — L↓, A↑ (실물 수령 확인, §7)  
- `ADJUST_ON_HAND` — T 변경 (입고·실사·폐기; 사유 필수)  
- `QUARANTINE_SET` / `QUARANTINE_RELEASE` — Q 변경  

**파생 (같 트랜잭션 갱신):**

- `catalog.qty_on_hand_total` (= T), `catalog.qty_quarantine` (= Q)  
- L, W, A는 **뷰** 또는 RPC 결과로 계산: L = Σ ledger RENT − RETURN_CONFIRM; A = T − L − Q  

**레거시 `inventory`:** cutover 동안 **read-only**; 목표 L와 diff 리포트 후 **deprecated** (삭제는 Phase 정리, 본 1차 범위 아님).

**멱등:** `private.equipment_request_results` (Phase2 mileage 패턴): `request_key` + payload hash.

**동시성:**  
`SELECT catalog FOR UPDATE` → 가용 A 검증 → ledger insert → catalog T/Q update → commit.

**복구:**  
- 트랜잭션 실패 → full rollback.  
- cutover 전 pg_dump (48+666+1412).  
- ledger insert-only → **DELETE 금지**; correction = `ADJUST_*` compensating event.

### 4.3 1차 문서와의 차이

- 1차 §2.2: `equipment_rentals` + `equipment_return_events` **이중 테이블** 제안.  
- **보완:** **단일 ledger 권고** — 부분 반납·조정·격리를 동일 모델로 수용, rental header 상태 머신 중복 제거.

---

## 5. 전환 시 이중 쓰기 · UI 불일치 방지

### 5.1 Phase 정의

| Phase | Admin UI | Teacher UI | DB write |
|-------|----------|------------|----------|
| **0** (현재) | legacy client write | read inventory | inventory ± logs |
| **1** Expand | legacy + **read** new views | unchanged | **ledger RPC only (admin API)** |
| **2** Cutover | **new 3-tab**; legacy **read-only** flag | read **derived** holdings | ledger only |
| **3** | legacy route redirect | teacher derived | inventory **trigger deny** (optional) |

### 5.2 불일치 방지 규칙

1. **단일 쓰기 플래그** `EQUIPMENT_WRITE_MODE=ledger|legacy` — 앱 env; ledger 시 legacy mutation UI **disabled**.  
2. **666 스냅샷 동결** 시각 `inventory_frozen_at`; 이후 legacy page에서 save 시 toast 차단.  
3. **Admin·Teacher 동시 표시:** cutover 후 **동일 VIEW** (`teacher_equipment_holdings_v`) — teacher는 RLS own rows.  
4. **1,412 logs** — 신규 이벤트는 ledger; logs 테이블 **신규 INSERT 중단** (선택 summary만).  
5. **회귀:** catalog 48 meta + image API **변경 없이** Phase 1.

### 5.3 1차 대비

- 1차 IMPLEMENTATION §Phase — 개념 동일; **legacy freeze 시각·VIEW 단일화** 명시 추가.

---

## 6. 기초잔액 확정 (창고 실사 + 강사 보유 확인)

### 6.1 입력 (관리자 실무)

1. **창고 실사:** SKU별 **T**, **Q** (현장 카운트).  
2. **강사 보유 확인:** SKU×강사 **실물 수** (666 스냅샷 = **작업 리스트**, SSOT 아님).  
3. **UNMAPPED 4 + 고아 19** 해소 후만 ledger posting.

### 6.2 확정 알고리즘 (SKU c)

```text
L_confirmed(c) = Σ 강사별 실물 확인 qty
T_confirmed(c) = 창고 실사 T + L_confirmed(c)   [전량이 조직 소유일 때]
Q_confirmed(c) = 창고 실사 격리 수
```

**검증:**

```text
T_confirmed ≥ L_confirmed + Q_confirmed
A_confirmed = T_confirmed − L_confirmed − Q_confirmed ≥ 0
```

**legacy Σ inventory (mapped) vs L_confirmed** — diff > 0 → **INVENTORY_RECONCILIATION** 티켓; ledger OPENING_BALANCE는 **L_confirmed** 기준.

### 6.3 ledger posting (cutover batch)

- Per SKU: one `OPENING_BALANCE` (T, Q) + per-teacher `RENT` lines (L 분해) **또는** OPENING + aggregate RENT — **같 트랜잭션**.  
- `reference`: `legacy_inventory_ids[]`, `cutover_batch_id`, `confirmed_by`, `confirmed_at`.  
- **임의 과거 rentDate 생성 금지** — `rented_at` = cutover 시각 또는 “미상” 플래그.

### 6.4 미실사 SKU

- catalog 48 중 실사 미완 → **대여 RPC 차단** + UI “실사 필요”.

---

## 7. 반납 요청 vs 실물 수령 · 관리자 조정

### 7.1 상태 분리

| 단계 | ledger | L | A | UI |
|------|--------|---|---|-----|
| **RETURN_REQUESTED** | optional event (정책) | **변경 없음** | **변경 없음** | 강사/관리자 “반납 예정” |
| **RETURN_CONFIRM** | `RETURN_CONFIRM` qty | **↓** | **↑** | 관리자 “실물 수령 확인” |

**권고:** Phase 2에서 RETURN_REQUESTED **생략 가능** (관리자 워크플로만); 최소 **RETURN_CONFIRM**만 SSOT.

**부분 반납:** `RETURN_CONFIRM` qty < outstanding — outstanding 잔존.

### 7.2 관리자 조정 (`ADJUST_ON_HAND`)

- **필수:** `reason_code` (enum: PURCHASE, STOCKTAKE, DISPOSAL, LOSS, OTHER), `reason_note`, `actor_user_id`, `occurred_at`.  
- T 변경; **T < L + Q** 이면 RPC **reject**.  
- `inventory_logs` 텍스트 로그 **대체하지 않음** — ledger가 SSOT.

### 7.3 1차 대비

- 1차 §4.4 수량 조정 — 개념 동일; **RETURN_REQUEST vs CONFIRM** 명시 추가.

---

## 8. 기존 5문서 대비 변경 요약

| 문서 | 1차 판정/내용 | 보완 후 |
|------|----------------|---------|
| FORENSIC_AUDIT | DB `NOT_VERIFIED` | row count·4·19 **사용자 실측 반영**; RLS still NOT_RUN |
| FEATURE_PARITY | — | 수량 정의·반납 2단계 반영 (매트릭스 본문 변경 없음) |
| DATA_MIGRATION | dual rental table | **단일 ledger 권고**로 supersede §2.2 후보 |
| IMPLEMENTATION | P1 rental tables | P1 **equipment_ledger** + RPC |
| RELEASE_GATE | DESIGN only | cutover 게이트: 4+19 해소, 실사, Vercel ref |

**5건 파일 본문은 편집하지 않음** — diff는 본 SUPPLEMENT가 SSOT.

---

## 9. 미해결 (`NOT_VERIFIED` / 추가 실측)

1. Vercel Production `NEXT_PUBLIC_SUPABASE_URL` ref  
2. 운영 RLS policies on catalog/inventory/logs  
3. DB 객체 `teacher_inventory` 존재 여부·정의  
4. 4행·19행 **행级** export  
5. catalog 48 vs inventory distinct name cardinality  

---

## 10. 재판정

| 항목 | 판정 |
|------|------|
| 코드/HTML 감사 | **COMPLETE** (1차 유지) |
| 운영 DB 실측 | **PARTIAL** (count·4·19 사용자 제공; RLS·DDL·teacher_inventory 객체 에이전트 미확인) |
| 수량·SSOT·전환·실사·반납 설계 | **SPEC_READY** (§1–7) |
| 구현 | **NOT_STARTED** |
| 1차 `DESIGN_READY` | **승인 불가 → 본 문서로 대체: `AUDIT_SUPPLEMENTED / SPEC_READY / FIX_NOT_STARTED`** |
| Production DB = Vercel Production | **PARTIAL** (§B) |

**구현 승인 전 필수:** §9 1–4 해소 + §6 실사 배치 sign-off.
