/**
 * Phase 5.2 — Smart Editor One UI 서식 (저장·발행 없음).
 * keyboard.insertText 입력(Phase 5.1) 이후 공식 툴바만 조작한다.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FINAL_EXPECTED_SHA256,
  finalNaverInputJsonPath,
  runPhase5LocalValidation,
} from './naver-article-pipeline.mjs';
import { readBodyParagraphsFromDom, verifyDomParagraphOrder } from './naver-new-write-runner.mjs';

function norm(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const REPORT_DIR = join(REPO_ROOT, 'reports', 'naver-new');

/** @readonly — DOM에서 확인한 안정 클래스 (해시 UUID 아님) */
export const STYLE_SEL = {
  bodyParagraph: '.se-section-text .se-text-paragraph',
  alignTrigger: '.se-toolbar-item-align button',
  alignLeft: '.se-toolbar-option-align-left-button',
  fontSizeTrigger: '.se-font-size-code-toolbar-button, button[data-name="font-size"]',
  fontSizeOption: (n) => `.se-toolbar-option-font-size-code-fs${n}-button`,
  bold: '.se-bold-toolbar-button, button[data-name="bold"]',
  boldActive: '.se-bold-toolbar-button.se-is-activated, button[data-name="bold"].se-is-activated',
  textFormatTrigger: '.se-text-format-toolbar-button, button[data-name="text-format"]',
  textFormatBody: '.se-toolbar-option-text-format-text-button',
  textFormatSectionTitle: '.se-toolbar-option-text-format-sectionTitle-button',
};

export const DEFAULT_HEADING_PARAGRAPH_INDEXES = [2, 7, 12];

const TOOLBAR_LOCATOR_MS = Number(process.env.NAVER_TOOLBAR_LOCATOR_MS || 2500);

/**
 * FINAL_NAVER_INPUT blocks → 편집 역할 (원고 텍스트 변경 없음).
 * @param {Array<{ type: string, text: string }>} blocks
 */
export function mapBlocksWithRoles(blocks) {
  return blocks.map((b, index) => {
    let role = 'paragraph';
    if (b.type === 'heading') role = 'heading';
    else if (index === 0) role = 'intro';
    return { index, role, type: b.type, text: b.text };
  });
}

/**
 * @param {Array<{ type: string }>} blocks
 */
export function headingParagraphIndexes(blocks) {
  const idx = [];
  blocks.forEach((b, i) => {
    if (b.type === 'heading') idx.push(i);
  });
  return idx.length ? idx : DEFAULT_HEADING_PARAGRAPH_INDEXES;
}

/**
 * @param {string} [articleId]
 */
export async function loadStyleBlockPlan(articleId = '9fad3d9e6f847f36') {
  const local = await runPhase5LocalValidation(articleId, FINAL_EXPECTED_SHA256);
  if (!local.pass) {
    throw new Error(`FINAL_LOCAL_VALIDATION_FAILED: ${JSON.stringify(local.alignment?.issues || [])}`);
  }
  const blocks = local.package?.blocks || [];
  return {
    articleId,
    sourceSha256: FINAL_EXPECTED_SHA256,
    title: local.copy.title,
    paragraphs: local.copy.paragraphs,
    blocks: mapBlocksWithRoles(blocks),
    headingIndexes: headingParagraphIndexes(blocks),
    finalInputJson: finalNaverInputJsonPath(articleId),
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {number} expected
 */
export async function assertParagraphCountGate(page, expected = 19) {
  const count = await page.locator(STYLE_SEL.bodyParagraph).count();
  if (count !== expected) {
    const err = new Error(`TEXT_MISMATCH: paragraph_count=${count} expected=${expected}`);
    err.code = 'TEXT_MISMATCH';
    throw err;
  }
  return count;
}

/**
 * @param {import('playwright').Page} page
 * @param {number[]} headingIndexes
 */
export async function readParagraphStylesFromDom(page, headingIndexes) {
  return page.evaluate((headingIdx) => {
    const ps = [...document.querySelectorAll('.se-section-text .se-text-paragraph')];
    return ps.map((p, index) => {
      const spans = [...p.querySelectorAll('span')];
      const sizes = spans.map((s) => parseFloat(getComputedStyle(s).fontSize) || 0);
      const weights = spans.map((s) => Number(getComputedStyle(s).fontWeight) || 400);
      const boldEl = p.querySelector('b, strong');
      const fsClass =
        spans
          .map((s) => (s.className || '').toString())
          .join(' ')
          .match(/se-fs\d+/i)?.[0] || null;
      const leafMaxFw = Math.max(
        ...[...p.querySelectorAll('b, strong, span')].map((s) => Number(getComputedStyle(s).fontWeight) || 400),
        400,
      );
      const fullText = (p.innerText || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      const boldText = [...p.querySelectorAll('b, strong')]
        .map((n) => (n.innerText || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim())
        .join('');
      const emptyBoldShell = [...p.querySelectorAll('b, strong')].some(
        (n) => !(n.textContent || '').replace(/\s/g, '').length,
      );
      const textNodes = [];
      const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      let tn;
      while ((tn = tw.nextNode())) {
        if ((tn.textContent || '').replace(/\u00a0/g, ' ').trim()) textNodes.push(tn);
      }
      const textNodeBold = (node) => {
        const host = node.parentElement;
        if (!host) return false;
        if (host.closest('b, strong')) return true;
        return (Number(getComputedStyle(host).fontWeight) || 400) >= 600;
      };
      const allTextNodesBold = textNodes.length > 0 && textNodes.every(textNodeBold);
      return {
        index,
        alignClass: [...p.classList].filter((c) => c.includes('align')),
        maxFontPx: Math.max(parseFloat(getComputedStyle(p).fontSize) || 0, ...sizes, 0),
        maxFontWeight: Math.max(Number(getComputedStyle(p).fontWeight) || 400, ...weights, 400),
        leafMaxFontWeight: leafMaxFw,
        hasBoldTag: !!boldEl,
        emptyBoldShell,
        boldTagTextLen: boldText.length,
        fullBoldTag: fullText.length > 0 && fullText === boldText,
        allTextNodesBold,
        boldTagWeight: boldEl ? Number(getComputedStyle(boldEl).fontWeight) : null,
        fsClass,
        role: headingIdx.includes(index) ? 'heading' : 'paragraph',
        textPreview: fullText.slice(0, 48),
      };
    });
  }, headingIndexes);
}

/** @param {import('playwright').Page} page */
export async function readRenderedBlocks(page) {
  return page.evaluate(() => {
    const section = document.querySelector('.se-section-text');
    if (!section) return { logicalBlocks: [], components: [] };
    const logicalBlocks = [...section.querySelectorAll('.se-text-paragraph')]
      .map((p, index) => ({
        index,
        kind: 'se-text-paragraph',
        text: (p.innerText || '').trim(),
        moduleClass: p.closest('.se-module')?.className?.toString().slice(0, 80) || null,
      }))
      .filter((b) => b.text.length > 0);
    const components = [...section.querySelectorAll('.se-module')].map((m, i) => ({
      index: i,
      className: (m.className || '').toString().slice(0, 100),
      paragraphCount: m.querySelectorAll('.se-text-paragraph').length,
      textPreview: (m.innerText || '').trim().slice(0, 60),
    }));
    return { logicalBlocks, components, fullSectionText: (section.innerText || '').trim().slice(0, 500) };
  });
}

/** @param {import('playwright').Page} page @param {number} index */
export async function inspectDomTextHierarchy(page, index) {
  return page.evaluate((idx) => {
    const p = document.querySelectorAll('.se-section-text .se-text-paragraph')[idx];
    if (!p) return null;
    const leaves = [];
    const walk = (el, depth) => {
      if (!el || depth > 10) return;
      if (el.nodeType === 3) {
        const t = (el.textContent || '').trim();
        if (t) {
          leaves.push({
            kind: 'text',
            depth,
            text: t.slice(0, 80),
            parentTag: el.parentElement?.tagName,
            parentClass: (el.parentElement?.className || '').toString().slice(0, 100),
          });
        }
        return;
      }
      if (el.nodeType !== 1) return;
      const cs = getComputedStyle(el);
      if (['B', 'STRONG', 'SPAN', 'I', 'U'].includes(el.tagName) || (el.className || '').includes('se-fs')) {
        leaves.push({
          kind: 'element',
          depth,
          tag: el.tagName,
          class: (el.className || '').toString().slice(0, 120),
          fontWeight: cs.fontWeight,
          fontSize: cs.fontSize,
          fontFamily: cs.fontFamily.slice(0, 48),
        });
      }
      for (const c of el.childNodes) walk(c, depth + 1);
    };
    walk(p, 0);
    return {
      index: idx,
      paragraphClass: [...p.classList].join(' '),
      text: (p.innerText || '').trim(),
      hasBoldTag: !!p.querySelector('b, strong'),
      leaves,
    };
  }, index);
}

/** @param {import('playwright').Page} page */
export async function inspectEditorCapabilities(page) {
  const toolbar = await page.evaluate(() => ({
    fontFamily: !!document.querySelector('button[data-name="font-family"], .se-font-family-toolbar-button'),
    fontSize: !!document.querySelector('.se-font-size-code-toolbar-button'),
    bold: !!document.querySelector('.se-bold-toolbar-button'),
    textFormat: !!document.querySelector('.se-text-format-toolbar-button'),
    align: !!document.querySelector('.se-toolbar-item-align'),
    sectionTitleOption: !!document.querySelector('.se-toolbar-option-text-format-sectionTitle-button'),
    bodyFormatOption: !!document.querySelector('.se-toolbar-option-text-format-text-button'),
  }));
  return {
    editor: 'Smart Editor One',
    officialDocs: [
      'https://help.naver.com/service/5593/contents/15515',
      'https://help.naver.com/service/5593/contents/15417',
      'https://help.naver.com/service/5593/contents/15509',
    ],
    toolbar,
    defaultFontNote:
      '미설정 시 나눔고딕 15·왼쪽 정렬(고객센터). 계정 기본 서체는 이 작업에서 변경하지 않음.',
    htmlModeSupported: false,
  };
}

/**
 * 입력 직전 툴바 준비 (전략 A). heading은 fs19 후 Bold ON → insertText 직전 상태.
 * @param {import('playwright').Page} page
 * @param {'body'|'heading'} role
 * @param {number} [paragraphIndex]
 */
/**
 * @typedef {{ alignLeft?: boolean, fontSize?: 16 | 19, bodyFormat?: boolean, boldOff?: boolean, textFormatKind?: 'body' | 'sectionTitle' }} ToolbarInsertCache
 */

export const N1_PROBE_BLOCKS = [
  { role: 'body', text: 'SPOKEDU 일반 본문 테스트입니다.' },
  { role: 'heading', text: 'Chapter 01. 움직임 놀이체육' },
  { role: 'body', text: '다음 문단은 일반 본문으로 돌아와야 합니다.' },
];

/**
 * @param {import('playwright').Page} page
 * @param {'body'|'heading'} role
 * @param {number} [paragraphIndex]
 * @param {ToolbarInsertCache} [cache]
 * @returns {Promise<ToolbarInsertCache>}
 */
export async function prepareToolbarForInsert(page, role, paragraphIndex = 0, cache = {}) {
  const targetFs = role === 'heading' ? 19 : 16;
  const next = { ...cache };

  if (!next.alignLeft) {
    const align = await applyLeftAlignIfNeeded(page, { paragraphIndex });
    if (align.verified) next.alignLeft = true;
  } else {
    await page.locator(STYLE_SEL.bodyParagraph).nth(paragraphIndex).click({ timeout: TOOLBAR_LOCATOR_MS });
    await page.waitForTimeout(60);
  }

  if (!next.bodyFormat) {
    await applyTextFormat(page, 'body');
    next.bodyFormat = true;
  }

  if (next.boldOff !== true) {
    await applyBold(page, false);
    next.boldOff = true;
  }

  if (next.fontSize !== targetFs) {
    await applyFontSize(page, targetFs);
    next.fontSize = targetFs;
  }

  return next;
}

/**
 * N1 — 소제목(글 유형 sectionTitle) 선지정, 본문은 전략 A.
 * @param {import('playwright').Page} page
 * @param {'body'|'heading'} role
 * @param {number} [paragraphIndex]
 * @param {ToolbarInsertCache} [cache]
 */
export async function prepareToolbarForInsertN1(page, role, paragraphIndex = 0, cache = {}) {
  const next = { ...cache };

  if (!next.alignLeft) {
    const align = await applyLeftAlignIfNeeded(page, { paragraphIndex });
    if (align.verified) next.alignLeft = true;
  } else {
    await page.locator(STYLE_SEL.bodyParagraph).nth(paragraphIndex).click({ timeout: TOOLBAR_LOCATOR_MS });
    await page.waitForTimeout(60);
  }

  if (role === 'heading') {
    await applyTextFormat(page, 'sectionTitle');
    next.textFormatKind = 'sectionTitle';
    next.bodyFormat = false;
    await applyBold(page, false);
    next.boldOff = true;
    return next;
  }

  if (next.textFormatKind !== 'body') {
    await applyTextFormat(page, 'body');
    next.textFormatKind = 'body';
    next.bodyFormat = true;
  } else if (!next.bodyFormat) {
    await applyTextFormat(page, 'body');
    next.bodyFormat = true;
  }

  if (next.boldOff !== true) {
    await applyBold(page, false);
    next.boldOff = true;
  }

  if (next.fontSize !== 16) {
    await applyFontSize(page, 16);
    next.fontSize = 16;
  }

  return next;
}

/** @typedef {'VISIBLE_DOCUMENT_BLOCK'|'HIDDEN_DUPLICATE'|'OUTSIDE_EDITOR'|'UNRESOLVED'} TextLocationClass */

/** @param {import('playwright').Page} page */
export async function readEditorFullDocumentDom(page) {
  return page.evaluate(() => {
    const normLocal = (s) =>
      String(s || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const ancestorPath = (el, maxDepth = 8) => {
      /** @type {string[]} */
      const parts = [];
      let cur = el;
      while (cur && cur !== document.documentElement && parts.length < maxDepth) {
        const tag = cur.tagName ? cur.tagName.toLowerCase() : '?';
        const idPart = cur.id ? `#${String(cur.id).slice(0, 24)}` : '';
        const clsRaw = cur.className && typeof cur.className === 'string' ? cur.className.trim() : '';
        const clsPart = clsRaw ? `.${clsRaw.split(/\s+/).slice(0, 2).join('.')}` : '';
        parts.push(`${tag}${idPart}${clsPart}`.slice(0, 96));
        cur = cur.parentElement;
      }
      return parts;
    };

    const elementRect = (el) => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };

    const isUiChrome = (el) =>
      !!el.closest(
        '.se-toolbar, .se-property-toolbar, .se-popup, .se-layer, .se-floating-menu, .se-help-panel, [role="menu"], [role="listbox"], .se-sidebar',
      );

    const visibilityState = (el) => {
      if (!el) return 'hidden';
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return 'hidden';
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) return 'hidden';
      if (parseFloat(style.opacity || '1') === 0) return 'hidden';
      if (el.closest('[aria-hidden="true"]')) return 'hidden';
      if (el.getClientRects().length === 0) return 'hidden';
      return 'visible';
    };

    const canvases = [...document.querySelectorAll('.se-canvas')];
    const primaryCanvas =
      canvases.find((c) => visibilityState(c) === 'visible') || canvases[0] || null;

    const describeModule = (m, moduleIndexInSection, sectionMeta) => {
      const className = (m.className || '').toString();
      const isSectionTitle = /se-sectionTitle/i.test(className);
      const isModuleText = /se-module-text/i.test(className);
      const paragraphs = [...m.querySelectorAll('.se-text-paragraph')];
      const paragraphTexts = paragraphs.map((p) => normLocal(p.innerText || ''));
      const text = paragraphTexts.filter(Boolean).join(' ');
      const firstP = paragraphs[0];
      const cs = firstP ? getComputedStyle(firstP) : null;
      const contentEditables = [...m.querySelectorAll('[contenteditable="true"]')].map((el) => ({
        tag: el.tagName,
        className: String(el.className || '').slice(0, 64),
      }));
      const inCanvas = !!(primaryCanvas && primaryCanvas.contains(m));
      const uiChrome = isUiChrome(m);
      const visible = visibilityState(m) === 'visible';
      /** @type {TextLocationClass} */
      let locationClass = 'UNRESOLVED';
      if (uiChrome) locationClass = 'OUTSIDE_EDITOR';
      else if (!inCanvas) locationClass = 'OUTSIDE_EDITOR';
      else if (!visible) locationClass = 'HIDDEN_DUPLICATE';
      else locationClass = 'VISIBLE_DOCUMENT_BLOCK';

      return {
        moduleIndexInSection,
        sectionIndex: sectionMeta.globalSectionIndex,
        globalSectionIndex: sectionMeta.globalSectionIndex,
        kind: isSectionTitle ? 'sectionTitle' : isModuleText ? 'paragraph' : 'other',
        moduleClass: className.slice(0, 120),
        text,
        paragraphTexts,
        paragraphCount: paragraphs.length,
        fontSizePx: cs ? parseFloat(cs.fontSize) || null : null,
        fontWeight: cs ? cs.fontWeight : null,
        moduleId: m.id || null,
        inCanvas,
        sectionInCanvas: sectionMeta.inCanvas,
        visible,
        locationClass,
        ancestorPath: ancestorPath(m),
        boundingRect: elementRect(m),
        contentEditables,
        iframeRelation: 'top_document_module',
      };
    };

    const allPageSections = [...document.querySelectorAll('.se-section-text')];
    /** @type {Array<object>} */
    const sections = allPageSections.map((sec, globalSectionIndex) => {
      const inCanvas = !!(primaryCanvas && primaryCanvas.contains(sec));
      const visible = visibilityState(sec) === 'visible';
      const modules = [...sec.querySelectorAll(':scope > .se-module')].map((m, moduleIndexInSection) =>
        describeModule(m, moduleIndexInSection, {
          globalSectionIndex,
          inCanvas,
        }),
      );
      return {
        globalSectionIndex,
        sectionIndexInCanvas: inCanvas
          ? [...(primaryCanvas?.querySelectorAll('.se-section-text') || [])].indexOf(sec)
          : -1,
        inCanvas,
        visible,
        ancestorPath: ancestorPath(sec),
        boundingRect: elementRect(sec),
        moduleCount: modules.length,
        modules,
      };
    });

    /** 논리 문서: 캔버스 안·표시 중·UI chrome 밖 모듈을 DOM 순서대로 */
    /** @type {Array<object>} */
    const logicalModules = [];
    let globalModuleIndex = 0;
    for (const sec of sections) {
      if (!sec.inCanvas || !sec.visible) continue;
      for (const mod of sec.modules) {
        if (mod.locationClass !== 'VISIBLE_DOCUMENT_BLOCK') continue;
        logicalModules.push({
          ...mod,
          moduleIndex: globalModuleIndex,
        });
        globalModuleIndex += 1;
      }
    }

    const logicalParagraphTexts = [];
    for (const mod of logicalModules) {
      for (const t of mod.paragraphTexts) {
        if (t) logicalParagraphTexts.push(t);
      }
    }

    /** @type {Array<object>} */
    const allOccurrences = [];
    sections.forEach((sec) => {
      for (const mod of sec.modules) {
        if (!normLocal(mod.text)) continue;
        allOccurrences.push({
          textPreview: mod.text.slice(0, 80),
          locationClass: mod.locationClass,
          globalSectionIndex: sec.globalSectionIndex,
          sectionIndexInCanvas: sec.sectionIndexInCanvas,
          moduleIndexInSection: mod.moduleIndexInSection,
          kind: mod.kind,
          moduleClass: mod.moduleClass,
          visible: mod.visible,
          inCanvas: mod.inCanvas,
          ancestorPath: mod.ancestorPath.slice(0, 4),
        });
      }
    });

    const fingerprint = logicalModules.map((m) => `${m.kind}:${normLocal(m.text)}`).join('|');
    const fullDocumentFingerprint = allOccurrences
      .map((o) => `${o.locationClass}:${o.kind}:${normLocal(o.textPreview)}`)
      .join('|');

    const canvasSections = primaryCanvas
      ? [...primaryCanvas.querySelectorAll('.se-section-text')]
      : [];

    return {
      documentRoot: {
        surface: 'top',
        pagePath: location.pathname,
        canvasId: primaryCanvas?.id || null,
        canvasCount: canvases.length,
        canvasRect: primaryCanvas ? elementRect(primaryCanvas) : null,
        sectionCountPage: allPageSections.length,
        sectionCountInCanvas: canvasSections.length,
        logicalModuleCount: logicalModules.length,
        iframeRelationNote:
          'contenteditable 입력은 about:blank iframe에서 발생할 수 있으나 본문 모듈 DOM은 top document의 se-canvas 아래에 반영됨',
      },
      sections,
      modules: logicalModules,
      blocks: logicalModules,
      logicalParagraphTexts,
      moduleCount: logicalModules.length,
      paragraphDomCount: logicalModules.reduce((n, m) => n + m.paragraphCount, 0),
      sectionTitleModuleCount: logicalModules.filter((m) => m.kind === 'sectionTitle').length,
      fingerprint,
      fullDocumentFingerprint,
      allOccurrences,
    };
  });
}

/** @param {import('playwright').Page} page */
export async function readCanonicalEditorBodyDom(page) {
  return readEditorFullDocumentDom(page);
}

/** @param {import('playwright').Page} page */
export async function readDocumentLogicalStructure(page) {
  const dom = await readEditorFullDocumentDom(page);
  return {
    blocks: dom.blocks,
    moduleCount: dom.moduleCount,
    paragraphDomCount: dom.paragraphDomCount,
    documentRoot: dom.documentRoot,
    sectionTitleModuleCount: dom.sectionTitleModuleCount,
    fingerprint: dom.fingerprint,
    fullDocumentFingerprint: dom.fullDocumentFingerprint,
    sections: dom.sections,
    allOccurrences: dom.allOccurrences,
  };
}

/**
 * @param {import('playwright').Page} page
 */
export async function readLogicalTextsInOrder(page) {
  const { readBodyParagraphsFromDom } = await import('./naver-new-write-runner.mjs');
  return readBodyParagraphsFromDom(page);
}

/**
 * @param {import('playwright').Page} page
 * @param {string} exactText
 */
/**
 * 편집기 프레임(탑 + 자식)에 읽기 전용 이벤트 훅 설치. 원고 전문·인증정보 미기록.
 * @param {import('playwright').Page} page
 */
export async function installSubtitleObservationHooks(page) {
  const attach = async (root) => {
    try {
      await root.evaluate(() => {
        if (window.__spokeduSubtitleObs) return;
        window.__spokeduSubtitleObs = { events: [] };
        const push = (type, detail) => {
          const ae = document.activeElement;
          const tag = ae ? ae.tagName : null;
          const cls = ae ? String(ae.className || '').slice(0, 72) : '';
          const ce =
            ae && (ae.getAttribute?.('contenteditable') === 'true' || ae.isContentEditable)
              ? true
              : false;
          window.__spokeduSubtitleObs.events.push({
            t: Date.now(),
            type,
            detail: detail ? String(detail).slice(0, 80) : '',
            activeTag: tag,
            activeClass: cls,
            contentEditableFocused: ce,
            selectionLen: (window.getSelection()?.toString() || '').length,
          });
          if (window.__spokeduSubtitleObs.events.length > 500) {
            window.__spokeduSubtitleObs.events.splice(0, 120);
          }
        };
        for (const ev of [
          'focusin',
          'focusout',
          'selectionchange',
          'keydown',
          'beforeinput',
          'input',
        ]) {
          document.addEventListener(ev, (e) => push(ev, e.inputType || e.key || ''), true);
        }
      });
    } catch {
      /* cross-origin */
    }
  };
  await attach(page);
  for (const frame of page.frames()) {
    if (frame !== page.mainFrame()) await attach(frame);
  }
}

/**
 * @param {import('playwright').Page | import('playwright').Frame} root
 */
async function readObservationTail(root) {
  try {
    return await root.evaluate(() => (window.__spokeduSubtitleObs?.events || []).slice(-40));
  } catch {
    return [];
  }
}

/**
 * 소제목 실험용 DOM 스냅샷 (텍스트 80자 truncate).
 * @param {import('playwright').Page} page
 * @param {string} label
 */
export async function captureSubtitleEditorSnapshot(page, label) {
  const documentDom = await readEditorFullDocumentDom(page);
  const top = await page.evaluate((label) => {
    const ae = document.activeElement;
    return {
      surface: 'top',
      label,
      t: Date.now(),
      toolbarTextFormatLabel: document
        .querySelector('.se-text-format-toolbar-button')
        ?.textContent?.trim()
        ?.slice(0, 24),
      activeElement: ae
        ? `${ae.tagName}.${String(ae.className || '').slice(0, 72)}`
        : null,
      eventTail: (window.__spokeduSubtitleObs?.events || []).slice(-25),
    };
  }, label);

  top.pageUrl = page.url().split('#')[0];
  top.documentRoot = documentDom.documentRoot;
  top.moduleCount = documentDom.moduleCount;
  top.sectionTitleModuleCount = documentDom.sectionTitleModuleCount;
  top.fingerprint = documentDom.fingerprint;
  top.fullDocumentFingerprint = documentDom.fullDocumentFingerprint;
  top.modules = documentDom.modules.map((m) => ({
    className: m.moduleClass,
    kind: m.kind,
    text: m.text.slice(0, 80),
    paragraphTexts: m.paragraphTexts.map((t) => t.slice(0, 80)),
    locationClass: m.locationClass,
    sectionIndex: m.sectionIndex,
  }));
  top.sections = documentDom.sections.map((s) => ({
    globalSectionIndex: s.globalSectionIndex,
    sectionIndexInCanvas: s.sectionIndexInCanvas,
    inCanvas: s.inCanvas,
    visible: s.visible,
    moduleCount: s.moduleCount,
    boundingRect: s.boundingRect,
    modules: s.modules.map((m) => ({
      kind: m.kind,
      text: (m.text || '').slice(0, 80),
      locationClass: m.locationClass,
    })),
  }));
  top.allOccurrences = documentDom.allOccurrences;
  top.document = {
    logicalParagraphTexts: documentDom.logicalParagraphTexts.map((t) => t.slice(0, 80)),
    fingerprint: documentDom.fingerprint,
    fullDocumentFingerprint: documentDom.fullDocumentFingerprint,
  };

  /** @type {Array<{ surface: string, frameUrl: string, eventTail: unknown[], imeInputCount?: number }>} */
  const frames = [];
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    const eventTail = await readObservationTail(frame);
    const imeInputCount = eventTail.filter(
      (e) =>
        e &&
        typeof e === 'object' &&
        (e.type === 'input' || e.type === 'beforeinput') &&
        /insert(CompositionText|Text)/.test(String(e.detail || '')),
    ).length;
    frames.push({
      surface: 'frame',
      frameUrl: frame.url().split('?')[0].slice(0, 100),
      eventTail,
      imeInputCount,
      contentEditableFocusedEvents: eventTail.filter(
        (e) => e && typeof e === 'object' && e.contentEditableFocused === true,
      ).length,
    });
  }
  top.frameEvents = frames;
  top.focusFrames = await readEditorFocusAcrossFrames(page);
  return top;
}

/**
 * @param {Awaited<ReturnType<typeof readEditorFullDocumentDom>>} doc
 * @param {string} exactText
 */
export function locateTextInEditorDocument(doc, exactText) {
  const exp = norm(exactText);
  if (!exp) return null;

  /** @type {Array<object>} */
  const hits = [];
  for (const sec of doc.sections || []) {
    for (const m of sec.modules || []) {
      const paraHit = m.paragraphTexts?.find((t) => norm(t) === exp);
      const joinedHit = norm(m.text) === exp;
      if (!paraHit && !joinedHit) continue;
      hits.push({
        moduleClass: m.moduleClass,
        kind: m.kind,
        text: paraHit || m.text,
        fontSizePx: m.fontSizePx,
        fontWeight: m.fontWeight,
        moduleIndex: m.moduleIndex ?? m.moduleIndexInSection,
        moduleIndexInSection: m.moduleIndexInSection,
        sectionIndex: m.sectionIndex,
        globalSectionIndex: m.globalSectionIndex,
        moduleId: m.moduleId,
        locationClass: m.locationClass,
        visible: m.visible,
        inCanvas: m.inCanvas,
        ancestorPath: m.ancestorPath?.slice(0, 5),
        boundingRect: m.boundingRect,
      });
    }
  }
  if (!hits.length) return null;

  const rank = (h) => {
    if (h.locationClass === 'VISIBLE_DOCUMENT_BLOCK') return 0;
    if (h.locationClass === 'HIDDEN_DUPLICATE') return 1;
    if (h.locationClass === 'OUTSIDE_EDITOR') return 2;
    return 3;
  };
  hits.sort((a, b) => rank(a) - rank(b));
  return hits[0];
}

/** @param {Awaited<ReturnType<typeof readEditorFullDocumentDom>>} doc @param {string} exactText */
function matchExpectedInLogicalDocument(doc, exactText) {
  const hit = locateTextInEditorDocument(doc, exactText);
  if (!hit || hit.locationClass !== 'VISIBLE_DOCUMENT_BLOCK') return null;
  return hit;
}

export async function findModuleForExactText(page, exactText) {
  const doc = await readEditorFullDocumentDom(page);
  return matchExpectedInLogicalDocument(doc, exactText);
}

/**
 * Playwright page ↔ top document DOM 판독 대상 일치 (read-only).
 * @param {import('playwright').Page} page
 */
export async function captureExecutionTargetAlignment(page) {
  const playwrightUrl = page.url().split('#')[0];
  const doc = await readEditorFullDocumentDom(page);
  const probe = await page.evaluate(() => {
    const canvas = document.querySelector('.se-canvas');
    return {
      documentHasFocus: document.hasFocus(),
      visibilityState: document.visibilityState,
      href: location.href.split('#')[0],
      pageTitle: document.title,
      canvasId: canvas?.id || null,
      postWriteForm: /PostWriteForm\.naver/i.test(location.href),
      activeElement: document.activeElement
        ? `${document.activeElement.tagName}.${String(document.activeElement.className || '').slice(0, 60)}`
        : null,
    };
  });
  const frameFocus = await readEditorFocusAcrossFrames(page);
  const urlMatch = playwrightUrl === probe.href;
  const canvasIdMatch = (doc.documentRoot?.canvasId ?? null) === probe.canvasId;
  const domReadAligned =
    urlMatch && canvasIdMatch && probe.postWriteForm && !page.isClosed();
  return {
    aligned: domReadAligned,
    domReadAligned,
    playwrightPageClosed: page.isClosed(),
    playwrightPageUrl: playwrightUrl,
    domReadUrl: probe.href,
    urlMatch,
    canvasId: probe.canvasId,
    documentRootCanvasId: doc.documentRoot?.canvasId ?? null,
    canvasIdMatch,
    canvasMatch: canvasIdMatch,
    postWriteForm: probe.postWriteForm,
    documentHasFocus: probe.documentHasFocus,
    visibilityState: probe.visibilityState,
    pageTitle: probe.pageTitle,
    topActiveElement: probe.activeElement,
    topDocument: probe,
    documentRootFromRead: doc.documentRoot,
    frameFocus,
    documentRoot: doc.documentRoot,
    sectionTitleModuleCount: doc.sectionTitleModuleCount,
    logicalModuleCount: doc.moduleCount,
    sectionCountPage: doc.documentRoot?.sectionCountPage,
    sectionCountInCanvas: doc.documentRoot?.sectionCountInCanvas,
  };
}

/**
 * @param {Awaited<ReturnType<typeof readEditorFullDocumentDom>>} doc
 * @param {typeof N1_PROBE_BLOCKS} [blocks]
 */
export function summarizeProbeTextLocations(doc, blocks = N1_PROBE_BLOCKS) {
  return blocks.map((b, i) => {
    const label = i === 0 ? 'A' : i === 1 ? 'B' : 'C';
    const loc = locateTextInEditorDocument(doc, b.text);
    return {
      label,
      role: b.role,
      textPreview: b.text.slice(0, 56),
      locationClass: loc?.locationClass ?? null,
      inLogicalDocument: loc?.locationClass === 'VISIBLE_DOCUMENT_BLOCK',
      kind: loc?.kind ?? null,
      sectionIndex: loc?.sectionIndex ?? null,
      globalSectionIndex: loc?.globalSectionIndex ?? null,
    };
  });
}

/**
 * A/B/C 위치 요약 (read-only).
 * @param {import('playwright').Page} page
 */
export async function probeThreeBlockTextLocations(page, blocks = N1_PROBE_BLOCKS) {
  const doc = await readEditorFullDocumentDom(page);
  const labels = ['A', 'B', 'C'];
  /** @type {Record<string, unknown>} */
  const byLabel = {};
  blocks.forEach((b, i) => {
    const loc = locateTextInEditorDocument(doc, b.text);
    byLabel[labels[i]] = loc
      ? {
          found: true,
          locationClass: loc.locationClass,
          kind: loc.kind,
          inCanvas: loc.inCanvas,
          visible: loc.visible,
          sectionIndex: loc.sectionIndex,
          textPreview: String(loc.text || '').slice(0, 80),
        }
      : { found: false, expectedPreview: b.text.slice(0, 80) };
  });
  return {
    documentRoot: doc.documentRoot,
    sectionTitleModuleCount: doc.sectionTitleModuleCount,
    logicalParagraphTexts: doc.logicalParagraphTexts.map((t) => t.slice(0, 80)),
    allOccurrences: doc.allOccurrences,
    byLabel,
  };
}

/**
 * @param {import('playwright').Page} page
 */
export async function captureRecordSessionBinding(page) {
  const doc = await readEditorFullDocumentDom(page);
  const frameUrls = page
    .frames()
    .map((f) => f.url().split('?')[0].slice(0, 120))
    .sort();
  return {
    pageUrl: page.url().split('#')[0],
    pageTitle: await page.title().catch(() => ''),
    frameUrls,
    frameCount: frameUrls.length,
    documentRoot: doc.documentRoot,
    documentFingerprint: doc.fingerprint,
    fullDocumentFingerprint: doc.fullDocumentFingerprint,
    capturedAt: Date.now(),
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {Awaited<ReturnType<typeof captureRecordSessionBinding>>} binding
 */
export async function verifyRecordSessionBinding(page, binding) {
  const now = await captureRecordSessionBinding(page);
  const drift = [];
  if (now.pageUrl !== binding.pageUrl) {
    drift.push({ field: 'pageUrl', before: binding.pageUrl, after: now.pageUrl });
  }
  if (now.documentRoot?.canvasId !== binding.documentRoot?.canvasId) {
    drift.push({
      field: 'canvasId',
      before: binding.documentRoot?.canvasId,
      after: now.documentRoot?.canvasId,
    });
  }
  if (now.documentRoot?.sectionCountInCanvas !== binding.documentRoot?.sectionCountInCanvas) {
    drift.push({
      field: 'sectionCountInCanvas',
      before: binding.documentRoot?.sectionCountInCanvas,
      after: now.documentRoot?.sectionCountInCanvas,
    });
  }
  const beforeFrames = new Set(binding.frameUrls || []);
  const afterFrames = new Set(now.frameUrls || []);
  for (const u of afterFrames) {
    if (!beforeFrames.has(u)) drift.push({ field: 'frameAdded', url: u });
  }
  return {
    stable: drift.length === 0,
    before: binding,
    after: now,
    drift,
  };
}

/**
 * @param {object} beforeSnap
 * @param {object} afterSnap
 */
function snapshotStructureFingerprint(snap) {
  if (snap?.fullDocumentFingerprint) return snap.fullDocumentFingerprint;
  if (snap?.document?.fullDocumentFingerprint) return snap.document.fullDocumentFingerprint;
  if (snap?.fingerprint) return snap.fingerprint;
  if (snap?.documentFingerprint) return snap.documentFingerprint;
  if (snap?.document?.fingerprint) return snap.document.fingerprint;
  const mods = snap?.modules || [];
  return mods.map((m) => `${m.locationClass || 'VISIBLE_DOCUMENT_BLOCK'}:${m.kind || 'paragraph'}:${norm(m.text || '')}`).join('|');
}

function collectTextsFromSnapshot(snap) {
  /** @type {string[]} */
  const out = [];
  if (snap?.document?.logicalParagraphTexts) {
    out.push(...snap.document.logicalParagraphTexts.map((t) => norm(t)).filter(Boolean));
  }
  for (const o of snap?.allOccurrences || []) {
    if (o?.textPreview) out.push(norm(o.textPreview));
  }
  for (const m of snap?.modules || []) {
    if (m?.text) out.push(norm(m.text));
  }
  return [...new Set(out)];
}

/**
 * @param {object} beforeSnap
 * @param {object} afterSnap
 * @param {{ expectedTexts?: string[] }} [opts]
 */
export function diagnoseInputVsDocumentCommit(beforeSnap, afterSnap, opts = {}) {
  const beforeFp = snapshotStructureFingerprint(beforeSnap);
  const afterFp = snapshotStructureFingerprint(afterSnap);
  const logicalChanged = (beforeSnap?.fingerprint ?? '') !== (afterSnap?.fingerprint ?? '');
  const fullDocChanged = beforeFp !== afterFp;

  const afterTexts = collectTextsFromSnapshot(afterSnap);
  const expected = (opts.expectedTexts || []).map((t) => norm(t)).filter(Boolean);
  const expectedInFullDocument = expected.filter((e) => afterTexts.includes(e));
  const expectedMissing = expected.filter((e) => !afterTexts.includes(e));

  /** @type {unknown[]} */
  const imeEvents = [];
  for (const fe of afterSnap?.frameEvents || []) {
    for (const ev of fe.eventTail || []) {
      if (!ev || typeof ev !== 'object') continue;
      if (
        (ev.type === 'input' || ev.type === 'beforeinput') &&
        /insert(CompositionText|Text)/.test(String(ev.detail || ''))
      ) {
        imeEvents.push({ frameUrl: fe.frameUrl, ...ev });
      }
    }
  }

  const afterManualStart = beforeSnap?.t ?? 0;
  const imeAfterManual = imeEvents.filter((e) => typeof e.t === 'number' && e.t >= afterManualStart);

  const inputStages = {
    keyInputObserved: imeAfterManual.length > 0,
    iframeInputEvents: imeAfterManual.length,
    fullDocumentDomChanged: fullDocChanged,
    logicalDocumentChanged: logicalChanged,
    expectedTextsInFullDocument: expectedInFullDocument,
    expectedTextsMissing: expectedMissing,
  };

  if (imeAfterManual.length > 0 && expectedMissing.length > 0) {
    return {
      code: 'INPUT_EVENT_WITHOUT_DOCUMENT_COMMIT',
      ...inputStages,
      imeEventCount: imeAfterManual.length,
      beforeFingerprint: beforeFp,
      afterFingerprint: afterFp,
      afterAllTextsPreview: afterTexts.map((t) => t.slice(0, 48)),
    };
  }
  if (imeAfterManual.length > 0 && fullDocChanged) {
    return {
      code: 'DOCUMENT_STRUCTURE_CHANGED',
      ...inputStages,
      imeEventCount: imeAfterManual.length,
      beforeFingerprint: beforeFp,
      afterFingerprint: afterFp,
    };
  }
  return {
    code: imeAfterManual.length > 0 ? 'INPUT_EVENTS_OBSERVED' : 'NO_INPUT_EVENTS_OBSERVED',
    ...inputStages,
    imeEventCount: imeAfterManual.length,
    beforeFingerprint: beforeFp,
    afterFingerprint: afterFp,
  };
}

/**
 * 저장된 record-subtitle JSON 감사 (브라우저 불필요).
 * @param {object} report
 */
export function auditRecordSubtitleReport(report) {
  const v = report?.verify || {};
  const structureTexts = (v.structure?.blocks || []).map((b) => norm(b.text)).filter(Boolean);
  const textLocations = v.textLocations || {};
  const afterSnap = report?.snapshots?.after || {};
  const afterOccurrences = afterSnap.allOccurrences || v.structure?.allOccurrences || [];

  /** @type {Record<string, unknown>} */
  const textAudit = {};
  const labels = [
    ['A', N1_PROBE_BLOCKS[0].text],
    ['B', N1_PROBE_BLOCKS[1].text],
    ['C', N1_PROBE_BLOCKS[2].text],
  ];
  for (const [key, expText] of labels) {
    const exp = norm(expText);
    const legacyBlock = v.blocks?.[key] ?? null;
    const loc = textLocations[key] ?? null;
    const inLogicalStructure = structureTexts.some((t) => t === exp);
    const occurrences = afterOccurrences.filter((o) => norm(o.textPreview) === exp);
    /** @type {TextLocationClass} */
    let locationClass = 'UNRESOLVED';
    if (loc?.locationClass) locationClass = loc.locationClass;
    else if (occurrences.length === 1) locationClass = occurrences[0].locationClass || 'UNRESOLVED';
    else if (occurrences.length > 1) {
      const visible = occurrences.find((o) => o.locationClass === 'VISIBLE_DOCUMENT_BLOCK');
      locationClass = visible?.locationClass || occurrences[0].locationClass || 'UNRESOLVED';
    } else if (legacyBlock?.text && !inLogicalStructure) {
      locationClass = 'UNRESOLVED';
    } else if (inLogicalStructure) locationClass = 'VISIBLE_DOCUMENT_BLOCK';

    textAudit[key] = {
      inLogicalStructure,
      legacyVerifyBlock: legacyBlock,
      locationClass,
      occurrenceCount: occurrences.length,
      occurrences: occurrences.slice(0, 3),
      verifierInconsistent:
        !!legacyBlock?.text && !inLogicalStructure && !loc && occurrences.length === 0,
    };
  }

  const legacyCInBlocks = !!v.blocks?.C?.text;
  const cInStructure = structureTexts.some((t) => t === norm(N1_PROBE_BLOCKS[2].text));

  return {
    mode: report?.mode,
    pollCount: report?.pollDuringWindow?.length ?? 0,
    logicalStructureTextCount: structureTexts.length,
    textAudit,
    preservedFindings: {
      AInLogicalStructure: textAudit.A?.inLogicalStructure === true,
      BFound: !!v.blocks?.B || textAudit.B?.occurrenceCount > 0,
      CLegacyBlockPresent: legacyCInBlocks,
      CInLogicalStructure: cInStructure,
      iframeImeEvents: (report?.snapshots?.after?.frameEvents || [])
        .filter((f) => /about:blank/i.test(f.frameUrl || ''))
        .flatMap((f) => f.eventTail || [])
        .filter(
          (e) =>
            e &&
            (e.type === 'input' || e.type === 'beforeinput') &&
            /insertCompositionText|insertText/.test(String(e.detail || '')),
        ).length,
      legacyVerifyStructureMismatch: legacyCInBlocks && !cInStructure,
    },
    cLocationFromLog:
      textAudit.C?.occurrenceCount > 0
        ? textAudit.C.locationClass
        : legacyCInBlocks && !cInStructure
          ? 'UNRESOLVED'
          : cInStructure
            ? 'VISIBLE_DOCUMENT_BLOCK'
            : 'UNRESOLVED',
    documentCommit: report?.documentCommit?.code ?? null,
  };
}

/**
 * @param {import('playwright').Page} page
 */
export async function readEditorFocusAcrossFrames(page) {
  const top = await page.evaluate(() => ({
    surface: 'top',
    activeElement: document.activeElement
      ? `${document.activeElement.tagName}.${String(document.activeElement.className || '').slice(0, 60)}`
      : null,
    selectionLen: (window.getSelection()?.toString() || '').trim().length,
  }));

  /** @type {Array<{ surface: string, frameUrl: string, activeElement: string | null, selectionLen: number }>} */
  const frames = [];
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    try {
      const snap = await frame.evaluate(() => ({
        activeElement: document.activeElement
          ? `${document.activeElement.tagName}.${String(document.activeElement.className || '').slice(0, 60)}`
          : null,
        selectionLen: (window.getSelection()?.toString() || '').trim().length,
      }));
      frames.push({
        surface: 'iframe',
        frameUrl: frame.url().split('?')[0].slice(0, 120),
        ...snap,
      });
    } catch {
      /* cross-origin */
    }
  }
  return { top, frames };
}

/**
 * @param {import('playwright').Page} page
 * @param {typeof N1_PROBE_BLOCKS} blocks
 */
export async function verifyN1ProbeDocument(page, blocks = N1_PROBE_BLOCKS) {
  const doc = await readEditorFullDocumentDom(page);
  const structure = {
    blocks: doc.blocks,
    moduleCount: doc.moduleCount,
    paragraphDomCount: doc.paragraphDomCount,
    documentRoot: doc.documentRoot,
    sectionTitleModuleCount: doc.sectionTitleModuleCount,
    fingerprint: doc.fingerprint,
    fullDocumentFingerprint: doc.fullDocumentFingerprint,
    sections: doc.sections.map((s) => ({
      globalSectionIndex: s.globalSectionIndex,
      inCanvas: s.inCanvas,
      visible: s.visible,
      moduleCount: s.moduleCount,
    })),
    allOccurrences: doc.allOccurrences,
  };
  const texts = doc.logicalParagraphTexts.map((t) => norm(t)).filter(Boolean);
  const expected = blocks.map((b) => norm(b.text));
  const textOrderOk = texts.length === expected.length && texts.every((t, i) => t === expected[i]);

  const locA = locateTextInEditorDocument(doc, blocks[0].text);
  const locB = locateTextInEditorDocument(doc, blocks[1].text);
  const locC = locateTextInEditorDocument(doc, blocks[2].text);

  const blockA = matchExpectedInLogicalDocument(doc, blocks[0].text);
  const blockB = matchExpectedInLogicalDocument(doc, blocks[1].text);
  const blockC = matchExpectedInLogicalDocument(doc, blocks[2].text);

  const textLocations = {
    A: locA,
    B: locB,
    C: locC,
  };

  const blocksConsistentWithStructure =
    (!blockA || structure.blocks.some((b) => norm(b.text) === norm(blockA.text))) &&
    (!blockB || structure.blocks.some((b) => norm(b.text) === norm(blockB.text))) &&
    (!blockC || structure.blocks.some((b) => norm(b.text) === norm(blockC.text)));

  const headingModuleOk = blockB?.kind === 'sectionTitle';
  const bodyRestoreOk =
    !!blockC &&
    blockC.kind === 'paragraph' &&
    (blockC.fontSizePx ?? 99) <= 17 &&
    (blockA?.fontSizePx ?? 99) <= 17;
  const headingVisualOk =
    headingModuleOk &&
    ((blockB?.fontSizePx ?? 0) >= (blockA?.fontSizePx ?? 0) ||
      (Number(blockB?.fontWeight) || 400) >= 600);

  const focusFrames = await readEditorFocusAcrossFrames(page);

  return {
    pass: textOrderOk && headingModuleOk && bodyRestoreOk && headingVisualOk,
    textOrderOk,
    headingModuleOk,
    bodyRestoreOk,
    headingVisualOk,
    texts,
    expected,
    structure,
    blocks: {
      A: blockA,
      B: blockB,
      C: blockC,
    },
    textLocations,
    blocksConsistentWithStructure,
    focusFrames,
    failures: [
      !textOrderOk && { code: 'TEXT_ORDER', detail: { texts, expected } },
      !blocksConsistentWithStructure && {
        code: 'VERIFY_BLOCKS_STRUCTURE_MISMATCH',
        detail: { blocks: { A: !!blockA, B: !!blockB, C: !!blockC }, textLocations },
      },
      locC && locC.locationClass !== 'VISIBLE_DOCUMENT_BLOCK' && {
        code: 'TEXT_C_LOCATION',
        detail: { locationClass: locC.locationClass, locC },
      },
      locB && locB.locationClass !== 'VISIBLE_DOCUMENT_BLOCK' && {
        code: 'TEXT_B_LOCATION',
        detail: { locationClass: locB.locationClass, locB },
      },
      !headingModuleOk && { code: 'HEADING_NOT_SECTION_TITLE', detail: blockB ?? locB },
      !bodyRestoreOk && { code: 'BODY_STYLE_NOT_RESTORED', detail: { A: blockA, C: blockC ?? locC } },
      !headingVisualOk && { code: 'HEADING_VISUAL_WEAK', detail: blockB },
    ].filter(Boolean),
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {Awaited<ReturnType<typeof loadStyleBlockPlan>>} plan
 */
export async function verifyN1HeadingModules(page, plan) {
  const structure = await readDocumentLogicalStructure(page);
  const rows = [];
  for (const hi of plan.headingIndexes) {
    const exp = norm(plan.paragraphs[hi]);
    const block = await findModuleForExactText(page, plan.paragraphs[hi]);
    rows.push({
      planIndex: hi,
      text: exp.slice(0, 48),
      found: !!block,
      kind: block?.kind ?? null,
      moduleClass: block?.moduleClass ?? null,
      fontSizePx: block?.fontSizePx ?? null,
      fontWeight: block?.fontWeight ?? null,
      pass: block?.kind === 'sectionTitle',
    });
  }
  return {
    pass: rows.every((r) => r.pass),
    rows,
    structureSummary: {
      moduleCount: structure.moduleCount,
      paragraphDomCount: structure.paragraphDomCount,
      logicalTextCount: structure.blocks.filter((b) => norm(b.text)).length,
    },
  };
}

/** @param {import('playwright').Page} page */
export async function deactivateToolbarBoldAfterInsert(page) {
  await applyBold(page, false);
  await page.keyboard.press('End');
}

/** @param {import('playwright').Page} page */
export async function ensureEditorFocus(page) {
  await page.locator('.se-content').click({ force: true });
  await page.waitForTimeout(80);
}

/**
 * @param {import('playwright').Page} page
 * @param {string} exactText
 */
export async function findParagraphIndexByExactText(page, exactText) {
  return page.evaluate((exp) => {
    const norm = (s) =>
      String(s || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const ps = [...document.querySelectorAll('.se-section-text .se-text-paragraph')];
    return ps.findIndex((p) => norm(p.innerText) === norm(exp));
  }, exactText);
}

/**
 * @param {import('playwright').Page} page
 * @param {number} paragraphIndex
 */
export async function readParagraphFullBoldState(page, paragraphIndex) {
  return page.evaluate((idx) => {
    const norm = (s) =>
      String(s || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const collectTextNodes = (root) => {
      const nodes = [];
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        if (norm(n.textContent || '')) nodes.push(n);
      }
      return nodes;
    };
    const textNodeBold = (tn) => {
      const host = tn.parentElement;
      if (!host) return false;
      if (host.closest('b, strong')) return true;
      return (Number(getComputedStyle(host).fontWeight) || 400) >= 600;
    };
    const el = document.querySelectorAll('.se-section-text .se-text-paragraph')[idx];
    if (!el) return { code: 'TARGET_NOT_FOUND', fullBold: false };
    const full = norm(el.innerText);
    const textNodes = collectTextNodes(el);
    const boldTags = [...el.querySelectorAll('b, strong')];
    const bold = norm(boldTags.map((n) => n.innerText || '').join(''));
    const emptyBoldShell = boldTags.some((n) => !norm(n.textContent || ''));
    const textNodeStates = textNodes.map((tn) => ({
      preview: norm(tn.textContent || '').slice(0, 24),
      inBold: textNodeBold(tn),
      fontWeight: tn.parentElement ? getComputedStyle(tn.parentElement).fontWeight : null,
    }));
    const allTextNodesBold = textNodes.length > 0 && textNodes.every(textNodeBold);
    const leafMaxFontWeight = textNodeStates.length
      ? Math.max(...textNodeStates.map((t) => Number(t.fontWeight) || 400), 400)
      : 400;
    const fullBoldTag = full.length > 0 && full === bold;
    const fullBold = allTextNodesBold;
    return {
      code: fullBold ? 'OK' : textNodeStates.some((t) => t.inBold) ? 'PARTIAL_BOLD' : 'BOLD_NOT_APPLIED',
      fullBold,
      fullBoldTag,
      allTextNodesBold,
      textNodeCount: textNodes.length,
      textNodeStates,
      leafMaxFontWeight,
      hasBoldTag: boldTags.length > 0,
      emptyBoldShell,
      textLen: full.length,
      boldLen: bold.length,
    };
  }, paragraphIndex);
}

/** @param {import('playwright').Page} page */
export async function readToolbarBoldActive(page) {
  return (await page.locator(STYLE_SEL.boldActive).count()) > 0;
}

/**
 * 읽기 전용 — 빈 `<b>` 껍데기 존재 여부만 보고 (운영 경로에서 DOM 삭제하지 않음).
 * @param {import('playwright').Page} page
 * @param {number} paragraphIndex
 */
export async function detectEmptyBoldShells(page, paragraphIndex) {
  return page.evaluate((idx) => {
    const el = document.querySelectorAll('.se-section-text .se-text-paragraph')[idx];
    if (!el) return { count: 0 };
    const empty = [...el.querySelectorAll('b, strong')].filter(
      (n) => !(n.textContent || '').replace(/\s/g, '').length,
    );
    return { count: empty.length };
  }, paragraphIndex);
}

/**
 * @param {import('playwright').Page} page
 * @param {number} paragraphIndex
 * @param {string} expectedText
 */
export async function readEditableFocusSnapshot(page, paragraphIndex) {
  return page.evaluate((idx) => {
    const norm = (s) =>
      String(s || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const el = document.querySelectorAll('.se-section-text .se-text-paragraph')[idx];
    if (!el) return { code: 'TARGET_NOT_FOUND' };
    const editable = el.closest('[contenteditable="true"]');
    const sel = window.getSelection();
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    const nodeLabel = (n) => {
      if (!n) return null;
      if (n.nodeType === 3) return `#text:${norm(n.textContent || '').slice(0, 20)}`;
      return `${n.nodeName}.${String(n.className || '').slice(0, 40)}`;
    };
    return {
      contenteditableClass: editable ? String(editable.className || '').slice(0, 80) : null,
      activeElement: document.activeElement
        ? `${document.activeElement.tagName}.${String(document.activeElement.className || '').slice(0, 60)}`
        : null,
      activeInEditable: !!(editable && document.activeElement && editable.contains(document.activeElement)),
      anchor: nodeLabel(sel.anchorNode),
      focus: nodeLabel(sel.focusNode),
      anchorOffset: sel.anchorOffset,
      focusOffset: sel.focusOffset,
      selectionText: norm(sel.toString()),
      rangeStart: range ? nodeLabel(range.startContainer) : null,
      rangeEnd: range ? nodeLabel(range.endContainer) : null,
      rangeStartOffset: range?.startOffset ?? null,
      rangeEndOffset: range?.endOffset ?? null,
    };
  }, paragraphIndex);
}

/**
 * @param {import('playwright').Page} page
 * @param {number} paragraphIndex
 * @param {string} expectedText
 */
export async function selectParagraphTextNodeRange(page, paragraphIndex, expectedText) {
  return page.evaluate(
    ({ idx, exp }) => {
      const norm = (s) =>
        String(s || '')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const focusEditable = (i) => {
        const p = document.querySelectorAll('.se-section-text .se-text-paragraph')[i];
        p?.scrollIntoView({ block: 'center' });
        const editable =
          document.querySelector('.se-content') ||
          document.querySelector('.se-main-container [contenteditable="true"]') ||
          document.querySelector('[contenteditable="true"]');
        editable?.focus();
        return { el: p, editable };
      };
      const { el, editable } = focusEditable(idx);
      if (!el) return { ok: false, code: 'TARGET_NOT_FOUND' };
      const textNodes = [];
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        if (norm(n.textContent || '')) textNodes.push(n);
      }
      if (!textNodes.length) return { ok: false, code: 'NO_TEXT_NODES' };
      const range = document.createRange();
      range.setStart(textNodes[0], 0);
      range.setEnd(textNodes[textNodes.length - 1], textNodes[textNodes.length - 1].length);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const full = norm(el.innerText);
      const selText = norm(sel.toString());
      const expNorm = norm(exp);
      const active = document.activeElement;
      const activeInEditable = !!(
        editable &&
        active &&
        (active === editable || editable.contains(active) || el.contains(active))
      );
      return {
        ok: selText === expNorm && selText === full,
        code: selText === expNorm && selText === full ? 'OK' : 'SELECTION_MISMATCH',
        textNodeCount: textNodes.length,
        fullLen: full.length,
        selLen: selText.length,
        selectedPreview: selText.slice(0, 48),
        activeInEditable,
        activeElement: active ? `${active.tagName}.${String(active.className || '').slice(0, 48)}` : null,
        editableClass: editable ? String(editable.className || '').slice(0, 80) : null,
      };
    },
    { idx: paragraphIndex, exp: expectedText },
  );
}

/**
 * 선택·포커스·Bold를 한 evaluate 컨텍스트에서 처리 (Selection 유지).
 * @param {import('playwright').Page} page
 * @param {number} paragraphIndex
 * @param {string} expectedText
 * @param {'keyboard' | 'execCommand'} mode
 */
export async function applyBoldInEditorContext(page, paragraphIndex, expectedText) {
  return page.evaluate(
    ({ idx, exp }) => {
      const norm = (s) =>
        String(s || '')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const focusEditable = (i) => {
        const p = document.querySelectorAll('.se-section-text .se-text-paragraph')[i];
        p?.scrollIntoView({ block: 'center' });
        const editable =
          document.querySelector('.se-content') ||
          document.querySelector('.se-main-container [contenteditable="true"]') ||
          document.querySelector('[contenteditable="true"]');
        editable?.focus();
        return { el: p, editable };
      };
      const { el, editable } = focusEditable(idx);
      if (!el) return { ok: false, code: 'TARGET_NOT_FOUND' };
      const textNodes = [];
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let tn;
      while ((tn = w.nextNode())) {
        if (norm(tn.textContent || '')) textNodes.push(tn);
      }
      if (!textNodes.length) return { ok: false, code: 'NO_TEXT_NODES' };
      const range = document.createRange();
      range.setStart(textNodes[0], 0);
      range.setEnd(textNodes[textNodes.length - 1], textNodes[textNodes.length - 1].length);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const full = norm(el.innerText);
      const selText = norm(sel.toString());
      const expNorm = norm(exp);
      if (selText !== expNorm || selText !== full) {
        return { ok: false, code: 'SELECTION_MISMATCH', selLen: selText.length, fullLen: full.length };
      }
      const before = {
        activeElement: document.activeElement
          ? `${document.activeElement.tagName}.${String(document.activeElement.className || '').slice(0, 48)}`
          : null,
        selectionText: selText,
        toolbarBold: !!document.querySelector('.se-bold-toolbar-button.se-is-activated'),
      };
      const boldBtn = document.querySelector('.se-bold-toolbar-button, button[data-name="bold"]');
      if (!boldBtn) return { ok: false, code: 'BOLD_BUTTON_NOT_FOUND', before };
      boldBtn.click();
      const afterSel = norm(window.getSelection()?.toString() || '');
      return {
        ok: true,
        code: 'OK',
        mode: 'range_toolbar_dom_click',
        before,
        afterSelectionText: afterSel,
        textNodeCount: textNodes.length,
        editableClass: editable ? String(editable.className || '').slice(0, 80) : null,
        toolbarBoldAfter: !!document.querySelector('.se-bold-toolbar-button.se-is-activated'),
      };
    },
    { idx: paragraphIndex, exp: expectedText },
  );
}

export async function diagnoseHeadingBoldParagraph(page, paragraphIndex, expectedText) {
  const hierarchy = await inspectDomTextHierarchy(page, paragraphIndex);
  const state = await readParagraphFullBoldState(page, paragraphIndex);
  const toolbarBold = await readToolbarBoldActive(page);
  const emptyShells = await detectEmptyBoldShells(page, paragraphIndex);
  const selTextNodes = await selectParagraphTextNodeRange(page, paragraphIndex, expectedText);
  const focusSnapshot = await readEditableFocusSnapshot(page, paragraphIndex);
  const domText = norm(hierarchy?.text || '');
  return {
    paragraphIndex,
    expectedMatch: domText === norm(expectedText),
    domTextPreview: domText.slice(0, 80),
    hierarchy,
    state,
    toolbarBold,
    emptyShells,
    selTextNodes,
    focusSnapshot,
    hasBoldTagVsBoldLen: {
      hasBoldTag: state.hasBoldTag,
      boldLen: state.boldLen,
      emptyBoldShell: state.emptyBoldShell,
      note:
        state.hasBoldTag && state.boldLen === 0
          ? 'b/strong exists but innerText empty — text likely outside bold wrapper'
          : null,
    },
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {number} paragraphIndex
 * @param {'full' | 'unbolded'} mode
 */
export async function selectParagraphTextRange(page, paragraphIndex, mode = 'full') {
  return page.evaluate(({ idx, mode: m }) => {
    const norm = (s) =>
      String(s || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const el = document.querySelectorAll('.se-section-text .se-text-paragraph')[idx];
    if (!el) return { code: 'TARGET_NOT_FOUND', ok: false };
    document.querySelector('.se-content')?.focus();
    const full = norm(el.innerText);
    const sel = window.getSelection();
    const tryRange = (range) => {
      sel.removeAllRanges();
      sel.addRange(range);
      const selText = norm(sel.toString());
      if (m === 'unbolded') return selText.length > 0;
      return selText === full && full.length > 0;
    };
    const range = document.createRange();
    const spans = [...el.querySelectorAll('span.__se-node')];
    let ok = false;
    let strategy = 'selectNodeContents';
    range.selectNodeContents(el);
    ok = tryRange(range);
    if (!ok && m === 'full' && spans.length >= 1) {
      strategy = 'spanEndpoints';
      range.setStart(spans[0], 0);
      range.setEnd(spans[spans.length - 1], spans[spans.length - 1].childNodes.length);
      ok = tryRange(range);
    }
    if (!ok && m === 'unbolded') {
      strategy = 'unboldedSpans';
      const targets = spans.filter((s) => !s.closest('b, strong') && norm(s.textContent || ''));
      if (targets.length) {
        range.setStart(targets[0], 0);
        range.setEnd(targets[targets.length - 1], targets[targets.length - 1].childNodes.length);
        ok = tryRange(range);
      }
    }
    const selText = norm(sel.toString());
    return {
      ok,
      strategy,
      code: ok ? 'OK' : 'SELECTION_MISMATCH',
      fullLen: full.length,
      selLen: selText.length,
      selectedPreview: selText.slice(0, 48),
    };
  }, { idx: paragraphIndex, mode });
}

/**
 * Golden Reference: .se-content 포커스 → Range → Bold UI (setBold(false)로 제거하지 않음).
 * @param {import('playwright').Page} page
 * @param {number} paragraphIndex
 */
export async function applyBoldToParagraphContents(page, paragraphIndex, expectedText) {
  if (paragraphIndex < 0) return { code: 'TARGET_NOT_FOUND' };

  const textCheck = await page.evaluate(
    ({ idx, exp }) => {
      const norm = (s) =>
        String(s || '')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const el = document.querySelectorAll('.se-section-text .se-text-paragraph')[idx];
      if (!el) return { ok: false, code: 'TARGET_NOT_FOUND' };
      const got = norm(el.innerText);
      return { ok: got === norm(exp), gotLen: got.length, code: got === norm(exp) ? 'OK' : 'TEXT_MISMATCH' };
    },
    { idx: paragraphIndex, exp: expectedText || '' },
  );
  if (expectedText && !textCheck.ok) {
    return { code: 'TEXT_MISMATCH', ...textCheck };
  }

  const pre = await readParagraphFullBoldState(page, paragraphIndex);
  if (pre.fullBold) {
    await page.keyboard.press('End');
    return { code: 'OK', strategy: 'already_full_bold', skipped: true, ...pre };
  }

  await focusBodyParagraph(page, paragraphIndex);

  const sel = await selectParagraphTextNodeRange(page, paragraphIndex, expectedText || '');
  if (!sel.ok) return { code: sel.code || 'SELECTION_MISMATCH', ...sel };

  const beforeCtrlB = {
    focus: await readEditableFocusSnapshot(page, paragraphIndex),
    selection: sel,
    toolbarBold: await readToolbarBoldActive(page),
  };

  let strategy = 'range_toolbar_playwright';
  if (beforeCtrlB.toolbarBold) {
    await applyBold(page, false);
    await focusBodyParagraph(page, paragraphIndex);
    await selectParagraphTextNodeRange(page, paragraphIndex, expectedText || '');
  }

  await page.locator(STYLE_SEL.bold).first().click({ force: true });
  await page.waitForTimeout(280);

  let finalState = await readParagraphFullBoldState(page, paragraphIndex);

  if (!finalState.fullBold) {
    strategy = 'range_toolbar_dom_click';
    const inCtx = await applyBoldInEditorContext(page, paragraphIndex, expectedText || '');
    beforeCtrlB.inContextToolbar = inCtx;
    await page.waitForTimeout(280);
    finalState = await readParagraphFullBoldState(page, paragraphIndex);
  }

  const afterCtrlB = {
    focus: await readEditableFocusSnapshot(page, paragraphIndex),
    toolbarBold: await readToolbarBoldActive(page),
  };

  const afterText = await page.evaluate((idx) => {
    const norm = (s) =>
      String(s || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const el = document.querySelectorAll('.se-section-text .se-text-paragraph')[idx];
    return norm(el?.innerText || '');
  }, paragraphIndex);
  if (expectedText && norm(afterText) !== norm(expectedText)) {
    return {
      code: 'TEXT_CHANGED_AFTER_BOLD',
      strategy,
      beforeCtrlB,
      afterCtrlB,
      ...finalState,
    };
  }

  await page.keyboard.press('End');
  return {
    code: finalState.fullBold ? 'OK' : finalState.code || 'BOLD_NOT_APPLIED',
    strategy,
    beforeCtrlB,
    afterCtrlB,
    ...finalState,
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {string[]} headingTexts
 */
export async function verifyHeadingBoldIntegrity(page, headingTexts) {
  const rows = [];
  for (const text of headingTexts) {
    const idx = await findParagraphIndexByExactText(page, text);
    if (idx < 0) {
      rows.push({ text: text.slice(0, 40), code: 'TARGET_NOT_FOUND' });
      continue;
    }
    const state = await readParagraphFullBoldState(page, idx);
    rows.push({ index: idx, text: text.slice(0, 40), ...state });
  }
  const pass = rows.every((r) => r.code === 'OK' && r.fullBold);
  return { pass, rows };
}

/**
 * @param {{ hasBoldTag?: boolean, leafMaxFontWeight?: number, fsClass?: string | null, maxFontPx?: number, role?: string }} styleRow
 */
export function paragraphBoldMatchesGolden(styleRow) {
  if (styleRow?.allTextNodesBold) return true;
  if (styleRow?.fullBoldTag) return true;
  if ((styleRow?.leafMaxFontWeight ?? 0) >= 600) return true;
  return false;
}

/**
 * @param {import('playwright').Page} page
 * @param {number} index
 */
export async function focusBodyParagraph(page, index) {
  await page.evaluate((idx) => {
    document.querySelectorAll('.se-section-text .se-text-paragraph')[idx]?.scrollIntoView({ block: 'center' });
  }, index);
  await page.locator(STYLE_SEL.bodyParagraph).nth(index).click({ force: true });
  await page.waitForTimeout(120);
}

/**
 * @param {import('playwright').Page} page
 */
/**
 * @param {import('playwright').Page} page
 * @param {number} [paragraphIndex]
 */
export async function readParagraphAlignState(page, paragraphIndex = 0) {
  return page.evaluate((idx) => {
    const p = document.querySelectorAll('.se-section-text .se-text-paragraph')[idx];
    if (!p) return { found: false, index: idx };
    const classes = [...p.classList];
    const isCenter = classes.some((c) => /align-center|align_center/i.test(c));
    const isRight = classes.some((c) => /align-right|align_right/i.test(c));
    const isLeft = classes.some((c) => /align-left|align_left/i.test(c));
    const inferredLeft = isLeft || (!isCenter && !isRight);
    return { found: true, index: idx, classes, isLeft: inferredLeft, isCenter, isRight };
  }, paragraphIndex);
}

/** @param {import('playwright').Page} page */
export async function probeAlignToolbarControls(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const triggers = [
      ...document.querySelectorAll('.se-toolbar-item-align button'),
      ...document.querySelectorAll('button[data-name="align"]'),
    ];
    const leftOptions = [
      ...document.querySelectorAll('.se-toolbar-option-align-left-button'),
      ...document.querySelectorAll('button[data-name="align-left"]'),
    ];
    const toolbarButtons = [...document.querySelectorAll('.se-toolbar button')]
      .filter(visible)
      .slice(0, 40)
      .map((b) => ({
        text: (b.innerText || '').trim().slice(0, 24),
        aria: (b.getAttribute('aria-label') || '').slice(0, 48),
        className: String(b.className || '').slice(0, 80),
      }));
    return {
      triggerCount: triggers.length,
      triggerVisible: triggers.filter(visible).length,
      leftOptionCount: leftOptions.length,
      leftOptionVisible: leftOptions.filter(visible).length,
      toolbarButtonsSample: toolbarButtons,
    };
  });
}

/**
 * @param {import('playwright').Page} page
 * @param {string} [tag]
 */
export async function writeAlignToolDiagnostics(page, tag = 'align-toolbar-fail') {
  await mkdir(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = join(REPORT_DIR, `${tag}-${stamp}`);
  const focus = await page.evaluate(() => ({
    url: location.href,
    activeTag: document.activeElement?.tagName?.toLowerCase() || null,
    activeClass: String(document.activeElement?.className || '').slice(0, 120),
    inIframe: window !== window.top,
  }));
  const alignState = await readParagraphAlignState(page, 0);
  const toolbar = await probeAlignToolbarControls(page);
  const payload = { capturedAt: new Date().toISOString(), focus, alignState, toolbar };
  await writeFile(`${base}.json`, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
  return { jsonPath: `${base}.json`, pngPath: `${base}.png`, payload };
}

/**
 * 본문 포커스 → 정렬 상태 확인 → 필요 시에만 메뉴에서 왼쪽 정렬.
 * @param {import('playwright').Page} page
 * @param {{ paragraphIndex?: number }} [opts]
 */
export async function applyLeftAlignIfNeeded(page, opts = {}) {
  const paragraphIndex = opts.paragraphIndex ?? 0;
  await ensureEditorFocus(page);
  await page.locator(STYLE_SEL.bodyParagraph).nth(paragraphIndex).click({ timeout: TOOLBAR_LOCATOR_MS });
  await page.waitForTimeout(100);

  let alignState = await readParagraphAlignState(page, paragraphIndex);
  if (alignState.found && alignState.isLeft && !alignState.isCenter && !alignState.isRight) {
    return { code: 'SKIPPED_ALREADY_LEFT', verified: true, alignState };
  }

  const trigger = page.locator(`${STYLE_SEL.alignTrigger}, button[data-name="align"]`).first();
  const triggerVisible = await trigger.isVisible({ timeout: TOOLBAR_LOCATOR_MS }).catch(() => false);
  if (!triggerVisible) {
    alignState = await readParagraphAlignState(page, paragraphIndex);
    if (alignState.found && alignState.isLeft && !alignState.isCenter) {
      return { code: 'SKIPPED_TOOLBAR_HIDDEN_LEFT_OK', verified: true, alignState };
    }
    const diagnostics = await writeAlignToolDiagnostics(page);
    const err = new Error('ALIGN_TOOLBAR_NOT_VISIBLE');
    err.code = 'ALIGN_TOOLBAR_NOT_VISIBLE';
    err.diagnostics = diagnostics;
    throw err;
  }

  await trigger.click({ timeout: TOOLBAR_LOCATOR_MS });
  await page.waitForTimeout(220);

  const leftSelectors = [
    '.se-toolbar-option-list .se-toolbar-option-align-left-button',
    STYLE_SEL.alignLeft,
    'button[data-name="align-left"]',
    '.se-toolbar-option-align-left-button',
  ];
  let clicked = false;
  for (const sel of leftSelectors) {
    const loc = page.locator(sel).first();
    if (await loc.isVisible({ timeout: 800 }).catch(() => false)) {
      await loc.click({ timeout: TOOLBAR_LOCATOR_MS });
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    const byRole = page.getByRole('button', { name: /왼쪽|left/i }).first();
    if (await byRole.isVisible({ timeout: 800 }).catch(() => false)) {
      await byRole.click({ timeout: TOOLBAR_LOCATOR_MS });
      clicked = true;
    }
  }

  await page.waitForTimeout(160);
  alignState = await readParagraphAlignState(page, paragraphIndex);

  if (!clicked && alignState.isLeft && !alignState.isCenter) {
    return { code: 'SKIPPED_MENU_ALREADY_LEFT', verified: true, alignState };
  }

  if (!alignState.found || alignState.isCenter || alignState.isRight) {
    const diagnostics = await writeAlignToolDiagnostics(page);
    const err = new Error(
      clicked ? 'ALIGN_VERIFY_FAILED' : 'ALIGN_LEFT_OPTION_NOT_VISIBLE',
    );
    err.code = clicked ? 'ALIGN_VERIFY_FAILED' : 'ALIGN_LEFT_OPTION_NOT_VISIBLE';
    err.diagnostics = diagnostics;
    err.alignState = alignState;
    throw err;
  }

  return { code: 'APPLIED', verified: true, alignState };
}

/** @deprecated applyLeftAlignIfNeeded 사용 */
export async function applyLeftAlign(page) {
  return applyLeftAlignIfNeeded(page);
}

/**
 * @param {import('playwright').Page} page
 * @param {11|13|15|16|19|24|28|30|34|38} size
 */
export async function applyFontSize(page, size) {
  await page.locator(STYLE_SEL.fontSizeTrigger).first().click({ timeout: TOOLBAR_LOCATOR_MS });
  await page.waitForTimeout(280);
  await page.locator(STYLE_SEL.fontSizeOption(size)).click({ timeout: TOOLBAR_LOCATOR_MS });
  await page.waitForTimeout(160);
}

/**
 * @param {import('playwright').Page} page
 * @param {boolean} on
 */
export async function applyBold(page, on) {
  const btn = page.locator(STYLE_SEL.bold).first();
  for (let attempt = 0; attempt < 4; attempt++) {
    const active = (await page.locator(STYLE_SEL.boldActive).count()) > 0;
    if ((on && active) || (!on && !active)) return;
    await btn.click({ force: true });
    await page.waitForTimeout(100);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {'body'|'sectionTitle'} kind
 */
export async function applyTextFormat(page, kind) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(80);
  await page.locator(STYLE_SEL.textFormatTrigger).first().click({ force: true, timeout: TOOLBAR_LOCATOR_MS });
  await page.waitForTimeout(240);
  if (kind === 'sectionTitle') {
    await page.locator(STYLE_SEL.textFormatSectionTitle).click({ force: true, timeout: TOOLBAR_LOCATOR_MS });
  } else {
    await page.locator(STYLE_SEL.textFormatBody).first().click({ force: true, timeout: TOOLBAR_LOCATOR_MS });
  }
  await page.waitForTimeout(180);
}

/**
 * @param {import('playwright').Page} page
 * @param {number} index
 * @param {'heading'|'paragraph'|'intro'} role
 * @param {{ allowSectionTitle?: boolean }} [opts]
 */
export async function styleParagraphByRole(page, index, role, opts = {}) {
  await focusBodyParagraph(page, index);
  await applyLeftAlignIfNeeded(page, { paragraphIndex: index });
  if (role === 'heading') {
    if (opts.allowSectionTitle) {
      await applyTextFormat(page, 'sectionTitle');
      await assertParagraphCountGate(page);
    } else {
      await applyTextFormat(page, 'body');
      await applyBold(page, true);
      await applyFontSize(page, 19);
    }
  } else {
    await applyTextFormat(page, 'body');
    await applyBold(page, false);
    await applyFontSize(page, 16);
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {string[]} expectedParagraphs
 * @param {number[]} headingIndexes
 */
export async function verifyPhase52Style(page, expectedParagraphs, headingIndexes) {
  const actual = await readBodyParagraphsFromDom(page);
  const structure = verifyDomParagraphOrder(expectedParagraphs, actual);
  const styles = await readParagraphStylesFromDom(page, headingIndexes);
  const leftCount = styles.filter((s) => s.alignClass.some((c) => c.includes('left'))).length;
  const centerCount = styles.filter((c) => c.alignClass.some((c) => c.includes('center'))).length;
  const bodyIndexes = styles.filter((s) => s.role === 'paragraph').map((s) => s.index);
  const headingDistinct =
    headingIndexes.every((i) => (styles[i]?.maxFontPx ?? 0) >= 18) &&
    bodyIndexes.every((i) => (styles[i]?.maxFontPx ?? 99) <= 17);
  const headingBold = headingIndexes.every((i) => paragraphBoldMatchesGolden(styles[i]));
  const failures = [];
  if (!structure.pass) failures.push({ code: 'TEXT_MISMATCH', detail: structure.reason });
  if (centerCount > 0) failures.push({ code: 'STYLE_NOT_APPLIED', detail: 'center_remaining', centerCount });
  if (!headingDistinct) failures.push({ code: 'STYLE_LEAK', detail: 'heading_vs_body_font_px' });
  if (!headingBold) failures.push({ code: 'STYLE_NOT_APPLIED', detail: 'heading_bold_dom' });
  return {
    pass: structure.pass && leftCount >= expectedParagraphs.length && centerCount === 0 && headingDistinct && headingBold,
    structure,
    styles,
    leftCount,
    centerCount,
    headingDistinct,
    headingBold,
    failures,
  };
}

/**
 * @param {import('playwright').Page} page
 * @param {{ mode?: 'READ_ONLY'|'PROTOTYPE'|'FULL', allowSectionTitle?: boolean, articleId?: string }} [opts]
 */
export async function runPhase52Style(page, opts = {}) {
  const mode = opts.mode || 'FULL';
  const plan = await loadStyleBlockPlan(opts.articleId);
  const report = {
    phase: 'PHASE52_STYLE',
    mode,
    articleId: plan.articleId,
    sourceSha256: plan.sourceSha256,
    startedAt: new Date().toISOString(),
    pass: false,
    saveClicked: false,
    publishClicked: false,
    saveDraftExecuted: false,
    publishExecuted: false,
    headingIndexes: plan.headingIndexes,
    appliedStyle: {
      align: 'left',
      bodyFontPx: 16,
      headingFontPx: 19,
      headingBold: true,
      sectionTitleUsed: false,
      note: 'sectionTitle는 문단 병합(19→18) 위험으로 기본 비활성',
    },
  };

  if (!/PostWriteForm\.naver/.test(page.url())) {
    report.failReason = { code: 'FOCUS_FAILURE', detail: 'not_on_PostWriteForm' };
    report.finishedAt = new Date().toISOString();
    return report;
  }

  try {
    await assertParagraphCountGate(page, plan.paragraphs.length);
    const beforeTexts = await readBodyParagraphsFromDom(page);
    const structureBefore = verifyDomParagraphOrder(plan.paragraphs, beforeTexts);
    report.contentBefore = { structure: structureBefore };

    if (mode === 'READ_ONLY') {
      report.styles = await readParagraphStylesFromDom(page, plan.headingIndexes);
      report.pass = structureBefore.pass;
      report.finishedAt = new Date().toISOString();
      return report;
    }

    const indices =
      mode === 'PROTOTYPE'
        ? [0, plan.headingIndexes[0] ?? 2, (plan.headingIndexes[0] ?? 2) + 1].filter(
            (v, i, a) => a.indexOf(v) === i,
          )
        : plan.paragraphs.map((_, i) => i);

    for (const i of indices) {
      const block = plan.blocks[i];
      const role = block?.role === 'heading' ? 'heading' : block?.role === 'intro' ? 'intro' : 'paragraph';
      const beforeOne = norm(await page.locator(STYLE_SEL.bodyParagraph).nth(i).innerText());
      await styleParagraphByRole(page, i, role === 'heading' ? 'heading' : 'paragraph', {
        allowSectionTitle: opts.allowSectionTitle === true,
      });
      await assertParagraphCountGate(page, plan.paragraphs.length);
      const afterOne = norm(await page.locator(STYLE_SEL.bodyParagraph).nth(i).innerText());
      if (beforeOne !== afterOne) {
        const err = new Error(`TEXT_MISMATCH at index ${i}`);
        err.code = 'TEXT_MISMATCH';
        report.textDelta = { index: i, beforeOne, afterOne };
        throw err;
      }
    }

    report.verify = await verifyPhase52Style(page, plan.paragraphs, plan.headingIndexes);
    report.pass = report.verify.pass === true;
    if (!report.pass && report.verify.failures?.length) {
      report.failReason = report.verify.failures[0];
    }
  } catch (e) {
    report.pass = false;
    report.failReason = report.failReason || { code: e.code || 'STYLE_NOT_APPLIED', detail: String(e.message || e) };
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

/**
 * @param {string} name
 * @param {object} payload
 */
export async function writePhase52ReportFile(name, payload) {
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(join(REPORT_DIR, name), JSON.stringify(payload, null, 2) + '\n', 'utf8');
}
