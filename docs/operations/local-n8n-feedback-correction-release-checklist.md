# SPOKEDU 피드백 AI 교정 MVP — 운영 적용 체크리스트 · 실행 순서

**상태:** 릴리스 패키지 (실행 **승인 전** — Supabase/Vercel/commit/push **금지**)  
**판정 근거:** `PRODUCTION_RELEASE_READY` (로컬 n8n E2E 완료)

---

## A. 실행 순서 (전체)

| 단계 | 담당 | 작업 | 완료 |
|------|------|------|------|
| **A0** | 운영 | 백업/PITR 확인, 유지보수 창(선택), 릴리스 커밋·배포 **승인** | ☐ |
| **A1** | Supabase | 마이그레이션 **1→2** 적용 (§B) | ☐ |
| **A2** | Supabase | 적용 **후** 검증 SQL (§B) | ☐ |
| **A3** | Vercel | `AUTOMATION_WORKER_SECRET` 생성·등록 (§D), **Production 재배포** (§E) | ☐ |
| **A4** | Vercel | 배포 후 worker 401/200 스모크 (Bearer, §F1) | ☐ |
| **A5** | Windows | n8n 컨테이너·env·워크플로 (§G), LM Studio (§H) | ☐ |
| **A6** | 운영 | **가상 1건** Smoke (§F2) | ☐ |
| **A7** | 운영 | 실패 시 §I 복구 또는 §B 롤백 | — |

**규칙:** **A1 → A2 → A3(재배포) → A4 → A5 → A6** 순서 권장. (DB 없이 worker만 켜도 큐 RPC는 실패하므로 **A1 선행**.)

---

## B. Supabase 마이그레이션

### B1. 적용 순서 (고정)

1. `supabase/migrations/20261105120000_admin_feedback_correction_queue.sql`
2. `supabase/migrations/20261105140000_admin_feedback_correction_queue_hardening.sql`

조직 표준 경로(Dashboard SQL / CI migration / `supabase db push`)로 **한 번씩**, **역순 금지**.

### B2. 적용 **전** 검증 (읽기 전용)

```sql
-- 큐 테이블이 아직 없어야 함 (이미 있으면 중복 적용 여부 확인)
select to_regclass('public.admin_feedback_correction_jobs') as jobs_table;
-- 기대: NULL

-- sessions 존재 (FK 전제)
select to_regclass('public.sessions') as sessions_table;
-- 기대: sessions

-- active job 0건 (신규면 자동 만족)
select count(*) as active_jobs
from public.admin_feedback_correction_jobs
where status in ('pending', 'processing');
-- 테이블 없으면 생략
```

### B3. 적용 **후** 검증 (읽기 전용)

```sql
select to_regclass('public.admin_feedback_correction_jobs') as jobs_table;

select proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname like 'admin_feedback_correction_%'
order by 1, 2;
-- 기대: requeue_stale, claim_jobs, complete_job, fail_job (fail 5-arg 시그니처)

select indexname from pg_indexes
where schemaname = 'public' and tablename = 'admin_feedback_correction_jobs';
-- 기대: session_created, status_lease, one_active_per_session, idempotency unique

select pol.polname, pol.polcmd
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
where c.relname = 'admin_feedback_correction_jobs';
-- 기대: deny_all (anon/authenticated)
```

### B4. 롤백 (비상, 데이터 삭제)

[`local-n8n-feedback-correction-production-sql.md`](./local-n8n-feedback-correction-production-sql.md) §롤백 — RPC drop → table drop → Vercel/앱 이전 버전.

---

## C. 기존 운영 스키마·RLS·트리거 영향 (최종)

| 대상 | 변경 여부 | 설명 |
|------|-----------|------|
| `public.sessions` 컬럼/트리거 | **없음** | 마이그레이션은 **FK 참조만** (`on delete cascade`) |
| 정산·마일리지·재고 테이블 | **없음** | 큐 테이블만 추가 |
| `sessions` RLS/피드백 가드 트리거 | **없음** | 교정안은 `admin_feedback_correction_jobs.correction_draft`; **기존 save API 전까지 sessions 미갱신** |
| `auth.users` | **없음** | `requested_by` nullable FK만 |
| 신규 `admin_feedback_correction_jobs` | **추가** | RLS: anon/authenticated **deny all**; API는 **service_role** |
| RPC `admin_feedback_correction_*` | **추가** | `service_role` execute only |

**운영 리스크:** 세션 삭제 시 해당 job row **cascade 삭제**. 세션당 **pending/processing 1건** unique.

---

## D. `AUTOMATION_WORKER_SECRET` (값 문서·채팅 **기재 금지**)

| # | 작업 |
|---|------|
| D1 | **생성:** 32바이트 이상 CSPRNG (예: `openssl rand -hex 32`). 비밀관리 도구/1Password 등에만 저장. |
| D2 | **Vercel:** Project → Settings → Environment Variables → Production(필요 시 Preview) → `AUTOMATION_WORKER_SECRET` = 생성값. |
| D3 | **재배포:** env 변경 후 **Production redeploy** (기존 배포만으로는 env 미반영). |
| D4 | **로컬 n8n (Windows):** `ops/local-automation/.env.local` → `SPOKEDU_AUTOMATION_WORKER_SECRET=<Vercel Production과 동일>` (Docker env). 워크플로 Header `Authorization: Bearer …`는 env에서 조합 (**JSON/워크플로 파일에 secret 금지**). |
| D5 | **로테이션:** Vercel 값 변경 → 재배포 → n8n `.env.local` 동시 변경 → `docker compose … up -d --force-recreate`. |

**주의:** Supabase **service_role** 은 n8n·PC에 **두지 않음**.

---

## E. Vercel Production 배포 범위

### E1. 환경 변수 (신규/필수)

| 변수 | 노출 |
|------|------|
| `AUTOMATION_WORKER_SECRET` | Server only (기존 Supabase env와 동일 프로젝트) |

### E2. 배포에 포함되는 **애플리케이션** 파일 (MVP diff 기준)

**API**

- `app/api/admin/automation/feedback-correction/route.ts`
- `app/api/admin/automation/feedback-correction/enqueue/route.ts`
- `app/api/admin/automation/feedback-correction/consume/route.ts`
- `app/api/automation/worker/claim/route.ts`
- `app/api/automation/worker/jobs/[id]/complete/route.ts`
- `app/api/automation/worker/jobs/[id]/fail/route.ts`

**서버·도메인**

- `app/lib/server/automationWorkerAuth.ts`
- `app/lib/server/feedbackCorrectionJobs.ts`
- `app/lib/automation/feedbackCorrectionDraft.ts`
- `app/lib/automation/feedbackCorrectionQuality.ts`
- `app/lib/automation/feedbackCorrectionPolicy.ts`

**Admin UI**

- `app/admin/teachers-classes/page.tsx` (AI 교정 요청 / 교정안 불러오기)

**문서·예시 (배포 아님, 커밋에 포함)**

- `.env.example` (`AUTOMATION_WORKER_SECRET` 주석)

### E3. Vercel **미포함** (Windows / DB / 검증)

- `supabase/migrations/202611051*.sql` → **Supabase**에서 별도 적용
- `ops/local-automation/**`, `scripts/**`, `docs/operations/**`

---

## F. Smoke Test (운영 · 가상 1건)

**전제:** A1–A5 완료, **실제 아동 PII 없음** — 내부 테스트용 `sessions` 1건(피드백 필드 채움) 또는 운영 승인된 **가상 문구**만.

### F1. Worker (배포 직후, DB 적용 후)

- `POST https://<production-domain>/api/automation/worker/claim`
- Header: `Authorization: Bearer <AUTOMATION_WORKER_SECRET>`
- **기대:** `200`, `{ ok: true, jobs: [] }` (대기 0건)

### F2. End-to-end 1건

| # | 단계 | 기대 |
|---|------|------|
| 1 | Admin 로그인 → `/admin/teachers-classes` → 테스트 세션 | — |
| 2 | **AI 교정 요청** (enqueue) | `200`, job `pending` |
| 3 | n8n **Manual test run** 또는 10분 스케줄 대기 | job `completed`, `correction_draft` 존재 |
| 4 | **교정안 불러오기** (consume) | `200`, draft 표시 |
| 5 | SQL: `sessions` 해당 row | `feedback_fields`·`status` **enqueue 전과 동일** |
| 6 | (선택) 검수 후 기존 save **하지 않음**으로 smoke 종료 | — |

**DB 확인 (읽기):**

```sql
select id, session_id, status, correction_draft is not null as has_draft, consumed_at
from public.admin_feedback_correction_jobs
where session_id = '<smoke-session-uuid>'
order by created_at desc
limit 1;
```

### F3. Smoke 실패 시 (복구 요약 → §I)

---

## G. n8n 컨테이너 재사용 · 운영 연결

**기존 `local-automation-n8n-1` / volume `n8n_data` 재사용 가능.**

| # | 작업 |
|---|------|
| G1 | `ops/local-automation/.env.local` — `SPOKEDU_APP_BASE_URL=https://<production-domain>` (trailing slash 없음), `SPOKEDU_AUTOMATION_WORKER_SECRET`, `LM_STUDIO_*`, `SPOKEDU_AUTOMATION_WORKER_ID` |
| G2 | `docker compose -f ops/local-automation/docker-compose.n8n.yml up -d` (이미 up이면 env 변경 시 `--force-recreate`) |
| G3 | 워크플로: repo 루트에서 `node scripts/n8n-import-feedback-correction.mjs` (**배열 bundle**, `active` 필드). 중복 import 시 `n8n list:workflow`로 정리 후 **최신 1개만 active** |
| G4 | n8n UI `http://127.0.0.1:5678` — workflow **Active**, Manual test run으로 F2 검증 |

**네트워크:** 컨테이너 → `host.docker.internal:1234` (LM), → **Production HTTPS** (Vercel). PC 방화벽/프록시에서 아웃바운드 HTTPS 허용.

---

## H. LM Studio (Windows)

| # | 작업 |
|---|------|
| H1 | 모델 1개 **Load** (운영 합의 모델 ID) |
| H2 | Local Server **ON** (`127.0.0.1:1234`) |
| H3 | `LM_STUDIO_MODEL` = `/v1/models`의 **id**와 일치 |
| H4 | `response_format: json_object` **사용 안 함** (워크플로 반영됨) |

---

## I. 실패 시 복구

| 실패 | 조치 |
|------|------|
| Migration 오류 | **중단**; partial 객체 확인; DBA 롤백 §B4 또는 수동 drop 후 재적용 |
| Vercel 401 worker | Vercel secret ↔ n8n env **일치** 확인, redeploy |
| n8n LLM 400/empty | 모델 **로드** 여부, `LM_STUDIO_MODEL` id, `jsonBody` 단일 객체 |
| job `processing` stuck | Supabase: `select admin_feedback_correction_requeue_stale();` 후 n8n 재실행 |
| 잘못된 draft completed | Admin save **하지 않음**; job row만 폐기 또는 수동 `failed` 처리; **sessions 롤백 불필요**(미변경) |
| MVP 전면 철수 | §B4 SQL + Vercel 이전 배포 + n8n workflow deactivate |

---

## J. Windows — 최종 **단일 시작** 절차 (일상)

**최초 1회:** §G3 import, §D4 secret, §H LM 설정.

**매 PC 기동 / Pull 재개:**

```powershell
# 1) LM Studio: 모델 Load + Local Server ON
# 2) 한 줄:
powershell -NoProfile -ExecutionPolicy Bypass -File ops/local-automation/start-n8n.ps1
```

`start-n8n.ps1` = Docker Compose up (`127.0.0.1:5678`).  
개발용 Next는 **`npm run dev:local` (3000)** — n8n Pull 대상 URL은 **Production(Vercel)** 이므로 3000 기동 **필수 아님**.

**(선택)** 로그인 시 자동: `ops/local-automation/register-scheduled-task.ps1`

---

## K. 승인 게이트 (실행 전 서명)

- ☐ Supabase migration 2건 승인  
- ☐ Vercel Production deploy + `AUTOMATION_WORKER_SECRET` 승인  
- ☐ Windows n8n PC 운영 URL·secret·LM 승인  
- ☐ Smoke F2 (가상 1건) PASS  
- ☐ commit/push/배포 **별도 지시** 완료  

---

*SSOT SQL 롤백:* [`local-n8n-feedback-correction-production-sql.md`](./local-n8n-feedback-correction-production-sql.md)
