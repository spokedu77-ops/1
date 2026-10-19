#!/usr/bin/env node
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { stabilizePublicPage } from '../../scripts/capture-page-utils.mjs';
import { ROUTE_QA, WIDTHS, SPOT_CHECKS, expectedPrimaryTextLeft } from './gate-a-qa-config.mjs';
import { buildMeasurePayload } from './gate-a-measure-lib.mjs';
import { assessContactFlow } from './gate-a-contact-flow.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const foundation = path.join(here, '..');
const repo = path.resolve(here, '../../../../..');
const outJson = process.env.GATE_A_OUT_JSON ?? path.join(foundation, 'WIDTH_QA.json');
const progressPath = path.join(foundation, 'WIDTH_QA.progress.jsonl');
const port = process.env.GATE_A_PORT ?? '3072';
const base = `http://127.0.0.1:${port}`;
const spotMode = process.env.GATE_A_SPOT === '1';
const ALIGN_TOLERANCE = 1.5;

function resolveMatrix() {
  if (!spotMode) {
    return ROUTE_QA.flatMap((cfg) => WIDTHS.map((viewport) => ({ cfg, viewport })));
  }
  const pairs = [];
  for (const spot of SPOT_CHECKS) {
    const cfg = ROUTE_QA.find((r) => r.route === spot.route);
    if (!cfg) continue;
    for (const viewport of spot.widths) pairs.push({ cfg, viewport });
  }
  return pairs;
}

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/`)).status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('server timeout');
}

function classifyFailureKind(cfg, failReasons, m) {
  if (failReasons.includes('cta_not_usable') && m.ctaFailureKind === 'selector_miss') return 'QA_SELECTOR_ERROR';
  if (failReasons.includes('alignment_delta')) return 'QA_MEASUREMENT_ERROR';
  if (failReasons.includes('contact_flow')) return 'REAL_INTERACTION_DEFECT';
  if (failReasons.some((r) => r.startsWith('contact_'))) return 'REAL_INTERACTION_DEFECT';
  return 'UNRESOLVED';
}

let srv;
let serverPid = null;
const matrix = resolveMatrix();
const results = [];
const runStarted = Date.now();

try {
  let buildId = '';
  try {
    buildId = (await readFile(path.join(repo, '.next', 'BUILD_ID'), 'utf8')).trim();
  } catch {
    buildId = 'unknown';
  }

  if (spotMode) {
    await writeFile(progressPath, '');
  }

  srv = spawn('npm run start', { cwd: repo, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  serverPid = srv.pid;
  await waitServer();
  const browser = await chromium.launch();
  const measureFn = buildMeasurePayload();

  for (const cfg of ROUTE_QA) {
    const routeStart = Date.now();
    let routePass = 0;
    let routeFail = 0;
    const routePairs = matrix.filter((p) => p.cfg.route === cfg.route);
    if (!routePairs.length) continue;

    for (const { viewport } of routePairs) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: viewport, height: 900 });
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(String(err)));

      await stabilizePublicPage(page, `${base}${cfg.route}`);

      let contactPayload = null;
      if (cfg.contactFlow) {
        contactPayload = await assessContactFlow(page);
      }

      const m = await page.evaluate(measureFn, {
        railSelectors: cfg.railSelectors,
        ctaSelectors: cfg.ctaSelectors,
        textSelectors: cfg.textSelectors,
        useTextAnchor: cfg.useTextAnchor,
        skipGenericCta: cfg.skipGenericCta,
        foldPrimaryVisible: cfg.foldPrimaryVisible,
        firstScreenSelector: cfg.firstScreenSelector ?? null,
      });

      const expectedLeft = expectedPrimaryTextLeft(cfg, viewport);
      const actualLeft =
        cfg.alignmentMode === 'lab-nav'
          ? (m.railContentLeft ?? m.primaryTextLeft)
          : (m.primaryTextLeft ?? m.railContentLeft);
      const alignmentDelta = actualLeft != null ? Math.abs(actualLeft - expectedLeft) : null;
      const alignmentPass =
        m.alignmentFound && actualLeft != null && alignmentDelta != null && alignmentDelta <= ALIGN_TOLERANCE;

      let ctaUsable = cfg.contactFlow ? contactPayload.contactPass : m.ctaUsable;
      let ctaFailureKind = cfg.contactFlow ? contactPayload.ctaFailureKind : m.ctaFailureKind;
      let ctaBox = m.ctaBox;
      let ctaSelectorMatched = m.ctaSelectorMatched;

      if (cfg.scrollBeforeCta) {
        await page.locator(cfg.scrollBeforeCta).scrollIntoViewIfNeeded().catch(() => undefined);
        await page.waitForTimeout(200);
        const ctaLoc = page.locator(cfg.ctaSelectors[0]).first();
        const visible = await ctaLoc.isVisible().catch(() => false);
        const box = await ctaLoc.boundingBox().catch(() => null);
        ctaUsable = visible && !!box && box.width >= 24 && box.height >= 24;
        ctaFailureKind = ctaUsable ? null : 'not_usable';
        ctaSelectorMatched = cfg.ctaSelectors[0];
        ctaBox = box ? { x: box.x, y: box.y, w: box.width, h: box.height } : null;
      }

      const errors = [...pageErrors, ...m.pageErrors];
      const pass =
        alignmentPass &&
        !m.horizontalOverflow &&
        m.h1Visible &&
        m.firstScreenOk &&
        ctaUsable &&
        m.pendingImages === 0 &&
        errors.length === 0 &&
        (!cfg.foldPrimaryVisible || m.foldPrimaryVisible);

      const failReasons = [];
      if (!m.alignmentFound || actualLeft == null) failReasons.push('rail_missing');
      if (alignmentDelta != null && alignmentDelta > ALIGN_TOLERANCE) failReasons.push('alignment_delta');
      if (m.horizontalOverflow) failReasons.push('horizontal_overflow');
      if (!m.h1Visible) failReasons.push('h1_not_visible');
      if (!m.firstScreenOk) failReasons.push('first_screen_empty');
      if (!ctaUsable) failReasons.push(cfg.contactFlow ? 'contact_flow' : 'cta_not_usable');
      if (m.pendingImages > 0) failReasons.push('images_pending');
      if (errors.length) failReasons.push('page_errors');
      if (cfg.foldPrimaryVisible && !m.foldPrimaryVisible) failReasons.push('fold_primary_hidden');

      const row = {
        route: cfg.route,
        viewport,
        measure: cfg.measure,
        alignmentMode: cfg.alignmentMode,
        expectedPrimaryTextLeft: expectedLeft,
        actualPrimaryTextLeft: actualLeft,
        alignmentDeltaPx: alignmentDelta,
        alignmentPass,
        horizontalOverflow: m.horizontalOverflow,
        h1Visible: m.h1Visible,
        firstScreenOk: m.firstScreenOk,
        foldPrimaryVisible: m.foldPrimaryVisible,
        ctaUsable,
        ctaFailureKind,
        ctaSelectorMatched,
        textSelectorMatched: m.textSelectorMatched,
        ctaBox,
        pendingImages: m.pendingImages,
        pageErrors: errors,
        failReasons,
        failureClass: pass ? null : classifyFailureKind(cfg, failReasons, { ...m, ctaFailureKind }),
        contact: contactPayload,
        pass,
      };
      results.push(row);
      if (pass) routePass += 1;
      else routeFail += 1;
      await page.close();
    }

    const elapsed = ((Date.now() - routeStart) / 1000).toFixed(1);
    console.log(`route ${cfg.route} completed pass=${routePass} fail=${routeFail} elapsed=${elapsed}s`);
    await appendFile(
      progressPath,
      `${JSON.stringify({ route: cfg.route, pass: routePass, fail: routeFail, elapsedSec: elapsed, at: new Date().toISOString() })}\n`,
    );
  }

  await browser.close();

  const payload = {
    capturedAt: new Date().toISOString(),
    gitHead: process.env.GATE_A_HEAD ?? 'unknown',
    buildId,
    port,
    serverPid,
    spotMode,
    totalChecks: results.length,
    passCount: results.filter((r) => r.pass).length,
    failCount: results.filter((r) => !r.pass).length,
    elapsedMs: Date.now() - runStarted,
    results,
  };

  if (!spotMode) {
    await writeFile(outJson, JSON.stringify(payload, null, 2));
  } else {
    await writeFile(path.join(foundation, 'WIDTH_QA_SPOT.json'), JSON.stringify(payload, null, 2));
  }

  console.log(
    JSON.stringify(
      { ok: payload.failCount === 0, pass: payload.passCount, fail: payload.failCount, spotMode, out: spotMode ? 'WIDTH_QA_SPOT.json' : outJson },
      null,
      2,
    ),
  );
  if (payload.failCount) process.exitCode = 1;
} finally {
  if (srv) {
    if (process.platform === 'win32') {
      spawnSync(`taskkill /PID ${srv.pid} /T /F`, { shell: true, stdio: 'ignore' });
    } else {
      srv.kill('SIGTERM');
    }
  }
}
