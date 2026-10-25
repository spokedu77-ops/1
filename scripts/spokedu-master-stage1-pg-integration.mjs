import assert from 'node:assert/strict';
import pg from 'pg';

const { Client, Pool } = pg;
const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new Pool({ connectionString, max: 24, connectionTimeoutMillis: 5000 });
const results = [];
const record = (name, detail) => { results.push({ name, detail }); console.log(`PASS ${name}: ${detail}`); };

async function query(text, values) { return pool.query(text, values); }
async function addUser(id) {
  await query(`insert into auth.users(id,aud,role,email,created_at,updated_at)
    values($1,'authenticated','authenticated',$2,now(),now()) on conflict(id) do nothing`, [id, `${id}@example.test`]);
}

async function claimRace(workers) {
  const id = `spm-lite-claim-${workers}`;
  await query(`insert into public.spokedu_master_payment_orders(order_id,user_id,plan,amount,status)
    values($1,'10000000-0000-4000-8000-000000000002','lite',9900,'pending')`, [id]);
  const attempts = await Promise.all(Array.from({ length: workers }, async () => {
    const c = new Client({ connectionString }); await c.connect();
    try {
      const r = await c.query(`update public.spokedu_master_payment_orders set status='processing',last_error_code=null
        where order_id=$1 and status in ('pending','failed','recoverable_failed') returning order_id`, [id]);
      return r.rowCount;
    } finally { await c.end(); }
  }));
  assert.equal(attempts.reduce((a, b) => a + b, 0), 1);
  record(`claim_${workers}_workers`, `exactly one claim (${attempts.join(',')})`);
}

async function backlog(total) {
  const prefix = `backlog-${total}-`;
  await query(`insert into public.spokedu_master_payment_orders
    (order_id,user_id,plan,amount,status,payment_key,billing_cycle_key,charge_state,billing_anchor_day)
    select $1||g, '10000000-0000-4000-8000-000000000002','lite',9900,'recoverable_failed',
           'pk-'||$1||g, 'cycle-'||$1||lpad(g::text,8,'0'),
           'approved_unapplied',31 from generate_series(1,$2) g`, [prefix, total]);
  const counts = [];
  while (true) {
    const r = await query(`with batch as (
      select order_id from public.spokedu_master_payment_orders
      where order_id like $1 and charge_state='approved_unapplied'
      order by created_at,order_id for update skip locked limit 20
    ) update public.spokedu_master_payment_orders o set charge_state='applied',status='active',applied_at=now()
      from batch where o.order_id=batch.order_id returning o.order_id`, [`${prefix}%`]);
    if (!r.rowCount) break;
    counts.push(r.rowCount);
  }
  assert.equal(counts.reduce((a, b) => a + b, 0), total);
  assert.deepEqual(counts, Array.from({ length: Math.ceil(total / 20) }, (_, i) => Math.min(20, total - i * 20)));
  record(`recovery_backlog_${total}`, `batches=${counts.join(',')}`);
}

try {
  const classification = await query(`select order_id,charge_state,operator_review_required
    from public.spokedu_master_payment_orders where order_id like 'spm-lite-fixture-%' order by order_id`);
  const states = Object.fromEntries(classification.rows.map(r => [r.order_id.replace('spm-lite-fixture-', ''), [r.charge_state, r.operator_review_required]]));
  assert.deepEqual(states, {
    ambiguous: ['review_required', true], applied: ['applied', false], approved: ['approved_unapplied', false],
    cancelled: ['fully_refunded', false], clean: ['unattempted', false], partial: ['partially_refunded', true],
  });
  record('legacy_null_charge_state_classification', JSON.stringify(states));

  const legacy = await query(`select billing_anchor_day,billing_anchor_is_eom,billing_anchor_timezone
    from public.spokedu_master_subscriptions where user_id='10000000-0000-4000-8000-000000000001'`);
  assert.deepEqual(legacy.rows[0], { billing_anchor_day: null, billing_anchor_is_eom: null, billing_anchor_timezone: null });
  record('legacy_anchor_not_inferred', 'all anchor fields remain NULL');

  const user = '20000000-0000-4000-8000-000000000031'; await addUser(user);
  await query(`insert into public.spokedu_master_payment_orders(order_id,user_id,plan,amount,status)
    values('spm-lite-initial-anchor31',$1,'lite',9900,'pending')`, [user]);
  const applied = await query(`select public.spokedu_master_apply_payment($1,'spm-lite-initial-anchor31','pk-anchor31','lite',9900,
    '2026-01-30 15:00:00+00','2026-02-27 15:00:00+00','2026-02-27 15:00:00+00','event-anchor31','initial',null,null,null) result`, [user]);
  assert.equal(applied.rows[0].result.status, 'processed');
  let anchor = await query(`select billing_anchor_day,billing_anchor_is_eom,billing_anchor_timezone from public.spokedu_master_subscriptions where user_id=$1`, [user]);
  assert.deepEqual(anchor.rows[0], { billing_anchor_day: 31, billing_anchor_is_eom: true, billing_anchor_timezone: 'Asia/Seoul' });
  record('first_paid_anchor_atomic', '2026-01-30T15:00Z => KST day 31');

  await query(`insert into public.spokedu_master_payment_orders(order_id,user_id,plan,amount,status,billing_cycle_key)
    values('spm-premium-upgrade-anchor31',$1,'premium',1000,'pending','upgrade:test-anchor31')`, [user]);
  const upgrade = await query(`select public.spokedu_master_apply_payment($1,'spm-premium-upgrade-anchor31','pk-upgrade31','premium',1000,
    '2026-02-15 00:00:00+00','2026-03-15 00:00:00+00','2026-03-15 00:00:00+00','event-upgrade31','upgrade',null,null,'upgrade:test-anchor31') result`, [user]);
  assert.equal(upgrade.rows[0].result.status, 'processed');
  anchor = await query(`select billing_anchor_day from public.spokedu_master_subscriptions where user_id=$1`, [user]);
  assert.equal(anchor.rows[0].billing_anchor_day, 31);
  record('lite_to_premium_anchor_preserved', 'anchor=31');

  const matrix = await query(`with anchors(day) as (values(29),(30),(31)), months(n) as (select generate_series(1,12))
    select day,n,extract(day from (make_date(case when n=12 then 2028 else 2027 end,case when n=12 then 1 else n+1 end,1)
      + (least(day,extract(day from (date_trunc('month',make_date(case when n=12 then 2028 else 2027 end,case when n=12 then 1 else n+1 end,1))+interval '1 month - 1 day')))::int-1)*interval '1 day'))::int actual
    from anchors cross join months order by day,n`);
  assert.equal(matrix.rowCount, 36);
  assert.equal(matrix.rows.find(r => r.day === 31 && r.n === 1).actual, 28);
  assert.equal(matrix.rows.find(r => r.day === 31 && r.n === 2).actual, 31);
  record('anchor_29_30_31_12_month_matrix', '36 PostgreSQL cases; Feb clamp and Mar restore');

  const leap = await query(`select extract(day from (date '2028-02-01' + interval '1 month - 1 day'))::int last_day`);
  assert.equal(leap.rows[0].last_day, 29);
  record('leap_year', '2028-02 last_day=29');

  await Promise.all([2,5,20].map(claimRace));

  const crashUser='20000000-0000-4000-8000-000000000099'; await addUser(crashUser);
  await query(`insert into public.spokedu_master_payment_orders(order_id,user_id,plan,amount,status,payment_key,charge_state,billing_anchor_day,billing_cycle_key)
    values('spm-lite-renewal-crash',$1,'lite',9900,'recoverable_failed','pk-crash','approved_unapplied',15,$2)`, [crashUser, `${crashUser}:20261001`]);
  await query(`insert into public.spokedu_master_subscriptions(user_id,plan,plan_id,status,current_period_start,current_period_end,next_billing_at,last_payment_at,current_amount,billing_anchor_day,billing_anchor_is_eom,billing_anchor_timezone)
    values($1,'lite','lite','active','2026-09-01','2026-10-01','2026-10-01','2026-09-01',9900,15,false,'Asia/Seoul')`, [crashUser]);
  const applySql=`select public.spokedu_master_apply_payment($1,'spm-lite-renewal-crash','pk-crash','lite',9900,'2026-10-01','2026-11-01','2026-11-01',$2,'renewal',null,null,$3) result`;
  const duplicate = await Promise.all(['crash-a','crash-b'].map(event => query(applySql,[crashUser,event,`${crashUser}:20261001`])));
  assert.equal(duplicate.filter(r => r.rows[0].result.status === 'processed').length, 2);
  const crashState=await query(`select current_period_start,current_period_end from public.spokedu_master_subscriptions where user_id=$1`,[crashUser]);
  assert.equal(new Date(crashState.rows[0].current_period_start).toISOString(),'2026-10-01T00:00:00.000Z');
  assert.equal(new Date(crashState.rows[0].current_period_end).toISOString(),'2026-11-01T00:00:00.000Z');
  record('approved_after_crash_duplicate_apply', 'two concurrent RPC calls, one period advance');

  await backlog(41); await backlog(100);

  const oldApp='20000000-0000-4000-8000-000000000088'; await addUser(oldApp);
  await query(`insert into public.spokedu_master_payment_orders(order_id,user_id,plan,amount,status) values('spm-lite-old-app',$1,'lite',9900,'pending')`,[oldApp]);
  let old=await query(`select charge_state from public.spokedu_master_payment_orders where order_id='spm-lite-old-app'`);
  assert.equal(old.rows[0].charge_state,'unattempted');
  await query(`update public.spokedu_master_payment_orders set status='active',payment_key='pk-old',applied_at=now() where order_id='spm-lite-old-app'`);
  old=await query(`select charge_state from public.spokedu_master_payment_orders where order_id='spm-lite-old-app'`);
  assert.equal(old.rows[0].charge_state,'applied');
  record('legacy_app_new_schema_compatibility', 'omitted new columns; trigger synchronized applied');

  await assert.rejects(query(`insert into public.spokedu_master_payment_orders(order_id,user_id,plan,amount,status,charge_state)
    values('spm-lite-invalid-state',$1,'lite',9900,'pending','unsafe')`,[oldApp]), /charge_state_check/);
  record('order_check_constraint', 'invalid charge_state rejected');

  const provider=await query(`select status from public.spokedu_master_billing_provider_state where singleton_key=true`);
  assert.equal(provider.rows[0].status,'unknown');
  const cron=await query(`select pg_get_functiondef('public.spokedu_master_run_billing_renewal_cron()'::regprocedure) def`);
  for(const needle of ["pg_try_advisory_xact_lock", "subscription.pg_provider = 'tosspayments'", 'billing_anchor_day IS NOT NULL','approved_unapplied','request_started','outcome_unknown']) assert.ok(cron.rows[0].def.includes(needle));
  record('provider_state_and_cron_wrapper', 'provider=unknown; lock/provider/anchor/recovery predicates present; HTTP function not invoked');

  const uniqueUser='20000000-0000-4000-8000-000000000077'; await addUser(uniqueUser);
  const inserts=await Promise.allSettled(Array.from({length:20},(_,i)=>query(`insert into public.spokedu_master_payment_orders(order_id,user_id,plan,amount,status,billing_cycle_key)
    values($1,$2,'lite',9900,'pending','same-cycle')`,[`spm-lite-unique-${i}`,uniqueUser])));
  assert.equal(inserts.filter(x=>x.status==='fulfilled').length,1);
  record('billing_cycle_unique_concurrency','1/20 inserts committed');

  console.log(JSON.stringify({ ok: true, results }, null, 2));
} finally {
  await pool.end();
}
