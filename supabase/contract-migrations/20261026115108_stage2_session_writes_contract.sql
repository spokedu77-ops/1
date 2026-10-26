-- Stage 2 P0 CONTRACT.
-- Apply only after every production instance uses the v2 RPCs and legacy-call telemetry is zero.
-- This file is intentionally outside supabase/migrations so a normal db push cannot apply it with EXPAND.

revoke all on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb)
  from public,anon,authenticated,service_role;
revoke all on function public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb)
  from public,anon,authenticated,service_role;
revoke all on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb)
  from public,anon,authenticated,service_role;
revoke all on function public.spokedu_master_save_session_capture(uuid,uuid,text,jsonb)
  from public,anon,authenticated,service_role;
