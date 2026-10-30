# SPOKEDU 교구 수불 — Stage 2 출시 전 통합 검증 보고 (2026-10-30)

**선행 판정:** `LOCAL_DB_INTEGRATION_PASS / PRODUCTION_CUTOVER_BLOCKED`  
**Stage 2 판정:** **`STAGE2_INTEGRATION_PASS (Docker + JWT 시뮬레이션)` / `PRODUCTION_CUTOVER_BLOCKED`**

**Stage 2 최종 QA:** [EQUIPMENT_STAGE2_FINAL_QA_REPORT.md](./EQUIPMENT_STAGE2_FINAL_QA_REPORT.md) → **`STAGE2_PARTIAL_PASS / REMAINING_GATES_DOCUMENTED`**

증거: [EQUIPMENT_STAGE2_INTEGRATION_RESULTS.json](./EQUIPMENT_STAGE2_INTEGRATION_RESULTS.json)

---

## 1. Supabase 격리 JWT·RLS

| 항목 | 결과 | 비고 |
|------|------|------|
| 관리자 조회·대여·반납 (RPC) | **PASS** | postgres/service 경로 + Stage 1.5 시나리오 유지 |
| 강사 본인 `teacher_equipment_holdings_v` | **PASS** | JWT `sub` 시뮬레이션, A=2 held |
| 타 강사 보유 차단 | **PASS** | B=0 rows |
| 미인증 | **NOT_VERIFIED (live)** | PostgREST anon live 미실행; ledger/rentals REVOKE DML은 PASS |
| authenticated 원장 DML | **PASS** | `permission denied for table equipment_ledger` |
| RPC authenticated EXECUTE | **PASS** | `admin_equipment_rent` 거부 |
| SECURITY DEFINER 트리거 | **PASS** | legacy gate 트리거 `security definer` |
| `security_invoker` 뷰 + RLS | **PASS** | rentals underlying RLS + view SELECT |
| **로컬 Supabase GoTrue live JWT** | **SKIP** | CLI 미기동 시 `STAGE2_SUPABASE_ANON_KEY` 없음 — `npx supabase start` 후 재실행 가능 |

재현:

```powershell
node docs/equipment-inventory/stage2_integration.mjs
# live Supabase (운영 아님):
# npx supabase start && supabase status -o env >> .env.stage2.local
# $env:STAGE2_SUPABASE_URL=...; $env:STAGE2_SUPABASE_ANON_KEY=...; node docs/equipment-inventory/stage2_integration.mjs
```

---

## 2. 운영 규모 데이터 복제 (익명 fixture)

| 조건 | 결과 |
|------|------|
| catalog 48 | **PASS** |
| inventory 666 | **PASS** |
| teacher_inventory 2 | **PASS** |
| M1 `밸런스핏 ` 4행 | **PASS** |
| U1 users 부재 19행 | **PASS** |
| expand 재적용 후 행 수·ledger 0 유지 | **PASS** (OPENING 미게시) |
| 삭제·이중 이관·임의 OPENING | **없음** |

Fixture: `stage2_scale_fixture.sql` (합성 UUID·이메일만).

---

## 3. 레거시 쓰기 차단

| 항목 | 결과 |
|------|------|
| 기본 `legacy_direct_writes_blocked=false` | **PASS** — legacy UPDATE 허용 |
| OPS `equipment_ops_set_legacy_writes_blocked(true)` | **PASS** — admin JWT UPDATE `EQUIPMENT_LEGACY_WRITE_BLOCKED` |
| `service_role` bypass | **PASS** |
| catalog T/Q direct cache (trigger) | **구현됨** — gate ON 시 authenticated T/Q UPDATE 거부 (별도 assert는 Stage 2.1) |

마이그레이션: `20261030200000_equipment_legacy_write_gate.sql`  
운영 활성화 전 DB 기본값 **false** → 기존 업무 방해 없음.

---

## 4. 신규 SQL (운영 적용은 OPS 승인 후)

| 파일 | 역할 |
|------|------|
| `20261030110000_equipment_legacy_tables_baseline.sql` | 로컬 reset용 IF NOT EXISTS (prod no-op) |
| `20261030200000_equipment_legacy_write_gate.sql` | legacy DML gate + ops RPC |

---

## 5. 잔여 cutover 차단

1. **로컬 Supabase live JWT** E2E (GoTrue 실제 토큰)
2. **OPS_ACTIVATION** + OPENING batch (의도적 보류)
3. **운영 DB** expand smoke (48/666 실데이터, PII 최소 export 후)
4. **렌더 회귀 QA** (admin/teacher UI)
5. inventory RLS **운영 정책**과 trigger **병행** 검증 (테스트 DB는 단순화 policy)

---

## 6. 지시서 잘림 (“신규…”)

사용자 메시지가 `신규`에서 잘렸습니다. **신규 UI/경로**에 대한 추가 요구가 있으면 이어서 알려주시면 동일 범위에서만 반영하겠습니다.

**Commit / Push / Deploy / 운영 Supabase 마이그레이션:** 수행하지 않음.
