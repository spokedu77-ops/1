/**
 * 네이버 PostWriteForm 진입 — 상태 분류·짧은 폴링·실패 시 진단( URL / 스크린샷 ).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BLOG_ID, WRITE_URL, dismissRestoreDraftDialog, SEL } from './naver-new-write-runner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, '..', '..', 'reports', 'naver-new');

/** Phase 5.3 성공 경로 — 제목 입력은 .se-text-paragraph */
export const TITLE_INPUT_SEL = '.se-section-documentTitle .se-text-paragraph';
export const TITLE_READ_SEL = '.se-section-documentTitle .se-title-text, .se-section-documentTitle .se-text-paragraph';
export const EDITOR_READY_SEL = [
  '.se-canvas',
  '.se-section-documentTitle',
  '.se-section-text .se-text-paragraph',
];

const SHORT_MS = Number(process.env.NAVER_ENTRY_POLL_MS || 800);
const MAX_POLLS = Number(process.env.NAVER_ENTRY_MAX_POLLS || 15);

/**
 * @typedef {'AUTH_REQUIRED'|'EDITOR_READY'|'RESTORE_DIALOG'|'SELECTOR_CHANGED'|'NAVIGATION_FAILED'|'PROFILE_LOCKED'|'UNKNOWN'} EditorEntryCode
 */

/**
 * @param {import('playwright').Page | import('playwright').Frame} root
 */
export async function probeEditorDom(root) {
  return root.evaluate(() => {
    const q = (sel) => document.querySelectorAll(sel).length;
    const titleText = q('.se-section-documentTitle .se-title-text');
    const titlePara = q('.se-section-documentTitle .se-text-paragraph');
    const bodyPara = q('.se-section-text .se-text-paragraph');
    const canvas = q('.se-canvas');
    const saveBtn = [...document.querySelectorAll('button')].filter((b) => (b.innerText || '').trim() === '저장').length;
    return {
      titleText,
      titlePara,
      bodyPara,
      canvas,
      saveBtn,
      hasDocumentTitle: !!document.querySelector('.se-section-documentTitle'),
      hasSectionText: !!document.querySelector('.se-section-text'),
      iframeCount: document.querySelectorAll('iframe').length,
      contentEditableCount: document.querySelectorAll('[contenteditable="true"]').length,
    };
  });
}

/**
 * @param {import('playwright').Page} page
 */
export async function resolveEditorRoot(page) {
  const top = await probeEditorDom(page);
  if (top.bodyPara >= 1 && top.hasDocumentTitle) {
    return { root: page, surface: 'top', dom: top };
  }

  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    const url = frame.url();
    if (!url || url === 'about:blank') continue;
    try {
      const dom = await probeEditorDom(frame);
      if (dom.bodyPara >= 1 && dom.hasDocumentTitle) {
        return { root: frame, surface: 'frame', frameUrl: url, dom };
      }
    } catch {
      /* cross-origin */
    }
  }

  try {
    const handle = await page.locator('#mainFrame').elementHandle({ timeout: SHORT_MS }).catch(() => null);
    if (handle) {
      const frame = await handle.contentFrame();
      if (frame) {
        const dom = await probeEditorDom(frame);
        if (dom.bodyPara >= 1 && dom.hasDocumentTitle) {
          return { root: frame, surface: 'mainFrame', frameUrl: frame.url(), dom };
        }
        return { root: frame, surface: 'mainFrame_pending', frameUrl: frame.url(), dom };
      }
    }
  } catch {
    /* ignore */
  }

  return { root: page, surface: 'top', dom: top };
}

/**
 * @param {import('playwright').Page} page
 */
export async function classifyEntryState(page) {
  const url = page.url();
  const pageTitle = await page.title().catch(() => '');

  if (/nid\.naver\.com|signin|login|passport/i.test(url)) {
    return { code: 'AUTH_REQUIRED', url, pageTitle, detail: 'login_url' };
  }

  const restoreVisible = await page
    .getByText('작성 중인 글이 있습니다')
    .isVisible()
    .catch(() => false);
  if (restoreVisible) {
    return { code: 'RESTORE_DIALOG', url, pageTitle, detail: 'draft_restore_prompt' };
  }

  if (!/PostWriteForm\.naver|blog\.naver\.com/i.test(url)) {
    return { code: 'NAVIGATION_FAILED', url, pageTitle, detail: 'unexpected_url' };
  }

  const resolved = await resolveEditorRoot(page);
  const { dom } = resolved;

  if (dom.canvas >= 1 && dom.bodyPara >= 1 && (dom.titleText >= 1 || dom.titlePara >= 1)) {
    return {
      code: 'EDITOR_READY',
      url,
      pageTitle,
      surface: resolved.surface,
      frameUrl: resolved.frameUrl || null,
      dom,
      titleInputSelector: dom.titlePara >= 1 ? TITLE_INPUT_SEL : SEL.title,
    };
  }

  if (dom.hasDocumentTitle || dom.hasSectionText) {
    return {
      code: 'SELECTOR_CHANGED',
      url,
      pageTitle,
      surface: resolved.surface,
      dom,
      detail: 'partial_editor_chrome',
    };
  }

  const bodyHasLogin = await page
    .locator('text=로그인')
    .first()
    .isVisible()
    .catch(() => false);
  if (bodyHasLogin && dom.bodyPara === 0) {
    return { code: 'AUTH_REQUIRED', url, pageTitle, detail: 'login_ui_visible' };
  }

  return { code: 'UNKNOWN', url, pageTitle, surface: resolved.surface, dom };
}

/**
 * @param {import('playwright').Page} page
 * @param {string} [tag]
 */
export async function writeEntryDiagnostics(page, tag = 'entry-fail') {
  await mkdir(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = join(REPORT_DIR, `${tag}-${stamp}`);
  const state = await classifyEntryState(page);
  const resolved = await resolveEditorRoot(page);

  const payload = {
    capturedAt: new Date().toISOString(),
    tag,
    state,
    resolved: {
      surface: resolved.surface,
      frameUrl: resolved.frameUrl || null,
      dom: resolved.dom,
    },
    selectorsCompared: {
      phase5_wait: SEL.title,
      phase53_titleInput: TITLE_INPUT_SEL,
      body: SEL.body,
    },
  };

  await writeFile(`${base}.json`, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
  return { jsonPath: `${base}.json`, pngPath: `${base}.png`, state };
}

/**
 * @param {import('playwright').Page} page
 * @param {{ allowRestoreDismiss?: boolean }} [opts]
 * @returns {Promise<{ code: EditorEntryCode, page: import('playwright').Page, editorRoot: import('playwright').Page | import('playwright').Frame, titleInputSelector: string, diagnostics?: object }>}
 */
export async function waitForWriteEditorReady(page, opts = {}) {
  const allowRestoreDismiss = opts.allowRestoreDismiss !== false;

  for (let i = 0; i < MAX_POLLS; i++) {
    const state = await classifyEntryState(page);

    if (state.code === 'RESTORE_DIALOG' && allowRestoreDismiss) {
      await dismissRestoreDraftDialog(page);
      await page.waitForTimeout(400);
      continue;
    }

    if (state.code === 'AUTH_REQUIRED') {
      const diag = await writeEntryDiagnostics(page, 'auth-required');
      const err = new Error('AUTH_REQUIRED: 네이버 로그인이 필요합니다. --mode=auth-setup 으로 전용 프로필에 1회 로그인하세요.');
      err.code = 'AUTH_REQUIRED';
      err.diagnostics = diag;
      throw err;
    }

    if (state.code === 'EDITOR_READY') {
      const resolved = await resolveEditorRoot(page);
      return {
        code: 'EDITOR_READY',
        page,
        editorRoot: resolved.root,
        titleInputSelector: state.titleInputSelector || TITLE_INPUT_SEL,
        dom: state.dom,
      };
    }

    if (state.code === 'SELECTOR_CHANGED' || state.code === 'UNKNOWN') {
      await page.waitForTimeout(SHORT_MS);
      continue;
    }

    if (state.code === 'NAVIGATION_FAILED') {
      const diag = await writeEntryDiagnostics(page, 'navigation-failed');
      const err = new Error(`NAVIGATION_FAILED: ${state.url}`);
      err.code = 'NAVIGATION_FAILED';
      err.diagnostics = diag;
      throw err;
    }

    await page.waitForTimeout(SHORT_MS);
  }

  const diag = await writeEntryDiagnostics(page, 'entry-timeout');
  const err = new Error(
    `SELECTOR_CHANGED: 편집기 준비 신호 없음 (${MAX_POLLS * SHORT_MS}ms). 진단: ${diag.jsonPath}`,
  );
  err.code = 'SELECTOR_CHANGED';
  err.diagnostics = diag;
  throw err;
}

/**
 * @param {import('playwright').Page} page
 */
export async function navigateToWriteEditor(page) {
  await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(500);
  return waitForWriteEditorReady(page);
}

/**
 * @param {import('playwright').BrowserContext} context
 */
export async function openWriteEditorPage(context) {
  if (process.env.NAVER_REUSE_WRITEFORM_TAB === '1') {
    const existing = context.pages().find((p) => /PostWriteForm\.naver/.test(p.url()));
    if (existing) {
      await existing.bringToFront().catch(() => {});
      const ready = await waitForWriteEditorReady(existing);
      return ready;
    }
  }

  const page = await context.newPage();
  try {
    return await navigateToWriteEditor(page);
  } catch (e) {
    if (!e.diagnostics) {
      e.diagnostics = await writeEntryDiagnostics(page, 'entry-error').catch(() => null);
    }
    throw e;
  }
}

/**
 * 로그인 확인용 — 블로그 글쓰기 URL 진입 가능 여부 (저장·발행 없음).
 * @param {import('playwright').BrowserContext} context
 */
export async function verifyProfileAuthSession(context) {
  const page = await context.newPage();
  try {
    const ready = await navigateToWriteEditor(page);
    const ok = ready.code === 'EDITOR_READY';
    return { pass: ok, code: ready.code, dom: ready.dom, url: page.url() };
  } catch (e) {
    return { pass: false, code: e.code || 'VERIFY_FAILED', message: e.message, diagnostics: e.diagnostics };
  } finally {
    await page.close().catch(() => {});
  }
}

export { WRITE_URL, BLOG_ID };
