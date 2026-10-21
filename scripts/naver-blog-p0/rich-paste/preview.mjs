#!/usr/bin/env node
/**
 * SPOKEDU FINAL article -> ONE unsaved Naver Smart Editor rich-paste preview.
 * Never saves or publishes; never modifies or closes existing tabs.
 * Uses the verified FINAL article validation and the proven 3-block HTML clipboard technique.
 *
 * cd scripts/naver-blog-p0/rich-paste && npm install --ignore-scripts
 * NAVER_CDP_URL=http://127.0.0.1:9222 npm run preview -- --article-id=9fad3d9e6f847f36
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { convert, getHtmlClipboardScript } from '@jjlabsio/md-to-naver-blog';
import { loadStyleBlockPlan, applyLeftAlignIfNeeded } from '../naver-new-style-runner.mjs';
import {
  FINAL_EXPECTED_SHA256,
  finalMarkdownPath,
  finalNaverInputJsonPath,
  parseArticleForNaver,
  sha256Text,
} from '../naver-article-pipeline.mjs';

const ARTICLE_ID = process.argv.find((x) => x.startsWith('--article-id='))?.split('=')[1] ?? '';
const CDP_URL = process.env.NAVER_CDP_URL || 'http://127.0.0.1:9222';
const POST_WRITE_URL = 'https://blog.naver.com/PostWriteForm.naver?blogId=spokedu77';
const REPORT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'reports', 'naver-new', 'rich-paste');
const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
const report = { articleId: ARTICLE_ID, startedAt: new Date().toISOString(), result: 'NOT_RUN',
  saveDraftExecuted: false, publishExecuted: false, existingTabModified: false };
let page;
const now = () => performance.now();
const t0 = now();
const norm = (s) => String(s ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function abort(code, detail = '') {
  const error = new Error(detail || code);
  error.code = code;
  throw error;
}

async function restoreDialogCancelOnly(page) {
  const popup = page.locator('.se-popup-alert-confirm:visible').first();
  if (!(await popup.isVisible().catch(() => false))) return false;
  const info = await popup.evaluate((el) => ({
    text: (el.innerText || '').slice(0, 600),
    buttons: [...el.querySelectorAll('button')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()),
  }));
  report.restorePopup = info;
  if (!/작성 중|작성하던|작성했던|임시저장|불러오|복원|이어쓰기|이어서 작성|이전.{0,15}글/.test(info.text)) {
    abort('UNKNOWN_POPUP', '복원 팝업이 아닌 확인창이므로 자동 조작하지 않습니다.');
  }
  const cancel = popup.getByRole('button', { name: '취소', exact: true });
  if (await cancel.count() !== 1) abort('NO_UNIQUE_RESTORE_CANCEL');
  await cancel.click({ timeout: 3000 });
  await popup.waitFor({ state: 'hidden', timeout: 3000 });
  report.restoreCancelled = true;
  return true;
}

function markdownFromPlan(plan) {
  return plan.blocks.map((b) => {
    if (b.type === 'heading' || b.role === 'heading') return `## ${b.text}`;
    return b.text;
  }).join('\n\n');
}

/**
 * Preserve the already-proven rich HTML markup, but explicitly request a left
 * alignment for each textual block. Smart Editor may sanitize inline CSS;
 * in that case the normal editor alignment toolbar is used as a fallback.
 * Never mutate the Naver document directly or drop the heading tags/styles.
 */
function leftAlignClipboardHtml(html) {
  let changed = 0;
  const result = html.replace(/<(p|h[1-6])(\s[^<>]*?)?>/gi, (whole, tag, attrs = '') => {
    changed += 1;
    if (/\bstyle\s*=\s*(["'])/i.test(attrs)) {
      const updated = attrs.replace(/\bstyle\s*=\s*(["'])(.*?)\1/i, (_, quote, css) => {
        const withoutAlign = css.replace(/(?:^|;)\s*text-align\s*:[^;]*/gi, '');
        return `style=${quote}${withoutAlign};text-align:left !important;${quote}`;
      });
      return `<${tag}${updated}>`;
    }
    return `<${tag}${attrs} style="text-align:left !important;">`;
  });
  return { html: result, changed };
}

function paragraphAlignmentFailures(verification) {
  return verification.actual
    .map((p, i) => ({ index: i, text: p.text.slice(0, 75), align: p.align,
      className: p.className, alignChain: p.alignChain }))
    .filter((p) => p.align !== 'left' && p.align !== 'start');
}

/**
 * Only align the exact, previously verified paragraph sequence. This is a
 * block-level editor command, not a text range/bold operation. After any
 * corrections caller re-verifies 19 texts and all 3 bold headings.
 */
async function correctNonLeftParagraphs(page, verification, plan) {
  const failures = paragraphAlignmentFailures(verification);
  const actions = [];
  const editorParagraphs = page.locator('.se-canvas .se-section-text .se-text-paragraph');
  const editorCount = await editorParagraphs.count();
  if (editorCount !== plan.paragraphs.length ||
      verification.actualCount !== plan.paragraphs.length) {
    return { status: 'SKIPPED_STRUCTURE_UNSAFE', editorCount,
      failures: failures.map(({index,align,className}) => ({index,align,className})), actions };
  }
  for (const candidate of failures) {
    // Never click after text has changed or an unexpected module was introduced.
    const before = await verifyVisibleDocument(page, plan);
    if (!before.textMatch ||
        !before.headingResults.every((h) => h.textMatch && h.fullBold) ||
        before.actualCount !== 19) {
      return { status: 'STOPPED_INTEGRITY_CHANGED', actions };
    }
    const sameText = norm(await editorParagraphs.nth(candidate.index).innerText().catch(() => '')) ===
      norm(plan.paragraphs[candidate.index]);
    if (!sameText) {
      return { status: 'STOPPED_TARGET_NOT_MATCHED', index: candidate.index, actions };
    }
    try {
      const result = await applyLeftAlignIfNeeded(page, { paragraphIndex: candidate.index });
      actions.push({ index: candidate.index, code: result.code,
        alignedBefore: candidate.align, classesBefore: candidate.className });
    } catch (error) {
      actions.push({ index: candidate.index, error: String(error.message || error).slice(0, 300),
        code: error.code || 'UNEXPECTED' });
      return { status: 'STOPPED_TOOLBAR_FAILURE', actions };
    }
  }
  return { status: 'COMPLETE', actions };
}

async function readBodyDocument(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.se-canvas');
    const candidates = canvas ? [...canvas.querySelectorAll('.se-section-text .se-text-paragraph, .se-sectionTitle .se-text-paragraph')] : [];
    const seen = new Set();
    const paragraphs = candidates.filter((node) => {
      if (seen.has(node) || !node.getClientRects().length) return false;
      seen.add(node); return true;
    }).map((node) => {
      const text = (node.innerText || '').trim();
      const leaves = [];
      const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) {
        const leaf = walk.currentNode;
        if (!(leaf.textContent || '').trim()) continue;
        const el = leaf.parentElement;
        const css = getComputedStyle(el);
        leaves.push({ text: leaf.textContent, weight: css.fontWeight, fontSize: css.fontSize,
          boldTag: Boolean(el.closest('b,strong')) });
      }
      const css = getComputedStyle(node);
      const alignChain = [];
      for (let e = node, depth = 0; e && depth < 4; e = e.parentElement, depth++) {
        alignChain.push({ tag: e.tagName.toLowerCase(), className: String(e.className || '').slice(0, 140),
          computed: getComputedStyle(e).textAlign, inline: e.style?.textAlign || null });
      }
      return { text, align: css.textAlign, className: node.className,
        alignChain, leaves, fullBold: leaves.length > 0 && leaves.every((leaf) => leaf.boldTag || Number(leaf.weight) >= 600) };
    }).filter((p) => p.text);
    return { canvas: Boolean(canvas), paragraphs };
  });
}

async function verifyVisibleDocument(page, plan) {
  const actual = await readBodyDocument(page);
  const expectedTexts = plan.paragraphs.map(norm);
  const actualTexts = actual.paragraphs.map((p) => norm(p.text));
  const textMatch = expectedTexts.length === actualTexts.length &&
    expectedTexts.every((v, i) => v === actualTexts[i]);
  const headingResults = plan.headingIndexes.map((i) => ({
    index: i, textMatch: expectedTexts[i] === actualTexts[i],
    fullBold: actual.paragraphs[i]?.fullBold ?? false,
    fontSizes: actual.paragraphs[i]?.leaves.map((v) => v.fontSize) ?? [],
  }));
  // Rendered CSS is authoritative. A left alignment class with computed
  // 'center' must NOT be reported as PASS.
  const leftAligned = actual.paragraphs.every((p) => p.align === 'left' || p.align === 'start');
  const alignmentFailures = actual.paragraphs.map((p, i) => ({index: i, align: p.align,
    className: p.className})).filter((p) => p.align !== 'left' && p.align !== 'start');
  return { canvas: actual.canvas, expectedCount: expectedTexts.length,
    actualCount: actualTexts.length, textMatch, headingResults, leftAligned,
    alignmentFailures, actualTexts, actual: actual.paragraphs };
}

try {
  if (!/^[a-f0-9]{16}$/i.test(ARTICLE_ID)) abort('ARTICLE_ID_REQUIRED', '16자리 article-id가 필요합니다.');
  // loadStyleBlockPlan validates the FINAL article but currently does not return its
  // parsed blocks (it reads local.package?.blocks, while Phase 5 returns only copy).
  // Recover heading roles from the SHA-verified FINAL Markdown, NOT from the empty
  // plan.blocks array or the fallback hard-coded heading positions.
  const basePlan = await loadStyleBlockPlan(ARTICLE_ID);
  const inputPackage = JSON.parse(await readFile(finalNaverInputJsonPath(ARTICLE_ID), 'utf8'));
  const finalMdPath = inputPackage.source || finalMarkdownPath(ARTICLE_ID);
  const finalMd = (await readFile(finalMdPath, 'utf8')).replace(/\r\n/g, '\n');
  const actualSha = sha256Text(finalMd);
  if (actualSha !== FINAL_EXPECTED_SHA256 || inputPackage.source_sha256 !== FINAL_EXPECTED_SHA256) {
    abort('FINAL_SOURCE_SHA_MISMATCH', `FINAL source mismatch: ${actualSha}`);
  }
  const parsedFinal = parseArticleForNaver(finalMd);
  const headingIndexes = parsedFinal.blocks.flatMap((b, i) => b.type === 'heading' ? [i] : []);
  const expectedHeadings = headingIndexes.length;
  const textMatches = parsedFinal.blocks.length === basePlan.paragraphs.length &&
    parsedFinal.blocks.every((b, i) => norm(b.text) === norm(basePlan.paragraphs[i]));
  if (basePlan.paragraphs.length !== 19 || parsedFinal.blocks.length !== 19 ||
      expectedHeadings !== 3 || !textMatches || norm(parsedFinal.title) !== norm(basePlan.title)) {
    abort('UNEXPECTED_FINAL_STRUCTURE',
      `FINAL ${parsedFinal.blocks.length}블록·${expectedHeadings}소제목, plan ${basePlan.paragraphs.length}문단, textMatch=${textMatches}`);
  }
  const plan = { ...basePlan, blocks: parsedFinal.blocks, headingIndexes };
  report.sourceSha256 = actualSha;
  report.expected = { title: plan.title, paragraphs: plan.paragraphs.length,
    headingIndexes, headings: headingIndexes.map((i) => plan.paragraphs[i]) };
  const md = markdownFromPlan(plan);
  const rendered = convert(md);
  if (rendered.errors?.length || !rendered.html) abort('MARKDOWN_CONVERSION_FAILED', JSON.stringify(rendered.errors));
  const clipboardBody = leftAlignClipboardHtml(rendered.html);
  report.clipboardAlignment = { injectedTextBlocks: clipboardBody.changed,
    note: 'p/h heading tags retain original formatting; left alignment is additive' };
  report.convertedHtmlBytes = Buffer.byteLength(clipboardBody.html, 'utf8');
  report.timing = { loadedAndConvertedMs: Math.round(now() - t0) };

  if (process.argv.includes('--offline')) {
    report.result = 'LOCAL_CONVERSION_PASS';
  } else {
    const ping = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(3000) });
    if (!ping.ok) abort('CDP_HTTP_UNAVAILABLE', String(ping.status));
    const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 10000 });
    const context = browser.contexts()[0];
    if (!context) abort('NO_EXISTING_BROWSER_CONTEXT');
    report.browserConnectedMs = Math.round(now() - t0);
    page = await context.newPage(); // never touch existing tabs
    await page.goto(POST_WRITE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    report.pageUrl = page.url();
    if (!report.pageUrl.startsWith('https://blog.naver.com/PostWriteForm.naver')) abort('NAVER_AUTH_REQUIRED');
    await restoreDialogCancelOnly(page);
    const title = page.locator('.se-section-documentTitle .se-text-paragraph').first();
    const para = page.locator('.se-section-text .se-text-paragraph').first();
    await para.waitFor({ state: 'visible', timeout: 8000 });
    await restoreDialogCancelOnly(page);
    // Avoid modifying any restored content, even in the new tab.
    const before = await readBodyDocument(page);
    if (!before.canvas || before.paragraphs.some((b) => b.text && !/글감과 함께 나의 일상을 기록해보세요/.test(b.text))) {
      abort('FRESH_TAB_NOT_EMPTY');
    }
    // The title is an empty Smart Editor ONE module, not a native <input>.
    // V4 clicked a nested <p> with force:true and used Ctrl+A, which left
    // the placeholder "제목" untouched. The actual title wrapper is .se-title-text
    // (used by an independent Smart Editor ONE title-automation reference).
    // Never issue Ctrl+A on an unfocused editor, never blindly retype.
    const titleWrapper = page.locator('.se-title-text').first();
    const emptyTitle = (text) => !norm(text) || norm(text) === '제목';
    const titleMatches = async () => norm(await title.innerText().catch(() => '')) === norm(plan.title);
    const captureTitle = async (label) => {
      const state = await page.evaluate(() => {
        const p = document.querySelector('.se-section-documentTitle .se-text-paragraph');
        const wrap = document.querySelector('.se-title-text');
        const active = document.activeElement;
        return {
          paragraphText: (p?.innerText || '').slice(0, 180),
          paragraphHtml: (p?.outerHTML || '').slice(0, 1100),
          wrapperText: (wrap?.innerText || '').slice(0, 180),
          wrapperHtml: (wrap?.outerHTML || '').slice(0, 650),
          activeTag: active?.tagName || null,
          activeClass: String(active?.className || '').slice(0, 150),
          selectionText: String(window.getSelection?.()?.toString() || '').slice(0, 80),
        };
      });
      report.titleDiagnostics.snapshots.push({label, ...state});
      return state;
    };
    report.titleDiagnostics = {expected: plan.title, attempts: [], snapshots: []};
    const beforeTitle = await captureTitle('before');
    if (!emptyTitle(beforeTitle.paragraphText)) {
      abort('TITLE_NOT_EMPTY', '기존 제목이 있어 새 제목으로 덮어쓰지 않습니다.');
    }
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {origin: 'https://blog.naver.com'});

    // Only try a second method if the first left both title and body unchanged.
    const methods = [
      {name: 'title_wrapper_insert_text', locator: titleWrapper, input: async () => {
        await page.keyboard.insertText(plan.title);
      }},
      {name: 'title_wrapper_plain_paste', locator: titleWrapper, input: async () => {
        await page.evaluate(async (text) => navigator.clipboard.writeText(text), plan.title);
        await page.keyboard.press('Control+V');
      }},
      {name: 'title_paragraph_plain_paste', locator: title, input: async () => {
        await page.evaluate(async (text) => navigator.clipboard.writeText(text), plan.title);
        await page.keyboard.press('Control+V');
      }},
    ];
    let titleSucceeded = await titleMatches();
    for (const method of methods) {
      if (titleSucceeded) break;
      const attempt = {method: method.name};
      report.titleDiagnostics.attempts.push(attempt);
      try {
        if (!(await method.locator.isVisible().catch(() => false))) {
          attempt.result = 'TARGET_NOT_VISIBLE';
          continue;
        }
        // Natural pointer click, not force:true: the editor must receive
        // real focus/selection events before text insertion.
        await method.locator.click({timeout: 3000});
        attempt.focus = await page.evaluate(() => ({
          tag: document.activeElement?.tagName || '',
          cls: String(document.activeElement?.className || '').slice(0, 120),
        }));
        await method.input();
      } catch (e) {
        attempt.error = String(e?.message || e).slice(0, 500);
      }
      // Bound DOM settling; never treat a 3.5-second timeout as the cause.
      await page.waitForFunction((expected) => {
        const p = document.querySelector('.se-section-documentTitle .se-text-paragraph');
        const n = (s) => String(s ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        return n(p?.innerText) === n(expected);
      }, plan.title, {timeout: 1200, polling: 100}).catch(() => {});
      const state = await captureTitle(`after_${method.name}`);
      const current = norm(state.paragraphText);
      titleSucceeded = current === norm(plan.title);
      attempt.titleAfter = current;
      attempt.result = titleSucceeded ? 'TITLE_ENTERED' : (attempt.result || 'UNCHANGED');
      if (titleSucceeded) break;
      // If a click aimed at the title accidentally wrote into the body, stop;
      // do not append text a second time or risk corrupting this new tab.
      const bodyState = await readBodyDocument(page);
      const dirtyBody = bodyState.paragraphs.filter((b) =>
        b.text && !/글감과 함께 나의 일상을 기록해보세요/.test(b.text));
      if (dirtyBody.length) {
        report.titleDiagnostics.unexpectedBody = dirtyBody.map((b) => b.text.slice(0, 160));
        abort('TITLE_TARGET_WRONG_MODULE', '제목 입력 중 본문에 문자가 들어가 재시도를 중단합니다.');
      }
      if (!emptyTitle(current)) {
        abort('TITLE_PARTIAL_INPUT', `부분 제목 발견: ${JSON.stringify(current.slice(0, 160))}`);
      }
    }
    report.titleDiagnostics.matches = titleSucceeded;
    if (!titleSucceeded) {
      abort('TITLE_INPUT_FAILED', '제목 입력 3가지 안전한 방법 모두 실패. titleDiagnostics에 실제 DOM·포커스 기록.');
    }
    // The next clipboard write contains HTML for the body; the preceding
    // title clipboard content is never used as body input.
    await page.evaluate(getHtmlClipboardScript(clipboardBody.html));
    report.timing.titleAndClipboardMs = Math.round(now() - t0);
    await restoreDialogCancelOnly(page);
    // Explicitly set the fresh EMPTY body paragraph to left alignment before
    // the single proven rich paste. No previous content is selected or changed.
    try {
      report.prePasteAlign = await applyLeftAlignIfNeeded(page, { paragraphIndex: 0 });
    } catch (error) {
      report.prePasteAlign = { code: error.code || 'ALIGN_SETUP_FAILED',
        error: String(error.message || error).slice(0, 400) };
    }
    // Only target the previously verified empty test tab. No forced click through popups.
    await restoreDialogCancelOnly(page);
    await para.click({ timeout: 3500 });
    await page.keyboard.press('Control+V');
    await page.waitForTimeout(500);
    report.timing.pasteMs = Math.round(now() - t0);
    report.verification = await verifyVisibleDocument(page, plan);
    report.timing.firstVerifyMs = Math.round(now() - t0);
    // Alignment is the only identified remaining styling issue. Reuse the
    // existing editor toolbar for only the non-left blocks when integrity is intact.
    const initial = report.verification;
    if (initial.textMatch && initial.headingResults.every((h) => h.textMatch && h.fullBold) &&
        !initial.leftAligned) {
      report.alignmentFix = await correctNonLeftParagraphs(page, initial, plan);
      await page.waitForTimeout(180);
      report.verification = await verifyVisibleDocument(page, plan);
    }
    report.timing.verifyMs = Math.round(now() - t0);
    const screenshot = join(REPORT_DIR, `article-preview-${stamp}.png`);
    await mkdir(REPORT_DIR, { recursive: true });
    await page.screenshot({ path: screenshot, timeout: 4000 });
    report.screenshot = screenshot;
    const v = report.verification;
    report.result = v.textMatch && v.headingResults.every((h) => h.textMatch && h.fullBold) && v.leftAligned
      ? 'RICH_PASTE_PREVIEW_PASS' : 'RICH_PASTE_PREVIEW_PARTIAL';
    report.note = '새 테스트 탭에 미저장 상태. 임시저장·발행하지 않음. 시각 검수 전 최종 승인 불가.';
  }
} catch (error) {
  report.result = 'RICH_PASTE_PREVIEW_ERROR';
  report.code = error.code || 'UNEXPECTED';
  report.error = String(error.message || error);
  if (page && !page.isClosed()) {
    report.pageUrl = page.url();
    try {
      const screenshot = join(REPORT_DIR, `preview-error-${stamp}.png`);
      await mkdir(REPORT_DIR, { recursive: true });
      await page.screenshot({ path: screenshot, timeout: 3000 });
      report.screenshot = screenshot;
    } catch { /* no screenshot if browser disconnected */ }
  }
} finally {
  report.timing ??= {};
  report.timing.totalMs = Math.round(now() - t0);
  await mkdir(REPORT_DIR, { recursive: true });
  const reportPath = join(REPORT_DIR, `article-preview-${stamp}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ result: report.result, reportPath, timing: report.timing,
    code: report.code ?? null, error: report.error ?? null,
    titleMatches: report.titleDiagnostics?.matches ?? null,
    titleAttempts: report.titleDiagnostics?.attempts?.map(a => ({method:a.method, result:a.result, titleAfter:a.titleAfter, error:a.error})),
    activeTitleFocus: report.titleDiagnostics?.snapshots?.at(-1)?.activeTag,
    paragraphCount: report.verification?.actualCount,
    textMatch: report.verification?.textMatch,
    headings: report.verification?.headingResults,
    leftAligned: report.verification?.leftAligned,
    alignmentFailures: report.verification?.alignmentFailures,
    prePasteAlign: report.prePasteAlign,
    alignmentFix: report.alignmentFix,
    saveDraftExecuted: false, publishExecuted: false }, null, 2));
  // CDP websocket may remain open; explicitly terminate only this Node client.
  // Deliberately never close pre-existing Chrome tabs, browser, or this unsaved preview tab.
  process.exit(['RICH_PASTE_PREVIEW_PASS', 'LOCAL_CONVERSION_PASS'].includes(report.result) ? 0 : 2);
}
