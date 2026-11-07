-- Approved mapping: active -> regular; paused -> ended.
BEGIN;
ALTER TABLE public.centers DROP CONSTRAINT IF EXISTS centers_status_check;
UPDATE public.centers SET status = 'regular' WHERE status = 'active';
UPDATE public.centers SET status = 'ended' WHERE status = 'paused';
ALTER TABLE public.centers ALTER COLUMN status SET DEFAULT 'regular';
ALTER TABLE public.centers ADD CONSTRAINT centers_status_check
  CHECK (status IN ('ongoing', 'regular', 'short', 'ended'));
COMMIT;
