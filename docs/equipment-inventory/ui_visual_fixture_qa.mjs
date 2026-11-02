#!/usr/bin/env node
/**
 * Visual fixture QA — real browser, no auth, no DB. VISUAL_FIXTURE_QA_PASS only.
 * Requires: EQUIPMENT_INVENTORY_VISUAL_FIXTURE=1 + next dev
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLocalQaTarget, installLocalQaRouteGuard } from '../../scripts/lib/qa-network-guard.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.UI_QA_BASE_URL || 'http://127.0.0.1:3000';
assertLocalQaTarget(BASE);
const FIXTURE = `${BASE}/dev/equipment-inventory-visual-fixture`;
const OUT_DIR = path.join(__dirname, 'ui_final_qa_screenshots');

export async function runVisualFixtureQa(log = defaultLog) {
  const results = [];
  const record = (section, status, detail = '') => {
    results.push({ section, status, detail });
    log(section, status, detail);
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const probe = await fetch(`${FIXTURE}?scenario=normal`).catch(() => null);
  if (!probe?.ok) {
    record('fixture_route', 'FAIL', 'EQUIPMENT_INVENTORY_VISUAL_FIXTURE=1 로 dev 재시작 필요');
    return { results, pass: false };
  }
  record('fixture_route', 'PASS', FIXTURE);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await installLocalQaRouteGuard(page.context());

  try {
    for (const scenario of ['normal', 'opening', 'drift', 'empty', 'mismatch']) {
      await page.goto(`${FIXTURE}?scenario=${scenario}`, { waitUntil: 'networkidle', timeout: 60_000 });
      await page.waitForSelector('[data-fixture-scenario]', { timeout: 15_000 });
      const body = (await page.textContent('body')) ?? '';
      if (scenario === 'mismatch') {
        record(`fixture_${scenario}_banner`, body.includes('일치하지 않') ? 'PASS' : 'FAIL', 'mismatch');
      } else if (scenario === 'empty') {
        record(`fixture_${scenario}`, body.includes('등록된 교구가 없습니다') ? 'PASS' : 'FAIL', 'empty');
      } else if (scenario === 'opening') {
        record(`fixture_${scenario}`, body.includes('미입력') && body.includes('재고 입력') ? 'PASS' : 'FAIL', 'opening');
      } else if (scenario === 'drift') {
        record(`fixture_${scenario}`, body.includes('캐시 불일치') ? 'PASS' : 'FAIL', 'drift');
      } else {
        const thead = (await page.locator('thead').first().textContent()) ?? '';
        for (const col of ['창고재고', '대여 중', '대여 가능', '관리']) {
          record(`fixture_normal_col_${col}`, thead.includes(col) ? 'PASS' : 'FAIL', col);
        }
      }
    }

    const viewports = [
      ['desktop_1440', 1440, 900, 'normal'],
      ['width_1024', 1024, 800, 'normal'],
      ['tablet_768', 768, 900, 'normal'],
      ['mobile_375', 375, 812, 'normal'],
    ];
    for (const [name, w, h, scenario] of viewports) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${FIXTURE}?scenario=${scenario}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      const file = path.join(OUT_DIR, `fixture_${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      record(`screenshot_${name}`, 'PASS', path.basename(file));
      if (w >= 1024) {
        const tables = await page.locator('table').count();
        record(`layout_table_${name}`, tables > 0 ? 'PASS' : 'FAIL', `tables=${tables}`);
      } else {
        const cards = await page.locator('article.rounded-2xl').count();
        record(`layout_cards_${name}`, cards > 0 ? 'PASS' : 'FAIL', `cards=${cards}`);
      }
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${FIXTURE}?scenario=modals`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '대여 모달' }).click();
    await page.getByRole('dialog').waitFor({ timeout: 5000 });
    await page.screenshot({ path: path.join(OUT_DIR, 'fixture_modal_rent.png'), fullPage: false });
    record('fixture_modal_rent', 'PASS', 'fixture_modal_rent.png');
    await page.getByRole('button', { name: '취소' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5000 });
    await page.getByRole('button', { name: '재고 입력' }).click();
    await page.getByLabel('창고에 있는 수량').waitFor({ timeout: 5000 });
    await page.screenshot({ path: path.join(OUT_DIR, 'fixture_modal_stock_input.png'), fullPage: false });
    record('fixture_modal_stock_input', 'PASS', 'fixture_modal_stock_input.png');
    await page.getByRole('button', { name: '취소' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5000 });
    await page.getByRole('button', { name: '반납' }).first().click();
    await page.getByText('대여 건').waitFor({ timeout: 5000 });
    await page.screenshot({ path: path.join(OUT_DIR, 'fixture_modal_return_multi.png') });
    record('fixture_modal_return', 'PASS', 'multi rental select');

    record('visual_fixture_summary', 'PASS', 'VISUAL_FIXTURE_QA_PASS');
  } catch (e) {
    record('visual_fixture_fatal', 'FAIL', e.message);
  } finally {
    await browser.close();
  }

  const pass = !results.some((r) => r.status === 'FAIL');
  return { results, pass };
}

function defaultLog(section, status, detail) {
  console.log(`${status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○'} [${section}] ${status}${detail ? `: ${detail}` : ''}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runVisualFixtureQa().then(({ pass }) => process.exit(pass ? 0 : 1));
}
