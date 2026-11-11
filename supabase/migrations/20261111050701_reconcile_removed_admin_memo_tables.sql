-- Reconcile the already removed Admin Memo product.
-- Scope: public.admin_memo_blocks and public.admin_memos only.
-- Production snapshot and restore SQL are stored locally outside Git.
-- An environment with different data must be backed up and reviewed separately.
-- Do not use CASCADE: unexpected dependencies must stop the migration.
DO $cleanup$
DECLARE
  memo_hash text;
  block_hash text;
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  IF to_regclass('public.admin_memos') IS NULL
     AND to_regclass('public.admin_memo_blocks') IS NULL THEN
    RETURN;
  END IF;
  IF to_regclass('public.admin_memos') IS NULL
     OR to_regclass('public.admin_memo_blocks') IS NULL THEN
    RAISE EXCEPTION 'Partial Admin Memo schema: stop and review before cleanup';
  END IF;

  LOCK TABLE public.admin_memos, public.admin_memo_blocks IN ACCESS EXCLUSIVE MODE;

  SELECT md5(coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.id), '[]')::text)
    INTO memo_hash FROM public.admin_memos m;
  SELECT md5(coalesce(jsonb_agg(to_jsonb(b) ORDER BY b.id), '[]')::text)
    INTO block_hash FROM public.admin_memo_blocks b;

  IF memo_hash <> '5539c0a942c4b7093147187cc3022bea'
     OR block_hash <> 'dc936f600be9e8860ef97a66879025b3' THEN
    RAISE EXCEPTION 'Admin Memo data differs from the reviewed backup: stop cleanup';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid IN ('public.admin_memos'::regclass, 'public.admin_memo_blocks'::regclass)
      AND conrelid NOT IN ('public.admin_memos'::regclass, 'public.admin_memo_blocks'::regclass)
  ) THEN
    RAISE EXCEPTION 'External Admin Memo foreign key found: stop cleanup';
  END IF;

  DROP TABLE public.admin_memo_blocks;
  DROP TABLE public.admin_memos;
END
$cleanup$;
