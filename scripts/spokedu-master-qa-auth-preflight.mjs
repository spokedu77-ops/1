import nextEnv from '@next/env';
import { chromium } from 'playwright';
import { ensureMasterQaAccess } from './lib/spokedu-master-auth-state.mjs';

nextEnv.loadEnvConfig(process.cwd());

const baseUrl = process.env.SPOKEDU_MASTER_QA_BASE_URL?.trim() || 'http://localhost:3000';
const accounts = [
  { email: 'spm.qa.lite@spokedu.test', plan: 'lite' },
  { email: 'spm.qa.pro@spokedu.test', plan: 'premium' },
];
const logStage = (label) => ({ stage, ok, status, plan }) => {
  console.log(JSON.stringify({ account: label, stage, ok, ...(status ? { status } : {}), ...(plan ? { plan } : {}) }));
};

const browser = await chromium.launch({ headless: true });
try {
  for (const account of accounts) {
    const context = await browser.newContext();
    try {
      const result = await ensureMasterQaAccess(context, baseUrl, {
        email: account.email,
        expectedPlan: account.plan,
        useStorageState: false,
        onDiagnostic: logStage(account.plan),
      });
      console.log(JSON.stringify({
        account: account.plan,
        result: 'PASS',
        status: result.status,
        authenticated: result.authenticated,
        plan: result.plan,
        canUseLibrary: result.canUseLibrary,
      }));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
