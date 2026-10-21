/**
 * READ-ONLY stage-2 browser smoke test. Does not use mocks or credentials in this repo.
 * Env: NOTE_V2_BASE_URL=http://localhost:3000
 *      NOTE_V2_STORAGE_STATE=<path-to-local-playwright-storage-state.json>
 * Fails closed if either the test browser or authenticated session is missing.
 * Does NOT certify real Korean IME, all interactions, mobile devices or RLS.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const baseURL = process.env.NOTE_V2_BASE_URL || 'http://localhost:3000';
const statePath = process.env.NOTE_V2_STORAGE_STATE;
if (!statePath || !fs.existsSync(statePath)) {
  console.error('BLOCKED: set NOTE_V2_STORAGE_STATE to an already-authenticated local admin browser state. Never commit or share this file.');
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const mutations = [];
try {
  const context = await browser.newContext({ storageState: statePath, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\/api\/admin\/note\//.test(new URL(request.url()).pathname) && /^(POST|PUT|PATCH|DELETE)$/.test(request.method())) {
      mutations.push(`${request.method()} ${request.url()}`);
    }
  });
  const response = await page.goto(new URL('/admin/note-v2-preview', baseURL).href, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, 'Preview route must be HTTP 200');
  await page.getByTestId('note-v2-blocknote-root').waitFor({ timeout: 20000 });
  const editable = page.locator('.bn-editor [contenteditable="true"]').first();
  await editable.waitFor({ timeout: 20000 });
  const probe = `QA_STAGE2_${Date.now()}_test`;
  await editable.click();
  await page.keyboard.type(probe);
  await page.getByRole('button', { name: '현재 JSON 보기' }).click();
  const raw = await page.getByTestId('note-v2-json-snapshot').innerText();
  const snapshot = JSON.parse(raw);
  assert.equal(snapshot.format, 'spokedu.note.stage2.preview');
  assert(Array.isArray(snapshot.blocks));
  assert(raw.includes(probe), 'Editor keystrokes must appear in the independent JSON view');
  const permitted = new Set(['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'divider']);
  const verifyBlocks = (blocks) => {
    for (const block of blocks) {
      assert(permitted.has(block.type), `Disallowed block found: ${block.type}`);
      verifyBlocks(block.children || []);
    }
  };
  verifyBlocks(snapshot.blocks);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('note-v2-blocknote-root').waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: '현재 JSON 보기' }).click();
  const afterReload = await page.getByTestId('note-v2-json-snapshot').innerText();
  assert(!afterReload.includes(probe), 'Stage-2 intentionally must not silently persist data');
  assert.equal(mutations.length, 0, `Unexpected note API mutations: ${mutations.join(', ')}`);
  assert.equal(errors.length, 0, `Browser JS errors: ${errors.join(', ')}`);
  console.log(JSON.stringify({ verdict: 'BROWSER_SMOKE_PASS_ONLY', previewUrl: page.url(), blockCount: snapshot.blocks.length, noteApiMutations: mutations.length, pageErrors: errors.length, refreshDiscardsDraft: true }, null, 2));
  console.warn('IMPORTANT: Korean IME, toggle UI, drag and mobile QA still require independent manual verification.');
  await context.close();
} finally {
  await browser.close();
}
