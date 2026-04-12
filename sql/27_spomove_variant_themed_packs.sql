-- SPOMOVE 색지각 — 탈 것·감정·동물 각 4슬롯 (Asset Hub에서 경로 채움)
INSERT INTO think_asset_packs (id, name, theme, assets_json)
VALUES
  (
    'spomove_variant_vehicles',
    'SPOMOVE 색지각 탈 것',
    'iiwarmup',
    '{"paths":[null,null,null,null]}'::jsonb
  ),
  (
    'spomove_variant_emotions',
    'SPOMOVE 색지각 감정',
    'iiwarmup',
    '{"paths":[null,null,null,null]}'::jsonb
  ),
  (
    'spomove_variant_animals',
    'SPOMOVE 색지각 동물',
    'iiwarmup',
    '{"paths":[null,null,null,null]}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
