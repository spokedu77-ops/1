# SPOKEDU 로컬 n8n — 피드백 AI 교정 (MVP)

## 전제

- 운영 DB 마이그레이션 `20261105120000_admin_feedback_correction_queue.sql` 적용 **후** 사용.
- n8n에는 **Supabase service_role을 넣지 않음**. `AUTOMATION_WORKER_SECRET` Bearer만 사용.
- AI 결과는 `admin_feedback_correction_jobs.correction_draft`에만 저장. `sessions` 변경은 관리자 검수 저장 API로만.

## 1회 Windows 설치 (최종 검증)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ops/local-automation/install-local-automation.ps1
```

스크립트는 Docker n8n 기동·`.env.local` 생성·체크리스트 출력까지 수행합니다. **Docker↔LM Studio E2E는 `NOT_TESTED` until you verify locally.**

1. Docker Desktop + WSL2
2. LM Studio Gemma/Qwen → Local Server `http://127.0.0.1:1234`
3. Repo `.env.local`: `AUTOMATION_WORKER_SECRET` (Vercel과 동일 값 예정)
4. n8n Credential: Header Auth `Authorization: Bearer <secret>` (JSON/코드에 넣지 않음)
5. Import `workflows/spokedu-feedback-correction.json` → Activate
6. (선택) `register-scheduled-task.ps1`

## 동작 확인

1. `/admin/teachers-classes` → 피드백 있는 수업 → **AI 교정 요청**.
2. PC/n8n 실행 대기 → **교정안 불러오기** → 내용 확인 → **검수 승인** (기존 save).
3. PC 종료 후에도 Supabase `admin_feedback_correction_jobs.status=pending` 유지.
4. PC 재기동 후 n8n claim → stale `processing` lease 만료 시 자동 requeue.

## 장애

| 증상 | 조치 |
|------|------|
| 401 worker | `AUTOMATION_WORKER_SECRET` / n8n credential 불일치 |
| LLM 실패 | LM Studio 모델 로드·포트 1234 확인 |
| 422 complete | 원문 시간·수치 토큰 과다 삭제 — n8n 재시도 또는 수동 검수 |
| 409 enqueue | 동일 세션 pending/processing job 존재 |
