import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
await page.goto('http://localhost:3000/spokedu/contact', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const footers = await page.evaluate(() =>
  Array.from(document.querySelectorAll('footer')).map((el, i) => ({
    i,
    className: el.className,
    display: getComputedStyle(el).display,
    visible: el.offsetHeight > 0 && getComputedStyle(el).display !== 'none',
    textStart: el.textContent?.replace(/\s+/g, ' ').trim().slice(0, 100),
    parentTag: el.parentElement?.tagName,
    parentClass: el.parentElement?.className?.slice(0, 60),
  })),
);

console.log(JSON.stringify(footers, null, 2));
await page.screenshot({ path: 'contact-390-footer.png', fullPage: true });
await browser.close();
