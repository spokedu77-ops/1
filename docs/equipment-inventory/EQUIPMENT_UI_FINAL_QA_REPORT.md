# SPOKEDU 교구 수불관리 — UI 최종 QA 보고서

**판정:** `EQUIPMENT_UI_VISUAL_QA_PASS / INTEGRATION_E2E_NOT_VERIFIED`
**일시:** 2026-11-02 (KST)
**결과 JSON:** `docs/equipment-inventory/EQUIPMENT_UI_FINAL_QA_RESULTS.json`

---

## 1. 최종 변경 파일 (UI + QA)

| 구분 | 경로 |
|------|------|
| 신규 3탭·모달·API | `app/admin/inventory/*`, `app/lib/equipment/*`, `app/api/admin/equipment/*` (이전 refactor) |
| **시각 fixture (신규)** | `app/admin/inventory/EquipmentInventoryVisualFixture.tsx` |
| **fixture 라우트 (dev 전용)** | `app/dev/equipment-inventory-visual-fixture/page.tsx` — `EQUIPMENT_INVENTORY_VISUAL_FIXTURE=1` + non-production |
| **Playwright** | `docs/equipment-inventory/ui_visual_fixture_qa.mjs`, `docs/equipment-inventory/ui_final_qa.mjs` |
| Stage 2.9 재사용 | `docs/equipment-inventory/stage29_full_e2e.mjs` (격리 DB 가능 시 자동 호출) |

운영 인증·RLS·admin API는 **우회하지 않음**. Fixture는 가상 수량·mock rental_id만 사용.

---

## 2. 실행 환경과 모드

| 항목 | 값 |
|------|-----|
| Next.js | 16.2.11 @ `http://127.0.0.1:3000` (단일 dev) |
| UI / 쓰기 | `.env.local`: `NEXT_PUBLIC_EQUIPMENT_UI=ledger`, `EQUIPMENT_WRITE_MODE=ledger` |
| Fixture | dev 프로세스: `EQUIPMENT_INVENTORY_VISUAL_FIXTURE=1` |
| Supabase | **원격** (`*.supabase.co`) — **mutation E2E 차단** (정책 준수) |
| Docker | **미설치/미가동** — Stage 2.9 DB bootstrap **불가** |
| Stage 2.9 계정 | `equip-admin@test.local` / `equip-teachera@test.local` + `stage2-equip-test-9` (격리 DB 전용, 원격 미사용) |

---

## 3. 신규 UI 실제 브라우저 시각 QA — **PASS**

**방식:** `VISUAL_FIXTURE_QA_PASS` — 승인된 React 컴포넌트(`EquipmentStockTable/Cards`, modals)를 fixture에서 렌더, Playwright Chromium 캡처.

| 검증 | 결과 |
|------|------|
| T/W/L/Q/A 컬럼 | **PASS** |
| OPENING 미확정 (`—`, 재고 미확정) | **PASS** |
| 캐시 불일치 배지 | **PASS** |
| 빈 목록 | **PASS** |
| UI/서버 불일치 배너 (fixture) | **PASS** |
| 1440 / 1024 테이블 | **PASS** |
| 768 / 375 카드 | **PASS** |
| 대여·반납(다중 rental 선택) 모달 | **PASS** |
| 가로 넘침(1024 테이블 3개) | **PASS** |

### 스크린샷 (신규 UI fixture 기준)

`docs/equipment-inventory/ui_final_qa_screenshots/`

- `fixture_desktop_1440.png`
- `fixture_width_1024.png`
- `fixture_tablet_768.png`
- `fixture_mobile_375.png`
- `fixture_modal_rent.png`
- `fixture_modal_return_multi.png`

**재실행:**

```powershell
$env:EQUIPMENT_INVENTORY_VISUAL_FIXTURE='1'
npm run dev
node --env-file=.env.local docs/equipment-inventory/ui_final_qa.mjs
```

---

## 4. 관리자·강사 업무 E2E — **NOT_VERIFIED**

| 항목 | 상태 | 사유 |
|------|------|------|
| Stage 2.9 SSR 쿠키 + opening/rent/return | **NOT_VERIFIED** | Supabase URL 원격 + Docker 없음 |
| `/admin/inventory` 실데이터 스크린샷 | **NOT_VERIFIED** | 동일 (격리 DB·Stage29 seed 미실행) |
| `/teacher/inventory` parity | **NOT_VERIFIED** | 동일 |

원격 DB에 테스트 데이터를 **삽입하지 않음**. 로컬 Supabase + Docker 가동 시 `ui_final_qa.mjs`가 `stage29_full_e2e.mjs`를 자동 호출하도록 연결됨.

---

## 5. 환경변수 모드 분리

| 검증 | 방법 | 결과 |
|------|------|------|
| UI ledger opt-in | `page.tsx` + `.env.local` | 코드·설정 **일치** |
| 서버 ledger writes | `EQUIPMENT_WRITE_MODE` + stock API | **NOT_VERIFIED** (원격 DB에서 Stage29 E2E 미실행) |
| 불일치 UX | fixture `scenario=mismatch` | **PASS** (시각) |

---

## 6. UI 결함 및 수정

| 결함 | 수정 |
|------|------|
| modals fixture 초기 auto-open으로 Playwright 클릭 차단 | `EquipmentInventoryVisualFixture` — 모달 초기 `false` |
| SPOKEDU_MASTER_QA 로그인 실패 | Stage 2.9 기본 계정으로 QA 스크립트 전환; 제품 결함 **아님** |
| Docker/격리 DB 없음 | mutation E2E **NOT_VERIFIED**로 기록 (PASS 아님) |

---

## 7. 남은 검증 환경 제약

1. **로컬 Supabase + Docker** — Stage 2.9 bootstrap·`stage29_full_e2e.mjs` 업무 E2E
2. 격리 DB에서 `UI_QA_ALLOW_MUTATIONS` 허용 시 opening/rent/return/history(created_by) 연속 검증
3. ledger UI **실서버 렌더** 스크린샷 (fixture와 별도, optional)

---

## 8. 완료 판정

| 게이트 | 판정 |
|--------|------|
| 시각 QA (1440/1024/768/375, 상태, 모달) | **`VISUAL_FIXTURE_QA_PASS`** |
| 통합 업무 E2E | **`INTEGRATION_E2E_NOT_VERIFIED`** |
| 종합 | **`EQUIPMENT_UI_VISUAL_QA_PASS / INTEGRATION_E2E_NOT_VERIFIED`** |

`EQUIPMENT_UI_FINAL_QA_PASS / PRODUCTION_CUTOVER_PENDING`는 **격리 DB에서 Stage 2.9 E2E PASS 후**에만 승격.

---

## 9. 금지 준수

- 운영 Supabase 데이터 변경 **없음**
- Commit / Push / Deploy **없음**
- 인증·RLS 우회 **없음** (fixture는 dev 전용 라우트 + 가상 데이터)

---

## 10. 환경 불일치 UI 상태 판정 수정 (2026-11-02)

### 문제

원격 DB에 ledger 스키마가 없는 상태(`SCHEMA_MISSING`)인데도 「수불 원장 DB 스키마 미준비」와 「ledger 모드 활성화 후 재시도」 안내가 **동시에** 노출되어, `EQUIPMENT_WRITE_MODE=ledger`인 서버를 **MODE_MISMATCH**로 오인했다.

### 수정

| 구분 | 내용 |
|------|------|
| SSOT | `app/lib/equipment/inventoryConnectionState.ts` — `MODE_MISMATCH` / `SCHEMA_MISSING` / `LEDGER_READY` / `LOAD_ERROR` |
| API | `GET /api/admin/equipment/stock` — `connection_state`, `ledger_schema_ready`; 스키마 없을 때 200 + 빈 items (0개 목록 아님) |
| API | `history` / `rentals` — ledger 모드·스키마 미준비 시 500 대신 빈 배열 + `warning` |
| UI | `EquipmentInventoryApp` — `SCHEMA_MISSING` 시 **단일 배너**만 (`SCHEMA_MISSING_USER_MESSAGE`); 재고·강사·이력 탭 중복 문구 제거; 대여·반납·조정·등록은 `LEDGER_READY` 전 차단 |

**현재 연결 환경 판정:** UI ledger + 서버 ledger + DB 스키마 없음 → **`SCHEMA_MISSING`** (MODE_MISMATCH 아님).

---

## 11. 원격 DB 전환 사전 점검 (읽기 전용, 2026-11-02)

**재실행:** `node --env-file=.env.local docs/equipment-inventory/_readonly_remote_db_prep_audit.mjs`
**운영 DDL/DML:** **미실행**

### 1) 연결 Supabase 프로젝트

| 항목 | 결과 |
|------|------|
| 프로젝트 ref | `mwgvserdyflsqyhcqecp` (호스트에서 추출; 키·URL 본문 미기록) |
| 로컬 env | `EQUIPMENT_WRITE_MODE=ledger`, `NEXT_PUBLIC_EQUIPMENT_UI=ledger` |

### 2) Legacy 테이블 구조·데이터 (API probe)

| 테이블 | 존재 | 건수(대략) |
|--------|------|------------|
| `catalog` | 예 | **48** |
| `inventory` | 예 | **666** |
| `inventory_logs` | 예 | **1412** |
| `teacher_inventory` | 예 | **2** |

Ledger용 `catalog` 확장 컬럼(`mgmt_code`, `qty_on_hand_total`, `qty_quarantine`, `opening_confirmed`) — **전부 미존재**.

### 3) 신규 수불 원장 마이그레이션 적용 여부

| 객체 | 상태 |
|------|------|
| `equipment_rentals` | **없음** |
| `equipment_ledger` | **없음** |
| `ledger_schema_ready_probe` | **false** |

`supabase_migrations.schema_migrations` 직접 조회는 `.env.local`에 `DATABASE_URL`/`SUPABASE_DB_URL` **없어 스킵**. API probe로 **ledger 마이그레이션 미적용**은 확실.

### 4) Repo 마이그레이션 순서·미적용 후보

파일명 순 (교구·20261030 체인):

1. `20260422130000_curriculum_sub_and_equipment_tags.sql`
2. `20261030110000_equipment_legacy_tables_baseline.sql`
3. `20261030120000_equipment_ledger_expand.sql` ← 테이블·RPC 핵심
4. `20261030130000_fix_legacy_gate_jwt_bypass.sql`
5. `20261030200000_equipment_legacy_write_gate.sql`
6. `20261030210000_equipment_cache_drift_detect.sql`

**함수 `CREATE OR REPLACE` 재정의 위험:** `30130000`이 `equipment_legacy_writes_blocked` 등을 재정의하고, `30200000`·`30210000`이 gate·cache drift 및 **`admin_equipment_opening_balance` / `admin_equipment_rent`** 를 다시 정의. **반드시 위 순서대로** 적용; `30210000`을 `30120000`보다 먼저 적용하면 RPC 시그니처·동작 불일치 가능.

### 5) 48교구·강사 보유 매핑 (inventory.name → catalog.name)

| 지표 | 값 |
|------|-----|
| 샘플 inventory 행 | 666 |
| catalog 1:1 exact name match | **662** |
| unmapped (match 0) | **4** |
| ambiguous (match >1) | **0** |

전환 전 **4건 unmapped** 수동 큐 필요 (자동 merge 금지).

### 6) Expand 가능성 (데이터 손실 없음)

- Legacy 3테이블 **존재·데이터 유지** → Expand-only 체인과 **양립**.
- Ledger 테이블·catalog qty 컬럼은 **추가 적용** 대상; 기존 48 catalog row **DROP 없음**.

### 7) 백업·쓰기 차단 (실행 전 계획, 미실행)

| 단계 | 권장 |
|------|------|
| 백업 | Supabase 프로젝트 스냅샷/PITR 또는 `pg_dump` (승인된 전환 창) |
| 쓰기 차단 | 전환 창에 `EQUIPMENT_WRITE_MODE=legacy` 또는 ops gate `legacy_direct_writes_blocked` (마이그레이션 `30200000` 이후) |
| 검증 | 격리 DB Stage 2.9 E2E → opening 분류 → 운영 cutover |
| 참고 문서 | `EQUIPMENT_DATA_MIGRATION_PLAN.md`, `EQUIPMENT_RELEASE_GATE.md` |

### 사전 점검 결론

**운영 DB는 legacy 데이터만 존재하며, repo의 20261030 equipment ledger 마이그레이션은 아직 적용되지 않은 상태로 판단된다.** UI `SCHEMA_MISSING` 판정과 일치. 다음 단계는 **승인된 운영 전환 절차**로 마이그레이션 적용·opening·E2E 검증 (본 보고서 범위 밖).
