import fs from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.SPOKEDU_MASTER_QA_ID || process.env.SPOKEDU_MASTER_QA_EMAIL;
const password = process.env.SPOKEDU_MASTER_QA_PASSWORD || process.env.SPM_QA_PASSWORD;
if (!email || !password) throw new Error('QA login environment variables are missing.');

async function login(page, nextPath) {
  await page.goto(`${base}/login?next=${encodeURIComponent(nextPath)}`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="text"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/spokedu-master\//, { timeout: 90000, waitUntil: 'domcontentloaded' });
}

async function inspectDialog(page, trigger, expectedMaxWidth) {
  await trigger.focus();
  await trigger.evaluate((element) => element.click());
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  const box = await dialog.boundingBox();
  const scrollLocked = await page.evaluate(() => document.body.style.overflow === 'hidden');
  const closeFocused = await page.evaluate(() => document.activeElement?.tagName === 'BUTTON');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  const focusRestored = await trigger.evaluate((element) => document.activeElement === element);
  return {
    width: box?.width ?? null,
    height: box?.height ?? null,
    maxWidthOk: Boolean(box && box.width <= expectedMaxWidth + 1),
    scrollLocked,
    closeFocused,
    escapeClosed: !(await dialog.isVisible()),
    focusRestored,
  };
}

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const desktopPage = await desktop.newPage();
const consoleErrors = [];
const httpErrors = [];
desktopPage.on('console', (message) => {
  if (message.type() === 'error' && !/favicon|devtools|extension/i.test(message.text())) {
    consoleErrors.push(message.text());
  }
});
desktopPage.on('response', (response) => {
  if (response.status() >= 400) {
    httpErrors.push({ status: response.status(), url: response.url() });
  }
});

const artifactDirectory = path.join(process.cwd(), 'qa-artifacts', 'spokedu-master-bottom-sheet');
await fs.mkdir(artifactDirectory, { recursive: true });

let result;
try {
  await login(desktopPage, '/spokedu-master/dashboard');
  await desktopPage.goto(`${base}/spokedu-master/dashboard`, { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForLoadState('networkidle').catch(() => undefined);
  const previewTrigger = desktopPage.locator('[data-weekly-program]').first().locator('button').first();
  const preview = await inspectDialog(desktopPage, previewTrigger, 1160);

  await desktopPage.goto(`${base}/spokedu-master/library`, { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForLoadState('networkidle').catch(() => undefined);
  const documentTrigger = desktopPage.locator('main article').first().locator('button').first();
  const document = await inspectDialog(desktopPage, documentTrigger, 1360);

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  await login(mobilePage, '/spokedu-master/dashboard');
  await mobilePage.goto(`${base}/spokedu-master/dashboard`, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForLoadState('networkidle').catch(() => undefined);
  const recordsTrigger = mobilePage.locator('nav').last().locator('button').last();
  const defaultSheet = await inspectDialog(mobilePage, recordsTrigger, 720);

  result = {
    preview,
    document,
    default: defaultSheet,
    sharedBehavior: {
      escape: [preview, document, defaultSheet].every((item) => item.escapeClosed),
      focusRestore: [preview, document, defaultSheet].every((item) => item.focusRestored),
      scrollLock: [preview, document, defaultSheet].every((item) => item.scrollLocked),
      focusOnOpen: [preview, document, defaultSheet].every((item) => item.closeFocused),
    },
    consoleErrors,
    httpErrors,
  };
  await mobile.close();

  await fs.writeFile(
    path.join(artifactDirectory, 'result.json'),
    JSON.stringify(result, null, 2),
    'utf8',
  );
  console.log(JSON.stringify(result, null, 2));

  const onlyKnownThumbnailFallbacks =
    httpErrors.length > 0 &&
    httpErrors.every(({ status, url }) =>
      status === 404 && /^https:\/\/img\.youtube\.com\/vi\/[^/]+\/maxresdefault\.jpg$/.test(url),
    );
  if (
    !preview.maxWidthOk ||
    !document.maxWidthOk ||
    !defaultSheet.maxWidthOk ||
    !Object.values(result.sharedBehavior).every(Boolean) ||
    (consoleErrors.length > 0 && !onlyKnownThumbnailFallbacks)
  ) {
    process.exitCode = 1;
  }
} finally {
  await desktop.close();
  await browser.close();
}
