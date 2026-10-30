# 교구 수불 Stage 1 — 로컬 구현 보고 (2026-10-30)

**SSOT:** [EQUIPMENT_DESIGN_FINAL_20261030.md](./EQUIPMENT_DESIGN_FINAL_20261030.md)  
**상태:** `LOCAL_IMPLEMENTATION_COMPLETE` / `PRODUCTION_BLOCKED`

---

## 1. DB Expand

| 산출 | 경로 |
|------|------|
| 마이그레이션 | `supabase/migrations/20261030120000_equipment_ledger_expand.sql` |

**포함:** `equipment_event_type`, `equipment_ledger`, `equipment_rentals`, `catalog` T/Q/mgmt_code, `teacher_equipment_holdings_v`, `private.equipment_request_results`, RPC 4종, RLS.

**로컬 적용:** `NOT_VERIFIED` — Docker/Podman 미설치로 `supabase status` 실패. **운영 DB에는 적용하지 않음.**

---

## 2. RPC·API

| RPC | 역할 |
|-----|------|
| `admin_equipment_rent` | 대여 + ledger RENT |
| `admin_equipment_return` | 부분/전량 반납 |
| `admin_equipment_adjust_on_hand` | T 조정 |
| `admin_equipment_quarantine_adjust` | Q 조정 |

| API | 메서드 |
|-----|--------|
| `/api/admin/equipment/stock` | GET |
| `/api/admin/equipment/rent` | POST |
| `/api/admin/equipment/return` | POST |
| `/api/admin/equipment/adjust` | POST |
| `/api/admin/equipment/history` | GET |
| `/api/admin/equipment/rentals` | GET |
| `/api/admin/equipment/teachers` | GET |

**쓰기 게이트:** `EQUIPMENT_WRITE_MODE=ledger` (서버, 기본 ledger). `legacy` 시 POST 403.

**멱등:** `request_key` 16–128 + `private.equipment_request_results`.

---

## 3. UI (3탭)

| 파일 | 역할 |
|------|------|
| `app/admin/inventory/page.tsx` | `NEXT_PUBLIC_EQUIPMENT_UI=legacy` → 레거시 |
| `app/admin/inventory/EquipmentInventoryApp.tsx` | 교구 재고 / 강사 / 이력 |
| `app/admin/inventory/LegacyInventoryClient.tsx` | 기존 drag-drop·inventory 직접 쓰기 |
| `app/admin/inventory/CatalogEditorModal.tsx` | 사진·교육정보·mgmt_code |
| `app/api/admin/inventory/images/route.ts` | **변경 없음** |

**KPI 전체 합산:** 미구현 (금지 준수).

---

## 4. 레거시 호환

- `catalog` / `inventory` / `inventory_logs` / `teacher_inventory` **DDL 삭제·truncate 없음**.
- OPENING batch / 4+19 orphan **미게시** (설계 §7).
- `app/teacher/inventory/page.tsx` — **미변경** (legacy inventory read).
- 레거 UI: `NEXT_PUBLIC_EQUIPMENT_UI=legacy`.

---

## 5. 테스트·검증

| 항목 | 결과 |
|------|------|
| `vitest` equipment (9 tests) | **PASS** |
| ESLint `app/admin/inventory`, `app/lib/equipment`, `app/api/admin/equipment` | **PASS** |
| `npm run build` | **FAIL** — `app/spokedu/data/about-v0-media.ts` 기존 TS2783 (본 작업 범위 외) |
| equipment 관련 tsc | **PASS** (수정 후) |
| RPC 통합·동시 대여 E2E | **NOT_VERIFIED** (로컬 DB 없음) |
| SECURITY DEFINER·teacher RLS E2E | **NOT_VERIFIED** (설계 §0) |

---

## 6. 환경 변수 (로컬 권장)

```env
EQUIPMENT_WRITE_MODE=ledger
NEXT_PUBLIC_EQUIPMENT_WRITE_MODE=ledger
# NEXT_PUBLIC_EQUIPMENT_UI=legacy  # 레거 UI
```

---

## 7. 잔여 위험

1. 마이그레이션 미적용 시 API가 `equipment_*` / catalog 컬럼 부재로 500.
2. 운영 `.env`에 ledger 모드 켜기 전 **OPS_ACTIVATION** 필수.
3. `CatalogEditorModal`의 `mgmt_code` insert — 컬럼 없으면 catalog 저장 실패.

---

## 8. 수정 파일 목록 (요약)

- `supabase/migrations/20261030120000_equipment_ledger_expand.sql` (신규)
- `app/lib/equipment/*` (신규)
- `app/api/admin/equipment/**` (신규)
- `app/admin/inventory/*` (page, EquipmentInventoryApp, Legacy, CatalogEditor, shared)

**Commit / Push / Deploy:** 수행하지 않음.
