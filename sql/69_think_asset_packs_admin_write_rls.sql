-- think_asset_packs: 관리자 INSERT/UPDATE/DELETE 명시 (WITH CHECK 포함)
-- 재실행 안전: 동일 이름 정책은 먼저 DROP 후 CREATE

DROP POLICY IF EXISTS "Admin full access to think asset packs" ON think_asset_packs;
DROP POLICY IF EXISTS "think_asset_packs_admin_insert" ON think_asset_packs;
DROP POLICY IF EXISTS "think_asset_packs_admin_update" ON think_asset_packs;
DROP POLICY IF EXISTS "think_asset_packs_admin_delete" ON think_asset_packs;

CREATE POLICY "think_asset_packs_admin_insert"
ON think_asset_packs
FOR INSERT
TO authenticated
WITH CHECK ((SELECT is_admin()));

CREATE POLICY "think_asset_packs_admin_update"
ON think_asset_packs
FOR UPDATE
TO authenticated
USING ((SELECT is_admin()))
WITH CHECK ((SELECT is_admin()));

CREATE POLICY "think_asset_packs_admin_delete"
ON think_asset_packs
FOR DELETE
TO authenticated
USING ((SELECT is_admin()));

-- 공개 읽기 정책 "All users can read think asset packs"는 그대로 유지
