# SPOKEDU 교구 재고 — 데이터 이전·마이그레이션 계획 (Stage 1)

**상태:** 설계안 — **운영 DB 미실측 (`NOT_VERIFIED`)**  
**원칙:** Expand → 검증 → 전환 → 정리; 기존 테이블 무단 DROP 금지

---

## 1. 현행 데이터 자산 (코드 관점)

| 테이블 | 역할 | 이전 시 취급 |
|--------|------|--------------|
| `catalog` | 교구 마스터 (메타) | **보존·확장** |
| `inventory` | 강사별 `(name, qty, …)` 스냅샷 | **원본 보존** + 신규 모델 매핑 |
| `inventory_logs` | 비구조 활동 문자열 | **보존** (신규 원장과 병행 기간) |
| (없음) | 창고 총보유 | **신규** — 실사/관리자 입력 필요 |

---

## 2. 목표 논리 모델 (승인 후 DDL)

### 2.1 교구 마스터 — `catalog` (확장)

**보존:** `id`, `name`, `category`, `image`, `simple_desc`, `key_points`, `usage_examples`, `created_at`

**추가 후보 (Expand):**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `mgmt_code` | text UNIQUE | PE-001; 기존 없으면 null 허용 후 backfill |
| `qty_on_hand_total` | int NOT NULL DEFAULT 0 | 창고 **총보유** (교구별) |
| `qty_quarantine` | int NOT NULL DEFAULT 0 | 점검·격리 |
| `is_active` | bool DEFAULT true | soft retire |

**금지:** 동명 교구 임의 merge.

### 2.2 대여 원장 — 신규 `equipment_rentals` (이름 가칭)

| 필드 | 설명 |
|------|------|
| `id` | uuid PK |
| `catalog_id` | FK → catalog |
| `teacher_id` | FK → users |
| `qty_lent` | 최초 대여 |
| `qty_returned` | 누적 반납 |
| `qty_outstanding` | GENERATED 또는 CHECK: `lent - returned` |
| `rented_at` | timestamptz |
| `status` | active / closed |
| `created_by` | admin user id |
| `idempotency_key` | optional unique |

**반납:** `equipment_return_events` (returned_qty, returned_at, rental_id) — 부분 반납 1행.

**대안:** 단일 `equipment_ledger` (type rent|return|adjust) — 감사 후 택1. **NOT_VERIFIED** against ops preference.

### 2.3 강사 보유 — 전략 (택1, 승인 필요)

| 옵션 | 설명 | 장점 | 단점 |
|------|------|------|------|
| A | `inventory` 유지 + `catalog_id` FK 추가 | teacher UI 변경 최소 | 스냅샷·원장 이중 |
| B | `inventory` deprecated; VIEW가 원장 SUM | 단일 SSOT | teacher page 쿼리 변경 |
| C | `inventory` = materialized cache (trigger refresh) | 성능 | 복잡 |

**권장 (안):** Expand **A** → 검증 후 **B** 전환.

---

## 3. 기존 `inventory` → 신규 매핑

### 3.1 `catalog_id` 연결

1. `inventory.name` = `catalog.name` **exact match** → `catalog_id` (다중 match 시 **수동 큐**, 자동 merge 금지).  
2. match 0 → **UNMAPPED** 목록 (관리자 매핑 UI).  
3. match N>1 → **AMBIGUOUS** 큐.

**근거:** 현재 `processAddItem`이 name merge (`app/admin/inventory/page.tsx` L133).

### 3.2 창고 총보유 (`qty_on_hand_total`)

| 시나리오 | 처리 |
|----------|------|
| DB에 창고 qty 없음 | **강사 보유 합만으로 total 확정 금지** (지시서 §3.5) |
| 실사 완료 | catalog별 total 입력 + `migration_cutover_at` 기록 |
| 미실사 품목 | `REQUIRES_PHYSICAL_COUNT` 플래그; 대여 RPC 차단 또는 read-only |

### 3.3 초기 대여 원장

- **과거 대여일·거래 복원 금지** (확인 불가).  
- cutover 시점: `inventory.quantity > 0` → **opening_balance** 레코드 1건  
  - `reason`: `LEGACY_INVENTORY_SNAPSHOT`  
  - `reference`: `inventory.id`, `snapshot_at`, `cutover_date`  
- `inventory_logs`는 **아카이브 참고**만; 자동 파싱 **INVESTIGATE** (정확도 낮음).

### 3.4 `inventory_logs`

- 신규 원장 가동 후: admin UI **삭제 비활성화**.  
- 기존 rows: **READ ONLY** 유지.

---

## 4. 정합성 검증 (cutover 전)

```text
∀ catalog c:
  qty_on_hand_total(c) >= SUM(outstanding rentals for c) + qty_quarantine(c)

∀ teacher t, catalog c:
  SUM(outstanding where teacher=t, catalog=c) = displayed_holdings(t,c)  [전략 A/B에 따라]

∀ rental:
  qty_returned <= qty_lent
  qty_outstanding >= 0
```

**운영 검증 SQL:** DDL 확정 후 작성 — 현재 **`NOT_VERIFIED`**.

---

## 5. Expand → 검증 → 전환 → 정리

| 단계 | 작업 | 롤백 |
|------|------|------|
| **Expand** | catalog 컬럼, rental/ledger 테이블, RPC (service_role), RLS read | 컬럼 nullable; 신규 테이블 empty |
| **검증** | staging: backfill script dry-run, UNMAPPED 리포트 | — |
| **전환** | feature flag: 신 UI + RPC write; legacy admin write freeze | flag off → legacy UI |
| **정리** | (승인 후) inventory direct write 제거, optional drop | backup restore |

---

## 6. 운영 전환·복구

### 6.1 백업

- cutover 전: `catalog`, `inventory`, `inventory_logs` pg_dump  
- `scripts/migrate-inventory-base64-images.mjs` 패턴 참고 (encrypted backup 옵션 존재)

### 6.2 롤백

1. 앱 flag → legacy `/admin/inventory` client path (단, warehouse 없는 동작 명시).  
2. 신규 테이블 truncate ( **원장에 cutover 후 데이터 있으면 승인 필수** ).  
3. catalog 추가 컬럼은 nullable 유지 시 rollback 안전.

### 6.3 강사 ID sync

- 기존 `sync-by-email` inventory/logs update **유지** — 신규 FK 테이블에도 동일 migration hook 필요 (**INVESTIGATE**).

---

## 7. 미확정·블로커

| ID | 항목 | 필요 액션 |
|----|------|-----------|
| B1 | 실제 DDL/RLS | Supabase schema export |
| B2 | catalog/inventory row counts | read-only COUNT |
| B3 | 동명 catalog 건수 | DISTINCT name HAVING count>1 |
| B4 | 창고 실사 데이터 | 운영팀 입력 |
| B5 | teacher role 값 | users.role 허용값 확인 |

**DATA_MIGRATION_PLAN 상태:** `DESIGN_READY` / 실행 `BLOCKED` on B1–B4
