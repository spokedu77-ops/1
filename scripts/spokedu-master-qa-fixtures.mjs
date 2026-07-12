/**
 * SPOKEDU MASTER subscription QA fixtures.
 *
 * Default mode is dry-run: prints the intended auth/subscription changes only.
 *
 * Apply:
 *   ALLOW_SPOKEDU_MASTER_QA_SEED=1 SPM_QA_PASSWORD=... node scripts/spokedu-master-qa-fixtures.mjs --apply
 *
 * Required for DB/Auth access:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional fixture emails:
 *   SPM_QA_TRIAL_EMAIL
 *   SPM_QA_PRO_EMAIL
 *   SPM_QA_TEAM_EMAIL
 *   SPM_QA_EXPIRED_EMAIL
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const cleanup = args.has('--cleanup');
const mutating = apply && !cleanup;
const dryRun = !mutating;

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_EMAIL_RE = /^spm\.qa\.[a-z0-9._+-]+@(?:spokedu\.test|spokedu\.com)$/i;
const DEFAULT_EMAILS = {
  trial: 'spm.qa.trial@spokedu.test',
  pro: 'spm.qa.pro@spokedu.test',
  team: 'spm.qa.center@spokedu.test',
  expired: 'spm.qa.expired@spokedu.test',
};

function loadDotEnv() {
  const path = join(ROOT, '.env.local');
  if (!existsSync(path)) return {};
  const env = {};
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function requireSafeEmail(label, email) {
  if (!ALLOWED_EMAIL_RE.test(email)) {
    throw new Error(`${label} email is not allowed for QA fixtures: ${email}`);
  }
}

function iso(date) {
  return date.toISOString();
}

function planForFixtures(now = new Date()) {
  return [
    {
      key: 'trial',
      email: env.SPM_QA_TRIAL_EMAIL || DEFAULT_EMAILS.trial,
      subscription: null,
      expected: 'subscription=free+trialEndsAt, programs/drills=200, payment=available',
    },
    {
      key: 'pro',
      email: env.SPM_QA_PRO_EMAIL || DEFAULT_EMAILS.pro,
      subscription: {
        plan: 'premium',
        plan_id: 'premium',
        status: 'active',
        pg_provider: 'manual_qa',
        period_start: iso(now),
        period_end: iso(new Date(now.getTime() + 30 * DAY_MS)),
      },
      expected: 'subscription=premium active, programs/drills=200, create-checkout=409',
    },
    {
      key: 'team',
      email: env.SPM_QA_TEAM_EMAIL || DEFAULT_EMAILS.team,
      subscription: {
        plan: 'team',
        status: 'active',
        pg_provider: 'manual_qa',
        period_start: iso(now),
        period_end: iso(new Date(now.getTime() + 30 * DAY_MS)),
      },
      expected: 'subscription=team active, programs/drills=200, create-checkout=409',
    },
    {
      key: 'expired',
      email: env.SPM_QA_EXPIRED_EMAIL || DEFAULT_EMAILS.expired,
      subscription: {
        plan: 'premium',
        plan_id: 'premium',
        status: 'active',
        pg_provider: 'manual_qa',
        period_start: iso(new Date(now.getTime() - 60 * DAY_MS)),
        period_end: iso(new Date(now.getTime() - DAY_MS)),
      },
      expected: 'subscription=expired/free, programs/drills=403, payment=available',
    },
  ];
}

function printPlan(fixtures, existingByEmail) {
  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}${cleanup ? ' (cleanup SQL only)' : ''}`);
  console.log('');
  console.log('QA fixtures:');
  for (const fixture of fixtures) {
    const existing = existingByEmail.get(fixture.email);
    console.log(`- ${fixture.key}: ${fixture.email}`);
    if (existing?.id) {
      console.log(`  auth: reuse ${existing.id}`);
      console.log(`  auth email confirmed: ${existing.email_confirmed_at ? 'yes' : 'no/unknown'}`);
      console.log('  target auth: update password, email_confirm=true, qa metadata');
    } else {
      console.log(`  auth: ${dryRun ? 'would create user' : 'create user'}`);
      console.log('  target auth: email_confirm=true, password from SPM_QA_PASSWORD, qa metadata');
    }
    if (existing?.subscription) {
      console.log(`  existing subscription: ${JSON.stringify(existing.subscription)}`);
    } else {
      console.log('  existing subscription: none/unknown');
    }
    if (fixture.subscription) {
      console.log(`  target subscription: ${JSON.stringify(fixture.subscription)}`);
    } else {
      console.log('  target subscription: none (trial fixture; no row will be created)');
      if (existing?.subscription) {
        console.log('  warning: trial fixture currently has a subscription row; cleanup SQL below can remove it.');
      }
    }
    console.log(`  expected: ${fixture.expected}`);
  }
  console.log('');
}

function printCleanupSql(fixtures, idsByEmail) {
  const emails = fixtures.map((fixture) => fixture.email);
  const ids = fixtures.map((fixture) => idsByEmail.get(fixture.email)).filter(Boolean);
  console.log('Cleanup SQL (subscription rows only; auth users are intentionally not deleted):');
  if (ids.length > 0) {
    console.log(`DELETE FROM public.spokedu_master_subscriptions WHERE user_id IN (${ids.map((id) => `'${id}'`).join(', ')});`);
  } else {
    console.log('-- User ids are unknown in dry-run without existing users.');
    console.log('-- After --apply, rerun dry-run to print exact user_id cleanup SQL.');
  }
  console.log('');
  console.log('Auth user deletion is intentionally excluded. If a QA auth user must be removed, do it manually after confirming these emails only:');
  for (const email of emails) console.log(`-- ${email}`);
  console.log('');
}

async function getSupabase() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (dryRun) return null;
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply.');
  }
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key, { auth: { persistSession: false } });
}

function qaMetadata(fixture, current = {}) {
  return {
    ...current,
    app: 'spokedu-master',
    qa: true,
    qa_state: fixture.key,
    purpose: 'spokedu-master-qa',
  };
}

async function listUsersByEmail(supabase, emails) {
  const result = new Map();
  if (!supabase) return result;
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`auth users lookup failed: ${error.message}`);
  for (const user of data.users ?? []) {
    if (emails.includes(user.email ?? '')) {
      result.set(user.email, {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        user_metadata: user.user_metadata ?? {},
      });
    }
  }
  return result;
}

async function attachSubscriptions(supabase, existingByEmail) {
  if (!supabase || existingByEmail.size === 0) return;
  const ids = [...existingByEmail.values()].map((user) => user.id);
  if (ids.length === 0) return;
  const { data, error } = await supabase
    .from('spokedu_master_subscriptions')
    .select('user_id,plan,status,pg_provider,period_start,period_end,toss_order_id,toss_payment_key')
    .in('user_id', ids);
  if (error) throw new Error(`subscription lookup failed: ${error.message}`);
  const byUserId = new Map((data ?? []).map((row) => [row.user_id, row]));
  for (const entry of existingByEmail.values()) {
    entry.subscription = byUserId.get(entry.id) ?? null;
  }
}

async function ensureUser(supabase, fixture, existing) {
  const password = env.SPM_QA_PASSWORD;
  if (!password) throw new Error('SPM_QA_PASSWORD is required for --apply.');
  const user_metadata = qaMetadata(fixture, existing?.user_metadata);

  if (existing?.id) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata,
    });
    if (error || !data?.user) {
      throw new Error(`failed to update ${fixture.email}: ${error?.message ?? 'unknown error'}`);
    }
    console.log(`UPDATE auth user ${fixture.key}: ${fixture.email} (${existing.id})`);
    return {
      id: data.user.id,
      email: data.user.email,
      email_confirmed_at: data.user.email_confirmed_at,
      user_metadata: data.user.user_metadata ?? user_metadata,
    };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: fixture.email,
    password,
    email_confirm: true,
    user_metadata,
  });
  if (error || !data?.user) {
    throw new Error(`failed to create ${fixture.email}: ${error?.message ?? 'unknown error'}`);
  }
  console.log(`CREATE auth user ${fixture.key}: ${fixture.email} (${data.user.id})`);
  return {
    id: data.user.id,
    email: data.user.email,
    email_confirmed_at: data.user.email_confirmed_at,
    user_metadata: data.user.user_metadata ?? user_metadata,
  };
}

async function applyFixtures(supabase, fixtures, existingByEmail) {
  const idsByEmail = new Map();
  for (const fixture of fixtures) {
    const user = await ensureUser(supabase, fixture, existingByEmail.get(fixture.email));
    idsByEmail.set(fixture.email, user.id);

    if (!fixture.subscription) {
      console.log(`SKIP subscription upsert for trial: ${fixture.email}`);
      continue;
    }

    const row = {
      user_id: user.id,
      ...fixture.subscription,
      toss_payment_key: null,
      toss_order_id: null,
    };
    if (fixture.key === 'team') {
      console.log(`SKIP subscription upsert for team legacy plan: ${fixture.email}`);
      continue;
    }
    const { error } = await supabase
      .from('spokedu_master_subscriptions')
      .upsert(row, { onConflict: 'user_id' });
    if (error) throw new Error(`subscription upsert failed for ${fixture.email}: ${error.message}`);
    console.log(`UPSERT subscription ${fixture.key}: ${fixture.email} (${user.id})`);
  }
  return idsByEmail;
}

const env = { ...loadDotEnv(), ...process.env };

async function main() {
  if (cleanup) {
    console.log('Note: --cleanup does not mutate DB. It prints cleanup SQL only.');
  }

  if (mutating && env.ALLOW_SPOKEDU_MASTER_QA_SEED !== '1') {
    throw new Error('Refusing --apply without ALLOW_SPOKEDU_MASTER_QA_SEED=1.');
  }

  const fixtures = planForFixtures();
  for (const fixture of fixtures) requireSafeEmail(fixture.key, fixture.email);

  if (mutating && !env.SPM_QA_PASSWORD) {
    throw new Error('SPM_QA_PASSWORD is required for --apply.');
  }

  const supabase = await getSupabase();
  const existingByEmail = await listUsersByEmail(supabase, fixtures.map((fixture) => fixture.email));
  await attachSubscriptions(supabase, existingByEmail);

  printPlan(fixtures, existingByEmail);

  let idsByEmail = new Map([...existingByEmail].map(([email, user]) => [email, user.id]));
  if (mutating) {
    console.log('Applying QA fixtures...');
    idsByEmail = await applyFixtures(supabase, fixtures, existingByEmail);
    console.log('Apply complete.');
    console.log('');
  } else {
    console.log('No DB/Auth changes were made.');
    console.log('');
  }

  printCleanupSql(fixtures, idsByEmail);

  console.log('Next E2E examples:');
  console.log('  SPOKEDU_MASTER_QA_ID=<fixture email> SPOKEDU_MASTER_QA_PASSWORD=$SPM_QA_PASSWORD node scripts/spokedu-master-home-logged-qa.mjs http://localhost:3000');
  console.log('  Use pro/team fixtures to verify create-checkout returns 409.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
