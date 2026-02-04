-- ================================================================
-- Think 150 프로그램 + BGM 설정
-- warmup_programs_composite에 Think 150 프로그램 삽입
-- think_asset_packs에 BGM 설정 초기화
-- ================================================================

-- 1. Think 150 프로그램 (주차별 4개, 템플릿)
-- week_id NULL = 템플릿 (17_iiwarmup_refactor_schema 적용 시)
-- week_id NOT NULL인 경우 'template' 등 placeholder 사용
INSERT INTO warmup_programs_composite (id, week_id, title, description, total_duration, phases)
VALUES
  ('think150_week1', 'template', 'Think 150 - 1주차', '150초 SPOKEDU Think (같은 색 k개 = k번 점프)', 150, '[
    {"type": "think", "content_type": "think150", "duration": 150, "config": {"week": 1}}
  ]'::jsonb),
  ('think150_week2', 'template', 'Think 150 - 2주차', '150초 SPOKEDU Think (두 색 = 왼발/오른발 동시 착지)', 150, '[
    {"type": "think", "content_type": "think150", "duration": 150, "config": {"week": 2}}
  ]'::jsonb),
  ('think150_week3', 'template', 'Think 150 - 3주차', '150초 SPOKEDU Think (ANTI 대각선)', 150, '[
    {"type": "think", "content_type": "think150", "duration": 150, "config": {"week": 3}}
  ]'::jsonb),
  ('think150_week4', 'template', 'Think 150 - 4주차', '150초 SPOKEDU Think (MEMORY 순서 기억)', 150, '[
    {"type": "think", "content_type": "think150", "duration": 150, "config": {"week": 4}}
  ]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  total_duration = EXCLUDED.total_duration,
  phases = EXCLUDED.phases,
  updated_at = NOW();

-- 2. BGM 설정 초기화
INSERT INTO think_asset_packs (id, name, theme, assets_json)
VALUES (
  'iiwarmup_bgm_settings',
  'IIWARMUP Think BGM 설정',
  'iiwarmup',
  '{"bgmList": [], "selectedBgm": ""}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

SELECT 'Think 150 프로그램 및 BGM 설정 완료' AS status;
