-- 마일리지 공휴일·연동 취소·고아 로그 전수 검증
-- 운영 적용 버전: 20261023135717, 20261023135727 (postpone) + 20261023150000 (holiday/cancel)
-- 로컬 postpone 파일명 20261022190000 은 운영 35717 과 동일 계열 — 중복 push 금지
-- 운영 정정 DML은 별도 승인 후 sql/71_mileage_holiday_remediation.sql 에서 실행

-- 1) 2026-10 공휴일 달력
SELECT holiday_date, name, holiday_kind
FROM public.kr_public_holidays
WHERE holiday_date IN ('2026-10-03', '2026-10-05', '2026-10-09')
ORDER BY holiday_date;

-- 2) 공휴일 posture (Asia/Seoul 기준 원래 수업 시작 시각 가정: UTC 07:00 = KST 16:00 전일 아님 — 실제 sessions.start_at 사용)
SELECT
  private.kr_public_holiday_posture(timestamptz '2026-10-02T15:00:00+00') AS oct3_kst,
  private.kr_public_holiday_posture(timestamptz '2026-10-04T15:00:00+00') AS oct5_kst,
  private.kr_public_holiday_posture(timestamptz '2026-10-08T15:00:00+00') AS oct9_kst;

-- 3) 정책상 연기 가산 0P (공휴일)
SELECT
  private.phase2_mileage_total('수업 연기', timestamptz '2026-10-02T15:00:00+00') AS postpone_oct3,
  private.phase2_mileage_total('당일 연기', timestamptz '2026-10-08T15:00:00+00') AS same_day_oct9,
  private.phase2_mileage_total('수업 연기 요청', timestamptz '2026-10-02T15:00:00+00') AS request_still_negative;

-- 4) 수업 연동 고아(session_id NULL) 전수
SELECT
  ml.id,
  u.name AS teacher_name,
  ml.amount,
  ml.reason,
  ml.session_title,
  ml.session_started_at,
  ml.created_at
FROM mileage_logs ml
JOIN users u ON u.id = ml.teacher_id
WHERE ml.reason ~ '^\[수업연동'
  AND ml.session_id IS NULL
ORDER BY ml.created_at;

-- 5) 공휴일 +2,500P 위반 후보 (수업 연기/당일 연기 가산, KST 날짜가 공휴일)
SELECT
  ml.id,
  u.name AS teacher_name,
  ml.amount,
  ml.reason,
  (ml.session_started_at AT TIME ZONE 'Asia/Seoul')::date AS seoul_session_date,
  h.name AS holiday_name
FROM mileage_logs ml
JOIN users u ON u.id = ml.teacher_id
LEFT JOIN kr_public_holidays h
  ON h.holiday_date = (COALESCE(ml.session_started_at, ml.created_at) AT TIME ZONE 'Asia/Seoul')::date
WHERE ml.reason ~ '^\[수업연동'
  AND ml.amount > 0
  AND (
    ml.reason LIKE '%수업 연기%'
    OR ml.reason LIKE '%당일 연기%'
  )
  AND h.holiday_date IS NOT NULL
ORDER BY seoul_session_date, teacher_name;

-- 6) 윤도현 2026-10-24 +2,500P (이름·날짜 스캔 — 정정 필요 여부 수동 판정용)
SELECT
  ml.id,
  u.name,
  ml.amount,
  ml.reason,
  ml.session_id,
  ml.session_started_at,
  (ml.session_started_at AT TIME ZONE 'Asia/Seoul')::date AS seoul_date
FROM mileage_logs ml
JOIN users u ON u.id = ml.teacher_id
WHERE u.name LIKE '%윤도현%'
  AND ml.amount = 2500
  AND (ml.session_started_at AT TIME ZONE 'Asia/Seoul')::date = DATE '2026-10-24';

-- 7) session_count_logs 는 마일리지 취소와 독립 (트리거 사유만 집계)
SELECT COUNT(*) AS session_count_logs_total FROM session_count_logs;
