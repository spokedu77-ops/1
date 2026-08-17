-- ================================================================
-- save_warmup_program RPC 함수 생성
-- 단일 트랜잭션으로 play_scenarios, warmup_programs_composite, rotation_schedule 저장
-- ================================================================

CREATE OR REPLACE FUNCTION save_warmup_program(
  scenario_data JSONB,
  week_id TEXT,
  as_template BOOLEAN DEFAULT false,
  program_title TEXT DEFAULT 'Untitled Program',
  program_description TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scenario_id TEXT;
  program_id TEXT;
  scenario_json JSONB;
BEGIN
  -- 1. play_scenarios 저장
  scenario_id := COALESCE(scenario_data->>'id', 'scenario_' || gen_random_uuid()::TEXT);
  
  -- scenario_json 구성
  scenario_json := jsonb_build_object(
    'theme', COALESCE(scenario_data->>'theme', 'kitchen'),
    'duration', COALESCE((scenario_data->>'duration')::INTEGER, 120),
    'actions', COALESCE(scenario_data->'actions', '[]'::jsonb)
  );
  
  INSERT INTO play_scenarios (id, name, theme, duration, scenario_json)
  VALUES (
    scenario_id,
    program_title,
    COALESCE(scenario_data->>'theme', 'kitchen'),
    COALESCE((scenario_data->>'duration')::INTEGER, 120),
    scenario_json
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    theme = EXCLUDED.theme,
    duration = EXCLUDED.duration,
    scenario_json = EXCLUDED.scenario_json,
    updated_at = NOW();
  
  -- 2. warmup_programs_composite 저장
  IF as_template THEN
    program_id := 'template_' || gen_random_uuid()::TEXT;
  ELSE
    program_id := COALESCE(
      week_id,
      'program_' || to_char(NOW(), 'YYYY_MM') || '_' || gen_random_uuid()::TEXT
    );
  END IF;
  
  INSERT INTO warmup_programs_composite (id, week_id, title, description, total_duration, phases)
  VALUES (
    program_id,
    CASE WHEN as_template THEN NULL ELSE week_id END,
    program_title,
    program_description,
    540, -- 2분 + 2분 + 5분
    jsonb_build_array(
      jsonb_build_object('type', 'play', 'scenario_id', scenario_id, 'duration', 120),
      jsonb_build_object('type', 'think', 'content_type', 'engine', 'duration', 120),
      jsonb_build_object('type', 'flow', 'content_type', 'engine', 'duration', 300)
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    week_id = EXCLUDED.week_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    total_duration = EXCLUDED.total_duration,
    phases = EXCLUDED.phases,
    updated_at = NOW();
  
  -- 3. rotation_schedule 저장 (week_id가 있고 템플릿이 아닐 때만)
  IF week_id IS NOT NULL AND NOT as_template THEN
    INSERT INTO rotation_schedule (week_key, program_id, is_published)
    VALUES (week_id, program_id, false)
    ON CONFLICT (week_key) DO UPDATE
    SET 
      program_id = EXCLUDED.program_id,
      updated_at = NOW();
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'scenario_id', scenario_id,
    'program_id', program_id
  );
END;
$$;

-- 권한 설정
GRANT EXECUTE ON FUNCTION save_warmup_program TO authenticated;
GRANT EXECUTE ON FUNCTION save_warmup_program TO anon;

-- 함수 설명
COMMENT ON FUNCTION save_warmup_program IS '웜업 프로그램을 단일 트랜잭션으로 저장 (play_scenarios → warmup_programs_composite → rotation_schedule)';
