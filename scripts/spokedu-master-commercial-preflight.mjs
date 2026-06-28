import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const REQUIRED_WRITE_GUARD = 'ALLOW_STAGING_WRITES';

function valueOf(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return '';
}

function isHttpsRemoteUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function isProductionLookingHost(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === 'spokedu.com' ||
      hostname.endsWith('.spokedu.com') ||
      hostname.includes('production') ||
      hostname.includes('prod')
    );
  } catch {
    return true;
  }
}

function extractSupabaseRef(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    const match = hostname.match(/^([a-z0-9-]+)\.supabase\.co$/);
    return match?.[1] ?? '';
  } catch {
    return '';
  }
}

function isTossTestKey(value) {
  return /^test_/i.test(value) || /(^|_)test_/i.test(value);
}

function parseAllowlist(value) {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const runtimeEnv = valueOf('SPM_RUNTIME_ENV');
const baseUrl = valueOf('STAGING_BASE_URL');
const supabaseUrl = valueOf('STAGING_NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const approvedSupabaseRef = valueOf('SPM_APPROVED_STAGING_SUPABASE_REF');
const tossClientKey = valueOf('STAGING_NEXT_PUBLIC_TOSS_CLIENT_KEY', 'NEXT_PUBLIC_TOSS_CLIENT_KEY', 'TOSS_CLIENT_KEY');
const tossSecretKey = valueOf('STAGING_TOSS_SECRET_KEY', 'TOSS_SECRET_KEY');
const qaId = valueOf('SPOKEDU_MASTER_QA_ID', 'SPM_QA_ID');
const qaPassword = valueOf('SPOKEDU_MASTER_QA_PASSWORD', 'SPM_QA_PASSWORD');
const writeGuard = valueOf('SPM_STAGING_WRITE_GUARD');
const disposableAllowlist = parseAllowlist(valueOf('SPM_DISPOSABLE_QA_ALLOWLIST', 'SPOKEDU_MASTER_QA_ALLOWLIST'));

const supabaseRef = extractSupabaseRef(supabaseUrl);
const runtimeValid = runtimeEnv === 'staging';
const baseLoaded = baseUrl.length > 0;
const baseValid = baseLoaded && isHttpsRemoteUrl(baseUrl) && !isProductionLookingHost(baseUrl);
const supabaseMatched =
  supabaseRef.length > 0 &&
  approvedSupabaseRef.length > 0 &&
  supabaseRef === approvedSupabaseRef;
const tossClientValid = tossClientKey.length > 0 && isTossTestKey(tossClientKey);
const tossSecretValid = tossSecretKey.length > 0 && isTossTestKey(tossSecretKey);
const qaLoaded = qaId.length > 0 && qaPassword.length > 0;
const qaDisposable =
  qaLoaded &&
  (disposableAllowlist.length === 0 ? /qa|test|staging|sandbox/i.test(qaId) : disposableAllowlist.includes(qaId.toLowerCase()));
const writeGuardEnabled = writeGuard === REQUIRED_WRITE_GUARD;

console.log(`runtime environment: ${runtimeValid ? 'staging' : 'invalid'}`);
console.log(`base URL loaded: ${baseLoaded ? 'yes' : 'no'}`);
console.log(`Supabase ref matched: ${supabaseMatched ? 'yes' : 'no'}`);
console.log(`Toss client mode: ${tossClientValid ? 'test' : 'invalid'}`);
console.log(`Toss secret mode: ${tossSecretValid ? 'test' : 'invalid'}`);
console.log(`QA credentials loaded: ${qaLoaded && qaDisposable ? 'yes' : 'no'}`);
console.log(`write guard: ${writeGuardEnabled ? 'enabled' : 'disabled'}`);

const ok =
  runtimeValid &&
  baseValid &&
  supabaseMatched &&
  tossClientValid &&
  tossSecretValid &&
  qaLoaded &&
  qaDisposable &&
  writeGuardEnabled;

if (!ok) {
  console.log('STAGING VALIDATION SKIPPED — unsafe or incomplete staging configuration');
  process.exit(78);
}

console.log('STAGING VALIDATION PREFLIGHT PASSED');
