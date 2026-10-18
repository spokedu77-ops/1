#!/usr/bin/env node
import { chromium } from 'playwright';

const envs = [
  { name: 'production', base: 'https://spokedu.kr' },
  { name: 'local', base: 'http://127.0.0.1:3018' },
];

const browser = await chromium.launch();
const out = [];

for (const env of envs) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${env.base}/contact`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(8000);
  await page.locator('#contact-type-select').scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => ({
    hasForm: Boolean(document.querySelector('form')),
    typeButtons: document.querySelectorAll('#contact-type-select button[type="button"]').length,
  }));
  const privateBtn = page.locator('#contact-type-select button', { hasText: '개인·소그룹' }).first();
  if (await privateBtn.count()) await privateBtn.click();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    const form = document.querySelector('form');
    const name = document.querySelector('input[placeholder*="이름"], input[name="name"]');
    const submit = document.querySelector('button[type="submit"]');
    return {
      hasForm: Boolean(form),
      hasName: Boolean(name),
      hasSubmit: Boolean(submit),
      bodyHasSubmit: (document.body.innerText ?? '').includes('상담 접수'),
    };
  });
  await page.route('**/api/**', (r) => (r.request().method() === 'POST' ? r.abort() : r.continue()));
  if (after.hasSubmit) {
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(600);
  }
  const validation = await page.evaluate(() => ({
    invalid: document.querySelectorAll(':invalid').length,
    text: document.body.innerText.includes('필수') || document.body.innerText.includes('입력'),
  }));
  out.push({ env: env.name, before, after, validation });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(out, null, 2));
