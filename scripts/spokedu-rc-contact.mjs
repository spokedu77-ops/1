import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3000';
const NAME = '테스트 문의입니다 - 삭제 가능';

async function run(type) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const apiCalls = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/api\/(private|dispatch|curriculum)\/leads/.test(req.url())) {
      apiCalls.push({ url: req.url(), body: req.postData() });
    }
  });

  await page.goto(`${BASE}/spokedu/contact?type=${type}`, { waitUntil: 'networkidle', timeout: 60000 });

  await page.locator('input[autocomplete="name"]').fill(NAME);
  await page.locator('input[autocomplete="tel"]').fill('010-0000-0001');
  await page.locator('input[placeholder*="서울"]').fill('서울 RC 테스트');
  await page.locator('textarea').first().fill('RC QA 테스트 문의입니다. 삭제 가능.');

  if (type === 'private') {
    await page.getByPlaceholder(/만 8세|초등/).fill('초등 2학년');
    await page.locator('select').nth(0).selectOption('1:1');
    await page.locator('select').nth(1).selectOption('LAB');
  }
  if (type === 'dispatch') {
    await page.getByLabel('기관명').fill('RC 테스트 기관');
    await page.getByLabel('대상 연령').fill('초등');
    await page.getByLabel('예상 인원').fill('25');
    await page.locator('select').last().selectOption('정규수업');
  }
  if (type === 'curriculum') {
    await page.getByLabel(/기관명 또는 소속/).fill('RC 테스트 소속');
    await page.locator('select').nth(0).selectOption('수업안');
    await page.locator('select').nth(1).selectOption('기관 도입');
  }

  const h3 = await page.locator('form h3').innerText();
  const emailReq = await page.locator('input[autocomplete="email"]').evaluate((el) => el.required);

  await page.getByRole('button', { name: '문의 접수하기' }).click();
  await page.waitForTimeout(3500);

  const success = await page.locator('.border-emerald-200').innerText().catch(() => '');
  const error = await page.locator('.border-red-200').innerText().catch(() => '');

  await browser.close();
  return { type, h3, emailRequired: emailReq, apiCalls, success: success.slice(0, 300), error: error.slice(0, 200), mode: apiCalls.length ? 'api' : success ? 'temp-or-ui' : 'fail' };
}

const types = ['private', 'dispatch', 'curriculum'];
const results = [];
for (const t of types) results.push(await run(t));
console.log(JSON.stringify(results, null, 2));
