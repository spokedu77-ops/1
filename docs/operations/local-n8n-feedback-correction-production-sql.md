# 피드백 AI 교정 큐 — 운영 적용 SQL (실행 금지 · Stage 3 준비물)

**상태:** `PRODUCTION_APPROVAL_PENDING` — 아래 SQL은 **복사·검토용**이며 Stage 3에서 **실행하지 않았습니다.**

---

## 적용 순서

1. `supabase/migrations/20261105120000_admin_feedback_correction_queue.sql`
2. `supabase/migrations/20261105140000_admin_feedback_correction_queue_hardening.sql`

Supabase Dashboard SQL Editor 또는 `supabase db push` / CI migration 파이프라인 등 **조직 표준 경로**로만 적용하세요.  
본 문서에 SQL 전문을 중복 붙이지 않습니다 — **SSOT는 위 두 파일**입니다.

---

## 적용 전 체크리스트

- [ ] 운영 DB 백업 또는 PITR 가능 시점 확인
- [ ] `admin_feedback_correction_jobs` 대기·processing job **0건** (또는 유지보수 창)
- [ ] `AUTOMATION_WORKER_SECRET` 생성·Vercel/n8n 배치 계획
- [ ] Admin enqueue UI / worker API 배포 버전이 마이그레이션과 **동일 릴리스**

---

## 롤백 절차 (승인 후 비상 시)

**주의:** 롤백은 **대기 중·처리 중 job 및 correction_draft 데이터를 삭제**합니다. completed 초안도 테이블 drop 시 함께 제거됩니다.

```sql
-- 1) RPC 제거 (hardening + base, 시그니처 주의)
drop function if exists public.admin_feedback_correction_fail_job(uuid, text, text, text, integer);
drop function if exists public.admin_feedback_correction_fail_job(uuid, text, text, text);
drop function if exists public.admin_feedback_correction_complete_job(uuid, text, jsonb);
drop function if exists public.admin_feedback_correction_claim_jobs(text, integer, integer);
drop function if exists public.admin_feedback_correction_requeue_stale(timestamptz);

-- 2) 테이블 제거 (sessions FK — sessions 데이터는 유지)
drop table if exists public.admin_feedback_correction_jobs cascade;
```

**애플리케이션 롤백:** worker/enqueue/consume API 및 Admin UI의 AI 교정 버튼을 이전 배포로 되돌리거나 feature flag off.

**PostgREST:** DDL 후 schema cache reload (Supabase는 migration 적용 시 일반적으로 자동).

---

## 검증 쿼리 (적용 후 · 읽기 전용)

```sql
select to_regclass('public.admin_feedback_correction_jobs') as jobs_table;

select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname like 'admin_feedback_correction_%';
```

---

## Stage 3 로컬과의 차이

- 로컬 E2E는 **최소 `sessions` stub** 위에 2개 마이그레이션만 적용.
- 운영은 **기존 `public.sessions`·RLS·트리거** 위에 동일 2파일 적용 — 세션 가드 트리거와 충돌 없음 (큐 테이블만 추가).
