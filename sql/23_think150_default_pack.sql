-- Think 150 Asset Pack 기본 데이터 (월별×주차별)
-- think_asset_packs 테이블이 있어야 함 (21_create_think_asset_packs.sql)
-- 1주차: 색상만 / 2·3·4주차: 1~12월마다 다른 이미지

INSERT INTO think_asset_packs (id, name, theme, assets_json)
VALUES (
  'iiwarmup_think_default',
  'IIWARMUP Think 150 Pack (월별×주차별)',
  'iiwarmup',
  '{"byMonth": {}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
