const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  for (const width of [375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'nextjs-portal { display:none!important; } header, header * { visibility:hidden!important;opacity:0!important;transition:none!important; }' });
    await page.evaluate(async () => { await document.fonts.ready; for (const image of document.images) image.loading = 'eager'; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
    for (const section of await page.locator('main > section').all()) {
      await section.screenshot({ path: `${__dirname}/after/section-${await section.getAttribute('id')}-${width}.png`, animations: 'disabled' });
    }
  }
  await browser.close();
  console.log('Section evidence refreshed without sticky header or development overlay');
})();
