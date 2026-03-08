-- ================================================================
-- 50: 스포키듀 구독 Bootstrap RPC
-- 목적: 신규 사용자가 최초 접속 시 센터 + 무료 구독을 자동 생성.
--       /api/spokedu-pro/context/bootstrap API에서 직접 INSERT하지 않고
--       RPC로 원자적(atomic) 처리.
-- 실행 조건: 20260308000000_spokedu_pro_commercial.sql 실행 후
-- ================================================================

CREATE OR REPLACE FUNCTION spokedu_pro_bootstrap_center(
  p_user_id  UUID,
  p_name     TEXT DEFAULT '내 센터'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_center   spokedu_pro_centers%ROWTYPE;
  v_sub_id   UUID;
BEGIN
  -- 1. 이미 센터가 있으면 반환
  SELECT * INTO v_center
  FROM spokedu_pro_centers
  WHERE owner_id = p_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'bootstrapped', false,
      'centerId', v_center.id,
      'centerName', v_center.name
    );
  END IF;

  -- 2. 센터 생성
  INSERT INTO spokedu_pro_centers (owner_id, name)
  VALUES (p_user_id, p_name)
  RETURNING * INTO v_center;

  -- 3. owner를 member로 등록 (duplicate 무시)
  INSERT INTO spokedu_pro_center_members (center_id, user_id, role)
  VALUES (v_center.id, p_user_id, 'owner')
  ON CONFLICT (center_id, user_id) DO NOTHING;

  -- 4. 무료 구독 생성
  INSERT INTO spokedu_pro_subscriptions (center_id, plan, status)
  VALUES (v_center.id, 'free', 'active')
  ON CONFLICT (center_id) DO NOTHING
  RETURNING id INTO v_sub_id;

  -- 5. 초기 XP 레코드
  INSERT INTO spokedu_pro_class_xp (center_id, total_xp, level)
  VALUES (v_center.id, 0, 1)
  ON CONFLICT (center_id) DO NOTHING;

  RETURN json_build_object(
    'bootstrapped', true,
    'centerId', v_center.id,
    'centerName', v_center.name
  );
END;
$$;

-- service_role 및 authenticated 사용자가 호출 가능
GRANT EXECUTE ON FUNCTION spokedu_pro_bootstrap_center(UUID, TEXT) TO service_role;
-- (anon에는 부여하지 않음)

SELECT 'spokedu_pro_bootstrap_center RPC (50) ready.' AS status;
