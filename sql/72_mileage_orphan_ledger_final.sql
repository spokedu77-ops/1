-- session_id IS NULL 수업연동 고아 로그 11건 (고유 ID 전수, 2026-10-24 스냅샷)
-- 윤도현 서초 농구 54768963-… 는 session 연결 정상 로그 → 이 목록에 포함하지 않음

-- 정정 예정 4건 (단일 취소, admin_cancel_mileage_log)
-- 584f0e25-1677-497d-b600-5b140075b762  성채민  +2500  [수업연동] 원복: 수업 연기  (10/3 공휴일)
-- 3835feb5-f5f8-49cc-817d-345517969dd3  하유선  +2500  [수업연동] 원복: 수업 연기  (10/5 공휴일)
-- b8461249-7c89-4180-9e30-fbfc06bc0252  김세중  +2500  [수업연동] 원복: 수업 연기  (10/9 공휴일)
-- a84785bd-c62c-4633-b70d-0fdb6025d23b  윤도현  +2500  [수업연동] 원복: 수업 연기  (개포 10/24 고아)

-- 유지 후보 3건 (과거 정산 근거 확인 후 확정)
-- 743487b7-c904-49c9-8c57-58966d7daf37  진우성  -5000  [수업연동] 차감: 수업 연기 요청
-- 725e05f5-5975-459b-9d3f-a8dc3b854312  진우성  -5000  [수업연동] 차감: 수업 연기 요청
-- ffcaac76-48bd-4c2f-95d6-f8f98d815c95  송예원  +2000  [수업연동] 원복: 주간 베스트 피드백

-- 추가 조사 4건
-- ecacf30b-1206-48c0-b142-bdbb500756ff  김미조  +5000  [수업연동] 원복: 해제
-- 31a3de43-102b-4210-845b-74b18567164c  송예원  +5000  [수업연동] 원복: 당일 연기
-- 42b07a89-fe81-4b0c-8f8e-df7463b892ae  송예원  +2500  [수업연동] 원복: 수업 연기
-- 34d1274f-0a0f-4151-889f-c2d9c060bcd9  송예원  +2500  [수업연동] 원복: 수업 연기

-- 유지 (고아 아님): 윤도현 서초 농구
-- 54768963-4242-4429-bd01-9e036cb3990c  session_id=3a45d8a7-…  [수업연동] 지급: 수업 연기  +2500

SELECT
  ml.id,
  u.name,
  ml.amount,
  ml.reason,
  ml.session_title,
  CASE ml.id
    WHEN '584f0e25-1677-497d-b600-5b140075b762'::uuid THEN 'CORRECT'
    WHEN '3835feb5-f5f8-49cc-817d-345517969dd3'::uuid THEN 'CORRECT'
    WHEN 'b8461249-7c89-4180-9e30-fbfc06bc0252'::uuid THEN 'CORRECT'
    WHEN 'a84785bd-c62c-4633-b70d-0fdb6025d23b'::uuid THEN 'CORRECT'
    WHEN '743487b7-c904-49c9-8c57-58966d7daf37'::uuid THEN 'KEEP_CANDIDATE'
    WHEN '725e05f5-5975-459b-9d3f-a8dc3b854312'::uuid THEN 'KEEP_CANDIDATE'
    WHEN 'ffcaac76-48bd-4c2f-95d6-f8f98d815c95'::uuid THEN 'KEEP_CANDIDATE'
    ELSE 'INVESTIGATE'
  END AS disposition
FROM mileage_logs ml
JOIN users u ON u.id = ml.teacher_id
WHERE ml.reason ~ '^\[수업연동'
  AND ml.session_id IS NULL
ORDER BY ml.created_at;

-- 정정 4건 포인트 (현재 users.points — 정정 후 예상은 amount 만큼 차감)
SELECT u.name, u.points AS points_before, ml.amount AS cancel_delta, (u.points::bigint - ml.amount::bigint) AS points_after_expected
FROM mileage_logs ml
JOIN users u ON u.id = ml.teacher_id
WHERE ml.id IN (
  '584f0e25-1677-497d-b600-5b140075b762',
  '3835feb5-f5f8-49cc-817d-345517969dd3',
  'b8461249-7c89-4180-9e30-fbfc06bc0252',
  'a84785bd-c62c-4633-b70d-0fdb6025d23b'
);
