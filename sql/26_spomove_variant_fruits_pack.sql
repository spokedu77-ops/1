-- SPOMOVE 반응 인지 — 변형 색지각 과일 11슬롯 (Asset Hub에서 경로 채움, null이면 기본 URL)
INSERT INTO think_asset_packs (id, name, theme, assets_json)
VALUES (
  'spomove_variant_fruits',
  'SPOMOVE 변형 색지각 과일',
  'iiwarmup',
  '{"paths":[null,null,null,null,null,null,null,null,null,null,null]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
