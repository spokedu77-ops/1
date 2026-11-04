# SPOKEDU n8n Stage 5 — 로컬 n8n 워크플로우 완성 보고

**상태:** `LOCAL_N8N_RUNTIME_E2E_PASS` / `PRODUCTION_APPROVAL_PENDING`  
**JSON:** [`local-n8n-feedback-correction-stage5-results.json`](./local-n8n-feedback-correction-stage5-results.json)

---

## 1. n8n Import (자동)

| 이슈 | 원인 | 해결 |
|------|------|------|
| `workflows.map is not a function` | CLI `import:workflow`는 **단일 객체가 아닌 JSON 배열** `[{…}]` 기대 | `scripts/n8n-import-feedback-correction.mjs`가 bundle 생성 |
| `NOT NULL constraint failed: workflow_entity.active` | workflow JSON에 `active` 필드 누락 | `"active": false` 추가 후 `update:workflow --active=true` |

**Import 명령:** `node scripts/n8n-import-feedback-correction.mjs`  
**검증:** 노드·연결·`SPOKEDU_*` / `LM_STUDIO_*` env·Bearer 헤더( `$env.SPOKEDU_AUTOMATION_WORKER_SECRET` ) — UI Import **미요청**

---

## 2. n8n 런타임 E2E (`scripts/local-n8n-runtime-e2e.mjs`)

환경: Docker Supabase, **`next start -p 3099`** (3000 `dev:local`과 **병행**), n8n Docker, LM Studio **`gemma-4-26b-a4b-it-qat`** (로드된 모델)

| # | 시나리오 | 결과 |
|---|----------|------|
| 1 | 0건 idle | PASS |
| 2 | 1건 Enqueue→n8n→Complete→Consume | PASS |
| 3 | 3건 순차 처리(중복 complete 없음) | PASS |
| 4 | LLM unreachable → fail/retry | PASS (worker fail 시뮬레이션) |
| 5 | 잘못된 draft → 422 | PASS |
| 6 | 재실행 멱등 | PASS |
| 7 | Lease 만료 → requeue → n8n | PASS |
| 8 | n8n 컨테이너 restart 후 pending 처리 | PASS |
| — | PC 전원 off | **NOT_TESTED** |

**LM Studio 이슈 (해결):** `response_format: json_object` → LM Studio 400 (`json_schema`/`text`만 허용). 워크플로에서 **제거**. `jsonBody` 이중 stringify 제거.

---

## 3. AI 교정 품질 (코드)

- `normalizeCorrectionDraft`: `feedback_fields` 중첩·**허용 외 top-level 키 거부**
- `assertCorrectionFieldsAlignWithSource`: **필드별** 원문 토큰 연관성 검사
- n8n **Parse correction JSON** 노드: 동일 규칙 + SPOMOVE 리터럴
- **Build LLM request**: `source_feedback`만 전달, 필드별 교정 지시

`sessions` / 정산 데이터: E2E에서 **불변 PASS**

---

## 4. Windows / 환경

- `.env.local` → `.env.local.stage5-backup` 후 로컬 Supabase 패치 → **테스트 후 복원**
- 3000 dev 서버: Stage 5 중 **`next start` 3099** 사용으로 **영향 없음**
- n8n `docker compose … --force-recreate` 검증

---

## 5. 검증 명령 (재현)

```powershell
# LM Studio: gemma (또는 .env.local의 LM_STUDIO_MODEL) 로드 + Server ON
docker compose -f ops/local-automation/docker-compose.n8n.yml up -d
# .env.local 패치(스크립트가 backup/복원) + next build && next start -p 3099
node scripts/local-n8n-runtime-e2e.mjs
```

---

## 6. 잔여 위험 (운영 전)

1. 운영 n8n은 **Header Auth Credential** 권장(로컬 Docker는 env Bearer)
2. LM 모델·로드 상태에 따른 **지연/실패** — fail/retry·Admin 검수
3. Import 시 workflow **중복 ID** 누적 — 주기적 n8n DB 정리 또는 `--separate` 정책
4. **운영 Supabase 마이그레이션·Vercel** — 여전히 **`PRODUCTION_APPROVAL_PENDING`**
