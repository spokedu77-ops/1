-- SPOMOVE 반응 인지 — 변형 색지각 과일 8슬롯 (Asset Hub에서 경로 채움; 업로드 없으면 훈련에서 무시)
INSERT INTO think_asset_packs (id, name, theme, assets_json)
VALUES (
  'spomove_variant_fruits',
  'SPOMOVE 변형 색지각 과일',
  'iiwarmup',
  '{"paths":[null,null,null,null,null,null,null,null]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
