# SPOKEDU n8n Stage 3 — 무료 로컬 검증 보고

**완료 상태:** `LOCAL_DB_E2E_PASS` / `PRODUCTION_APPROVAL_PENDING`  
**기준일:** 2026-11-05 (KST)  
**운영 Supabase / Vercel / commit / push:** 적용·실행하지 않음

---

## 1. 요약

| 구분 | 결과 |
|------|------|
| 로컬 Docker Postgres + 큐 마이그레이션 2건 | **PASS** (`scripts/local-feedback-correction-supabase-e2e.mjs`) |
| Enqueue→Claim→Complete→Consume (DB/RPC) | **PASS** (Consume은 DB `consumed_at` 시뮬레이션; Admin consume API는 NOT_TESTED) |
| 대기 0·1·다건·중복·Lease·실패·재시도 | **PASS** |
| Automation Vitest (8 tests, 3 files) | **PASS** |
| 전체 Vitest (현재 워킹 트리, HEAD `225a9111` + 로컬 변경) | **3335 passed / 2 skipped** — n8n 큐 회귀 아님 |
| LM Studio (`127.0.0.1:1234/v1/models`) | **PROBE OK (HTTP 200)** — n8n 워크플로 연동 E2E는 NOT_TESTED |
| n8n Docker (`127.0.0.1:5678`) | **NOT_TESTED** (컨테이너 미기동) |
| Next HTTP worker / enqueue / consume API | **NOT_TESTED** (dev 서버 미기동) |

상세 JSON: [`local-n8n-feedback-correction-e2e-results.json`](./local-n8n-feedback-correction-e2e-results.json)

---

## 2. 로컬 DB 구성 (신규 Supabase 클라우드 없음)

- **유지:** 기존 SPOKEDU Supabase 클라우드 프로젝트 — **쓰기·마이그레이션 미적용**
- **사용:** 로컬 Supabase 스택 (`127.0.0.1:54321` / Postgres `54322`)
- **제약:** `supabase/config.toml`의 `[db.migrations] enabled = false` 및 Supabase CLI v3 설정 검증(Twilio/Apple 등) 때문에 **`supabase db reset`은 CLI 경로로는 사용하지 않음**
- **대안:** E2E 스크립트가 Docker Postgres에 **레거시 `sessions` 최소 스tub**을 올린 뒤, 작성한 **마이그레이션 2개만** 순서대로 적용
  - `20261105120000_admin_feedback_correction_queue.sql`
  - `20261105140000_admin_feedback_correction_queue_hardening.sql`
- DDL 후 PostgREST 스키마 캐시: `pg_notify('pgrst', 'reload schema')` + 1.5s 대기

**한계 (명시):** 운영 DB와 동일한 전체 마이그레이션 체인·트리거·RLS 주변(`sessions` 가드 등)은 로컬 stub에서 **재현하지 않음**. 큐 RPC·제약·멱등·lease·retry 의미만 검증.

---

## 3. E2E 시나리오 (가상 강사·학생)

- `auth.users`: `e2e-teacher@example.invalid`, `e2e-admin@example.invalid`
- `sessions` / `feedback_fields`: SPOMOVE-CORE5 등 **가상** 피드백 스냅샷
- 검증: `sessions.status`는 complete 후에도 `finished` 유지

---

## 4. Vitest 26건 실패 (과거) vs 기준 커밋

- **기준 커밋:** `225a9111149da052db5fe6728f05df950f98b4a9` (현재 `main` HEAD)
- **Stage 2 당시:** 워킹 트리의 **SPOMOVE 훈련·공개 웹(site-ia, field-records 등)** 미커밋 변경으로 전체 Vitest **26 fail** — automation/n8n 파일과 **무관**
- **Stage 3 재측정 (본 세션):** `npx vitest run` → **507 files pass, 3335 tests pass** (동일 dirty tree)
- automation 전용: `feedbackCorrection` / `feedback-correction` / `regressionIsolation` → **8/8 PASS**

**결론:** 피드백 교정 큐 MVP는 Vitest 회귀 원인이 아님. 전체 스위트 실패는 **다른 도메인 WIP**와 동기화 여부에 따름.

---

## 5. NOT_TESTED 목록

| 항목 | 사유 |
|------|------|
| n8n Pull 워크플로 import·스케줄 실행 | `docker-compose.n8n.yml` 서비스 미기동 |
| LM Studio → n8n HTTP → LLM → complete | 워크플로·Next worker 동시 기동 미실시 (LM API 프로브만 200) |
| `POST /api/admin/.../enqueue` | Next 미기동 |
| `POST /api/automation/worker/*` | Next 미기동 |
| `POST /api/admin/.../consume` | Next 미기동 (DB `consumed_at`만 검증) |
| Supabase CLI `db reset` + 전체 247 migrations | CLI config 검증 실패 + 레거시 테이블(`warmup_programs_composite` 등) 갭 |
| 운영 DB 마이그레이션 적용 | **금지** (본 Stage 범위 외) |

---

## 6. 운영 적용 시 예상 영향 (승인 전)

**적용 대상 (승인 후에만):**

1. `20261105120000_admin_feedback_correction_queue.sql` — 신규 테이블·RPC·RLS deny·service_role grant  
2. `20261105140000_admin_feedback_correction_queue_hardening.sql` — complete/fail hardening

**기대 효과**

- Admin 수동 enqueue → n8n Pull worker → `correction_draft` 임시 저장 → Admin consume·편집 → 기존 save API
- **`sessions` / 정산·마일리지 자동 변경 없음** (마이그레이션 주석·E2E로 확인)

**리스크 / 주의**

- `sessions`당 active(pending|processing) job **1건** unique — 중복 enqueue DB 거부
- PostgREST/Supabase: DDL 후 API에서 RPC 보이려면 배포 파이프라인의 migration 적용 + schema reload (운영은 마이그레이션 경로 사용)
- `AUTOMATION_WORKER_SECRET` — Vercel env + n8n `.env.local` (service_role은 n8n에 **부여하지 않음**)
- 롤백 시 in-flight job 데이터 손실 가능 — 운영 적용 전 대기 큐 0건 확인 권장

**운영 SQL 번들·롤백:** [`local-n8n-feedback-correction-production-sql.md`](./local-n8n-feedback-correction-production-sql.md) (**실행하지 않음**)

---

## 7. 변경 파일 (Stage 3)

- `scripts/local-feedback-correction-supabase-e2e.mjs` — 로컬 E2E (stub + 2 migrations, PostgREST reload)
- `docs/operations/local-n8n-feedback-correction-e2e-results.json` — 실행 결과
- `docs/operations/local-n8n-feedback-correction-stage3-report.md` — 본 문서
- `docs/operations/local-n8n-feedback-correction-production-sql.md` — 운영 적용/롤백 초안

---

## 8. 승인 요청 (`PRODUCTION_APPROVAL_PENDING`)

운영 Supabase에 위 **2개 마이그레이션만** (순서 고정) 적용하고, Vercel env·n8n worker URL·secret 설정 후 Admin UI smoke를 진행해도 되는지 승인 부탁드립니다.
