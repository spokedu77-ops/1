# SPOKEDU 교구 수불 — Stage 2 최종 QA 종료 보고 (2026-10-30)

**이전:** `STAGE2_INTEGRATION_PASS (Docker + JWT simulation) / PRODUCTION_CUTOVER_BLOCKED`  
**이번 판정:** **`STAGE2_PARTIAL_PASS / REMAINING_GATES_DOCUMENTED`**

Stage 1~1.5 PASS 항목(마이그레이션·불변식·멱등·48/666 fixture)은 **재실행하지 않음**.

---

## 1. 실제 Supabase 인증 E2E

| # | 항목 | 상태 | 근거 |
|---|------|------|------|
| 1 | 관리자 조회·수불 API | **PASS (부분)** | 로컬 GoTrue + PostgREST: admin JWT `equipment_rentals` SELECT (`stage2_live_auth_e2e.mjs`); Next Admin API는 **NOT_VERIFIED** |
| 2 | 강사 A 본인 보유 | **PASS** | `teacher_equipment_holdings_v` held≥2 |
| 3 | 강사 A → B 차단 | **PASS** | cross `inventory` 0 rows |
| 4 | 비로그인 | **PASS** | anon `inventory`/`equipment_ledger` 0 rows |
| 5 | ledger DML | **PASS** | JWT INSERT denied |
| 6 | rentals DML | **PASS** | JWT UPDATE denied |
| 7 | authenticated RPC | **PASS** | `admin_equipment_rent` denied |
| 8 | service_role 수불 | **PASS** | `admin_equipment_return` OK |
| 9 | holdings view + invoker | **PASS** | (Stage 2 Docker JWT sim + live view query) |
| 10 | service_role 브라우저 | **PASS** | `app/lib/supabase/browser.ts` 정적 검사 |

**환경:** `npx supabase@2.122.0 start` (CLI **2.30.4는 config.toml 파싱 실패** → **2.122.0 사용**, 운영 config 미변경).  
로그: [EQUIPMENT_STAGE2_LIVE_AUTH_RESULTS.json](./EQUIPMENT_STAGE2_LIVE_AUTH_RESULTS.json)

Docker `SET ROLE` JWT sim은 **live E2E로 치환하지 않음** (Stage 15/2 보고 유지).

---

## 2. 관리자·강사 브라우저 E2E

| 상태 | 사유 |
|------|------|
| **NOT_VERIFIED** | 로컬 `next dev` + Playwright 관리자/강사 전 flows 미실행 (시간·env·auth wiring). UI 코드 정적 검토: 3탭·검색·OPENING/ drift 배너·부분 반납 버튼 **구현됨**. |

---

## 3. 운영 모드 조합

| 모드 | 상태 | 요약 |
|------|------|------|
| **A** legacy UI + legacy write | **PASS (정적+DB)** | default env; legacy gate `false` (Stage 2 integration) |
| **B** ledger UI + OPENING 미확정 | **PASS (UI+API)** | `opening_confirmed` false → 가용 `—`, 대여 버튼 숨김; rent RPC `OPENING_NOT_CONFIRMED` |
| **C** 격리 OPENING + legacy block ON | **PASS (DB)** | Stage 2 integration legacy gate + live service RPC |
| **D** 설정 불일치 | **PASS (부분)** | UI `ledger` + server `legacy` → `capabilities.ledger_writes=false`, 쓰기 UI off; legacy UI + gate ON → 저장 **DB 차단** (Legacy 클라이언트 toast는 **NOT_VERIFIED**) |

**운영 cutover 허용 조합 (문서):**

```env
EQUIPMENT_WRITE_MODE=ledger
NEXT_PUBLIC_EQUIPMENT_UI=ledger
# + OPS: equipment_ops_set_legacy_writes_blocked(true) on DB after sign-off
```

**금지:** server `legacy` + DB legacy block ON + 신규 UI만 (허위 쓰기 가능 UI) — UI는 capabilities로 쓰기 숨김.

---

## 4. 강제 롤백

| 항목 | 상태 |
|------|------|
| 실패 rent 후 ledger/rentals 불변 | **PASS** |
| ledger INSERT 후 RAISE 전체 롤백 | **PASS** |
| idempotency 재시도 | **SKIP** (Stage 1.5 PASS 유지) |

로그: [EQUIPMENT_STAGE2_ROLLBACK_CACHE_RESULTS.json](./EQUIPMENT_STAGE2_ROLLBACK_CACHE_RESULTS.json)

---

## 5. 원장·캐시 정합성

| 항목 | 상태 |
|------|------|
| 정상 수불 시 replay=cache | **PASS** (opening metadata Q 포함) |
| 불일치 주입 탐지 | **PASS** `equipment_catalog_cache_drifted` |
| drift 시 rent 차단 | **PASS** `EQUIPMENT_CACHE_DRIFT` |
| UI 허위 가용 방지 | **PASS** OPENING/drift 시 `—` |
| 자동 보정 | **SKIP** (별도 승인) |

---

## 6. 기존 데이터

| 항목 | 상태 |
|------|------|
| 48/666/2·M1·U1 | **SKIP** (Stage 2 fixture PASS 유지, 운영 미변경) |
| OPENING 자동 게시 | **PASS** (미수행) |

---

## 7. 수정 파일·이유

| 파일 | 이유 |
|------|------|
| `20261030210000_equipment_cache_drift_detect.sql` | drift 탐지·rent 차단·opening Q replay |
| `fetchStock.ts`, `types.ts`, `rpcMap.ts` | opening/drift flags |
| `EquipmentInventoryApp.tsx` | 검색·OPENING/drift 표시·허위 A 방지 |
| `stage2_live_auth_e2e.mjs` | GoTrue+PostgREST E2E |
| `stage2_rollback_and_cache.mjs` | 롤백·drift QA |
| `stage2_supabase_minimal_apply.sql` | 로컬 Supabase users/is_admin shell |

---

## 8. 미해결·cutover 차단

1. **브라우저 E2E** (admin/teacher full flows)  
2. **Next.js Admin API** + live JWT 통합 (cookie session)  
3. **운영 DB** expand + OPS OPENING + legacy gate ON  
4. Legacy UI 저장 실패 UX (gate ON)  
5. `supabase db reset` 전체 마이그레이션 chain smoke (로컬 partial apply만 수행)

---

## 9. 재현 명령 (격리)

```powershell
npx supabase@2.122.0 start
# SQL: stage2_supabase_minimal_apply.sql + equipment migrations on supabase_db_1
$env:STAGE2_SUPABASE_URL='http://127.0.0.1:54321'
$env:STAGE2_SUPABASE_ANON_KEY='...'   # supabase status -o env
$env:STAGE2_SUPABASE_SERVICE_ROLE_KEY='...'
node docs/equipment-inventory/stage2_live_auth_e2e.mjs
node docs/equipment-inventory/stage2_rollback_and_cache.mjs
```

**Commit / Push / Deploy / 운영 변경:** 없음.
