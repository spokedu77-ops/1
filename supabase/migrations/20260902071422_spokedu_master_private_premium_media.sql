-- Staging-first private storage boundary for Premium SPOMOVE guide videos.
-- Deliberately does not alter the shared public `iiwarmup-files` bucket.
-- Objects are delivered only by the server after the `spomove` capability gate.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'spokedu-master-premium-media',
  'spokedu-master-premium-media',
  false,
  209715200,
  array['video/mp4', 'video/webm']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- No anon/authenticated storage.objects policy is created. The service-role
-- route signs exact server-resolved paths for five minutes.
