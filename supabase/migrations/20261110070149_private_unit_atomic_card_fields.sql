CREATE OR REPLACE FUNCTION public.admin_private_save_unit(
  p_id uuid, p_data jsonb, p_expected_revision bigint,
  p_guardian_mode text DEFAULT 'keep',
  p_guardian_id uuid DEFAULT NULL,
  p_guardian_data jsonb DEFAULT '{}'::jsonb,
  p_add_enrollments jsonb DEFAULT '[]'::jsonb,
  p_cancel_enrollments jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_revision bigint;
  v_g_revision bigint;
  v_g_id uuid;
  v_current_g uuid;
  v_other_links integer;
  v_en jsonb;
BEGIN
  IF p_guardian_mode NOT IN ('keep','new','existing','edit','clear') THEN
    RAISE EXCEPTION 'INVALID_GUARDIAN_MODE';
  END IF;
  IF length(btrim(coalesce(p_data->>'name',''))) = 0 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  IF coalesce(p_data->>'status','active') NOT IN ('active','paused','ended') OR
     coalesce(p_data->>'weekPattern','every') NOT IN ('every','odd','even','biweekly') THEN
    RAISE EXCEPTION 'INVALID_UNIT';
  END IF;
  IF p_id IS NULL THEN
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
    INSERT INTO public.admin_private_units (name,age_grade,class_type,coach,status,neighborhood,place_type,address,subject,schedule_days,schedule_time,week_pattern,memo,schedules,coach_id)
    VALUES (btrim(p_data->>'name'),coalesce(p_data->>'ageGrade',''),coalesce(p_data->>'classType','1:1 개인'),coalesce(p_data->>'coach',''),coalesce(p_data->>'status','active'),coalesce(p_data->>'neighborhood',''),coalesce(p_data->>'placeType','아파트 커뮤니티'),coalesce(p_data->>'address',''),coalesce(p_data->>'subject',''),
      ARRAY(SELECT x::smallint FROM jsonb_array_elements_text(coalesce(p_data->'scheduleDays','[]'::jsonb)) AS x),coalesce(p_data->>'scheduleTime',''),coalesce(p_data->>'weekPattern','every'),coalesce(p_data->>'memo',''),p_data->'schedules',nullif(p_data->>'coachId','')::uuid)
    RETURNING id,revision INTO v_id,v_revision;
  ELSE
    IF p_expected_revision IS NULL THEN RAISE EXCEPTION 'REVISION_REQUIRED'; END IF;
    UPDATE public.admin_private_units SET name=btrim(p_data->>'name'),age_grade=coalesce(p_data->>'ageGrade',''),class_type=coalesce(p_data->>'classType','1:1 개인'),coach=coalesce(p_data->>'coach',''),
      status=coalesce(p_data->>'status','active'),neighborhood=coalesce(p_data->>'neighborhood',''),place_type=coalesce(p_data->>'placeType','아파트 커뮤니티'),address=coalesce(p_data->>'address',''),subject=coalesce(p_data->>'subject',''),
      schedule_days=ARRAY(SELECT x::smallint FROM jsonb_array_elements_text(coalesce(p_data->'scheduleDays','[]'::jsonb)) AS x),schedule_time=coalesce(p_data->>'scheduleTime',''),week_pattern=coalesce(p_data->>'weekPattern','every'),memo=coalesce(p_data->>'memo',''),
      coach_id=CASE WHEN p_data ? 'coachId' THEN nullif(p_data->>'coachId','')::uuid ELSE coach_id END,
      schedules=CASE WHEN p_data ? 'schedules' THEN p_data->'schedules' ELSE schedules END,
      revision=revision+1,updated_at=now()
    WHERE id=p_id AND revision=p_expected_revision AND deleted_at IS NULL
    RETURNING id,revision INTO v_id,v_revision;
    IF v_id IS NULL THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  END IF;
  -- The profile, linked calendars, guardian and enrollments commit atomically.
  -- Absent keys preserve existing facts for older clients.
  UPDATE public.admin_private_units SET
    gender=CASE WHEN p_data ? 'gender' THEN p_data->>'gender' ELSE gender END,
    attends_gym=CASE WHEN p_data ? 'attendsGym' THEN (p_data->>'attendsGym')::boolean ELSE attends_gym END,
    rain_available=CASE WHEN p_data ? 'rainAvailable' THEN (p_data->>'rainAvailable')::boolean ELSE rain_available END,
    schedule_group_ids=CASE WHEN p_data ? 'scheduleGroupIds'
      THEN ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(p_data->'scheduleGroupIds'))
      ELSE schedule_group_ids END
  WHERE id=v_id;
  IF p_guardian_mode='clear' THEN
    DELETE FROM public.admin_private_unit_guardians WHERE unit_id=v_id;
  ELSIF p_guardian_mode='new' THEN
    INSERT INTO public.admin_private_guardians(relation,phone) VALUES (coalesce(p_guardian_data->>'relation',''),coalesce(p_guardian_data->>'phone','')) RETURNING id INTO v_g_id;
    DELETE FROM public.admin_private_unit_guardians WHERE unit_id=v_id;
    INSERT INTO public.admin_private_unit_guardians(unit_id,guardian_id,position) VALUES (v_id,v_g_id,0);
  ELSIF p_guardian_mode='existing' THEN
    IF p_guardian_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.admin_private_guardians WHERE id=p_guardian_id) THEN RAISE EXCEPTION 'GUARDIAN_NOT_FOUND'; END IF;
    DELETE FROM public.admin_private_unit_guardians WHERE unit_id=v_id;
    INSERT INTO public.admin_private_unit_guardians(unit_id,guardian_id,position) VALUES (v_id,p_guardian_id,0);
  ELSIF p_guardian_mode='edit' THEN
    SELECT guardian_id INTO v_current_g FROM public.admin_private_unit_guardians WHERE unit_id=v_id ORDER BY position LIMIT 1;
    IF v_current_g IS NULL OR v_current_g IS DISTINCT FROM p_guardian_id THEN RAISE EXCEPTION 'GUARDIAN_NOT_LINKED'; END IF;
    SELECT count(*) INTO v_other_links FROM public.admin_private_unit_guardians WHERE guardian_id=v_current_g AND unit_id<>v_id;
    IF v_other_links>0 THEN RAISE EXCEPTION 'SHARED_GUARDIAN_EDIT_REQUIRES_CONFIRMATION'; END IF;
    v_g_revision := nullif(p_guardian_data->>'revision','')::bigint;
    UPDATE public.admin_private_guardians SET relation=coalesce(p_guardian_data->>'relation',''),phone=coalesce(p_guardian_data->>'phone',''), revision=revision+1,updated_at=now()
    WHERE id=v_current_g AND revision=v_g_revision;
    IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  END IF;
  -- Enrollment changes are part of the same transaction as unit+guardian changes.
  IF jsonb_typeof(p_add_enrollments) <> 'array' OR jsonb_typeof(p_cancel_enrollments) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_ENROLLMENT_ARRAY';
  END IF;
  FOR v_en IN SELECT value FROM jsonb_array_elements(p_cancel_enrollments) LOOP
    IF v_en->>'id' IS NULL OR v_en->>'revision' IS NULL THEN RAISE EXCEPTION 'INVALID_ENROLLMENT'; END IF;
    UPDATE public.admin_private_enrollments SET canceled_at=now(),revision=revision+1,updated_at=now()
      WHERE id=(v_en->>'id')::uuid AND unit_id=v_id AND revision=(v_en->>'revision')::bigint AND canceled_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  END LOOP;
  FOR v_en IN SELECT value FROM jsonb_array_elements(p_add_enrollments) LOOP
    IF coalesce((v_en->>'sessions')::int,0)<1 OR coalesce((v_en->>'amount')::int,-1)<0 OR v_en->>'enrolledAt' IS NULL THEN
      RAISE EXCEPTION 'INVALID_ENROLLMENT';
    END IF;
    INSERT INTO public.admin_private_enrollments(unit_id,enrolled_at,sessions,amount_10k_krw,paid_at,next_due_date,expires_at,memo)
    VALUES(v_id,(v_en->>'enrolledAt')::date,(v_en->>'sessions')::int,(v_en->>'amount')::int,
      nullif(v_en->>'paidAt','')::date,nullif(v_en->>'nextDueDate','')::date,nullif(v_en->>'expiresAt','')::date,coalesce(v_en->>'memo',''));
  END LOOP;
  RETURN jsonb_build_object('id',v_id,'revision',v_revision);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_private_save_unit(uuid,jsonb,bigint,text,uuid,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_private_save_unit(uuid,jsonb,bigint,text,uuid,jsonb,jsonb,jsonb) TO service_role;
