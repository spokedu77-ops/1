import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000/spokedu', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const r = await page.evaluate(() => {
  const section = document.querySelector('[aria-label="현장 운영 증거"]');
  if (!section) return { err: 'no section' };
  return Array.from(section.querySelectorAll('a')).map((a, i) => {
    const img = a.querySelector('img');
    const panel = a.querySelector('[role="img"]');
    const pr = panel?.getBoundingClientRect();
    return {
      i,
      href: a.getAttribute('href'),
      imgSrc: img?.currentSrc || img?.src || null,
      naturalWidth: img?.naturalWidth ?? 0,
      panelHeight: pr?.height ?? 0,
      linkHeight: a.getBoundingClientRect().height,
    };
  });
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
