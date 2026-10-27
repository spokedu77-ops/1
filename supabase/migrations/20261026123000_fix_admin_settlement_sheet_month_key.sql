alter table public.admin_settlement_sheet_months
  drop constraint if exists admin_settlement_sheet_months_month_key_check;

alter table public.admin_settlement_sheet_months
  add constraint admin_settlement_sheet_months_month_key_check
  check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$');
