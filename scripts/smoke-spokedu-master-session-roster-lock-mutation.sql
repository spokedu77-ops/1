-- Isolated non-Production mutation smoke for roster lock.
-- Do not run against Production. Requires auth.users + MASTER schema.
-- Wrap the whole script in a transaction and ROLLBACK.

-- Inspect attached session triggers first:
select t.tgname, p.proname, pg_get_triggerdef(t.oid)
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.spokedu_master_sessions'::regclass
  and not t.tgisinternal
order by t.tgname;
