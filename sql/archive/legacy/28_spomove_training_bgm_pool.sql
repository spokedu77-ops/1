-- SPOMOVE 훈련 공통 BGM 풀 (Asset Hub BGM 탭 · useSpomoveTrainingBGM)
INSERT INTO think_asset_packs (id, name, theme, assets_json)
VALUES (
  'spomove_training_bgm_settings',
  'SPOMOVE 훈련 BGM 풀',
  'iiwarmup',
  '{"bgmList": []}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
