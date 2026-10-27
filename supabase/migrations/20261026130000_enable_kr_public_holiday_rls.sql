-- Harden the public holiday reference tables without changing their existing
-- access contract: authenticated users may read, while writes remain service-only.

alter table public.kr_public_holidays enable row level security;
alter table public.kr_public_holiday_coverage enable row level security;

drop policy if exists kr_public_holidays_authenticated_read
  on public.kr_public_holidays;
create policy kr_public_holidays_authenticated_read
  on public.kr_public_holidays
  for select
  to authenticated
  using (true);

drop policy if exists kr_public_holiday_coverage_authenticated_read
  on public.kr_public_holiday_coverage;
create policy kr_public_holiday_coverage_authenticated_read
  on public.kr_public_holiday_coverage
  for select
  to authenticated
  using (true);
