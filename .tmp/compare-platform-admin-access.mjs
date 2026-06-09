import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Required Supabase env is missing.');

const emails = [
  'choijihoon@spokedu.com',
  'kimkoomin@spokedu.com',
  'kimyoonki@spokedu.com',
];
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (authError) throw authError;

const authByEmail = new Map(
  (authData.users ?? [])
    .filter((user) => user.email && emails.includes(user.email.toLowerCase()))
    .map((user) => [user.email.toLowerCase(), user]),
);
const ids = [...authByEmail.values()].map((user) => user.id);

const [usersResult, profilesResult, subscriptionsResult] = await Promise.all([
  ids.length
    ? supabase.from('users').select('id,role,is_admin').in('id', ids)
    : Promise.resolve({ data: [], error: null }),
  ids.length
    ? supabase.from('profiles').select('id,role').in('id', ids)
    : Promise.resolve({ data: [], error: null }),
  ids.length
    ? supabase
        .from('spokedu_master_subscriptions')
        .select('user_id,plan,status,period_end')
        .in('user_id', ids)
    : Promise.resolve({ data: [], error: null }),
]);

if (usersResult.error) throw usersResult.error;
if (profilesResult.error) throw profilesResult.error;
if (subscriptionsResult.error) throw subscriptionsResult.error;

const usersById = new Map((usersResult.data ?? []).map((row) => [row.id, row]));
const profilesById = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
const subscriptionsById = new Map(
  (subscriptionsResult.data ?? []).map((row) => [row.user_id, row]),
);

const result = emails.map((email) => {
  const auth = authByEmail.get(email);
  const user = auth ? usersById.get(auth.id) : null;
  const profile = auth ? profilesById.get(auth.id) : null;
  const subscription = auth ? subscriptionsById.get(auth.id) : null;
  const adminRole =
    user?.role === 'admin' ||
    user?.role === 'master' ||
    user?.is_admin === true ||
    profile?.role === 'admin' ||
    profile?.role === 'master';

  return {
    email,
    authUser: Boolean(auth),
    usersRow: Boolean(user),
    profilesRow: Boolean(profile),
    usersRole: user?.role ?? null,
    usersIsAdmin: user?.is_admin === true,
    profileRole: profile?.role ?? null,
    adminRole,
    subscriptionRow: Boolean(subscription),
    subscriptionPlan: subscription?.plan ?? null,
    subscriptionStatus: subscription?.status ?? null,
    subscriptionActiveNow: Boolean(
      subscription?.status === 'active' &&
        (!subscription.period_end || Date.parse(subscription.period_end) >= Date.now()),
    ),
  };
});

console.log(JSON.stringify(result, null, 2));
