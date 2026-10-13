/**
 * 네이버 PostUpdateForm — Playwright 실키보드 편집·발행·공개 검증 실행기.
 * DOM/SE store 조작 금지. manifest edits + preserve 기준.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLLECT_SNAPSHOT_FN, verifySnapshot } from './dom-verify.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST = JSON.parse(readFileSync(join(__dirname, 'manifest.json'), 'utf8'));

const BLOG_ID = MANIFEST.blogId || 'spokedu77';

/** @typedef {{ logNo: string, id: string, preserve: object, edits: object[], linkEdits?: object[] }} PostConfig */

/**
 * @param {import('playwright').Page} page
 */
export async function collectSnapshot(page) {
  return page.evaluate(COLLECT_SNAPSHOT_FN);
}

/**
 * @param {import('playwright').Page} page
 * @param {string} [anchorHint]
 */
export async function waitForEditor(page, anchorHint) {
  await page.waitForFunction(
    (hint) => {
      if (!/PostUpdateForm\.naver/.test(location.href)) return false;
      const n = document.querySelectorAll('.se-text-paragraph').length;
      if (n < 20) return false;
      if (!hint) return true;
      return Array.from(document.querySelectorAll('.se-text-paragraph')).some((p) =>
        (p.innerText || '').includes(hint),
      );
    },
    anchorHint || '',
    { timeout: 120000 },
  );
}

/**
 * @param {import('playwright').Page} page
 * @param {string} text
 * @param {'exact' | 'includes'} match
 */
function paragraphLocator(page, text, match = 'includes') {
  const loc = page.locator('.se-text-paragraph');
  if (match === 'exact') {
    return loc.filter({ has: page.locator(`text="${text.replace(/"/g, '\\"')}"`) }).first();
  }
  return loc.filter({ hasText: text }).first();
}

/**
 * @param {import('playwright').Page} page
 * @param {import('playwright').Locator} para
 */
async function focusParagraph(page, para) {
  await para.waitFor({ state: 'attached', timeout: 60000 });
  await para.scrollIntoViewIfNeeded({ timeout: 20000 }).catch(() => {});
  const inner = para.locator('.se-module-text, [contenteditable="true"], span').first();
  if (await inner.count()) {
    await inner.click({ force: true, timeout: 15000 });
  } else {
    await para.click({ force: true, timeout: 15000 });
  }
  await page.waitForTimeout(150);
}

/**
 * @param {import('playwright').Page} page
 * @param {string} url
 */
async function applyLinkOnSelection(page, url) {
  await page.getByRole('button', { name: '링크 입력 열기' }).first().click({ force: true, timeout: 8000 });
  const input = page.locator('input.se-custom-layer-link-input');
  await input.waitFor({ state: 'visible', timeout: 8000 });
  await input.fill(url);
  await page.locator('button.se-custom-layer-link-apply-button').first().click({ force: true });
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
}

/**
 * @param {import('playwright').Page} page
 * @param {string} lineText
 */
async function selectLineText(page, lineText) {
  const para = page.locator('.se-text-paragraph').filter({ hasText: lineText }).first();
  await focusParagraph(page, para);
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  const sel = await page.evaluate(() => (window.getSelection()?.toString() || '').trim());
  if (!sel.includes(lineText.slice(0, 8))) {
    await para.click({ force: true, clickCount: 3 });
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {{ text: string, link?: string }[]} paragraphs
 * @param {'after' | 'before'} mode
 */
async function typeParagraphBlock(page, paragraphs, mode) {
  for (let i = 0; i < paragraphs.length; i++) {
    const { text, link } = paragraphs[i];
    if (i === 0 && mode === 'before') {
      await page.keyboard.press('Home');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
    }
    await page.keyboard.insertText(text);
    if (link) {
      await page.waitForTimeout(100);
      await page.keyboard.press('Home');
      await page.keyboard.down('Shift');
      await page.keyboard.press('End');
      await page.keyboard.up('Shift');
      await applyLinkOnSelection(page, link);
      await selectLineText(page, text);
    }
    if (i < paragraphs.length - 1) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
    }
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {object} edit
 */
async function applyTextEdit(page, edit) {
  const anchor = edit.anchorText;
  const match = edit.anchorMatch === 'exact' ? 'exact' : 'includes';
  const paras = edit.blocks.flatMap((b) => b.paragraphs);

  const head = paras[0]?.text?.slice(0, 16);
  const snap = await collectSnapshot(page);
  const already = paras.every((p) => {
    if (p.link) {
      return snap.links.some((l) => l.href === p.link && l.text.includes(p.text.slice(0, 10)));
    }
    return (snap.paragraphs || []).some((t) => t.includes(p.text.slice(0, 12)));
  });
  if (already) return { skipped: true, reason: 'already-applied' };

  const anchorLoc = paragraphLocator(page, anchor, match);
  await focusParagraph(page, anchorLoc);

  const pos = edit.insertPosition || 'afterAnchorComponent';
  if (pos === 'afterAnchorComponent' || pos.includes('after')) {
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(120);
    await typeParagraphBlock(page, paras, 'after');
  } else {
    let ok = false;
    try {
      await page.keyboard.press('Home');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      await typeParagraphBlock(page, paras, 'before');
      const check = await collectSnapshot(page);
      ok = paras.some((p) => (check.paragraphs || []).some((t) => t.includes(p.text.slice(0, 10))));
    } catch {
      ok = false;
    }
    if (!ok) {
      const prev = page
        .locator('.se-text-paragraph')
        .filter({ hasText: '대상과 공간에 맞춰 구성하고 있습니다.' })
        .last();
      if (await prev.count()) {
        await focusParagraph(page, prev);
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await typeParagraphBlock(page, paras, 'after');
      } else {
        throw new Error(`before-insert-fallback-failed:${edit.id}`);
      }
    }
  }
  return { skipped: false };
}

/**
 * @param {import('playwright').Page} page
 * @param {{ findText: string, replaceText: string }} linkEdit
 */
async function applyLinkEdit(page, linkEdit) {
  const snap = await collectSnapshot(page);
  if (snap.links.some((l) => l.href === linkEdit.replaceText)) {
    return { skipped: true, reason: 'url-already-updated' };
  }
  const para = page.locator('.se-text-paragraph').filter({ hasText: linkEdit.findText }).first();
  if (!(await para.count())) {
    const plain = page.getByText(linkEdit.findText, { exact: true });
    if (await plain.count()) {
      await plain.first().click({ force: true, clickCount: 3 });
    } else {
      throw new Error(`link-edit-not-found:${linkEdit.findText}`);
    }
  } else {
    await selectLineText(page, linkEdit.findText);
  }
  await applyLinkOnSelection(page, linkEdit.replaceText);
  return { skipped: false };
}

/**
 * @param {import('playwright').Page} page
 */
export async function publishPost(page) {
  await page.locator('.se-title-text').first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(200);
  const pub = page.locator('button.publish_btn__v_kS9, button[data-click-area="tpb.publish"]').first();
  const box = await pub.boundingBox();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  else await pub.click({ force: true });
  await page.waitForTimeout(800);
  await page.locator('button.confirm_btn__byZZW, button[data-testid="seOnePublishBtn"]').first().click({
    force: true,
    timeout: 20000,
  });
  await page.waitForURL(/PostView\.naver|blog\.naver\.com\/spokedu77\/\d+/, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

/**
 * @param {import('playwright').Page} page
 * @param {PostConfig} post
 */
export async function verifyPublicView(page, post) {
  const logNo = post.logNo;
  const url = `https://blog.naver.com/${BLOG_ID}/${logNo}`;
  if (!page.url().includes(logNo)) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
  }
  return page.evaluate((expected) => {
    const body = document.body.innerText || '';
    const links = Array.from(document.querySelectorAll('a[href]')).map((a) => ({
      text: (a.innerText || '').trim().slice(0, 120),
      href: a.href,
    }));
    const checks = [];
    for (const edit of expected.edits) {
      for (const block of edit.blocks) {
        for (const para of block.paragraphs) {
          checks.push({
            text: para.text.slice(0, 40),
            hasText: body.includes(para.text),
            href: para.link || null,
            linkOk: para.link
              ? links.some((l) => l.href.includes(para.link.replace(/^https?:\/\//, '').split('/').pop()) || l.href === para.link)
              : true,
          });
        }
      }
    }
    const titleOk = !expected.preserve.titleExact || body.includes(expected.preserve.titleExact.slice(0, 20));
    return { url: location.href, titleOk, checks, pass: checks.every((c) => c.hasText && c.linkOk) };
  }, post);
}

/**
 * @param {import('playwright').Page} page
 * @param {PostConfig} post
 * @param {{ skipEdits?: string[], publish?: boolean }} opts
 */
export async function runPost(page, post, opts = {}) {
  const t0 = Date.now();
  const editUrl = `https://blog.naver.com/PostUpdateForm.naver?blogId=${BLOG_ID}&Redirect=Update&logNo=${post.logNo}`;
  if (!page.url().includes(`logNo=${post.logNo}`)) {
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  }
  const firstAnchor = post.edits[0]?.anchorText?.slice(0, 12);
  await waitForEditor(page, firstAnchor);

  const baseline = post.baselineFile
    ? JSON.parse(readFileSync(join(__dirname, post.baselineFile), 'utf8'))
    : null;
  const before = await collectSnapshot(page);
  const applied = [];

  for (const edit of post.edits) {
    if (opts.skipEdits?.includes(edit.id)) continue;
    try {
      applied.push({ id: edit.id, ...(await applyTextEdit(page, edit)) });
    } catch (e) {
      return {
        logNo: post.logNo,
        id: post.id,
        ok: false,
        stage: 'edit',
        error: String(e),
        applied,
        ms: Date.now() - t0,
      };
    }
  }

  if (post.linkEdits) {
    for (const le of post.linkEdits) {
      try {
        applied.push({ id: le.id, ...(await applyLinkEdit(page, le)) });
      } catch (e) {
        return {
          logNo: post.logNo,
          id: post.id,
          ok: false,
          stage: 'linkEdit',
          error: String(e),
          applied,
          ms: Date.now() - t0,
        };
      }
    }
  }

  const after = await collectSnapshot(page);
  const verify = verifySnapshot(after, post, baseline);
  if (!verify.pass) {
    return {
      logNo: post.logNo,
      id: post.id,
      ok: false,
      stage: 'preserve',
      verify,
      applied,
      ms: Date.now() - t0,
    };
  }

  if (opts.publish !== false) {
    await publishPost(page);
    const pub = await verifyPublicView(page, post);
    if (!pub.pass) {
      return {
        logNo: post.logNo,
        id: post.id,
        ok: false,
        stage: 'public',
        pub,
        applied,
        ms: Date.now() - t0,
      };
    }
    return {
      logNo: post.logNo,
      id: post.id,
      ok: true,
      applied,
      pub,
      ms: Date.now() - t0,
      publicUrl: `https://blog.naver.com/${BLOG_ID}/${post.logNo}`,
    };
  }

  return { logNo: post.logNo, id: post.id, ok: true, applied, verify, ms: Date.now() - t0, dryRun: true };
}

/**
 * @param {import('playwright').Page} page
 * @param {{ postIds: string[], publish?: boolean }} options
 */
export async function runPilotBatch(page, options) {
  const results = [];
  for (const postId of options.postIds) {
    const post = MANIFEST.posts.find((p) => p.id === postId);
    if (!post) {
      results.push({ postId, ok: false, error: 'unknown-post' });
      continue;
    }
    const skipEdits =
      postId === 'p0-family-sports-day' ? ['mod-a-case-link'] : [];
    const r = await runPost(page, post, {
      publish: options.publish !== false,
      skipEdits,
    });
    results.push(r);
    if (!r.ok) {
      results.push({ batchStopped: false, note: 'continue-after-failure' });
    }
  }
  return { blogId: BLOG_ID, results, at: new Date().toISOString() };
}

export function loadManifestPost(logNo) {
  return MANIFEST.posts.find((p) => p.logNo === logNo);
}

export function appendLedger(batchResult) {
  const ledgerPath = join(__dirname, 'ledger.json');
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
  ledger.updatedAt = new Date().toISOString();
  ledger.pilotRun = batchResult;
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
}
