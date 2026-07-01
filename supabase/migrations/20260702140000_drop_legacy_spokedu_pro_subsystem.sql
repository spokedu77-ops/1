-- Legacy SPOKEDU PRO 멀티테넌트·구독·원생 서브시스템 제거.
-- MASTER는 spokedu_pro_programs(overlay), spokedu_pro_leads(/pro 문의)만 유지한다.

DROP TABLE IF EXISTS public.spokedu_pro_program_lesson_details CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_lesson_detail_status CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_screenplays CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_classes CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_stripe_webhook_events CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_ai_reports CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_observations CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_attendance CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_xp_events CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_class_xp CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_students CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_subscriptions CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_center_members CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_tenant_content CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_center_content CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_user_data CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_content CASCADE;
DROP TABLE IF EXISTS public.spokedu_pro_centers CASCADE;

DROP FUNCTION IF EXISTS public.spokedu_pro_purge_stripe_webhook_events(integer);
DROP FUNCTION IF EXISTS public.spokedu_pro_bootstrap_center(uuid, text);
DROP FUNCTION IF EXISTS private.spokedu_pro_is_center_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.spokedu_pro_is_center_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.spokedu_pro_set_updated_at() CASCADE;

SELECT 'legacy spokedu_pro subsystem dropped (programs + leads retained).' AS status;
