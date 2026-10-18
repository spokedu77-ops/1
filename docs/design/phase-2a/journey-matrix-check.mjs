#!/usr/bin/env node
import { chromium } from 'playwright';

async function journeys(base, env) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const rows = [];

  const go = async (id, fn) => {
    try {
      rows.push({ id, env, ...(await fn()) });
    } catch (e) {
      rows.push({ id, env, status: 'FAIL', note: String(e.message).slice(0, 200) });
    }
  };

  await go('J01', async () => {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    const vis = page.locator('a[href="/private"]:visible').first();
    if (await vis.count()) await vis.click();
    else await page.goto(`${base}/private`);
    await page.waitForTimeout(2000);
    return { status: page.url().includes('/private') ? 'PASS' : 'FAIL', url: page.url() };
  });

  await go('J02', async () => {
    await page.goto(`${base}/private`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const ok = await page.evaluate(() => document.body.innerText.includes('1:1과 소그룹'));
    return { status: ok ? 'PASS' : 'FAIL', url: page.url() };
  });

  await go('J03', async () => {
    await page.goto(`${base}/private`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.locator('a[href="/contact"]:visible, a[href="#apply"]').first().click({ timeout: 5000 }).catch(async () => {
      await page.goto(`${base}/contact`);
    });
    await page.waitForTimeout(1500);
    return { status: page.url().includes('/contact') || page.url().includes('#apply') ? 'PASS' : 'PARTIAL', url: page.url() };
  });

  await go('J04', async () => {
    await page.goto(`${base}/spomove`, { waitUntil: 'domcontentloaded' });
    return { status: page.url().includes('/spomove') ? 'PASS' : 'FAIL', url: page.url() };
  });

  await go('J05', async () => {
    await page.goto(`${base}/spomove/catalog`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const d = await page.evaluate(() => ({
      fallback: document.body.innerText.includes('전체 카탈로그를 아직 표시할 수 없습니다'),
      iframe: Boolean(document.querySelector('iframe')),
    }));
    const status = d.iframe ? 'PASS' : d.fallback ? 'PARTIAL' : 'FAIL';
    return { status, url: page.url(), detail: d };
  });

  await go('J06', async () => {
    await page.goto(`${base}/spomove/catalog`, { waitUntil: 'domcontentloaded' });
    const link = page.locator('a:has-text("기관 도입")').first();
    await link.click();
    await page.waitForTimeout(1500);
    return { status: page.url().includes('contact') ? 'PASS' : 'PARTIAL', url: page.url() };
  });

  await go('J07', async () => {
    await page.goto(`${base}/contact`, { waitUntil: 'domcontentloaded' });
    return { status: page.url().includes('/contact') ? 'PASS' : 'FAIL', url: page.url() };
  });

  await go('J08', async () => {
    await page.goto(`${base}/contact`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.locator('#contact-type-select button').first().click();
    await page.waitForTimeout(400);
    const ok = await page.evaluate(() => Boolean(document.querySelector('form button[type="submit"]')));
    return { status: ok ? 'PASS' : 'FAIL', url: page.url() };
  });

  await go('J09', async () => {
    await page.route('**/api/**', (r) => (r.request().method() === 'POST' ? r.abort() : r.continue()));
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    const v = await page.evaluate(() => document.querySelectorAll(':invalid').length);
    return { status: v > 0 ? 'PASS' : 'PARTIAL', detail: { invalid: v }, note: 'POST blocked; no prod submit' };
  });

  await go('J10', async () => {
    const t = await page.evaluate(() => document.body.innerText);
    return {
      status: t.includes('010-') || t.includes('spokedu') ? 'PASS' : 'PARTIAL',
      detail: { hasPhone: t.includes('010-'), hasEmail: t.includes('@') },
    };
  });

  await browser.close();
  return rows;
}

const prod = await journeys('https://spokedu.kr', 'production');
const local = await journeys('http://127.0.0.1:3018', 'local');
console.log(JSON.stringify({ production: prod, local }, null, 2));
