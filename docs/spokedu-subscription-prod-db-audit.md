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

마지막 업데이트: 2026-04-03
