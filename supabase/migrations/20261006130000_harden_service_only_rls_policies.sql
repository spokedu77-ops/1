-- Keep internal tables service-only while making the intended RLS policy explicit.
do $$
declare
  v_table text;
  v_policy text;
begin
  foreach v_table in array array[
    'commercial_funnel_events',
    'mr_special_pe_asset_map',
    'spokedu_master_billing_runs',
    'spokedu_master_class_schedule_rules',
    'spokedu_master_entitlement_grants',
    'spokedu_master_promotion_invites'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated', v_table);
    execute format('grant all on table public.%I to service_role', v_table);

    v_policy := v_table || '_service_role_all';
    execute format('drop policy if exists %I on public.%I', v_policy, v_table);
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      v_policy,
      v_table
    );
  end loop;
end;
$$;
