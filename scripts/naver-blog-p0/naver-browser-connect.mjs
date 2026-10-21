/**
 * 네이버 편집기용 Playwright 연결 — CDP 우선, 없으면 영속 Chrome 프로필.
 * 쿠키 덤프·임의 추출 없음.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_NAVER_PROFILE_DIR = join(__dirname, '.naver-editor-profile');

/**
 * @returns {Promise<{ context: import('playwright').BrowserContext, browser: import('playwright').Browser | null, mode: 'cdp' | 'persistent', disconnect: () => Promise<void> }>}
 */
export async function connectNaverBrowser() {
  const { chromium } = await import('playwright');
  /** 기본: 영속 프로필. CDP는 NAVER_CDP_URL을 명시한 경우만 (MCP/전역 Chrome 강제 연결 없음). */
  const cdp = process.env.NAVER_CDP_URL || null;

  if (cdp) {
    const cdpTimeoutMs = Number(process.env.NAVER_CDP_CONNECT_MS || 120_000);
    const browser = await chromium.connectOverCDP(cdp, { timeout: cdpTimeoutMs });
    const context = browser.contexts()[0] || (await browser.newContext());
    return {
      browser,
      context,
      mode: 'cdp',
      disconnect: async () => {
        await browser.close().catch(() => {});
      },
    };
  }

  const userDataDir = process.env.NAVER_USER_DATA_DIR || DEFAULT_NAVER_PROFILE_DIR;
  const channel = process.env.NAVER_CHROME_CHANNEL || 'chrome';
  let context;
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel,
      viewport: null,
      args: ['--disable-blink-features=AutomationControlled'],
    });
  } catch (e) {
    const msg = String(e.message || e);
    if (/user data directory|already in use|profile/i.test(msg)) {
      const err = new Error(`PROFILE_LOCKED: ${msg}`);
      err.code = 'PROFILE_LOCKED';
      throw err;
    }
    throw e;
  }

  return {
    browser: null,
    context,
    mode: 'persistent',
    disconnect: async () => {
      if (process.env.NAVER_KEEP_BROWSER === '0') {
        await context.close().catch(() => {});
      }
    },
  };
}

/**
 * @param {import('playwright').BrowserContext} context
 * @returns {Promise<{ page: import('playwright').Page, entry: Awaited<ReturnType<import('./naver-editor-entry.mjs')['openWriteEditorPage']>> }>}
 */
export async function openFreshWriteEditorPage(context) {
  const { openWriteEditorPage } = await import('./naver-editor-entry.mjs');
  const entry = await openWriteEditorPage(context);
  return { page: entry.page, entry, reusedManuscript: false };
}

/**
 * FINAL·N1 실험용 — 항상 새 PostWriteForm 탭 (기존 미저장 탭 유지).
 * @param {import('playwright').BrowserContext} context
 */
export async function openNewWriteEditorTab(context) {
  const { navigateToWriteEditor } = await import('./naver-editor-entry.mjs');
  const page = await context.newPage();
  const entry = await navigateToWriteEditor(page);
  return { page, entry, reusedManuscript: false, newTab: true };
}

/**
 * CDP 등 기존 탭 중 FINAL 원고(19/19)와 일치하는 PostWriteForm을 우선 재사용.
 * @param {import('playwright').BrowserContext} context
 * @param {{ title: string, paragraphs: string[] }} plan
 */
export async function openReusableWriteEditorPage(context, plan) {
  const { waitForWriteEditorReady } = await import('./naver-editor-entry.mjs');
  const { readBodyParagraphsFromDom } = await import('./naver-new-write-runner.mjs');

  const norm = (s) =>
    String(s || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const planNorm = plan.paragraphs.map(norm);
  const candidates = context.pages().filter((p) => !p.isClosed() && /PostWriteForm\.naver/.test(p.url()));

  /** @type {{ page: import('playwright').Page, entry: object, bodyMatch: boolean, titleMatch: boolean } | null} */
  let best = null;
  for (const page of candidates) {
    try {
      await page.bringToFront().catch(() => {});
      const ready = await waitForWriteEditorReady(page);
      const titleLoc = page.locator('.se-section-documentTitle .se-text-paragraph').first();
      const title = norm(await titleLoc.innerText().catch(() => ''));
      const dom = (await readBodyParagraphsFromDom(page)).map(norm);
      const bodyMatch =
        dom.length === planNorm.length && dom.every((t, i) => t === planNorm[i]);
      const titleMatch = title === norm(plan.title);
      if (bodyMatch && titleMatch) {
        return { page, entry: ready, reusedManuscript: true };
      }
      if (bodyMatch && !best) {
        best = { page, entry: ready, bodyMatch, titleMatch };
      }
    } catch {
      /* 다른 탭 시도 */
    }
  }
  if (best) {
    return { page: best.page, entry: best.entry, reusedManuscript: true, titleMismatch: !best.titleMatch };
  }

  process.env.NAVER_REUSE_WRITEFORM_TAB = '1';
  return openFreshWriteEditorPage(context);
}
