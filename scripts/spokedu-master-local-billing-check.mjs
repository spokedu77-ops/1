// Local, non-charging configuration check. Never prints credentials or calls
// Toss, Supabase, or Vercel. --verified-mid records the operator's MID check;
// a hash is not independent proof of a merchant contract or key registration.
import nextEnv from '@next/env';
import { require as tsxRequire } from 'tsx/cjs/api';
import { readFile, writeFile } from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const { billingKeyPairDigest, getBillingConfigurationError, getBillingKeyFormatError, SPOKEDU_BILLING_MID } = tsxRequire('../app/lib/server/spokeduMasterBillingConfiguration.ts', import.meta.url);
const client = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() ?? '';
const secret = process.env.TOSS_SECRET_KEY?.trim() ?? '';
const family = (key) => key.match(/^(?:test|live)_(?:g?ck|g?sk)_/)?.[0] ?? (key ? 'invalid' : 'missing');
const formatError = getBillingKeyFormatError();
if (formatError) {
  console.log(JSON.stringify({ ready: false, code: formatError, clientFamily: family(client), secretFamily: family(secret), requestsSent: 0 }));
  process.exit(2);
}
const flag = process.argv.indexOf('--verified-mid');
if (flag >= 0) {
  if (process.argv[flag + 1] !== SPOKEDU_BILLING_MID) throw new Error('expected_verified_billing_mid');
  const digest = billingKeyPairDigest(client, secret);
  let text = await readFile('.env.local', 'utf8');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  for (const [name, value] of [['TOSS_BILLING_MID', SPOKEDU_BILLING_MID], ['TOSS_BILLING_KEY_PAIR_SHA256', digest]]) {
    const expression = new RegExp(`^\\s*${name}\\s*=.*$`, 'gm');
    if (expression.test(text)) text = text.replace(expression, `${name}=${value}`);
    else text += `${text.endsWith('\n') ? '' : newline}${name}=${value}${newline}`;
    process.env[name] = value;
  }
  await writeFile('.env.local', text, 'utf8');
}
const code = getBillingConfigurationError();
console.log(JSON.stringify({ ready: !code, code, clientFamily: family(client), secretFamily: family(secret), requestsSent: 0, localMetadataUpdated: flag >= 0 }));
if (client.startsWith('live_ck_')) console.log('Live keys: completing billing/issue can charge the card. This check makes no requests.');
process.exitCode = code ? 2 : 0;
