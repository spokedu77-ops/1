/**
 * 단일 프로세스 네이버 신규 글 입력·서식·검증 (Phase 5.3 Strategy A + Golden Bold post-pass).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  N1_PROBE_BLOCKS,
  STYLE_SEL,
  prepareToolbarForInsert,
  prepareToolbarForInsertN1,
  readDocumentLogicalStructure,
  readLogicalTextsInOrder,
  readParagraphStylesFromDom,
  verifyN1HeadingModules,
  verifyPhase52Style,
} from './naver-new-style-runner.mjs';
import { dismissRestoreDraftDialog, readBodyParagraphsFromDom } from './naver-new-write-runner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const REPORT_DIR = join(REPO_ROOT, 'reports', 'naver-new');

function norm(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DEVICE_CLASS = {
  desktop: 'se-l-viewport-desktop',
  mobile: 'se-l-viewport-mobile',
  tablet: 'se-l-viewport-tablet',
};

/**
 * @param {import('playwright').Page} page
 * @param {Awaited<ReturnType<typeof loadStyleBlockPlan>>} plan
 */
/**
 * @param {import('playwright').Page} page
 * @param {Awaited<ReturnType<typeof loadStyleBlockPlan>>} plan
 */
export async function renderArticleTitle(page, plan) {
  await dismissRestoreDraftDialog(page);
  const titleLoc = page.locator('.se-section-documentTitle .se-text-paragraph').first();
  const currentTitle = norm(await titleLoc.innerText().catch(() => ''));
  if (currentTitle === norm(plan.title)) {
    await page.locator(STYLE_SEL.bodyParagraph).first().click({ force: true });
    await page.waitForTimeout(200);
    return;
  }
  await titleLoc.click({ force: true });
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText(plan.title);
  await page.locator(STYLE_SEL.bodyParagraph).first().click({ force: true });
  await page.waitForTimeout(200);
}

/**
 * @param {import('playwright').Page} page
 * @param {Awaited<ReturnType<typeof loadStyleBlockPlan>>} plan
 */
export async function renderArticleBodyBlocks(page, plan) {
  const { paragraphs, headingIndexes } = plan;

  const existing = await readBodyParagraphsFromDom(page);
  const existingNorm = existing.map(norm);
  const planNorm = paragraphs.map(norm);
  if (
    existingNorm.length === planNorm.length &&
    existingNorm.every((t, i) => t === planNorm[i])
  ) {
    return { skipped: true, reason: 'body_already_matches_plan' };
  }
  const isPlaceholderParagraph = (t) =>
    !t || /글감과 함께|기록해보세요!/i.test(t);
  const nonPlaceholderExisting = existingNorm.filter((t) => !isPlaceholderParagraph(t));
  if (
    nonPlaceholderExisting.length > 0 &&
    nonPlaceholderExisting.some((t) => !planNorm.includes(t))
  ) {
    const err = new Error(
      'PARTIAL_TAB_CONTENT: 이 탭에 이전 시도 본문이 남아 있습니다. 새 글쓰기 탭에서 다시 실행하세요.',
    );
    err.code = 'PARTIAL_TAB_CONTENT';
    throw err;
  }

  /** @type {import('./naver-new-style-runner.mjs').ToolbarInsertCache} */
  let toolbarCache = {};
  /** @type {Array<{ index: number, role: string, ms: number, phases?: Record<string, number> }>} */
  const blockTimings = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const blockT0 = performance.now();
    /** @type {Record<string, number>} */
    const phases = {};
    const role = headingIndexes.includes(i) ? 'heading' : 'body';
    if (i > 0) {
      const tEnter = performance.now();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      await page.evaluate((idx) => {
        document.querySelectorAll('.se-section-text .se-text-paragraph')[idx]?.scrollIntoView({ block: 'center' });
      }, i);
      await page.locator(STYLE_SEL.bodyParagraph).nth(i).click({ force: true, timeout: 60000 });
      await page.waitForTimeout(80);
      phases.enterFocus = Math.round(performance.now() - tEnter);
    }
    const tToolbar = performance.now();
    toolbarCache = await prepareToolbarForInsert(page, role === 'heading' ? 'heading' : 'body', i, toolbarCache);
    phases.toolbar = Math.round(performance.now() - tToolbar);
    const tInsert = performance.now();
    await page.keyboard.insertText(paragraphs[i]);
    await page.waitForTimeout(50);
    phases.insertText = Math.round(performance.now() - tInsert);
    const count = await page.locator(STYLE_SEL.bodyParagraph).count();
    if (count !== i + 1) {
      const err = new Error(`PARAGRAPH_COUNT_DRIFT at ${i}: got ${count}`);
      err.code = 'PARAGRAPH_COUNT_DRIFT';
      err.blockIndex = i;
      throw err;
    }
    const got = norm(await page.locator(STYLE_SEL.bodyParagraph).nth(i).innerText());
    if (got !== norm(paragraphs[i])) {
      const err = new Error(`TEXT_MISMATCH at block ${i}`);
      err.code = 'TEXT_MISMATCH';
      err.blockIndex = i;
      err.expectedLen = norm(paragraphs[i]).length;
      err.actualLen = got.length;
      throw err;
    }
    blockTimings.push({
      index: i,
      role,
      ms: Math.round(performance.now() - blockT0),
      phases,
    });
  }
  return { skipped: false, blockTimings };
}

/**
 * N1 3블록 프로브 (새 탭 전용).
 * @param {import('playwright').Page} page
 */
export async function renderN1ProbeBlocks(page) {
  /** @type {import('./naver-new-style-runner.mjs').ToolbarInsertCache} */
  let toolbarCache = {};
  const blockTimings = [];

  for (let i = 0; i < N1_PROBE_BLOCKS.length; i++) {
    const blockT0 = performance.now();
    const spec = N1_PROBE_BLOCKS[i];
    const role = spec.role === 'heading' ? 'heading' : 'body';

    if (i > 0) {
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
      const paraCount = await page.locator(STYLE_SEL.bodyParagraph).count();
      const focusIdx = Math.min(i, Math.max(0, paraCount - 1));
      if (paraCount > focusIdx) {
        await page.locator(STYLE_SEL.bodyParagraph).nth(focusIdx).click({ force: true });
      } else {
        await page.locator('.se-content').first().click({ force: true });
      }
      await page.waitForTimeout(80);
    }

    toolbarCache = await prepareToolbarForInsertN1(page, role, i, toolbarCache);
    if (role === 'heading') {
      await page.locator('.se-content').first().click({ force: true });
    }
    await page.keyboard.insertText(spec.text);
    await page.waitForTimeout(50);

    if (role === 'heading') {
      toolbarCache = {
        ...toolbarCache,
        textFormatKind: 'sectionTitle',
        bodyFormat: false,
        fontSize: undefined,
      };
    }

    const texts = (await readLogicalTextsInOrder(page)).map(norm);
    const expected = N1_PROBE_BLOCKS.slice(0, i + 1).map((b) => norm(b.text));
    if (texts.length !== expected.length || !expected.every((t, j) => texts[j] === t)) {
      const err = new Error(`N1_PROBE_TEXT_MISMATCH at ${i}`);
      err.code = 'TEXT_MISMATCH';
      err.blockIndex = i;
      err.actual = texts;
      err.expected = expected;
      err.structure = await readDocumentLogicalStructure(page);
      throw err;
    }

    blockTimings.push({ index: i, role: spec.role, ms: Math.round(performance.now() - blockT0) });
  }

  return { blockTimings };
}

/**
 * @param {import('playwright').Page} page
 * @param {Awaited<ReturnType<typeof loadStyleBlockPlan>>} plan
 */
export async function renderArticleBodyBlocksN1(page, plan) {
  const { paragraphs, headingIndexes } = plan;

  const existing = (await readLogicalTextsInOrder(page)).map(norm);
  const planNorm = plan.paragraphs.map(norm);
  if (existing.length === planNorm.length && existing.every((t, i) => t === planNorm[i])) {
    return { skipped: true, reason: 'body_already_matches_plan' };
  }

  /** @type {import('./naver-new-style-runner.mjs').ToolbarInsertCache} */
  let toolbarCache = {};
  const blockTimings = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const blockT0 = performance.now();
    const phases = {};
    const role = headingIndexes.includes(i) ? 'heading' : 'body';

    if (i > 0) {
      const tEnter = performance.now();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      const paraCount = await page.locator(STYLE_SEL.bodyParagraph).count();
      await page.locator(STYLE_SEL.bodyParagraph).nth(Math.max(0, paraCount - 1)).click({ force: true, timeout: 60000 });
      await page.waitForTimeout(80);
      phases.enterFocus = Math.round(performance.now() - tEnter);
    }

    const tToolbar = performance.now();
    toolbarCache = await prepareToolbarForInsertN1(page, role === 'heading' ? 'heading' : 'body', i, toolbarCache);
    phases.toolbar = Math.round(performance.now() - tToolbar);

    const tInsert = performance.now();
    await page.keyboard.insertText(paragraphs[i]);
    await page.waitForTimeout(50);
    phases.insertText = Math.round(performance.now() - tInsert);

    if (role === 'heading') {
      toolbarCache = {
        ...toolbarCache,
        textFormatKind: 'sectionTitle',
        bodyFormat: false,
        fontSize: undefined,
      };
    }

    const texts = (await readLogicalTextsInOrder(page)).map(norm);
    const expected = planNorm.slice(0, i + 1);
    if (texts.length !== expected.length || !expected.every((t, j) => texts[j] === t)) {
      const err = new Error(`TEXT_MISMATCH at block ${i} (logical)`);
      err.code = 'TEXT_MISMATCH';
      err.blockIndex = i;
      err.actual = texts;
      err.expectedLen = expected.length;
      throw err;
    }

    blockTimings.push({
      index: i,
      role,
      ms: Math.round(performance.now() - blockT0),
      phases,
    });
  }

  return { skipped: false, blockTimings };
}

/** @deprecated use renderArticleTitle + renderArticleBodyBlocks */
export async function renderArticleParagraphs(page, plan) {
  await renderArticleTitle(page, plan);
  await renderArticleBodyBlocks(page, plan);
}

/**
 * @param {import('playwright').Page} page
 * @param {Awaited<ReturnType<typeof loadStyleBlockPlan>>} plan
 */
export async function verifyArticleDomN1(page, plan) {
  const logicalTexts = (await readLogicalTextsInOrder(page)).map(norm);
  const planNorm = plan.paragraphs.map(norm);
  const textMatch =
    logicalTexts.length === planNorm.length && logicalTexts.every((t, i) => t === planNorm[i]);
  const structure = await readDocumentLogicalStructure(page);
  const headingModules = await verifyN1HeadingModules(page, plan);
  const styles = await readParagraphStylesFromDom(page, plan.headingIndexes);
  const bodyStyles = styles.filter((s) => s.role === 'paragraph');
  const bodyFsOk = bodyStyles.every((s) => (s.maxFontPx ?? 99) <= 17);
  const leftOk = styles.every((s) => s.alignClass.some((c) => /left/i.test(c)));
  const centerCount = styles.filter((s) => s.alignClass.some((c) => /center/i.test(c))).length;

  const headingPassCount = headingModules.rows.filter((r) => r.pass).length;

  return {
    pass: textMatch && headingModules.pass && bodyFsOk && leftOk && centerCount === 0,
    inputStrategy: 'n1',
    logicalBlockCount: logicalTexts.length,
    expectedLogicalBlocks: plan.paragraphs.length,
    textMatch,
    headingModules,
    fullBoldHeadings: `${headingPassCount}/${plan.headingIndexes.length}`,
    sourceSha256: plan.sourceSha256,
    bodyFsOk,
    leftOk,
    centerCount,
    structure,
    styles,
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {Awaited<ReturnType<typeof loadStyleBlockPlan>>} plan
 */
export async function verifyArticleDom(page, plan) {
  if (process.env.NAVER_INPUT_STRATEGY === 'n1') {
    return verifyArticleDomN1(page, plan);
  }

  const domTexts = await readBodyParagraphsFromDom(page);
  const styleReport = await verifyPhase52Style(page, plan.paragraphs, plan.headingIndexes);
  const styles = await readParagraphStylesFromDom(page, plan.headingIndexes);
  const paragraphMatch = domTexts.length === plan.paragraphs.length;

  return {
    pass: styleReport.pass && paragraphMatch,
    paragraphCount: domTexts.length,
    expectedParagraphCount: plan.paragraphs.length,
    sourceSha256: plan.sourceSha256,
    styleReport,
    styles,
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {string} outDir
 */
export async function captureDevicePreviews(page, outDir) {
  await mkdir(outDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const shots = {};

  for (const [device, cls] of Object.entries(DEVICE_CLASS)) {
    const ok = await ensureCanvasViewport(page, cls);
    await page.waitForTimeout(500);
    const fileName = `naver-editor-${device}-${date}.png`;
    const path = join(outDir, fileName);
    await page.locator('.se-canvas').first().screenshot({ path, timeout: 60000 }).catch(async () => {
      await page.screenshot({ path, fullPage: false });
    });
    shots[device] = { path: path.replace(/\\/g, '/'), viewportClass: cls, switched: ok };
  }

  return shots;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} targetClass
 */
async function ensureCanvasViewport(page, targetClass) {
  const canvas = page.locator('.se-canvas').first();
  for (let i = 0; i < 6; i++) {
    const cls = await canvas.evaluate((el) => el.className);
    if (cls.includes(targetClass)) return true;
    await page.locator('.se-util-button.__mode-button').first().click({ force: true });
    await page.waitForTimeout(450);
  }
  const finalCls = await canvas.evaluate((el) => el.className);
  return finalCls.includes(targetClass);
}

/**
 * @param {object} payload
 */
export async function writeArticleEditorRunReport(payload) {
  await mkdir(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(REPORT_DIR, `article-editor-run-${stamp}.json`);
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return path;
}
