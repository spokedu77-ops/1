-- Private destination for criminal-background-check attachments.
-- Deliberately leaves the shared public `iiwarmup-files` bucket unchanged.
-- No storage.objects row or policy is changed here. Authenticated admin server
-- paths use the service role to issue exact, short-lived signed URLs.
--
-- Re-running this migration is safe only when an existing bucket has exactly
-- the approved settings. A mismatched bucket is never changed implicitly.

do $$
declare
  v_bucket storage.buckets%rowtype;
  v_allowed_mime_types constant text[] := array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/x-hwp',
    'application/haansofthwp',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[];
begin
  select *
  into v_bucket
  from storage.buckets
  where id = 'spokedu-center-criminal-checks'
  for update;

  if not found then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'spokedu-center-criminal-checks',
      'spokedu-center-criminal-checks',
      false,
      26214400,
      v_allowed_mime_types
    )
    on conflict (id) do nothing;

    select *
    into strict v_bucket
    from storage.buckets
    where id = 'spokedu-center-criminal-checks'
    for update;
  end if;

  if v_bucket.name is distinct from 'spokedu-center-criminal-checks'
    or v_bucket.public is distinct from false
    or v_bucket.file_size_limit is distinct from 26214400
    or v_bucket.allowed_mime_types is distinct from v_allowed_mime_types
  then
    raise exception using
      errcode = 'P0001',
      message = 'center criminal-check bucket exists with unexpected settings; no changes were applied';
  end if;
end;
$$;
