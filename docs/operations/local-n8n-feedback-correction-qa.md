# 피드백 AI 교정 — Local QA ledger

**판정:** `LOCAL_QA_PASS` (automation scope) / `STAGING_APPROVAL_PENDING`

## LOCAL_QA_PASS (agent / Vitest — automation scope)

- Worker auth, claim mock, complete idempotent/mismatch scenarios
- Draft quality heuristics + SPOMOVE literal guard
- n8n workflow JSON contract (0-job idle, multi-job fan-out, no secrets, reduced execution logging)
- Regression isolation vs equipment/settlement

## Repo-wide gates (2026-11-05 run)

| Gate | Automation 관련 | 전체 repo |
|------|-----------------|-----------|
| `npm run typecheck` | PASS | PASS |
| `npm run build` | PASS (automation routes included) | PASS |
| Vitest automation paths | **20/20 PASS** | — |
| Vitest full `npm run test` | — | **26 FAIL** (SPOMOVE catalog 72→75 등 **본 MVP와 무관**, 기존 워킹 트리) |
| `npm run lint:ci` | changed paths PASS | FAIL (`.spomove-audit-stage2/**` 등 **무관**) |

## NOT_TESTED (명시)

| 항목 | 이유 |
|------|------|
| Windows Docker ↔ LM Studio HTTP | 에이전트 환경에서 실제 Docker/LM Studio 미기동 |
| n8n runtime import 실행 | n8n UI/컨테이너 미실행 |
| Supabase queue RPC E2E (9 scenarios) | 운영/스테이징 DB 마이그레이션 미적용 |
| `/admin/teachers-classes` rendered QA | 로컬 admin 로그인 세션 없음 |
| Vercel worker URL from n8n container | Production/Preview 배포 금지 |

## DB 시나리오 (스테이징 적용 후 수동)

1. pending 0 → claim empty
2. pending 1 → complete
3. pending N → N번 fan-out
4. duplicate enqueue → 409
5. processing + kill PC → lease 후 requeue
6. lease 만료 → 다른 worker claim
7. stale worker complete → JOB_WORKER_MISMATCH
8. completed re-complete → idempotent 200
9. fail × MAX → max_attempts_exceeded
