#!/usr/bin/env node
import nextEnv from '@next/env';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const closureDir = path.join(docsDir, 'closure');
const capDir =
  process.env.CONTACT_E2E_CLOSURE_OUTPUT === '1'
    ? path.join(closureDir, 'captures')
    : path.join(docsDir, 'captures');
const evidencePath =
  process.env.CONTACT_E2E_CLOSURE_OUTPUT === '1'
    ? path.join(closureDir, 'CUSTOMER_QA_EVIDENCE.json')
    : path.join(docsDir, 'CUSTOMER_QA_EVIDENCE.json');
const repoRoot = path.resolve(docsDir, '../../..');
nextEnv.loadEnvConfig(repoRoot);

const port = process.env.CONTACT_QA_PORT ?? '3023';
const base = `http://127.0.0.1:${port}`;

const viewports = [
  { n: '390', w: 390, h: 844 },
  { n: '941', w: 941, h: 861 },
  { n: '1440', w: 1440, h: 900 },
];

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/contact`)).status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error('server timeout');
}

const evidence = { port, BUILD_ID: null, checks: [], journeys: [], overall: 'FAIL' };
let srv;

try {
  await mkdir(capDir, { recursive: true });
  if (process.env.CONTACT_QA_NO_SPAWN !== '1') {
    srv = spawn('npm run start', {
      cwd: repoRoot,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: port },
    });
  }
  await waitServer();
  try {
    evidence.BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();
  } catch {
    evidence.BUILD_ID = null;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(`${base}/contact`, { waitUntil: 'load', timeout: 60000 });
    const probe = await page.evaluate(() => {
      const body = document.body?.innerText ?? '';
      return {
        h1: document.querySelector('h1')?.textContent?.trim(),
        typeCards: document.querySelectorAll('button[type="button"]').length,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        hasPrivacyHint: body.includes('개인정보') || body.includes('처리방침'),
      };
    });
    await page.screenshot({ path: path.join(capDir, `contact-${vp.n}.png`), fullPage: true });
    evidence.checks.push({
      id: `E17-E19-${vp.n}`,
      status: probe.h1 && !probe.overflow ? 'PASS' : 'FAIL',
      probe,
    });
  }

  async function fillPrivateSynthetic(page) {
    await page.getByLabel(/이름/).fill('합성테스트');
    await page.getByLabel(/연락처/).fill('010-0000-0000');
    await page.getByLabel(/이메일/).fill('phase2c.synthetic@spokedu.test');
    await page.getByLabel(/희망 지역/).fill('서울');
    await page.getByLabel(/아이 연령/).fill('만 8세');
    await page.getByLabel(/문의 내용/).fill('Phase2C synthetic');
    await page.getByLabel(/희망 수업 형태/).selectOption('1:1');
    await page.getByLabel(/희망 장소/).selectOption('LAB');
  }

  // validation UI 390
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/contact?type=private`, { waitUntil: 'load' });
  await page.getByRole('button', { name: '상담 접수하기' }).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(capDir, 'contact-validation-390.png'), fullPage: false });

  // synthetic success message (mock route)
  await page.route('**/api/private/leads', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, leadId: 'mock-id' }),
    });
  });
  await page.goto(`${base}/contact?type=private`, { waitUntil: 'load' });
  await fillPrivateSynthetic(page);
  await page.getByRole('button', { name: '상담 접수하기' }).click();
  await page.waitForTimeout(1500);
  const successText = await page.evaluate(() => document.body.innerText.includes('문의가 정상적으로 접수되었습니다'));
  await page.screenshot({ path: path.join(capDir, 'contact-success-synthetic.png'), fullPage: false });
  evidence.checks.push({
    id: 'success-message-synthetic',
    status: successText ? 'PASS' : 'FAIL',
    mock: true,
    note: 'API mocked — not DB PASS',
  });

  await page.unroute('**/api/private/leads');
  await page.route('**/api/private/leads', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });
  await page.goto(`${base}/contact?type=private`, { waitUntil: 'load' });
  await fillPrivateSynthetic(page);
  await page.getByLabel(/이름/).fill('합성실패');
  await page.getByRole('button', { name: '상담 접수하기' }).click();
  await page.waitForTimeout(1500);
  const failProbe = await page.evaluate(() => ({
    failMsg: document.body.innerText.includes('문의가 접수되지 않았습니다'),
    draftHint: document.body.innerText.includes('임시 보관'),
  }));
  await page.screenshot({ path: path.join(capDir, 'contact-failure-retry.png'), fullPage: false });
  evidence.checks.push({ id: 'E12-failure-ui', status: failProbe.failMsg && failProbe.draftHint ? 'PASS' : 'FAIL', mock: true, failProbe });

  // E16 entry paths
  for (const j of [
    { id: 'E16-contact', url: '/contact' },
    { id: 'E16-private', url: '/private#apply' },
    { id: 'E16-education', url: '/education#contact' },
  ]) {
    await page.goto(`${base}${j.url}`, { waitUntil: 'load', timeout: 60000 });
    const ok = await page.evaluate(() => document.body.innerText.length > 200);
    evidence.journeys.push({ ...j, status: ok ? 'PASS' : 'FAIL' });
  }

  // admin login wall capture (synthetic — no credentials)
  await page.goto(`${base}/admin/consult`, { waitUntil: 'load', timeout: 60000 });
  await page.screenshot({ path: path.join(capDir, 'admin-inquiry-synthetic.png'), fullPage: false });
  evidence.checks.push({
    id: 'admin-inquiry-synthetic',
    status: 'NOT_VERIFIED',
    note: 'Unauthenticated admin route — expect login/unauthorized UI only',
  });

  await browser.close();
  const fails = evidence.checks.some((c) => c.status === 'FAIL') || evidence.journeys.some((j) => j.status === 'FAIL');
  evidence.overall = fails ? 'FAIL' : 'PASS';
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ overall: evidence.overall, BUILD_ID: evidence.BUILD_ID }, null, 2));
  if (fails) process.exit(1);
} finally {
  if (srv) srv.kill('SIGTERM');
}
