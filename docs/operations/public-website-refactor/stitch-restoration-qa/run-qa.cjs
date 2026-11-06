/* Local-only rendered evidence. Blocks all writes and deployed app/image requests. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const root = process.cwd();
const out = path.join(root, 'docs/operations/public-website-refactor/stitch-restoration-qa');
const refRoot = path.join(root, 'docs/operations/public-website-refactor/contract-draft/sources/b0-extracted/stitch-unpacked/stitch_editorial_website_redesign');
const routes = [
  ['home', '/', 'home_spomove'], ['private', '/private', 'private_lesson_spomove'],
  ['education', '/education', 'education_programs_spomove'], ['about', '/about', 'about_spomove'],
  ['spomove', '/spomove', 'spomove_system_spomove'],
];
const widths = [390, 768, 1024, 1440, 1920];
const cached = process.argv.includes('--reuse-reference') ? JSON.parse(fs.readFileSync(path.join(out, 'rendered.json'), 'utf8')).pages : [];
const report = { pages: [], browserErrors: [], blockedWrites: 0, contact: [], accessibility: [], outside: [] };
const checkpoint = () => fs.writeFileSync(path.join(out, 'rendered.json'), JSON.stringify(report, null, 2));
const guard = async route => {
  const req = route.request();
  const url = new URL(req.url());
  if (req.method() !== 'GET') { report.blockedWrites++; return route.abort(); }
  if (url.hostname === 'spokedu.kr' || url.hostname.endsWith('.spokedu.kr') || url.hostname.endsWith('.vercel.app')) return route.abort();
  return route.continue();
};
async function ready(page) {
  await page.locator('img').evaluateAll(imgs => imgs.forEach(img => { img.loading = 'eager'; }));
  await page.evaluate(() => Promise.race([
    Promise.all([...document.images].map(img => img.decode().catch(() => {}))).then(() => document.fonts.ready),
    new Promise(resolve => setTimeout(resolve, 10000)),
  ]));
}
async function data(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const h1 = main.querySelector('h1');
    const css = getComputedStyle(h1);
    return {
      title: document.title, h1: h1.textContent.trim(), h1Count: main.querySelectorAll('h1').length,
      type: { size: css.fontSize, weight: css.fontWeight, line: css.lineHeight, spacing: css.letterSpacing, family: css.fontFamily },
      overflow: document.documentElement.scrollWidth > innerWidth,
      sections: [...main.querySelectorAll('section')].map(e => ({ id: e.id, paddingTop: getComputedStyle(e).paddingTop, paddingBottom: getComputedStyle(e).paddingBottom })),
      images: [...main.querySelectorAll('img')].map(e => ({ src: e.getAttribute('src'), currentSrc: e.currentSrc.replace(location.origin, ''), alt: e.getAttribute('alt'), loaded: e.complete && e.naturalWidth > 0, fit: getComputedStyle(e).objectFit, position: getComputedStyle(e).objectPosition })),
      anchorsMissing: [...main.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a => a.hash),
      links: [...document.querySelectorAll('a[href]')].map(e => e.getAttribute('href')),
      metricClipping: [...main.querySelectorAll('dl[aria-label] dd')].filter(e => { const a=e.getBoundingClientRect(), b=e.parentElement.getBoundingClientRect(); return a.left < b.left - 1 || a.right > b.right + 1; }).map(e => e.textContent),
    };
  });
}
async function platformFonts(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'main h1' });
  const result = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  await cdp.detach();
  return result.fonts;
}
(async () => {
  fs.mkdirSync(path.join(out, 'after'), { recursive: true });
  fs.mkdirSync(path.join(out, 'reference'), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    await context.route('**/*', guard);
    const current = await context.newPage();
    current.on('pageerror', e => report.browserErrors.push(e.message));
    const reference = await context.newPage();
    for (const width of widths) {
      await current.setViewportSize({ width, height: 1000 });
      await reference.setViewportSize({ width, height: 1000 });
      for (const [name, route, directory] of routes) {
        const response = await current.goto('http://127.0.0.1:3000' + route, { waitUntil: 'domcontentloaded' });
        await ready(current);
        await current.addStyleTag({ content: 'nextjs-portal { display:none !important }' });
        const actual = await data(current);
        actual.fonts = await platformFonts(current);
        await current.screenshot({ path: path.join(out, 'after', name + '-' + width + '.png'), fullPage: true });
        let original = cached.find(row => row.name === name && row.width === width)?.original;
        if (!original) {
          await reference.setContent(fs.readFileSync(path.join(refRoot, directory, 'code.html'), 'utf8'), { waitUntil: 'load', timeout: 30000 });
          await ready(reference);
          original = await data(reference);
          await reference.screenshot({ path: path.join(out, 'reference', name + '-' + width + '.png'), fullPage: true });
        }
        report.pages.push({ name, route, width, status: response.status(), actual, original });
        console.log(name, width, response.status(), 'overflow=' + actual.overflow, 'images=' + actual.images.every(x => x.loaded));
        fs.writeFileSync(path.join(out, 'rendered.json'), JSON.stringify(report, null, 2));
      }
    }

    // Current routes remain available; do not submit to a real API.
    for (const type of ['private', 'dispatch', 'spomove']) {
      for (const ok of [true, false]) {
        const isolated = await browser.newContext({ ignoreHTTPSErrors: true });
        const page = await isolated.newPage();
        const requests = [];
        await isolated.route('**/*', async route => {
          const req = route.request();
          if (req.method() === 'GET') return guard(route);
          if (/\/api\/(private|dispatch)\/leads/.test(req.url())) {
            const payload = req.postDataJSON();
            requests.push({ endpoint: new URL(req.url()).pathname, type: payload.type, consent: payload.privacy_consent, programs: payload.programs, source: payload.source, acquisition: payload.acquisition });
            return route.fulfill({ status: ok ? 200 : 500, contentType: 'application/json', body: JSON.stringify(ok ? { ok: true } : { ok: false, error: 'LOCAL_QA_MOCK' }) });
          }
          return route.abort();
        });
        await page.goto('http://127.0.0.1:3000/' + (type === 'private' ? 'private?classType=small-group&utm_source=stitch-local-qa#apply' : type === 'dispatch' ? 'education?proposal=true&utm_source=stitch-local-qa#inquiry' : 'spomove?operation=SPOMOVE&utm_source=stitch-local-qa#inquiry'), { waitUntil: 'domcontentloaded' });
        await page.locator('#inquiry a[href="/contact?type=' + type + '"]').click();
        await page.waitForURL(url => url.pathname === '/contact' && url.searchParams.get('type') === type);
        await page.waitForTimeout(150);
        const fields = page.locator('form input,form textarea,form select');
        for (let i = 0; i < await fields.count(); i++) {
          const e = fields.nth(i);
          if (!await e.isVisible() || !await e.isEditable()) continue;
          const info = await e.evaluate(x => ({ tag: x.tagName, type: x.type, placeholder: x.placeholder, options: x.tagName === 'SELECT' ? [...x.options].map(o => o.value).filter(Boolean) : [] }));
          if (info.type === 'checkbox') continue;
          if (info.tag === 'SELECT') { if (info.options.length) await e.selectOption(info.options[0]); continue; }
          let value = info.type === 'email' ? 'audit@example.invalid' : info.type === 'tel' || /010|0000/.test(info.placeholder || '') ? '01000000000' : info.type === 'number' ? '10' : 'LOCAL_QA';
          if (info.tag === 'TEXTAREA') value = 'LOCAL QA mocked request only';
          if (['text', 'tel', 'email', 'number', 'textarea'].includes(info.type)) await e.fill(value);
        }
        await page.locator('button[type=submit]').click();
        const noConsentRequestCount = requests.length;
        await page.locator('#contact-privacy-consent').check();
        await page.locator('button[type=submit]').click();
        await page.waitForTimeout(200);
        report.contact.push({ type, response: ok ? 'success' : 'failure', noConsentRequestCount, requests, draft: await page.evaluate(() => !!localStorage.getItem('spokedu.contact.inquiries.temp')), formReset: !await page.locator('#contact-privacy-consent').isChecked() });
        checkpoint();
        await isolated.close();
      }
    }

    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:3000/private#apply', { waitUntil: 'domcontentloaded' });
    report.apply = await page.locator('#apply').evaluate(e => ({ exists: true, y: e.getBoundingClientRect().top }));
    const menu = page.getByRole('button', { name: /메뉴/ }).first();
    if (await menu.count()) {
      await menu.click();
      report.menu = { expanded: await menu.getAttribute('aria-expanded') };
      await page.keyboard.press('Escape');
      report.menu.escapeClosed = await menu.getAttribute('aria-expanded') === 'false';
      report.menu.focusRestored = await menu.evaluate(e => e === document.activeElement);
    }
    try {
      await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js' });
      for (const [, route] of routes) {
        await page.goto('http://127.0.0.1:3000' + route, { waitUntil: 'domcontentloaded' });
        await ready(page);
        await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js' });
        const result = await page.evaluate(async () => window.axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
        report.accessibility.push({ route, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: result.incomplete.map(x => x.id) });
        checkpoint();
      }
    } catch (e) { report.accessibilityError = e.message; }
    for (const route of ['/records', '/records/dongjak-spomove', '/contact', '/partners', '/spomat', '/spomove/catalog', '/spokedu-lab', '/admin']) {
      try {
        const response = await page.goto('http://127.0.0.1:3000' + route, { waitUntil: 'domcontentloaded', timeout: 10000 });
        report.outside.push({ route, status: response.status(), finalPath: new URL(page.url()).pathname, title: await page.title() });
      } catch (e) { report.outside.push({ route, status: 'BLOCKED', reason: e.message.slice(0,180) }); }
      checkpoint();
    }
    fs.writeFileSync(path.join(out, 'rendered.json'), JSON.stringify(report, null, 2));
    const rows = report.pages.map(row => '<h2>' + row.name + ' · ' + row.width + 'px</h2><div class="pair"><figure><figcaption>Original Stitch HTML</figcaption><img loading="lazy" src="reference/' + row.name + '-' + row.width + '.png"></figure><figure><figcaption>Local implementation</figcaption><img loading="lazy" src="after/' + row.name + '-' + row.width + '.png"></figure></div>').join('');
    fs.writeFileSync(path.join(out, 'comparison.html'), '<!doctype html><html><meta charset="utf-8"><title>Stitch restoration rendered comparison</title><style>body{font:14px sans-serif;background:#eef1f6;margin:24px}h2{margin-top:48px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}figure{margin:0;background:white;padding:10px}img{width:100%;height:auto}figcaption{padding:8px;font-weight:bold}</style><h1>Stitch / local · 5 routes × 5 widths</h1><p>Source mockup imagery and fictional claims are reference only. Approved content, common chrome and withheld photos differ. Image exceptions are not a visual PASS.</p>' + rows + '</html>');
    console.log('QA evidence complete');
  } finally { await browser.close(); }
})().catch(e => { fs.writeFileSync(path.join(out, 'rendered-error.txt'), e.stack); console.error(e.stack); process.exitCode = 1; });
