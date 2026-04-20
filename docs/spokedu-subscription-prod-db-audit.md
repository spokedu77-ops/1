# 스포키듀 구독 프로덕션 DB 점검 가이드

목표: 상용화 전 `구독/정산` 관련 마이그레이션 적용 상태와 데이터 정합성을 확인한다.

---

## 1) 점검 대상

- 구독 상용화 스키마
  - `supabase/migrations/20260308000000_spokedu_pro_commercial.sql`
  - `supabase/migrations/20260314000000_spokedu_pro_classes.sql`
- 강사 수수료 테이블
  - `sql/65_teacher_tier_fees_table.sql`

---

## 2) 프로덕션 점검 SQL

```sql
-- A. 핵심 테이블 존재 확인
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'spokedu_pro_centers',
    'spokedu_pro_subscriptions',
    'spokedu_pro_center_members',
    'teacher_tier_fees'
  )
order by table_name;

-- B. 구독 상태 분포 확인
select status, count(*) as cnt
from spokedu_pro_subscriptions
group by status
order by cnt desc;

-- C. trialing 중 이미 만료된 데이터 확인
select center_id, plan, status, trial_end
from spokedu_pro_subscriptions
where status = 'trialing'
  and trial_end is not null
  and trial_end < now()
order by trial_end asc;

-- D. center_id 중복 구독 확인 (정합성)
select center_id, count(*) as cnt
from spokedu_pro_subscriptions
group by center_id
having count(*) > 1;

-- E. 강사 등급 수수료 기본값 확인
select tier, fee_per_class, is_active, updated_at
from teacher_tier_fees
order by tier;
```

---

## 3) 합격 기준

- 핵심 테이블 4개가 모두 존재한다.
- `center_id`당 구독 row는 1개다.
- 만료된 `trialing` 데이터는 0건이거나 운영 플레이북으로 처리 완료됐다.
- `teacher_tier_fees` 기본 등급(1~5)이 활성 상태로 존재한다.

---

## 4) 실패 시 조치

- 테이블 누락: 해당 마이그레이션 우선 적용 후 재검증
- 중복 구독 row 발견: 최신 row 기준 정리, 나머지 보관/삭제 정책 적용
- 만료 trial 잔존: 플레이북대로 `expired` 전환
- 수수료 데이터 누락: `65_teacher_tier_fees_table.sql` 기준 seed 재적용

---

## 5) Stripe ↔ `spokedu_pro_subscriptions` 정합 (웹훅 외 주기 점검)

**진실 공급원**: 운영·과금 관점에서는 **Stripe 구독 객체**가 기준이고, DB는 웹훅·수동 플레이북으로 맞춘다. 아래는 **드리프트·누락**을 찾기 위한 SQL이다.

```sql
-- F1. 동일 stripe_subscription_id가 두 센터에 매핑(이면 안 됨)
select stripe_subscription_id, count(*) as cnt, array_agg(center_id) as centers
from spokedu_pro_subscriptions
where stripe_subscription_id is not null
  and trim(stripe_subscription_id) <> ''
group by stripe_subscription_id
having count(*) > 1;

-- F2. 유료 플랜인데 Stripe 구독 ID 없음(Checkout 전·데이터 오류 구분 필요)
select center_id, plan, status, stripe_subscription_id, updated_at
from spokedu_pro_subscriptions
where plan in ('basic', 'pro')
  and status not in ('canceled', 'expired')
  and (stripe_subscription_id is null or trim(stripe_subscription_id) = '');

-- F3. past_due / active 혼선 후보: 기간 종료일은 과거인데 active
select center_id, plan, status, current_period_end
from spokedu_pro_subscriptions
where status = 'active'
  and current_period_end is not null
  and current_period_end < now() - interval '2 days';

-- F4. 웹훅 멱등 테이블 크기(보관 정리 전 모니터링)
select count(*) as webhook_events_total,
       min(created_at) as oldest,
       max(created_at) as newest
from spokedu_pro_stripe_webhook_events;
```

**실패 시**: Stripe Dashboard·API로 해당 구독 상태 확인 후 [`spokedu-subscription-state-playbook.md`](./spokedu-subscription-state-playbook.md)에 따라 DB 보정 또는 재전송 이벤트 처리.

---

## 6) 스포키듀 Pro 테넌트 무결성 (center_id 경계)

원생·출결·리포트는 모두 `center_id`로 격리된다. 앱 RLS와 별개로, **데이터 버그**를 잡는 점검용이다.

```sql
-- T1. 출결의 center_id가 학생 center_id와 불일치
select a.id as attendance_id, a.student_id, a.center_id as att_center, s.center_id as student_center
from spokedu_pro_attendance a
join spokedu_pro_students s on s.id = a.student_id
where a.center_id is distinct from s.center_id;

-- T2. AI 리포트의 center_id가 학생 center_id와 불일치
select r.id as report_id, r.student_id, r.center_id as report_center, s.center_id as student_center
from spokedu_pro_ai_reports r
join spokedu_pro_students s on s.id = r.student_id
where r.center_id is distinct from s.center_id;

-- T3. 센터는 있는데 구독 row 없음(부트스트랩 누락)
select c.id, c.name, c.created_at
from spokedu_pro_centers c
left join spokedu_pro_subscriptions s on s.center_id = c.id
where s.center_id is null;

-- T4. 인덱스 존재 스냅샷(마이그레이션 누락 탐지용)
select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'spokedu_pro_subscriptions',
    'spokedu_pro_students',
    'spokedu_pro_attendance',
    'spokedu_pro_ai_reports',
    'spokedu_pro_stripe_webhook_events'
  )
order by tablename, indexname;
```

**합격 기준**: T1·T2·T3는 0건(또는 알려진 예외만). T4에 테이블별 최소 1개 이상의 인덱스가 보인다.

---

마지막 업데이트: 2026-04-21
