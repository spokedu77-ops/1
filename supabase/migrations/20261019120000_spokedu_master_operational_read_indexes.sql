-- Preserve complete operational history while reducing the cost of the
-- nested session aggregate on small Supabase compute tiers.
create index if not exists spokedu_master_session_programs_owner_session_sort_idx
  on public.spokedu_master_session_programs(owner_id, session_id, sort_order);

create index if not exists spokedu_master_session_attendance_owner_session_idx
  on public.spokedu_master_session_attendance(owner_id, session_id);
