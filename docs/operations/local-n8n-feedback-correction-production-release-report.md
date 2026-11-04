# SPOKEDU 피드백 AI 교정 — 운영 적용 직전 최종 보고

**판정:** `PRODUCTION_RELEASE_READY`  
**조건:** 아래 **릴리스 게이트**를 승인 순서대로 실행할 것. (본 문서 작성 시점: 운영 Supabase·Vercel·commit·push **미실행**)

**근거 로그:** [`local-n8n-feedback-correction-stage5-results.json`](./local-n8n-feedback-correction-stage5-results.json) (`LOCAL_N8N_RUNTIME_E2E_PASS`)

---

## 1. Stage 5 n8n 실행 결과 요약 (로그·DB 교차)

| 시나리오 | n8n 실행 | DB / API 교차 | 결과 |
|----------|----------|---------------|------|
| **0건** | `Manual test run` → claim → `Expand or idle` → **No pending jobs**, `Execution was successful` | pending 0 | **PASS** |
| **1건** | 동일 체인 → LM → Parse → Complete | `status=completed`, `correction_draft` 5필드, `worker_id=n8n-local`; HTTP consume **200** | **PASS** |
| **다건(3)** | enqueue 3회 + execute 3회(순차) | `completed` count **3**, 세션별 1 active 제약 위반 없음 | **PASS** |
| **실패(LLM)** | Fail LLM / Mark job failed 경로 (초기 LM 설정 오류 시 `llm_unreachable`; 수정 후 정상 complete) | fail 시뮬: `pending` + `error_code=llm_unreachable`, `correction_draft` null | **PASS** |
| **재시도** | fail below max → RPC pending | `fail path → pending retry` evidence | **PASS** |
| **잘못된 JSON/품질** | Parse fail → Mark failed; API **422** on unrelated draft | `sessions.feedback_fields` 불변 | **PASS** |
| **중복 complete** | idle 재실행, pending 0 | 멱등 complete, duplicate complete 없음 | **PASS** |
| **Lease 만료** | requeue_stale 후 n8n reclaim | stale `processing` → **completed** | **PASS** |
| **n8n 재기동** | `docker restart` 후 import+execute | pending → **completed** | **PASS** |
| **PC 전원 off** | — | — | **NOT_TESTED** |

**LM 운영 참고:** 로컬 검증 모델 **`gemma-4-26b-a4b-it-qat`** (LM Studio에 **로드된** 모델 ID 사용). `response_format: json_object`는 LM Studio에서 **400** — 워크플로에서 제거됨.

---

## 2. 3099 종료 코드 1 · 프로세스 정리

| 항목 | 내용 |
|------|------|
| **관측** | `npx next start -p 3099`: `Ready in 172ms` 후 **약 307초 뒤 exit 1**. 로그에 Next 런타임 스택/크래시 **없음**. |
| **판단** | Stage 5 E2E·후속 셸 작업으로 **부모 npm/에이전트 세션 종료** 또는 **동일 repo의 다른 Next 조작**에 의한 정상 종료에 가깝고, 앱 자체 fatal로 보기 어렵다. |
| **조치** | 통합 테스트용 **`next start` (PID 16460, port 3099) 종료**함. |
| **유지** | **`127.0.0.1:3000` dev (`dev:local`)** — 종료하지 않음. |
| **유지(선택)** | n8n Docker **5678** — 로컬 Pull worker용, 운영 배포와 무관. |

---

## 3. Supabase 마이그레이션 최종 점검

### 적용 순서 (고정)

1. `20261105120000_admin_feedback_correction_queue.sql` — 테이블·인덱스·RLS deny·RPC 4종(초기 complete/fail 시그니처)
2. `20261105140000_admin_feedback_correction_queue_hardening.sql` — complete/fail **교체**, fail에 `p_max_attempts`, grant 시그니처 갱신

**역순 적용 금지.** 2번만 단독 적용 금지.

### 기존 스키마 충돌

| 항목 | 평가 |
|------|------|
| `public.sessions` FK | 운영에 **이미 존재** 전제. 신규 테이블만 추가. |
| `auth.users` (`requested_by`) | nullable FK — 기존 auth와 충돌 없음. |
| 동명 객체 재적용 | `create table if not exists`, `create or replace function` — **idempotent**; 운영 1회 적용 권장. |
| `sessions` 트리거/정산 | 마이그레이션이 **`sessions` 미변경**. 정산·마일리지 **무영향**. |
| RLS | anon/authenticated **deny all**; 앱은 **service_role**만 insert/update (기존 admin API 패턴). |

### 롤백

SSOT: [`local-n8n-feedback-correction-production-sql.md`](./local-n8n-feedback-correction-production-sql.md) — RPC drop → `admin_feedback_correction_jobs` drop. **job·draft 데이터 삭제.** 앱 이전 버전 또는 UI off.

### 적용 전 (운영)

- [ ] 백업 / PITR
- [ ] `admin_feedback_correction_jobs` pending+processing **0건**
- [ ] 마이그레이션과 **동일 커밋**의 Vercel 배포 준비

---

## 4. `AUTOMATION_WORKER_SECRET` (값 미기재)

| 단계 | 작업 |
|------|------|
| **1. 생성** | `openssl rand -hex 32` 또는 동등 CSPRNG (**32바이트 이상**). 저장소·n8n JSON·채팅에 **넣지 않음**. |
| **2. Vercel** | Production(필요 시 Preview) Environment Variables: `AUTOMATION_WORKER_SECRET=<생성값>`. Worker API 라우트가 배포된 **동일 프로젝트**. |
| **3. 재배포** | env 추가/변경 후 **재배ploy** (런타임 env 반영). |
| **4. 로컬 n8n (Windows PC)** | `ops/local-automation/.env.local`에 `SPOKEDU_AUTOMATION_WORKER_SECRET=<Vercel과 동일>` (Docker env). 워크플로는 `$env.SPOKEDU_AUTOMATION_WORKER_SECRET` → Header `Authorization: Bearer …`. **Supabase service_role은 n8n에 넣지 않음.** |
| **5. 검증** | n8n 없이: `POST /api/automation/worker/claim` + Bearer → **401**(오류) / **200**(일치). |

**로컬 Next 개발(3000):** repo `.env.local`에도 동일 변수 필요( worker API 로컬 테스트 시). 운영 secret과 **로컬 전용 secret 분리** 권장.

---

## 5. Windows 최종 설치·실행 (사용자 작업 최소화)

**전제:** Docker Desktop, LM Studio, repo clone, `.env.local`(Supabase + `AUTOMATION_WORKER_SECRET`) 이미 있음.

| # | 사용자 작업 | 비고 |
|---|-------------|------|
| 1 | **LM Studio:** 모델 1개 **Load** → Local Server **ON** (`127.0.0.1:1234`) | `LM_STUDIO_MODEL` = 목록의 **id**와 일치 |
| 2 | **한 줄:** `powershell -File ops/local-automation/install-local-automation.ps1` | n8n Docker up, `.env.local` 템플릿 |
| 3 | `ops/local-automation/.env.local` 편집: `SPOKEDU_APP_BASE_URL` = **운영 또는 Preview Vercel URL** (Pull 대상), `SPOKEDU_AUTOMATION_WORKER_SECRET`, `LM_STUDIO_*` | PC에서 n8n이 **클라우드 Next**를 호출 |
| 4 | **repo 루트:** `node scripts/n8n-import-feedback-correction.mjs` | UI Import **불필요** (배열 bundle + `active` 필드) |
| 5 | (선택) `register-scheduled-task.ps1` | 로그인 시 n8n 자동 기동 |
| 6 | Vercel 배포·DB 마이그레이션 **승인 후** Admin에서 **AI 교정 요청** → n8n 10분 스케줄 또는 Manual test run | |

**개발 일상:** `npm run dev:local` (3000) — n8n 통합 검증과 **분리**. 통합 전용은 `next build && next start -p 3099` (Stage 5 방식).

---

## 6. 운영 적용 시 변경·영향

### 필수 변경 (승인 후)

| 영역 | 변경 |
|------|------|
| **Supabase** | 마이그레이션 2개 (순서 준수) |
| **Vercel** | `AUTOMATION_WORKER_SECRET` + **앱 코드 배포**(enqueue/worker/consume/UI 이미 워킹 트리) |
| **Windows n8n PC** | Docker n8n, workflow import, env, LM Studio |
| **Admin UX** | `/admin/teachers-classes` AI 교정 요청·교정안 불러오기 (기존 save만 sessions 반영) |

### 영향 범위

| 대상 | 영향 |
|------|------|
| **`sessions` / 정산 / 재고** | 자동 **변경 없음** (교정안은 job row; 승인 save만 반영) |
| **DB 부하** | 소량 job row + RPC; 세션당 active job 1건 |
| **보안** | Worker Bearer 노출 시 큐 조작 가능 → secret rotation, n8n 볼륨 접근 제한 |
| **n8n** | 10분 Pull; PC off 시 pending 유지 → 재기동 후 처리 (Stage 5 restart **PASS**) |

### 릴리스 게이트 (승인 후 실행 순서)

1. Supabase migration 2개  
2. Vercel env + deploy  
3. Read-only SQL 검증 (`production-sql.md`)  
4. Admin enqueue 1건 smoke (운영)  
5. n8n PC: URL·secret·LM → Manual run 1건 → consume → save 검수  

### `BLOCKED`로 올리지 않은 잔여 리스크 (게이트로 흡수)

- **NOT_TESTED:** 호스트 PC **전원 off** E2E  
- **NOT_TESTED:** **Production Vercel URL** + **운영 n8n PC** 조합 smoke (로컬은 `host.docker.internal:3099` + 로컬 Supabase stub/패치)  
- 로컬 n8n DB **workflow import 중복** — import 전 `list:workflow` 정리 권장  

---

## 7. 판정 근거

- 로컬 **n8n 런타임 E2E PASS**, HTTP·품질 가드·`sessions` 불변 확인  
- 마이그레이션 **additive**, 롤백 문서화  
- secret·Windows·Vercel 절차 정리 (secret **미노출**)  
- 3099 테스트 프로세스 **정리**, 3000 **유지**  

**`PRODUCTION_RELEASE_READY`** = 위 **릴리스 게이트** 실행 승인만 남음. 게이트 실패 시 **`BLOCKED`**로 재판정.

---

## 참고 문서

- [`local-n8n-feedback-correction-stage5-report.md`](./local-n8n-feedback-correction-stage5-report.md)  
- [`local-n8n-feedback-correction-production-sql.md`](./local-n8n-feedback-correction-production-sql.md)  
- [`local-n8n-feedback-correction-runbook.md`](./local-n8n-feedback-correction-runbook.md)
