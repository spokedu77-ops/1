# SPOKEDU n8n Stage 4 — 로컬 통합 E2E 보고

**상태:** `LOCAL_INTEGRATION_E2E_PASS` / `PRODUCTION_APPROVAL_PENDING`  
**기준일:** 2026-11-05 (KST)  
**운영 Supabase / Vercel / commit / push:** 미적용

머신 판독 JSON: [`local-n8n-feedback-correction-stage4-results.json`](./local-n8n-feedback-correction-stage4-results.json)

---

## 1. HTTP API E2E — **PASS**

| 항목 | 상태 | 비고 |
|------|------|------|
| Next 로컬 통합 서버 (`127.0.0.1:3099`) | PASS | Docker Supabase(`54321`) 전용; `.env.local` 임시 패치 후 재기동 |
| Worker Bearer 없음 → 401 | PASS | |
| Admin 세션 없음 → enqueue 401 | PASS | `requireAdmin()` 우회 없음 |
| Admin enqueue (로컬 auth) | PASS | **로컬 Docker Auth** + 플랫폼 운영진 이메일 패턴; **운영 실계정 세션 아님** |
| 중복 enqueue → 409 | PASS | |
| Claim → Complete → Consume HTTP | PASS | 422 품질 가드, complete 멱등, consume 200 |
| `sessions.status` / `mileage_option` / `feedback_fields` 불변 | PASS | stub 테이블 기준 |
| 대기 0건 claim | PASS | |
| 복구(pending 유지 → 재 claim) | PASS | PC 전원 off/on 전체는 **NOT_TESTED** (DB persistence만 검증) |

**재현:**  
1. Docker Supabase 기동  
2. `.env.local`을 로컬 URL/키로 패치 (백업: `.env.local.stage4-backup`)  
3. `npx next dev -p 3099 -H 127.0.0.1`  
4. `FEEDBACK_CORRECTION_SKIP_ENV_PATCH=1 node scripts/local-feedback-correction-integration-e2e.mjs`

**참고:** Stage 4 종료 후 **`.env.local`은 백업에서 복원**함. 일반 `npm run dev:local`(3000)은 재시작 시 운영 Supabase URL을 다시 읽는다.

---

## 2. n8n 워크플로 런타임 E2E — **부분 PASS / NOT_TESTED**

| 항목 | 상태 | 비고 |
|------|------|------|
| Docker Compose n8n 기동 | PASS | `ops/local-automation/docker-compose.n8n.yml`, healthz 200 |
| 컨테이너 → Next worker API | PASS | `host.docker.internal:3099`, Bearer 정상 시 claim JSON |
| 컨테이너 → LM Studio | PASS | `host.docker.internal:1234/v1/models` |
| 워크플로 JSON Import (CLI) | **NOT_TESTED** | `n8n import:workflow` 형식 오류 (`workflows.map is not a function`) — UI Import 필요 |
| 0건 idle / 1건·다건 스케줄 실행 | **NOT_TESTED** | Import·Credential·Activate 미완 |
| n8n → LLM → complete/fail 전체 런 | **NOT_TESTED** | HTTP 스크립트로 worker 경로는 PASS |

`.env.local` (n8n): `SPOKEDU_APP_BASE_URL=http://host.docker.internal:3099`, `LM_STUDIO_MODEL=qwen3.5-9b`

---

## 3. LM Studio 실제 추론 — **PASS** (호스트 HTTP, n8n 노드 연동은 NOT_TESTED)

| 항목 | 상태 |
|------|------|
| 로드 모델 목록 | PASS (`qwen3.5-9b` 등) |
| 가상 피드백 3건 chat/completions | PASS (JSON 파싱) |
| SPOMOVE 리터럴·시간 토큰 휴리스틱 | PASS (스크립트 내 최소 검사) |

**잔여 품질 리스크:** 일부 샘플에서 모델이 입력과 다른 필드를 반환하는 경우가 관측됨 → **운영 전 사람 검수·422 가드·diff UI** 필수. 타임아웃/abort(120s) 경로는 별도 **NOT_TESTED**.

---

## 4. PC 종료·재실행 복구 — **부분 PASS**

| 범위 | 상태 |
|------|------|
| pending job이 DB에 유지된 채 worker 재 claim | PASS |
| n8n/Docker/Next/LM 전원 off 후 재부팅 E2E | **NOT_TESTED** |
| stale `processing` lease requeue (HTTP/RPC) | Stage 3 DB E2E **PASS**; Stage 4 HTTP 미재실행 |

---

## 5. 기존 업무 로직 영향 — **PASS (범위 내)**

- 로컬 stub DB만 사용; **운영 Supabase·정산·재고 테이블 미접촉**
- 구현 변경 없음; 검증 스크립트·runbook·n8n `.env.local`만 추가
- 운영 `main` dev(3000)는 Stage 4 중 일시 중단 후 3099 사용 — **운영 DB 쓰기 없음**

---

## 6. 운영 배포 전 잔여 위험

1. **마이그레이션 2건** 운영 적용 전 대기 큐·백업·롤백 SQL 검토 ([Stage 3 production-sql doc](./local-n8n-feedback-correction-production-sql.md))  
2. **n8n UI** Credential(Header Bearer) + 워크플로 Import/Activate 수동 1회  
3. **LM 품질:** 로컬 Qwen/Gemma가 샘플 2·3에서 원문과 다른 JSON을 내는 경우 — n8n fail/retry·max attempts와 Admin 검수 의존  
4. **관리자 enqueue/consume:** Stage 4는 **로컬 Auth + 운영진 이메일 규칙**; 운영 Vercel 쿠키·실계정 smoke는 배포 후  
5. **Next 단일 dev lock:** 통합 검증 시 포트 3099 + env 패치 필요 (운영 URL과 분리)  
6. **AUTOMATION_WORKER_SECRET** Vercel ↔ n8n 일치

---

## 7. 관리자 실계정 / BLOCKED

| 항목 | 상태 |
|------|------|
| 운영 Supabase + Vercel + 실제 Admin 브라우저 세션 enqueue/consume | **BLOCKED** (Stage 4 금지: 운영 DB·배포) |
| 로컬 Docker Auth + `requireAdmin()` 정상 경로 | PASS |

---

## 8. 추가·변경 파일 (Stage 4)

- `scripts/local-feedback-correction-integration-e2e.mjs`
- `scripts/start-local-integration-next.ps1`
- `ops/local-automation/.env.local` (로컬 n8n env, gitignore 대상일 수 있음)
- `docs/operations/local-n8n-feedback-correction-stage4-results.json`
- 본 문서

---

## 9. 승인 요청

운영 Supabase 마이그레이션·Vercel env·n8n 운영 URL 연결은 여전히 **`PRODUCTION_APPROVAL_PENDING`** 입니다.  
Stage 4 기준 **로컬 HTTP + LM + n8n 컨테이너 연결**은 PASS; **n8n 워크플로 UI Import/스케줄 E2E**만 잔여 NOT_TESTED입니다.
