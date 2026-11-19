import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { assertLocalQaTarget, installLocalQaRouteGuard } from './qa-network-guard.mjs';

/** Current public routes. Presentation values belong to the site, not this smoke check. */
const ROUTES = ['/', '/education', '/private', '/spomove', '/records', '/about', '/contact'];
const WIDTHS = [390, 1440];

export async function runPublicQa(args = process.argv.slice(2)) {
  const base = assertLocalQaTarget(args.find(arg => /^https?:/.test(arg)) ?? process.env.SPOKEDU_QA_ORIGIN ?? 'http://127.0.0.1:3000');
  const selected = args.filter(arg => arg.startsWith('--route=')).map(arg => arg.slice(8));
  if (selected.some(route => !ROUTES.includes(route))) throw new Error(`Supported routes: ${ROUTES.join(', ')}`);
  const widths = args.filter(arg => arg.startsWith('--width=')).map(arg => Number(arg.slice(8)));
  if (widths.some(width => !Number.isInteger(width) || width < 320 || width > 2560)) throw new Error('Width must be 320–2560.');
  const plan = { baseUrl: base.origin, routes: selected.length ? [...new Set(selected)] : ROUTES, widths: widths.length ? [...new Set(widths)] : WIDTHS };
  if (args.includes('--list')) { console.log(JSON.stringify(plan, null, 2)); return; }
  const directory = path.join(process.cwd(), '.qa-spokedu', 'public-current');
  await mkdir(directory, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), ...plan, checks: [], blockedRequests: [], visualApproval: 'not assessed', limitations: ['No form submission, authentication, payment or database-write coverage.', 'Only the selected public routes and viewports were exercised.'] };
  let browser;
  try {
    try { browser = await chromium.launch({ headless: true }); }
    catch { browser = await chromium.launch({ channel: 'chrome', headless: true }); }
    const context = await browser.newContext();
    report.blockedRequests = await installLocalQaRouteGuard(context);
    for (const width of plan.widths) for (const route of plan.routes) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => {
        const message = error.message.replace(/\u0000+/g, '[NUL]').slice(0, 2000);
        if (!errors.includes(message)) errors.push(message);
      });
      const check = { route, width, ok: false };
      try {
        await page.setViewportSize({ width, height: 900 });
        const response = await page.goto(new URL(route, base.origin).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
        if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? 'no response'}`);
        if (new URL(page.url()).pathname !== route) throw new Error(`Unexpected redirect: ${new URL(page.url()).pathname}`);
        await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 20000 });
        await page.evaluate(() => document.fonts.ready);
        const measure = async () => page.evaluate(() => {
          const main = document.querySelector('main');
          const h1 = main?.querySelector('h1');
          const rect = h1?.getBoundingClientRect();
          return {
            mainCount: document.querySelectorAll('main').length,
            headerCount: document.querySelectorAll('[data-spokedu-global-header="true"]').length,
            footerCount: document.querySelectorAll('[data-spokedu-global-footer="true"]').length,
            headingCount: main?.querySelectorAll('h1').length ?? 0,
            headingText: h1?.textContent?.trim() ?? '',
            headingWidth: rect?.width ?? 0,
            overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          };
        });
        // Give hydration, fonts and responsive layout a bounded chance to settle.
        let metrics = await measure();
        for (let attempt = 0; metrics.overflow && attempt < 4; attempt++) {
          await page.waitForTimeout(250); metrics = await measure();
        }
        Object.assign(check, metrics);
        if (metrics.mainCount !== 1 || metrics.headerCount !== 1 || metrics.footerCount !== 1 || metrics.headingCount !== 1 || !metrics.headingText || metrics.headingWidth <= 0 || metrics.overflow) throw new Error('Landmark, heading visibility or horizontal overflow check failed.');
        // Exercise the real mobile disclosure without freezing labels, classes or item counts.
        if (width < 768) {
          const trigger = page.locator('header button[aria-controls="mobile-nav-panel"]');
          if (await trigger.count() !== 1 || !await trigger.isVisible()) throw new Error('Mobile navigation trigger unavailable.');
          await trigger.click();
          await page.waitForFunction(() => document.querySelector('button[aria-controls="mobile-nav-panel"]')?.getAttribute('aria-expanded') === 'true');
          await page.locator('#mobile-nav-panel').waitFor({ state: 'visible' });
          const links = await page.locator('#mobile-nav-panel a[href]').evaluateAll(items => items.map(item => ({ href: item.getAttribute('href'), text: item.textContent?.trim() || item.getAttribute('aria-label') })));
          if (!links.length || links.some(link => !link.href || !link.text)) throw new Error('Mobile navigation contains unusable links.');
          await page.keyboard.press('Escape');
          await page.locator('#mobile-nav-panel').waitFor({ state: 'hidden' });
          if (await trigger.getAttribute('aria-expanded') !== 'false') throw new Error('Mobile navigation failed to reset.');
          check.mobileMenu = 'open/Escape-close checked';
        }
        if (errors.length) throw new Error(errors.join('; '));
        check.ok = true;
      } catch (error) { check.error = error.message; check.pageErrors = errors; }
      if (args.includes('--capture') || !check.ok) {
        const file = `${route === '/' ? 'home' : route.slice(1)}-${width}.png`;
        await page.screenshot({ path: path.join(directory, file), fullPage: true }).catch(() => {});
        check.screenshot = file;
      }
      report.checks.push(check);
      await page.close();
    }
  } catch (error) { report.setupError = error.message; }
  finally {
    await browser?.close();
    report.ok = !report.setupError && report.checks.length === plan.widths.length * plan.routes.length && report.checks.every(check => check.ok);
    await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}
