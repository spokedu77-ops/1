// Offline PostgreSQL/PLpgSQL verification. Never accepts a database URL and
// never opens a Supabase connection. Install PGlite only in the ignored fixture
// directory: npm install --prefix .tmp/billing-v2/resumed/pg-fixture @electric-sql/pglite
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const modulePath = path.resolve('.tmp/billing-v2/resumed/pg-fixture/node_modules/@electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const out = '.tmp/billing-v2/resumed';
const userId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const results = [];
const baselineSql = await readFile('supabase/migrations/20261024113000_preserve_spokedu_master_billing_anchor.sql', 'utf8');
const start = baselineSql.indexOf('CREATE OR REPLACE FUNCTION public._spm_capture_initial_billing_anchor()');
const end = baselineSql.indexOf('$$;', start) + 3;
const baselineFunction = baselineSql.slice(start, end);
const migration = await readFile('supabase/migrations/20261106150000_reset_billing_anchor_on_verified_resubscription.sql', 'utf8');
await mkdir(out, { recursive: true });
await writeFile(`${out}/anchor-rollback.sql`, baselineFunction + '\n');
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE public.spokedu_master_subscriptions (
      user_id uuid PRIMARY KEY, billing_anchor_day smallint, billing_anchor_is_eom boolean, billing_anchor_timezone text,
      current_period_start timestamptz, current_period_end timestamptz, last_payment_at timestamptz,
      toss_order_id text, toss_payment_key text
    );
    CREATE TABLE public.spokedu_master_payment_orders (
      order_id text PRIMARY KEY, user_id uuid, billing_cycle_key text, status text, payment_key text
    );
  `);
  await db.exec(baselineFunction);
  await db.exec(`CREATE TRIGGER spm_capture_initial_billing_anchor BEFORE INSERT OR UPDATE OF current_period_start
    ON public.spokedu_master_subscriptions FOR EACH ROW EXECUTE FUNCTION public._spm_capture_initial_billing_anchor();`);
  async function check(name, test) {
    await db.exec('BEGIN');
    try { await test(); results.push({ name, status: 'PASS' }); }
    catch (error) { results.push({ name, status: 'FAIL', reason: error.message }); }
    finally { await db.exec('ROLLBACK'); }
  }
  async function seed() {
    await db.query(`INSERT INTO public.spokedu_master_subscriptions
      (user_id,current_period_start,current_period_end,last_payment_at,toss_order_id,toss_payment_key)
      VALUES ($1,'2026-01-26T12:00:00+09','2026-02-26T12:00:00+09','2026-01-26T12:00:00+09','old-order','old-payment')`, [userId]);
  }
  async function transition({ date = '2026-11-06T12:00:00+09', cycle = `initial:${userId}:checkout:0`, owner = userId, status = 'processing', key, orderId = 'new-order' } = {}) {
    const paymentKey = `new-payment-${orderId}`;
    await db.query('INSERT INTO public.spokedu_master_payment_orders VALUES ($1,$2,$3,$4,$5)', [orderId, owner, cycle, status, key ?? paymentKey]);
    await db.query(`UPDATE public.spokedu_master_subscriptions SET current_period_start=$1, last_payment_at=$1,
      current_period_end=(($1::timestamptz AT TIME ZONE 'Asia/Seoul') + interval '1 month') AT TIME ZONE 'Asia/Seoul',
      toss_order_id=$2,toss_payment_key=$4 WHERE user_id=$3`, [date, orderId, userId, paymentKey]);
    return (await db.query('SELECT billing_anchor_day,billing_anchor_is_eom,billing_anchor_timezone FROM public.spokedu_master_subscriptions WHERE user_id=$1', [userId])).rows[0];
  }
  await check('baseline_reproduces_expired_resubscription_anchor_drift', async () => {
    await seed(); assert.equal((await transition()).billing_anchor_day, 26);
  });
  await seed();
  const before = (await db.query('SELECT * FROM public.spokedu_master_subscriptions')).rows;
  await db.exec(migration);
  assert.deepEqual((await db.query('SELECT * FROM public.spokedu_master_subscriptions')).rows, before);
  results.push({ name: 'migration_does_not_backfill_or_modify_existing_rows', status: 'PASS' });
  await db.query('DELETE FROM public.spokedu_master_subscriptions WHERE user_id=$1', [userId]); // in-memory fixture only
  await check('expired_resubscription_starts_new_verified_anchor', async () => { await seed(); assert.equal((await transition()).billing_anchor_day, 6); });
  for (const [day, date, eom] of [[28, '2028-02-28T12:00:00+09', false], [29, '2028-02-29T12:00:00+09', true], [30, '2028-04-30T12:00:00+09', true], [31, '2028-01-31T12:00:00+09', true]]) {
    await check(`resubscription_calendar_day_${day}`, async () => { await seed(); const row = await transition({ date }); assert.equal(row.billing_anchor_day, day); assert.equal(row.billing_anchor_is_eom, eom); assert.equal(row.billing_anchor_timezone, 'Asia/Seoul'); });
  }
  await check('kst_midnight_boundary_uses_korean_date', async () => { await seed(); assert.equal((await transition({ date: '2026-01-31T16:00:00Z' })).billing_anchor_day, 26); // still before old period end
    assert.equal((await transition({ date: '2027-01-31T16:00:00Z', orderId: 'later-order' })).billing_anchor_day, 1); });
  for (const [name, options] of [
    ['renewal_preserves_existing_anchor', { cycle: 'subscription:20261106' }],
    ['upgrade_preserves_existing_anchor', { cycle: `upgrade:${userId}:premium:2026-12-06` }],
    ['different_owner_cannot_reset_anchor', { owner: otherId }],
    ['unapproved_failed_order_cannot_reset_anchor', { status: 'failed' }],
    ['different_payment_key_cannot_reset_anchor', { key: 'conflicting-payment' }],
    ['replayed_order_cannot_reset_anchor', { orderId: 'old-order' }],
  ]) await check(name, async () => { await seed(); assert.equal((await transition(options)).billing_anchor_day, 26); });
  await check('first_paid_subscription_still_captures_anchor', async () => {
    await db.query(`INSERT INTO public.spokedu_master_subscriptions (user_id,current_period_start,last_payment_at) VALUES ($1,'2026-01-30T16:00:00Z','2026-01-30T16:00:00Z')`, [userId]);
    const row = (await db.query('SELECT billing_anchor_day,billing_anchor_is_eom FROM public.spokedu_master_subscriptions')).rows[0];
    assert.equal(row.billing_anchor_day, 31); assert.equal(row.billing_anchor_is_eom, true);
  });
  await db.exec(baselineFunction);
  await check('rollback_restores_previous_function', async () => { await seed(); assert.equal((await transition()).billing_anchor_day, 26); });
} finally {
  await db.close();
  await writeFile(`${out}/anchor-postgres-results.json`, JSON.stringify({ engine: 'PGlite PostgreSQL WASM; in-memory only', productionConnections: 0, results }, null, 2));
}
console.log(JSON.stringify({ passed: results.filter((r) => r.status === 'PASS').length, failed: results.filter((r) => r.status === 'FAIL').length, results }));
process.exitCode = results.some((r) => r.status === 'FAIL') ? 1 : 0;
