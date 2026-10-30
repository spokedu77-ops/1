# 03. CENTER_SETTLEMENT_MAPPING_PLAN

**전제:** 59 policy rows, **0**건 `payload.center_id` 연결 (2026-10-30 실측)  
**원칙:** UUID(운영) ↔ TEXT(정산 id) 고유 연결; 이름 영구 연결 금지; 해제 시 정산 데이터 삭제 금지

---

## 1. 59개 정산 항목 분류 (type)

| `payload.type` | 건수 | 분류 | 연결 전략 |
|----------------|------|------|-----------|
| `regular` | 43 | 정규 기관·거점 수업 | **1:1 연결 후보** (운영 `centers` 존재 시) |
| `short` | 14 | 단기/특강·행사성 | **수동 검토** — 운영 센터 없이 policy-only 가능 |
| `private` | 2 | 프라이빗/비정규 | **수동 검토** (1건 이름 공백) |
| `etc` | 0 | 기타 (타입 정의만) | — |

**이름 없음 (2):**

| TEXT id | type |
|---------|------|
| `c5kaghnr` | private |
| `c3assl67` | regular |

→ **연결 대상 아님** until 이름·성격 확인; policy row 유지.

---

## 2. 운영 센터 대비 휴리스틱 (이름 정규화 trim, 공백 collapse)

| 지표 | 값 | 의미 |
|------|-----|------|
| exactNameMatch (1 centers row) | **7** | 자동 연결 **후보** (운영자 확인 still required) |
| ambiguousNameMatch | **0** | 동명 2+ centers 없음 |
| noNameMatch | **52** | 철자·별칭·「거점 N호」 vs 등록명 차이, 또는 **비센터 비용 행** |

**샘플 불일치 (정산명 → centers에 동일 문자열 없음):**

- `샘물 지역아동센터` vs centers `샘물 지역 아동센터` (공백)
- `거점 6호 늘봄`, `우면산`, `송파 청소년(세움)` 등 — **운영 DB 52건 중 exact match 아님**

**분류 결론:**

| 버킷 | 대략 규모 | 처리 |
|------|-----------|------|
| A. UUID 연결 확정 | 0 (현재) + ≤7 이름후보 | `payload.center_id` SET via MASTER UI |
| B. policy-only (센터 관리 없음) | 다수 short + 비용성 regular | 연결 없음; 정산만 유지 |
| C. 수동 검토 | 52 noMatch + 2 noName | 스프레드시트 매핑 작업 (OPS) |
| D. 중복 연결 방지 | API | PUT 시 동일 UUID 다른 policy에 있으면 **409** (신규 검증 권장) |

---

## 3. 제안 DB 관계

### 3.1 Phase 1 (권장, **DDL 없음**)

- **`admin_settlement_sheet_centers.payload.center_id`** — 이미 `SettlementCenter.center_id`, PUT 검증 존재.
- **운영 `centers`에 역참조 없음** — 정산 시트가 링크 SSOT.
- **1:N 허용:** 한 UUID에 multiple TEXT policy (정규 + 재료비 + 특강) 가능 → **`centers.settlement_center_id` 단일 FK 부적합**.

### 3.2 Phase 2 (선택 DDL, 승인 후)

**옵션 A — 매핑 테이블 (1:N 공식화)**

```sql
-- 설계안만; 실행 금지
create table public.center_settlement_links (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  settlement_policy_id text not null references public.admin_settlement_sheet_centers(id) on delete restrict,
  link_role text not null default 'primary', -- primary | materials | event
  created_at timestamptz not null default now(),
  unique (settlement_policy_id)
);
```

- `unique (settlement_policy_id)` → policy당 운영 센터 1개.
- `center_id` multiple rows → 1:N.

**옵션 B — `centers.primary_settlement_policy_id` (1:1 only)**

- 59건 중 다수가 복수 policy 필요 시 **비권장**.

**권장:** Phase 1 JSON link + OPS 수동 분류 → 필요 시 옵션 A.

---

## 4. 데이터 소유권 (동기화 금지)

| 데이터 | SSOT | 센터 모달 탭 |
|--------|------|--------------|
| 기관명·주소·계약 | `centers` | 기본정보 |
| 회당 청구 `session_fee` | `centers` | 수업 및 금액 |
| 월별 청구·회기·VAT | `admin_settlement_sheet_months` | 정산 |
| instr/assist/rental/cost | policy + `rates[]` | 정산 (read + link) |
| 강사 기본 단가 | `users` + tier | 수업 및 금액 (computed) |
| 실제 회차·배정 | `sessions` | 정산 (집계 참조만) |

**양방향 overwrite sync 구현 금지** (지시서 §5).

---

## 5. 무결성

1. **연결 생성:** MASTER only; UUID exists; optional duplicate policy guard.
2. **연결 해제:** `center_id: null`; **월별 rows·locked history 유지**.
3. **센터 삭제:** FK 없음 → orphan `center_id` 가능 → 삭제 전 unlink 또는 soft-delete 정책 (Product Decision).
4. **59건 보존:** migration/restore로 id 변경 금지; `id` TEXT stable key.

---

## 6. 4개월 월별 데이터 (2026-08 ~ 11)

- **4** month keys, **`locked: false`** (전부 미확정).
- 구현·QA 시 locked=true 시나리오로 423 회귀 필수 (`route.test.ts`).

---

## 7. 승인 필요

1. Phase 1 only vs 매핑 테이블 도입 시점.
2. 이름 7건 자동 제안 UI 허용 여부 (휴리스틱 **assist**, not auto-save).
3. `short`/`private` policy를 centers에 **신규 생성**할지 vs policy-only 유지.

---

**상태:** `DESIGN_READY` (매핑 — DDL 승인 대기)
