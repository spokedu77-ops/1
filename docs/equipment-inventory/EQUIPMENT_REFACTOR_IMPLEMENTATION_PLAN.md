# SPOKEDU 교구 재고 — 구현 계획 (Stage 2–4, 승인 전)

**전제:** `EQUIPMENT_FORENSIC_AUDIT.md` + `EQUIPMENT_DATA_MIGRATION_PLAN.md` 승인  
**구현:** **시작하지 않음** (`FIX_NOT_STARTED`)

---

## 1. 구현 목표 (한 줄)

HTML V2의 **3탭·교구별 재고·대여/반납 이력**을 SPOKEDU **catalog·users·이미지·상세 UI**와 합치고, **모든 수량 변경을 DB 트랜잭션(RPC)** 으로 일원화한다.

---

## 2. 단계별 순서

| Phase | 내용 | 산출 | UI/DB 분리 |
|-------|------|------|------------|
| **P0** | 운영 DB schema + RLS read-only 감사 | DDL 문서, RLS 매트릭스 | DB only |
| **P1** | Expand migration (catalog cols, ledger tables, RPC skeleton) | supabase migration | DB only |
| **P2** | Admin API: rent, return, adjust, list stock | `app/api/admin/equipment/**` | API only |
| **P3** | Backfill script + UNMAPPED report | `scripts/equipment-backfill*.mjs` | ops |
| **P4** | Admin UI 3-tab refactor | `app/admin/inventory/**` | UI (flag) |
| **P5** | Teacher inventory read path | catalog join, outstanding dates | UI |
| **P6** | Deprecate client direct writes | remove supabase mutations from page | security |
| **P7** | QA + release gate | `EQUIPMENT_RELEASE_GATE.md` | — |

**금지:** P4와 P1을 하나의 PR로 묶지 않음.

---

## 3. 파일·컴포넌트 계획

### 3.1 신규 (후보)

```text
app/admin/inventory/
  page.tsx                 # thin shell + tabs
  EquipmentStockTab.tsx    # 교구 재고 표
  EquipmentTeachersTab.tsx # 강사 카드 + 상세 drawer
  EquipmentHistoryTab.tsx  # 이력 + filters + CSV
  EquipmentRentalModal.tsx
  EquipmentReturnDialog.tsx
  hooks/useEquipmentStock.ts
  hooks/useEquipmentRentals.ts

app/api/admin/equipment/
  stock/route.ts           # GET aggregated per catalog
  rent/route.ts            # POST idempotent
  return/route.ts          # POST partial/full
  adjust/route.ts          # POST stock adjustment
  history/route.ts         # GET paginated
  export/route.ts          # GET csv

app/lib/equipment/
  types.ts
  validation.ts
```

### 3.2 수정

| 파일 | 변경 |
|------|------|
| `app/admin/inventory/page.tsx` | monolith → tabs or replace |
| `app/teacher/inventory/page.tsx` | catalog_id join, rental date from ledger |
| `app/components/Sidebar.tsx` | 라벨 유지 |
| `app/api/admin/teachers/sync-by-email/route.ts` | ledger teacher_id update 추가 |

### 3.3 유지

| 파일 | 이유 |
|------|------|
| `app/api/admin/inventory/images/route.ts` | 이미지 SSOT |
| `scripts/lib/inventory-image-migration.mjs` | base64 legacy |

### 3.4 DB (신규 migration 후보)

- `YYYYMMDDHHMMSS_equipment_ledger_expand.sql`
  - catalog columns
  - `equipment_rentals`, `equipment_return_events` (or ledger)
  - `admin_equipment_rent(...)`, `admin_equipment_return(...)`, `admin_equipment_adjust_stock(...)`
  - REVOKE public/anon/authenticated; GRANT service_role
  - RLS: teachers SELECT own holdings view; admins via API only

**패턴 참고:** `admin_apply_mileage_adjustment`, Phase2 idempotency table (`20261018110000_*.sql`).

---

## 4. RPC·트랜잭션 설계 요약

### 4.1 `admin_equipment_rent`

1. `requireAdmin` (API) → service_role RPC  
2. `SELECT catalog FOR UPDATE`  
3. `available = total - quarantine - SUM(outstanding)`  
4. if `qty > available` → raise  
5. INSERT rental + optional inventory upsert  
6. INSERT audit row / emit inventory_logs summary (optional)

### 4.2 `admin_equipment_return`

- Partial: INSERT return_event, UPDATE rental returned/outstanding  
- Full: outstanding → 0, status closed  
- **DELETE inventory row 금지** — qty 0 또는 view exclude

### 4.3 동시성

- catalog row lock + rental idempotency_key unique  
- 409 HTTP for stale/conflict (Stage2 P0 패턴)

---

## 5. UI 통합 (지시서 §5)

| 탭 | 컬럼/행동 | SPOKEDU merge |
|----|-----------|---------------|
| 교구 재고 | 관리번호·교구명·총·대여·가용·대여/수정/상세 | 상세=기존 dark modal |
| 강사 | 카드 + 종류 수; 상세=교구별 qty·대여일·반납 | users DB |
| 이력 | 필터·페이지네이션·CSV | server-driven |

**REJECT:** 전체 수량 KPI 카드.

---

## 6. 테스트 계획 (승인 후 실행)

| 유형 | 범위 |
|------|------|
| Unit | validation, available qty math |
| Contract | API 401/403, rent overflow 409 |
| Integration | RPC + rollback on failure |
| E2E | admin rent → teacher sees qty; partial return |
| Regression | catalog image upload, sync-by-email |
| Load | **NOT_VERIFIED** until row counts known |

**현재:** 테스트 **미실행** (no-verify-shell).

---

## 7. 프리셋 (INVESTIGATE)

- UI: 강사 상세 “프리셋 적용” optional  
- Rule: **only existing catalog_id with available > 0**  
- Multi-item: single RPC batch with all-or-nothing  
- **별도 Product Decision** 필요

---

## 8. 리스크

| 리스크 | 완화 |
|--------|------|
| RLS가 client write 허용 중 | P6에서 API 이관 후 RLS tighten |
| DDL repo 缺失 | P0 block |
| name duplicate catalog | UNMAPPED 큐 |
| Teacher page downtime | feature flag parallel read |

---

## 9. 승인 게이트 (구현 착수 조건)

1. 사용자 명시적 “구현 승인”  
2. B1–B4 (`DATA_MIGRATION_PLAN`) 해소 또는 accepted risk  
3. Ledger vs dual-table 최종 선택  
4. Sprint Brief 또는 동등 scope 문서

**상태:** `DESIGN_READY` / `FIX_NOT_STARTED`
