-- Admin-only wipe of teacher holdings (legacy + ledger rentals). Warehouse catalog totals unchanged.
create or replace function public.equipment_ops_purge_teacher_holdings()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_import integer := 0;
  v_ledger integer := 0;
  v_rentals integer := 0;
  v_inventory integer := 0;
  v_teacher_inv integer := 0;
  v_logs integer := 0;
begin
  if to_regclass('private.equipment_legacy_import_rows') is not null then
    delete from private.equipment_legacy_import_rows where true;
    get diagnostics v_import = row_count;
  end if;

  delete from public.equipment_ledger
  where event_type in ('RENT', 'RETURN_CONFIRM');

  get diagnostics v_ledger = row_count;

  delete from public.equipment_rentals where true;
  get diagnostics v_rentals = row_count;

  delete from public.inventory where true;
  get diagnostics v_inventory = row_count;

  if to_regclass('public.teacher_inventory') is not null then
    delete from public.teacher_inventory where true;
    get diagnostics v_teacher_inv = row_count;
  end if;

  if to_regclass('public.inventory_logs') is not null then
    delete from public.inventory_logs where true;
    get diagnostics v_logs = row_count;
  end if;

  return jsonb_build_object(
    'legacy_import_rows', v_import,
    'equipment_ledger_rentals', v_ledger,
    'equipment_rentals', v_rentals,
    'inventory', v_inventory,
    'teacher_inventory', v_teacher_inv,
    'inventory_logs', v_logs
  );
end;
$$;

revoke all on function public.equipment_ops_purge_teacher_holdings() from public, anon, authenticated;
grant execute on function public.equipment_ops_purge_teacher_holdings() to service_role;
