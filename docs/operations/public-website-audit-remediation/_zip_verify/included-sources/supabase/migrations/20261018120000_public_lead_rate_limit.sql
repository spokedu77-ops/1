-- Public lead API rate limit (service role only). Shared across serverless instances.
create table if not exists public.public_lead_rate_limits (
  bucket text primary key,
  window_start_ms bigint not null,
  hit_count integer not null default 0
);

alter table public.public_lead_rate_limits enable row level security;

create or replace function public.public_lead_rate_limit_check(
  p_bucket text,
  p_window_ms bigint,
  p_max integer,
  p_now_ms bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.public_lead_rate_limits%rowtype;
  v_allowed boolean := true;
begin
  insert into public.public_lead_rate_limits (bucket, window_start_ms, hit_count)
  values (p_bucket, p_now_ms, 1)
  on conflict (bucket) do nothing;

  select * into v_row from public.public_lead_rate_limits where bucket = p_bucket for update;
  if not found then
    return true;
  end if;

  if p_now_ms - v_row.window_start_ms > p_window_ms then
    update public.public_lead_rate_limits
    set window_start_ms = p_now_ms, hit_count = 1
    where bucket = p_bucket;
    return true;
  end if;

  if v_row.hit_count >= p_max then
    return false;
  end if;

  update public.public_lead_rate_limits
  set hit_count = hit_count + 1
  where bucket = p_bucket;
  return true;
end;
$$;

revoke all on function public.public_lead_rate_limit_check(text, bigint, integer, bigint) from public;
grant execute on function public.public_lead_rate_limit_check(text, bigint, integer, bigint) to service_role;
