-- Manual smoke for roster_locked_at. Does not rewrite existing completed rows.
-- Replace owner/class/student ids before running.

-- 1) Scheduled class with A/B/C uses current class roster (no session snapshot).
-- 2) Complete with A/B/C present/absent → roster_locked_at is set.
-- 3) Remove C and add D to the class → locked session attendance stays A/B/C.
-- 4) Flip A present → absent on the locked session → success.
-- 5) Add D to locked attendance → fail (locked roster cannot add or remove students).
-- 6) Remove C from locked attendance → fail.
-- 7) Complete a 0-student class → attendance [] and roster_locked_at is set.
-- 8) Existing completed rows with roster_locked_at IS NULL stay unchanged.

select
  id,
  status,
  roster_locked_at,
  (select count(*) from public.spokedu_master_session_attendance a where a.session_id = s.id) as attendance_count
from public.spokedu_master_sessions s
where deleted_at is null
order by start_at desc
limit 20;
