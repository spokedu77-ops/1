-- ================================================================
-- 현재 주차 웜업 프로그램 삽입
-- 2026년 1월 4주차 (현재 날짜 기준)
-- ================================================================

-- 1. 복합 웜업 프로그램 삽입
INSERT INTO warmup_programs_composite (id, week_id, title, description, total_duration, phases, is_active)
VALUES (
  'program_2026_01_w4',
  '2026-01-W4',
  '신나는 주방 웜업',
  'Play, Think, Flow 3단계로 구성된 10분 웜업 프로그램',
  540,
  '[
    {
      "type": "play",
      "scenario_id": "week1_kitchen",
      "duration": 120
    },
    {
      "type": "think",
      "content_type": "placeholder",
      "duration": 120
    },
    {
      "type": "flow",
      "content_type": "placeholder",
      "duration": 300
    }
  ]'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE
SET 
  week_id = EXCLUDED.week_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  total_duration = EXCLUDED.total_duration,
  phases = EXCLUDED.phases,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 2. 단일 웜업 프로그램도 삽입 (호환성)
INSERT INTO iiwarmup_programs (id, year, month, week, title, description, content_type, content, is_active, is_premium)
VALUES (
  gen_random_uuid(),
  2026,
  1,
  4,
  'MOS 웜업',
  '기본 스트레칭 및 준비운동',
  'html_code',
  '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;font-size:3rem;font-weight:bold;">MOS 웜업 프로그램</div>',
  true,
  false
)
ON CONFLICT (year, month, week) DO UPDATE
SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  content_type = EXCLUDED.content_type,
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 확인
SELECT 'Current week warmup programs inserted successfully!' AS status;

-- 결과 확인
SELECT * FROM warmup_programs_composite WHERE week_id = '2026-01-W4';
SELECT * FROM iiwarmup_programs WHERE year = 2026 AND month = 1 AND week = 4;
