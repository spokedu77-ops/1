alter table public.postpone_notices
  add column if not exists start_date date,
  add column if not exists end_date date;

update public.postpone_notices
set start_date = notice_date,
    end_date = notice_date
where start_date is null or end_date is null;

alter table public.postpone_notices
  alter column start_date set not null,
  alter column end_date set not null;

alter table public.postpone_notices
  add constraint postpone_notices_date_range_check check (end_date >= start_date);
