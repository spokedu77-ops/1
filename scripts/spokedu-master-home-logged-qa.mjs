/**
 * SPOKEDU MASTER 홈 — 로그인 세션 Playwright 스모크
 *
 * Usage:
 *   SPOKEDU_MASTER_QA_ID=... SPOKEDU_MASTER_QA_PASSWORD=... node scripts/spokedu-master-home-logged-qa.mjs http://localhost:3000
 *
 * Requires: npm i -D playwright (or run from an environment that already has playwright, like spokedu-qa.mjs)
 */
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const QA_ID = process.env.SPOKEDU_MASTER_QA_ID || process.env.SPOKEDU_MASTER_QA_EMAIL || '';
const QA_PASSWORD = process.env.SPOKEDU_MASTER_QA_PASSWORD || '';

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod.chromium;
  } catch {
    console.warn('SKIP: playwright 패키지가 없습니다. `npm i -D playwright` 후 다시 실행하세요.');
    process.exit(0);
  }
}

async function main() {
  if (!QA_ID || !QA_PASSWORD) {
    console.log('SKIP: SPOKEDU_MASTER_QA_ID(또는 _EMAIL) / SPOKEDU_MASTER_QA_PASSWORD 가 없어 로그인 홈 스모크를 건너뜁니다.');
    process.exit(0);
  }

  const chromium = await loadPlaywright();
  const consoleErrors = [];
  let failed = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/favicon|extension|devtools/i.test(text)) return;
    consoleErrors.push(text);
  });

  try {
    await page.goto(`${BASE}/login?next=${encodeURIComponent('/spokedu-master/dashboard')}`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('아이디를 입력하세요').fill(QA_ID);
    await page.getByPlaceholder('비밀번호를 입력하세요').fill(QA_PASSWORD);
    await page.getByRole('button', { name: /로그인/i }).click();
    await page.waitForURL(/\/spokedu-master\/dashboard/, { timeout: 90000, waitUntil: 'domcontentloaded' });

    const mainBg = await page.locator('main').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    const lightOk = /rgb\(245,\s*247,\s*251\)|#f5f7fb/i.test(mainBg);
    console.log(`${lightOk ? 'OK' : 'FAIL'} 라이트 배경: ${mainBg}`);
    if (!lightOk) failed += 1;

    const recommendHeading = page.getByRole('heading', { name: '추천 수업' });
    const hasRecommend = await recommendHeading.count();
    console.log(`${hasRecommend > 0 ? 'OK' : 'FAIL'} 추천 수업 row`);
    if (hasRecommend === 0) failed += 1;

    const previewButton = page.getByRole('button', { name: '빠른 미리보기' }).first();
    if (await previewButton.count()) {
      await previewButton.click();
      const iframe = page.locator('iframe[src*="youtube.com/embed"]');
      const video = page.locator('video[autoplay]');
      const hasIframe = await iframe.count();
      const hasVideo = await video.count();
      if (hasIframe > 0) {
        const src = await iframe.first().getAttribute('src');
        const autoplayOk = src?.includes('autoplay=1') ?? false;
        console.log(`${autoplayOk ? 'OK' : 'FAIL'} 미리보기 YouTube autoplay: ${src ?? '(none)'}`);
        if (!autoplayOk) failed += 1;
      } else if (hasVideo > 0) {
        console.log('OK 미리보기 mp4 autoplay');
      } else {
        console.log('WARN 미리보기 열림 — embed/video 없음(썸네일만일 수 있음)');
      }
      await page.keyboard.press('Escape');
    } else {
      console.log('WARN 빠른 미리보기 버튼 없음 — 히어로 로딩 상태 확인');
    }

    const rowScroll = page.locator('.overflow-x-auto').first();
    if (await rowScroll.count()) {
      const overflow = await rowScroll.evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      const scrollable = overflow.scrollWidth > overflow.clientWidth + 4;
      console.log(`${scrollable ? 'OK' : 'WARN'} 가로 스크롤 row: scroll ${overflow.scrollWidth} / client ${overflow.clientWidth}`);
    }

    const severeConsole = consoleErrors.filter((line) => !/hydration|ResizeObserver/i.test(line));
    console.log(`${severeConsole.length === 0 ? 'OK' : 'FAIL'} 콘솔 error ${severeConsole.length}건`);
    if (severeConsole.length > 0) {
      severeConsole.slice(0, 5).forEach((line) => console.log(`  - ${line}`));
      failed += 1;
    }
  } catch (error) {
    console.error('FAIL', error instanceof Error ? error.message : error);
    failed += 1;
  } finally {
    await browser.close();
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nLogged-in home smoke passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
