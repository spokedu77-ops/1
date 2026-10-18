-- Corrected public lead rate limiter. Apply using Supabase migrations.
-- Counts first request exactly once; allows service_role only.
create table if not exists public.public_lead_rate_limits (
  bucket text primary key,
  window_start_ms bigint not null,
  hit_count integer not null default 0
);
alter table public.public_lead_rate_limits enable row level security;

create or replace function public.public_lead_rate_limit_check(
  p_bucket text, p_window_ms bigint, p_max integer, p_now_ms bigint
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.public_lead_rate_limits%rowtype;
  v_inserted boolean := false;
begin
  if p_bucket is null or length(p_bucket) < 1 or length(p_bucket) > 512
     or p_window_ms is null or p_window_ms <= 0
     or p_max is null or p_max <= 0 or p_now_ms is null then
    return false;
  end if;

  insert into public.public_lead_rate_limits(bucket, window_start_ms, hit_count)
  values (p_bucket, p_now_ms, 1)
  on conflict(bucket) do nothing
  returning true into v_inserted;

  if coalesce(v_inserted, false) then
    return true;
  end if;

  select * into v_row
  from public.public_lead_rate_limits
  where bucket = p_bucket for update;

  if not found then return false; end if;

  if p_now_ms - v_row.window_start_ms >= p_window_ms then
    update public.public_lead_rate_limits
    set window_start_ms = p_now_ms, hit_count = 1
    where bucket = p_bucket;
    return true;
  end if;

  if v_row.hit_count >= p_max then return false; end if;

  update public.public_lead_rate_limits
  set hit_count = hit_count + 1
  where bucket = p_bucket;
  return true;
end;
$$;

revoke all on function public.public_lead_rate_limit_check(text,bigint,integer,bigint)
  from public, anon, authenticated;
grant execute on function public.public_lead_rate_limit_check(text,bigint,integer,bigint)
  to service_role;
