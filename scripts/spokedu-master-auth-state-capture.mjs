import nextEnv from '@next/env';
import { chromium } from 'playwright';
import {
  assertMasterQaAccess,
  ensureMasterStorageStateDirectory,
} from './lib/spokedu-master-auth-state.mjs';

nextEnv.loadEnvConfig(process.cwd());

const baseUrl = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const storageStatePath = await ensureMasterStorageStateDirectory();
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/spokedu-master/login?next=${encodeURIComponent('/spokedu-master/library')}`, {
    waitUntil: 'domcontentloaded',
  });
  console.log('Complete MASTER passwordless login in the opened browser. Tokens will not be printed.');

  const deadline = Date.now() + 5 * 60_000;
  let accessSnapshot = null;
  while (Date.now() < deadline) {
    try {
      accessSnapshot = await assertMasterQaAccess(context, baseUrl);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  if (!accessSnapshot) throw new Error('MASTER passwordless login was not completed within 5 minutes.');

  await context.storageState({ path: storageStatePath });
  console.log(JSON.stringify({
    ok: true,
    storageStatePath,
    access: accessSnapshot,
    secretOrTokenLogged: false,
  }));
} finally {
  await browser.close();
}
