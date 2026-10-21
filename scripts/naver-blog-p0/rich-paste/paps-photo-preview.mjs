#!/usr/bin/env node
/**
 * SPOKEDU PAPS: verified 19-block Rich Paste + guarded real photo insertion (unsaved new tab).
 * Never saves or publishes; never modifies or closes existing tabs.
 * Uses the verified FINAL article validation and the proven 3-block HTML clipboard technique.
 *
 * cd scripts/naver-blog-p0/rich-paste && npm install --ignore-scripts
 * NAVER_CDP_URL=http://127.0.0.1:9222 npm run preview -- --article-id=9fad3d9e6f847f36
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { probeChromeProtocol, formatCdpError } from './cdp-health.mjs';
import { isEditorEmpty, reconcileParagraphs, validateNewImageSlot } from './photo-text-integrity.mjs';
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
const REPORT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'reports', 'naver-new', 'rich-paste', 'paps-photo');
const ASSET_DIR = join(dirname(fileURLToPath(import.meta.url)), 'editorial-assets');
const WANT_LIVE = process.argv.includes('--live');
const WANT_ONE = process.argv.includes('--one-photo');
const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
const report = { articleId: ARTICLE_ID, startedAt: new Date().toISOString(), result: 'NOT_RUN',
  saveDraftExecuted: false, publishExecuted: false, existingTabModified: false, photoUploadAttempted: false };
let page;
let stage = 'INIT';
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
    });
    // Keep raw DOM paragraphs in the same order. Smart Editor inserts zero-width
    // placeholders inside visually blank paragraphs; their physical slot matters.
    return { canvas: Boolean(canvas), rawParagraphs: paragraphs };
  });
}

async function verifyVisibleDocument(page, plan) {
  const actual = await readBodyDocument(page);
  const expectedTexts = plan.paragraphs.map(norm);
  // Strictly ignore ONLY Unicode-zero-width empty editor paragraphs. Do not
  // drop real text, altered wording, duplicate paragraphs, or split sentences.
  const reconciled = reconcileParagraphs(actual.rawParagraphs, expectedTexts);
  const actualTexts = reconciled.actualTexts;
  const actualParagraphs = reconciled.kept;
  const textMatch = reconciled.textMatch;
  const headingResults = plan.headingIndexes.map((i) => ({
    index: i, textMatch: expectedTexts[i] === actualTexts[i],
    fullBold: actualParagraphs[i]?.fullBold ?? false,
    fontSizes: actualParagraphs[i]?.leaves.map((v) => v.fontSize) ?? [],
  }));
  // Rendered CSS is authoritative. A left alignment class with computed
  // 'center' must NOT be reported as PASS.
  const leftAligned = actualParagraphs.every((p) => p.align === 'left' || p.align === 'start');
  const alignmentFailures = actualParagraphs.map((p, i) => ({index: i, align: p.align,
    className: p.className})).filter((p) => p.align !== 'left' && p.align !== 'start');
  return { canvas: actual.canvas, expectedCount: expectedTexts.length,
    actualCount: actualTexts.length, textMatch, headingResults, leftAligned,
    alignmentFailures, actualTexts, actual: actualParagraphs,
    rawParagraphs: actual.rawParagraphs, rawParagraphCount: reconciled.totalRaw,
    ignoredEmptyParagraphCount: reconciled.ignoredEmpty, rawDiagnostics: reconciled.rawDiagnostics };
}



// Baked from six actual 2025 Yangcheon-center class photos. Composite assets
// include source captions as image pixels so the original 19 text blocks
// stay unchanged. This mode sends the images to Naver's upload service but
// does NOT save the blog post; portrait-publication rights remain a separate gate.
const PHOTO_PLAN = Object.freeze([
  { id: 'cover', after: -1, name: '01-cover-paps.jpg', sourceCount: 1, sha256:'4a346f4329b0861aae0fab2a605c1699c693cd18f4ec13396efca86518acbcc1' },
  { id: 'activity-one', after: 2, name: '02-fitness-pair.jpg', sourceCount: 2, sha256:'440af414d608fec3b3f566808853cba77f87e0087097ec14fa3d0d96c3029a4e' },
  { id: 'activity-two', after: 7, name: '03-movement-pair.jpg', sourceCount: 2, sha256:'6e67fe36c38b8c870a5d32a2becea1a3a56ac9b628d944c1a4fbac1b90a4a549' },
  { id: 'activity-three', after: 12, name: '04-jump-single.jpg', sourceCount: 1, sha256:'161c8f0dd01d4457c7cd4903911ebfbe2a25a814978b5e8bbad4fcc858549ba1' },
]);

async function verifyAssetFile(photo) {
  const f = join(ASSET_DIR, photo.name);
  const bin = await readFile(f);
  if (bin.length < 20000 || bin.length > 4 * 1024 * 1024 ||
      bin[0] !== 0xff || bin[1] !== 0xd8 || bin[2] !== 0xff) {
    abort('IMAGE_ASSET_INVALID', photo.name);
  }
  const hash=createHash('sha256').update(bin).digest('hex');
  if(hash!==photo.sha256)abort('IMAGE_ASSET_SHA_MISMATCH',photo.name);
  return { ...photo, path: resolve(f), bytes: bin.length };
}

async function readEditorImageSections(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.se-canvas');
    if (!canvas) return { count: -1, images: [], sections: [] };
    const items = [...canvas.querySelectorAll('.se-component')].filter(el => !el.parentElement?.closest('.se-component') && el.getClientRects().length);
    return {
      count: items.filter(el => /\bse-component-image\b/.test(el.className) || el.querySelector('.se-section-image')).length,
      images: items.filter(el => /\bse-component-image\b/.test(el.className) || el.querySelector('.se-section-image')).map(el => ({className:el.className, text: (el.innerText||'').slice(0,120), htmlLength:el.outerHTML.length, imgCount:el.querySelectorAll('img').length})),
      sections: items.map(el => ({type:el.querySelector('.se-section-image')?'image':el.querySelector('.se-section-text')?'text':el.className, text:(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,96)})),
    };
  });
}

function integrityCheck(v, plan, phase) {
  const headings = v.headingResults.every(h => h.textMatch && h.fullBold);
  if (!(v.textMatch && v.actualCount === plan.paragraphs.length && headings && v.leftAligned)) {
    abort('TEXT_INTEGRITY_CHANGED', `After ${phase}: 19/${v.actualCount}, matches=${v.textMatch}, bold=${headings}, align=${v.leftAligned}`);
  }
}

/** Non-mutating caret placement at end of an exact 19-block paragraph.
 * We deliberately do not write DOM HTML or use SmartEditor's private model.
 * Pressing Enter through native keyboard produces the insertion point.
 */
async function setCaretAtAnchor(page, plan, after) {
  const beforeSlot = await verifyVisibleDocument(page, plan);
  if (!beforeSlot.textMatch || beforeSlot.actualCount !== 19 ||
      !beforeSlot.headingResults.every(h => h.textMatch && h.fullBold)) {
    abort('PHOTO_ANCHOR_BASELINE_CHANGED', `slot=${after}: original text already modified`);
  }
  const expected = after === -1 ? plan.paragraphs[0] : plan.paragraphs[after];
  const loc = page.locator('.se-canvas .se-section-text .se-text-paragraph').filter({hasText: expected}).first();
  const found = await page.evaluate((args) => {
    const norm = s => String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
    const elems = [...document.querySelectorAll('.se-canvas .se-section-text .se-text-paragraph')].filter(e => e.getClientRects().length && norm(e.innerText) === norm(args.expected));
    return elems.length;
  }, {expected});
  if (found !== 1) abort('PHOTO_ANCHOR_NOT_UNIQUE', `${after}: matches ${found}`);
  // Natural focus/click lets Smart Editor establish its own active editing session.
  await loc.click({timeout: 4000});
  const caret = await page.evaluate(({expected,after}) => {
    const norm = s => String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
    const p = [...document.querySelectorAll('.se-canvas .se-section-text .se-text-paragraph')].find(e => e.getClientRects().length && norm(e.innerText) === norm(expected));
    if (!p) return {ok:false,reason:'NOT_FOUND'};
    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(after === -1);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);
    const inEditor = Boolean(p.closest('.se-canvas'));
    return {ok:inEditor,collapsed:sel.isCollapsed,anchorText:(sel.anchorNode?.parentElement?.closest('.se-text-paragraph')?.innerText||'').slice(0,80)};
  }, {expected,after});
  if (!caret.ok || !caret.collapsed) abort('PHOTO_CARET_NOT_SET', JSON.stringify(caret));
  // At the top, splitting first paragraph creates an empty paragraph BEFORE it;
  // ArrowUp returns the caret to that blank line. For all other slots, placing
  // at paragraph END and Enter opens a new blank line immediately after it.
  await page.keyboard.press('Enter');
  if (after === -1) await page.keyboard.press('ArrowUp');
  const split = await verifyVisibleDocument(page, plan);
  const slotIntegrity = validateNewImageSlot(
    beforeSlot.rawParagraphs, split.rawParagraphs, plan.paragraphs, after);
  report.lastPhotoSlotIntegrity = slotIntegrity;
  if (!slotIntegrity.ok || !split.headingResults.every(h => h.textMatch && h.fullBold) || !split.leftAligned) {
    abort('IMAGE_NEWLINE_DAMAGED_TEXT',
      `at slot ${after}: meaningful=${split.actualCount}/19 raw=${split.rawParagraphCount}, ` +
      `newEmptyAtAnchor=${slotIntegrity.insertionValid}, textMatch=${split.textMatch}. ` +
      `Review lastPhotoSlotIntegrity for exact content; do not continue if substantive text split.`);
  }
  return { ...caret, imageSlot: { at: slotIntegrity.expectedInsertion,
    rawParagraphCount: slotIntegrity.afterRawCount, ignoredEmpty: split.ignoredEmptyParagraphCount } };
}

async function uploadViaNaverPhotoButton(page, filePath) {
  const btn = page.locator('button.se-image-toolbar-button, button[data-name="image"]').first();
  if (!(await btn.isVisible().catch(() => false))) {
    abort('NAVER_PHOTO_BUTTON_NOT_FOUND', '사진 툴바 버튼을 찾을 수 없습니다. 버튼 구조 변경 여부 확인 필요.');
  }
  // Prefer native OS filechooser; some Naver builds expose a hidden <input>.
  // Either path uses the public UI and avoids private upload API access.
  let chooserError;
  const chooserWait = page.waitForEvent('filechooser', {timeout: 5500}).catch(e=>{chooserError=String(e.message||e).slice(0,260);return null;});
  await btn.click({timeout:4500});
  const chooser = await chooserWait;
  if (chooser) {
    await chooser.setFiles(filePath);
    return {method:'filechooser'};
  }
  const inputs = page.locator('input[type="file"]');
  const n = await inputs.count();
  if(n<1) abort('PHOTO_FILE_INPUT_MISSING', `filechooser error: ${chooserError||'none'}, inputs=${n}`);
  const accepted = [];
  for (let i=0;i<n;i++) {
    const meta = await inputs.nth(i).evaluate(el=>({accept:el.accept,multiple:el.multiple}));
    accepted.push(meta);
    if (!meta.accept || /image|jpg|jpeg|png/i.test(meta.accept)) {
      await inputs.nth(i).setInputFiles(filePath,{timeout:4500});
      return {method:'input[type=file]', inputIndex:i, accepted};
    }
  }
  abort('PHOTO_INPUT_NOT_IMAGE', JSON.stringify(accepted));
}



// Determine real visual ordering of typed text and native Naver image modules.
// The image count alone is insufficient: four images at the bottom is NOT a
// correctly laid-out editorial article.
async function verifyPhotoPositions(page, plan, expectedAfterIndices=null) {
  const visual = await page.evaluate(() => {
    const norm = s => String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
    const root = document.querySelector('.se-canvas');
    if (!root) return {error:'NO_CANVAS',order:[]};
    const comps=[...root.querySelectorAll('.se-component')]
      .filter(el => !el.parentElement?.closest('.se-component') && el.getClientRects().length);
    const order=[];
    for (const c of comps) {
      if (c.classList.contains('se-component-image') || c.querySelector('.se-section-image')) {
        order.push({kind:'image'}); continue;
      }
      for(const p of c.querySelectorAll('.se-section-text .se-text-paragraph, .se-sectionTitle .se-text-paragraph')) {
        if (!p.getClientRects().length) continue;
        const t=norm(p.innerText);
        if(t && !/글감과 함께|기록해보세요/.test(t))order.push({kind:'text',value:t});
      }
    }
    return {order};
  });
  if(visual.error) return {...visual,ok:false};
  const actual=[], expected=plan.paragraphs.map(norm);
  let nextText=0;let wrongText=[];
  for(const block of visual.order){
    if(block.kind==='image') actual.push(nextText-1);
    else if(block.value===expected[nextText])nextText++;
    else wrongText.push({expectedIndex:nextText, text:block.value.slice(0,80)});
  }
  const slots=expectedAfterIndices ?? PHOTO_PLAN.map(s=>s.after);
  return {ok: nextText===expected.length && wrongText.length===0 &&
      JSON.stringify(actual)===JSON.stringify(slots), actualAfterIndices:actual,
    expectedAfterIndices:slots,readTextCount:nextText,wrongText,components:visual.order.length};
}

async function insertOnePhoto(page, plan, photo) {
  const beforeText = await verifyVisibleDocument(page, plan);
  integrityCheck(beforeText,plan,`before ${photo.id}`);
  const beforeImages = await readEditorImageSections(page);
  if (beforeImages.count < 0) abort('PHOTO_EDITOR_CANVAS_NOT_FOUND');
  const caret = await setCaretAtAnchor(page,plan,photo.after);
  // Record an upload attempt ONLY after the empty-slot integrity gate passes.
  report.photoUploadAttempted = true;
  const method = await uploadViaNaverPhotoButton(page,photo.path);
  const min = beforeImages.count+1;
  // Smart Editor can take several seconds to complete the upload.
  await page.waitForFunction((want)=> {
    const can=document.querySelector('.se-canvas');
    if(!can)return false;
    return [...can.querySelectorAll('.se-component')].filter(e=>!e.parentElement?.closest('.se-component')&&e.getClientRects().length&&(e.classList.contains('se-component-image')||e.querySelector('.se-section-image'))).length>=want;
  }, min,{timeout:15000,polling:250}).catch(()=>{});
  const afterImages = await readEditorImageSections(page);
  const afterText = await verifyVisibleDocument(page, plan);
  if (afterImages.count < min) abort('PHOTO_UPLOAD_NOT_CONFIRMED', `${photo.id}: count ${beforeImages.count} -> ${afterImages.count}`);
  integrityCheck(afterText,plan,`after ${photo.id}`);
  const insertedIds=[...(report.photoInsertions||[]).map(x=>x.id),photo.id];
  const inserted=PHOTO_PLAN.filter(x=>insertedIds.includes(x.id)).map(x=>x.after);
  const positions=await verifyPhotoPositions(page,plan,inserted);
  // During descending insertion, only a suffix of the final positions exists;
  // require that every observed image sits after its intended source block.
  if (positions.readTextCount!==19 || positions.wrongText.length ||
      JSON.stringify(positions.actualAfterIndices)!==JSON.stringify(inserted)) {
    abort('PHOTO_LOCATION_MISMATCH', `${photo.id}: image after blocks ${JSON.stringify(positions.actualAfterIndices)}, expected ${JSON.stringify(inserted)}. Remaining photos NOT uploaded.`);
  }
  return {id:photo.id, file:photo.name,method,caret,imagesBefore:beforeImages.count,imagesAfter:afterImages.count,
    photoPositions:positions.actualAfterIndices, textIntegrity:true, bytes:photo.bytes};
}

try {
  if (!/^[a-f0-9]{16}$/i.test(ARTICLE_ID)) abort('ARTICLE_ID_REQUIRED', '16자리 article-id가 필요합니다.');
  // loadStyleBlockPlan validates the FINAL article but currently does not return its
  // parsed blocks (it reads local.package?.blocks, while Phase 5 returns only copy).
  // Recover heading roles from the SHA-verified FINAL Markdown, NOT from the empty
  // plan.blocks array or the fallback hard-coded heading positions.
  stage='FINAL_PRECHECK';
  const basePlan = await loadStyleBlockPlan(ARTICLE_ID);
  const inputPackage = JSON.parse(await readFile(finalNaverInputJsonPath(ARTICLE_ID), 'utf8'));
  const finalMdPath = inputPackage.source || finalMarkdownPath(ARTICLE_ID);
  const finalMd = (await readFile(finalMdPath, 'utf8')).replace(/\r\n/g, '\n');
  const actualSha = sha256Text(finalMd);
  if (actualSha !== FINAL_EXPECTED_SHA256 || inputPackage.source_sha256 !== FINAL_EXPECTED_SHA256) {
    abort('FINAL_SOURCE_SHA_MISMATCH', `FINAL source mismatch: ${actualSha}`);
  }
  const parsedFinal = parseArticleForNaver(finalMd);
  if (/POPS|팝스/i.test(finalMd)) abort('PAPS_CORRECTION_REQUIRED', 'v2 --apply 를 먼저 실행하여 PAPS로 교정하세요.');
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
  const photoAssets = await Promise.all(PHOTO_PLAN.map(verifyAssetFile));
  report.photoPlan = photoAssets.map(({path,...item})=>item);
  report.photoPublicationRights='UNVERIFIED_DO_NOT_PUBLISH';

  if (!WANT_LIVE) {
    report.result = 'PAPS_PHOTO_OFFLINE_READY';
  } else {
    stage='CDP_CONNECT';
    // Verify real CDP command responses, not only a successful WebSocket TCP handshake.
    // This read-only preflight does not open/close any Chrome page or mutate editor state.
    report.cdpPreflight = await probeChromeProtocol(CDP_URL, { httpTimeoutMs: 3000, commandTimeoutMs: 5000 });
    if (!report.cdpPreflight.ok) {
      abort(report.cdpPreflight.code, formatCdpError(report.cdpPreflight));
    }
    // Direct WS endpoint avoids a second HTTP /json/version discovery step.
    // Never restart/kill the shared Chrome, and never retry a stalled session blindly.
    let browser;
    try {
      browser = await chromium.connectOverCDP(report.cdpPreflight.wsEndpoint, { timeout: 16000 });
    } catch (error) {
      report.cdpConnectError = String(error?.message || error).slice(0, 1500);
      abort('CDP_PLAYWRIGHT_INIT_FAILED',
        'Raw CDP Browser.getVersion and Target.getTargets passed, but Playwright initialization failed. ' +
        'Do not terminate Chrome with open tabs. ' + report.cdpConnectError);
    }
    const context = browser.contexts()[0];
    if (!context) abort('NO_EXISTING_BROWSER_CONTEXT');
    report.browserConnectedMs = Math.round(now() - t0);
    stage='NAVER_NEW_TAB';
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
    if (!before.canvas || before.rawParagraphs.some((b) => !isEditorEmpty(b.text) && !/글감과 함께 나의 일상을 기록해보세요/.test(b.text))) {
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
      const dirtyBody = bodyState.rawParagraphs.filter((b) =>
        !isEditorEmpty(b.text) && !/글감과 함께 나의 일상을 기록해보세요/.test(b.text));
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
    stage='RICH_PASTE';
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
    report.note = '새 테스트 탭에 미저장 상태. 사진 삽입은 네이버 서버로 업로드되지만 임시저장·발행하지 않음.';
    // This is our stable baseline: never attempt image insertion unless v6
    // verified all 19 blocks / 3 bold headings / left alignment.
    if(report.result !== 'RICH_PASTE_PREVIEW_PASS') abort('BASE_RICH_PASTE_NOT_PASS');
    stage='PHOTO_UPLOAD';
    report.photoInsertions=[];
    // Descending section order reduces interactions with already inserted
    // image modules; the cover is placed last.
    const selected = WANT_ONE ? [photoAssets[0]] : [photoAssets[3],photoAssets[2],photoAssets[1],photoAssets[0]];
    for (const photo of selected) {
      report.photoInsertions.push(await insertOnePhoto(page, plan, photo));
      report.photoProgress=`${report.photoInsertions.length}/${selected.length}`;
    }
    const finalDoc = await verifyVisibleDocument(page, plan);
    integrityCheck(finalDoc,plan,'final photos');
    const finalImages = await readEditorImageSections(page);
    report.finalPhotoPositions=await verifyPhotoPositions(page,plan,selected.length===4 ? PHOTO_PLAN.map(s=>s.after) : [-1]);
    report.imageSections=finalImages;
    report.verification=finalDoc;
    if (!report.finalPhotoPositions.ok) abort('FINAL_PHOTO_LOCATION_MISMATCH',JSON.stringify(report.finalPhotoPositions));
    report.result = selected.length === 4 && finalImages.count >= 4
      ? 'PAPS_PHOTO_PREVIEW_PASS' : 'PAPS_ONE_PHOTO_PROBE_PASS';
    stage='COMPLETE';
    const imageShot = join(REPORT_DIR, `paps-photo-${stamp}.png`);
    await page.screenshot({ path: imageShot, timeout: 10000, fullPage: true });
    report.photoScreenshot=imageShot;
  }
} catch (error) {
  report.result = 'RICH_PASTE_PREVIEW_ERROR';
  report.code = error.code || 'UNEXPECTED';
  report.failedStage = stage;
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
    code: report.code ?? null, error: report.error ?? null, failedStage: report.failedStage ?? null,
    photoUploadAttempted: report.photoUploadAttempted,
    cdpPreflight: report.cdpPreflight ? {
      ok: report.cdpPreflight.ok, code: report.cdpPreflight.code,
      stage: report.cdpPreflight.stage, httpStatus: report.cdpPreflight.httpStatus,
      browser: report.cdpPreflight.browser, targets: report.cdpPreflight.targets,
      elapsedMs: report.cdpPreflight.elapsedMs, detail: report.cdpPreflight.detail,
    } : null,
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
    imageSlot: report.lastPhotoSlotIntegrity ? {
      ok: report.lastPhotoSlotIntegrity.ok, beforeRawCount: report.lastPhotoSlotIntegrity.beforeRawCount,
      afterRawCount: report.lastPhotoSlotIntegrity.afterRawCount,
      afterMeaningfulCount: report.lastPhotoSlotIntegrity.afterMeaningfulCount,
      insertionValid: report.lastPhotoSlotIntegrity.insertionValid,
      expectedInsertion: report.lastPhotoSlotIntegrity.expectedInsertion,
      diagnostics: report.lastPhotoSlotIntegrity.afterRawDiagnostics?.slice(0, 3),
    } : null, photoProgress:report.photoProgress ?? null, photoInsertions:report.photoInsertions?.map(x=>({id:x.id,method:x.method,imagesBefore:x.imagesBefore,imagesAfter:x.imagesAfter,textIntegrity:x.textIntegrity})),
    saveDraftExecuted: false, publishExecuted: false }, null, 2));
  // CDP websocket may remain open; explicitly terminate only this Node client.
  // Deliberately never close pre-existing Chrome tabs, browser, or this unsaved preview tab.
  process.exit(['PAPS_PHOTO_PREVIEW_PASS','PAPS_ONE_PHOTO_PROBE_PASS','PAPS_PHOTO_OFFLINE_READY'].includes(report.result) ? 0 : 2);
}
