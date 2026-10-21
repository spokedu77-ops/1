/**
 * SPOKEDU — Naver PostWriteForm 신규 글 Phase 2–3 (preflight / input / save-draft).
 * PostUpdateForm·manifest·ledger·playwright-runner.mjs 는 건드리지 않는다.
 * 발행(PUBLISH) 단계는 구현·실행하지 않는다.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const REPORT_DIR = join(REPO_ROOT, 'reports', 'naver-new');
const HISTORY_PATH = join(REPORT_DIR, 'draft_execution_history.json');

export const BLOG_ID = 'spokedu77';
export const WRITE_URL = `https://blog.naver.com/PostWriteForm.naver?blogId=${BLOG_ID}`;

/** @readonly */
export const SEL = {
  title: '.se-section-documentTitle .se-title-text',
  body: '.se-section-text .se-text-paragraph',
};

/** Phase 3 임시저장 검증 전용 (실제 원고 eef9d371bedc 와 구분) */
export const TEST_COPY = {
  id: 'PH3-SAVE-DRAFT-TEST',
  title: '[SPOKEDU-PH3-DRAFT] 2026-10-21 임시저장 검증',
  body: '[SPOKEDU-PH3-DRAFT] 임시저장·재조회 검증용 본문. eef9d371bedc 원고 아님. 자동 발행 금지.',
};

/** Phase 3 PH3 테스트 원고 (실제 LLM 원고와 분리) */
export const MANUSCRIPT_HOLD = {
  id: 'eef9d371bedc',
  status: 'HOLD_SOURCE_REVIEW',
  autoPublishEligible: false,
};

import {
  runPhase4ArticlePrep,
  toNaverCopy,
  runPhase5LocalValidation,
  FINAL_EXPECTED_SHA256,
  finalNaverInputJsonPath,
  finalPackageToRunnerCopy,
} from './naver-article-pipeline.mjs';

export {
  runPhase4ArticlePrep,
  toNaverCopy,
  runPhase5LocalValidation,
  FINAL_EXPECTED_SHA256,
  finalNaverInputJsonPath,
  finalPackageToRunnerCopy,
};

/** Phase 5.2 — lazy export (순환 import 방지) */
export async function runPhase52Style(page, opts) {
  const m = await import('./naver-new-style-runner.mjs');
  return m.runPhase52Style(page, opts);
}
export async function loadStyleBlockPlan(articleId) {
  const m = await import('./naver-new-style-runner.mjs');
  return m.loadStyleBlockPlan(articleId);
}
export async function verifyPhase52Style(page, expectedParagraphs, headingIndexes) {
  const m = await import('./naver-new-style-runner.mjs');
  return m.verifyPhase52Style(page, expectedParagraphs, headingIndexes);
}
export async function loadStyleSel() {
  const m = await import('./naver-new-style-runner.mjs');
  return m.STYLE_SEL;
}

/** Phase 5.3 — lazy export */
export async function runPhase53StrategyA(page) {
  const m = await import('./naver-new-style-phase53.mjs');
  return m.runStrategyA(page);
}
export async function runPhase53StrategyB(page) {
  const m = await import('./naver-new-style-phase53.mjs');
  return m.runStrategyB(page);
}
export async function loadPhase53PrototypeParagraphs(articleId) {
  const m = await import('./naver-new-style-phase53.mjs');
  return m.loadPhase53PrototypeParagraphs(articleId);
}

const PLACEHOLDER_TITLE = '제목';
const PLACEHOLDER_BODY_MARKERS = ['글감과 함께', '기록해보세요'];

function sha256Text(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function sanitizeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}${u.search ? '?…' : ''}`;
  } catch {
    return String(url).split('?')[0];
  }
}

export function norm(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSaveDraftApproved() {
  return process.env.NAVER_SAVE_DRAFT_APPROVED === '1';
}

export async function loadDraftHistory() {
  try {
    const raw = await readFile(HISTORY_PATH, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data.runs) ? data : { runs: [] };
  } catch {
    return { runs: [] };
  }
}

/**
 * @param {object} entry
 */
export async function appendDraftHistory(entry) {
  const hist = await loadDraftHistory();
  hist.runs.push({ ...entry, recordedAt: new Date().toISOString() });
  hist.updatedAt = new Date().toISOString();
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(HISTORY_PATH, JSON.stringify(hist, null, 2) + '\n', 'utf8');
}

/**
 * @param {string} titleSha256
 */
export async function findVerifiedRun(titleSha256) {
  const hist = await loadDraftHistory();
  return hist.runs.find((r) => r.titleSha256 === titleSha256 && r.verified === true) || null;
}

/**
 * @param {import('playwright').Page} page
 */
export async function locateEditorRegions(page) {
  const title = page.locator(SEL.title);
  const body = page.locator(SEL.body);
  const titleCount = await title.count();
  const bodyCount = await body.count();
  return { title, body, titleCount, bodyCount };
}

/**
 * @param {import('playwright').Page} page
 */
export async function readTitleBodyFromDom(page) {
  const titleCount = await page.locator(SEL.title).count();
  const bodyCount = await page.locator(SEL.body).count();
  if (titleCount !== 1 || bodyCount < 1) {
    throw new Error(
      `SELECTOR_MISMATCH: title count=${titleCount}, body count=${bodyCount} (expected title=1, body>=1)`,
    );
  }
  return page.evaluate(({ titleSel, bodySel }) => {
    const titleEl = document.querySelector(titleSel);
    const bodyEl = document.querySelector(bodySel);
    return {
      title: (titleEl?.innerText || '').trim(),
      body: (bodyEl?.innerText || '').trim(),
    };
  }, { titleSel: SEL.title, bodySel: SEL.body });
}

/**
 * 본문 영역의 모든 `.se-text-paragraph` 텍스트 (순서 유지).
 * @param {import('playwright').Page} page
 */
export async function readBodyParagraphsFromDom(page) {
  const { readCanonicalEditorBodyDom } = await import('./naver-new-style-runner.mjs');
  const dom = await readCanonicalEditorBodyDom(page);
  return dom.logicalParagraphTexts;
}

/**
 * @param {string[]} expected
 * @param {string[]} actual
 */
export function verifyDomParagraphOrder(expected, actual) {
  const details = [];
  if (actual.length < expected.length) {
    return {
      pass: false,
      reason: 'missing_paragraphs',
      expectedCount: expected.length,
      actualCount: actual.length,
      details,
    };
  }
  if (actual.length > expected.length) {
    details.push({ note: 'extra_dom_paragraphs', extra: actual.length - expected.length });
  }
  for (let i = 0; i < expected.length; i++) {
    const exp = norm(expected[i]);
    const act = norm(actual[i] || '');
    const ok = act === exp || act.includes(exp) || exp.includes(act);
    details.push({ index: i, pass: ok, expectedPreview: exp.slice(0, 48), actualPreview: act.slice(0, 48) });
    if (!ok) {
      return {
        pass: false,
        reason: 'order_or_text_mismatch',
        failedIndex: i,
        expectedCount: expected.length,
        actualCount: actual.length,
        details,
      };
    }
  }
  const dupCheck = new Set(actual.map((a) => norm(a)));
  if (dupCheck.size < Math.min(actual.length, expected.length)) {
    return {
      pass: false,
      reason: 'possible_duplicate_paragraphs',
      expectedCount: expected.length,
      actualCount: actual.length,
      details,
    };
  }
  return { pass: true, expectedCount: expected.length, actualCount: actual.length, details };
}

/**
 * @param {{ title: string, body: string }} snap
 */
export function isEmptyEditorContent(snap) {
  const titleEmpty = !snap.title || snap.title === PLACEHOLDER_TITLE;
  const bodyEmpty =
    !snap.body || PLACEHOLDER_BODY_MARKERS.some((m) => snap.body.includes(m));
  return { titleEmpty, bodyEmpty, empty: titleEmpty && bodyEmpty };
}

/**
 * @param {import('playwright').Page} page
 * @param {import('playwright').Locator} loc
 * @param {string} text
 */
export async function focusAndKeyboardInsert(page, loc, text) {
  await loc.waitFor({ state: 'attached', timeout: 30000 });
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ force: true, timeout: 20000 });
  await page.waitForTimeout(150);
  await page.keyboard.press('Control+A');
  await page.waitForTimeout(80);
  await page.keyboard.insertText(text);
  await page.waitForTimeout(200);
}

/**
 * @param {import('playwright').Page} page
 */
export async function verifySaveButtonSemantics(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    const save = buttons.find((b) => (b.innerText || '').trim() === '저장');
    const publish = buttons.find((b) => (b.innerText || '').trim() === '발행');
    const draftList = buttons.find((b) => /임시저장/.test(b.getAttribute('aria-label') || ''));
    const onWriteForm = /PostWriteForm\.naver/.test(location.href);
    const onUpdateForm = /PostUpdateForm\.naver/.test(location.href);
    const draftListAria = draftList?.getAttribute('aria-label') || null;
    const confirmedTempSave =
      onWriteForm &&
      !onUpdateForm &&
      !!save &&
      !!publish &&
      save !== publish &&
      !!draftList &&
      /임시저장/.test(draftListAria || '');
    return {
      onWriteForm,
      onUpdateForm,
      hasSaveButton: !!save,
      hasPublishButton: !!publish,
      saveDistinctFromPublish: !!save && !!publish && save !== publish,
      draftListAria,
      confirmedTempSave,
      rationale:
        'PostWriteForm header: label "저장" is separate from "발행"; draft list control aria-label references 임시저장.',
    };
  });
}

/**
 * @param {import('playwright').Page} page
 */
export async function openDraftListPanel(page) {
  const draftBtn = page.getByRole('button', { name: /임시저장된 글/ });
  if ((await draftBtn.count()) < 1) {
    return { opened: false, reason: 'draft_list_button_missing' };
  }
  await draftBtn.first().click({ force: true });
  await page.waitForTimeout(900);
  return { opened: true };
}

/**
 * @param {import('playwright').Page} page
 * @param {string} titleNeedle
 */
export async function draftListContainsTitle(page, titleNeedle) {
  return page.evaluate((needle) => {
    const canvas = document.querySelector('.se-components-wrap');
    const canvasText = canvas?.innerText || '';
    const bodyText = document.body?.innerText || '';
    const outsideEditor = bodyText.replace(canvasText, '');
    return outsideEditor.includes(needle);
  }, titleNeedle);
}

/**
 * @param {import('playwright').Page} page
 */
/** @param {import('playwright').Page} page */
export async function dismissRestoreDraftDialog(page) {
  page.on('dialog', (d) => d.accept());
  const restoreHint = page.getByText('작성 중인 글이 있습니다');
  if (await restoreHint.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: '취소', exact: true }).click({ force: true });
    await page.waitForTimeout(400);
  }
}

/**
 * @param {import('playwright').Page} page
 */
export async function navigateFreshWriteForm(page) {
  const { navigateToWriteEditor } = await import('./naver-editor-entry.mjs');
  await navigateToWriteEditor(page);
}

/**
 * @param {import('playwright').Page} page
 * @param {{ manuscriptPath?: string; copy?: typeof TEST_COPY }} [opts]
 */
export async function runPreflight(page, opts = {}) {
  const copy = opts.copy || TEST_COPY;
  const startedAt = new Date().toISOString();
  const url = page.url();
  const report = {
    phase: 'PREFLIGHT',
    startedAt,
    pass: false,
    blogId: BLOG_ID,
    url: sanitizeUrl(url),
    steps: [],
    manuscript: { ...MANUSCRIPT_HOLD },
    testCopy: {
      id: copy.id,
      titleSha256: sha256Text(copy.title),
      bodySha256: sha256Text(copy.body),
    },
    saveDraftExecuted: false,
    publishExecuted: false,
  };

  const step = (name, pass, detail) => {
    report.steps.push({ name, pass, detail });
    if (!pass) report.failReason = { step: name, detail };
  };

  try {
    step('url-post-write-form', /PostWriteForm\.naver/.test(url), { url: report.url });
    if (!/PostWriteForm\.naver/.test(url)) {
      report.pass = false;
      return report;
    }

    step('url-not-update-form', !/PostUpdateForm\.naver/.test(url), {});
    step('url-blog-id', url.includes(`blogId=${BLOG_ID}`), { expected: BLOG_ID });

    const { titleCount, bodyCount } = await locateEditorRegions(page);
    step('selector-title-unique', titleCount === 1, { count: titleCount, selector: SEL.title });
    step('selector-body-present', bodyCount >= 1, { count: bodyCount, selector: SEL.body });

    if (titleCount !== 1 || bodyCount < 1) {
      report.pass = false;
      return report;
    }

    const snap = await readTitleBodyFromDom(page);
    const empty = isEmptyEditorContent(snap);
    step('editor-empty-or-placeholder', empty.empty || empty.titleEmpty || empty.bodyEmpty, {
      snapshot: { title: snap.title.slice(0, 40), body: snap.body.slice(0, 60) },
      ...empty,
    });

    const saveBtn = page.getByRole('button', { name: '저장', exact: true });
    const publishBtn = page.getByRole('button', { name: '발행', exact: true });
    step('save-button-visible', (await saveBtn.count()) >= 1 && (await saveBtn.first().isVisible()), {
      count: await saveBtn.count(),
    });
    step('publish-button-visible-not-clicked', (await publishBtn.count()) >= 1, {
      count: await publishBtn.count(),
      clicked: false,
    });

    const manuscriptPath =
      opts.manuscriptPath ||
      process.env.NAVER_NEW_MANUSCRIPT_JSON ||
      join(__dirname, 'manuscripts', `${MANUSCRIPT_HOLD.id}.json`);
    try {
      const raw = await readFile(manuscriptPath, 'utf8');
      report.manuscript.path = manuscriptPath;
      report.manuscript.sha256 = sha256Text(raw);
      step('manuscript-sha256', true, { sha256: report.manuscript.sha256 });
    } catch {
      report.manuscript.path = manuscriptPath;
      report.manuscript.sha256 = null;
      step('manuscript-sha256', true, { skipped: 'file_missing', note: 'HOLD manuscript not loaded' });
    }

    step('manuscript-hold-not-autopublish', MANUSCRIPT_HOLD.status === 'HOLD_SOURCE_REVIEW', {
      status: MANUSCRIPT_HOLD.status,
      autoPublishEligible: MANUSCRIPT_HOLD.autoPublishEligible,
    });

    const verifiedPrior = await findVerifiedRun(sha256Text(copy.title));
    step('history-no-prior-verified-save', !verifiedPrior, {
      priorRun: verifiedPrior
        ? { recordedAt: verifiedPrior.recordedAt, postIdentifier: verifiedPrior.postIdentifier }
        : null,
    });

    report.pass = report.steps.every((s) => s.pass);
  } catch (e) {
    report.pass = false;
    report.failReason = { step: 'exception', detail: String(e?.message || e) };
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

/**
 * LLM 원고 — 문단별 Enter 입력 (Phase 4 연동).
 * @param {import('playwright').Page} page
 * @param {{ title: string, paragraphs: string[], id?: string }} copy
 */
export async function runInputTestFromArticle(page, copy) {
  const startedAt = new Date().toISOString();
  const report = {
    phase: 'INPUT_TEST',
    startedAt,
    pass: false,
    url: sanitizeUrl(page.url()),
    expected: { title: copy.title, paragraphCount: copy.paragraphs?.length ?? 0 },
    saveClicked: false,
    publishClicked: false,
    source: copy.id?.startsWith('final-') ? 'final-naver-input' : 'article-pipeline',
  };

  try {
    if (!/PostWriteForm\.naver/.test(page.url())) throw new Error('REFUSED: not on PostWriteForm');
    const { title, body } = await locateEditorRegions(page);
    const titlePara = page.locator('.se-section-documentTitle .se-text-paragraph').first();
    const titleTarget = (await titlePara.count()) > 0 ? titlePara : title;
    await focusAndKeyboardInsert(page, titleTarget, copy.title);
    await focusAndKeyboardInsert(page, body.first(), copy.paragraphs[0] ?? '');
    for (let i = 1; i < copy.paragraphs.length; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      await page.keyboard.insertText(copy.paragraphs[i]);
      await page.waitForTimeout(80);
    }
    const readback = await readTitleBodyFromDom(page);
    const domParagraphs = await readBodyParagraphsFromDom(page);
    report.readback = readback;
    report.domParagraphs = domParagraphs;
    const titleOk = norm(readback.title).includes(norm(copy.title));
    const structure = verifyDomParagraphOrder(copy.paragraphs, domParagraphs);
    report.paragraphStructure = structure;
    const bodyOk =
      structure.pass &&
      copy.paragraphs.every((p) => norm(readback.body).includes(norm(p.slice(0, 24))));
    report.match = { title: titleOk, body: bodyOk, paragraphOrder: structure.pass };
    report.pass = titleOk && bodyOk && structure.pass;
    if (!report.pass) {
      report.failReason = { detail: 'readback_or_structure_mismatch', structure: structure.reason };
    }
  } catch (e) {
    report.failReason = { detail: String(e?.message || e) };
  }
  report.finishedAt = new Date().toISOString();
  return report;
}

/**
 * Phase 5 — FINAL_NAVER_INPUT.json → runner copy (원고 재작성 없음).
 * @param {string} [articleId]
 */
export async function loadFinalArticleCopy(articleId = '9fad3d9e6f847f36') {
  const local = await runPhase5LocalValidation(articleId, FINAL_EXPECTED_SHA256);
  if (!local.pass) {
    throw new Error(`FINAL_LOCAL_VALIDATION_FAILED: ${JSON.stringify(local.alignment?.issues || [])}`);
  }
  return { copy: local.copy, localReport: local };
}

/**
 * Phase 5 — 로컬 검증 + (선택) 원격 입력·DOM 검증. 임시저장·발행은 호출하지 않음.
 * @param {import('playwright').Page | null} page
 * @param {{ articleId?: string, remoteInput?: boolean }} [opts]
 */
export async function runPhase5Connect(page, opts = {}) {
  const articleId = opts.articleId || '9fad3d9e6f847f36';
  const localReport = await runPhase5LocalValidation(articleId, FINAL_EXPECTED_SHA256);
  /** @type {object | null} */
  let remoteInput = null;

  if (opts.remoteInput && page) {
    remoteInput = {
      executed: true,
      saveDraftExecuted: false,
      publishExecuted: false,
    };
    if (!localReport.pass) {
      remoteInput.skipped = true;
      remoteInput.reason = 'local_validation_failed';
    } else {
      await navigateFreshWriteForm(page);
      const preflight = await runPreflight(page, { copy: localReport.copy });
      remoteInput.preflight = preflight;
      if (preflight.pass) {
        remoteInput.input_test = await runInputTestFromArticle(page, localReport.copy);
        await writeReport('phase5_final_input_test.json', remoteInput.input_test);
        remoteInput.pass = remoteInput.input_test.pass === true;
      } else {
        remoteInput.pass = false;
        remoteInput.reason = 'preflight_failed';
      }
    }
  }

  const payload = {
    ...localReport,
    remoteInput,
    workflowState: localReport.pass
      ? remoteInput && remoteInput.executed && remoteInput.pass !== true
        ? 'VERIFY_REQUIRED'
        : 'AWAITING_DRAFT_SAVE_APPROVAL'
      : 'VERIFY_REQUIRED',
    nextSteps: {
      publishAllowed: false,
      draftSaveRequires: [
        'localValidationPass',
        'NAVER_SAVE_DRAFT_APPROVED=1',
        'institution_publication_approved (FINAL_NAVER_INPUT.permissions)',
        'PO review of FINAL_PREVIEW.html',
      ],
      suggestedCommandInputOnly:
        'NAVER_CDP_URL=<cdp> node scripts/naver-blog-p0/run-phase5-final-connect.mjs --article-id=9fad3d9e6f847f36 --remote-input',
      suggestedCommandSaveAfterPoApproval:
        'NAVER_SAVE_DRAFT_APPROVED=1 NAVER_CDP_URL=<cdp> node scripts/naver-blog-p0/run-new-write-phase3.mjs (future: wire final copy via NAVER_FINAL_ARTICLE_ID; Phase 5 does not save)',
      note: 'Phase 5 does not invoke runSaveDraft.',
    },
    phase5Complete: localReport.pass && remoteInput?.saveDraftExecuted !== true,
  };
  await writeReport('phase5_final_connect.json', payload);
  return payload;
}

/**
 * @param {import('playwright').Page} page
 * @param {{ title?: string; body?: string; id?: string }} [copy]
 */
export async function runInputTest(page, copy = TEST_COPY) {
  const startedAt = new Date().toISOString();
  const report = {
    phase: 'INPUT_TEST',
    startedAt,
    pass: false,
    url: sanitizeUrl(page.url()),
    expected: { title: copy.title, body: copy.body },
    expectedSha256: { title: sha256Text(copy.title), body: sha256Text(copy.body) },
    readback: null,
    match: null,
    saveClicked: false,
    publishClicked: false,
  };

  try {
    if (!/PostWriteForm\.naver/.test(page.url())) {
      throw new Error('REFUSED: not on PostWriteForm');
    }

    const { title, body } = await locateEditorRegions(page);
    if ((await title.count()) !== 1 || (await body.count()) < 1) {
      throw new Error('SELECTOR_MISMATCH before input');
    }

    const titlePara = page.locator('.se-section-documentTitle .se-text-paragraph').first();
    const titleTarget = (await titlePara.count()) > 0 ? titlePara : title;
    await focusAndKeyboardInsert(page, titleTarget, copy.title);
    await focusAndKeyboardInsert(page, body.first(), copy.body);

    const readback = await readTitleBodyFromDom(page);
    report.readback = readback;
    report.readbackSha256 = { title: sha256Text(readback.title), body: sha256Text(readback.body) };

    const titleMatch = norm(readback.title).includes(norm(copy.title));
    const bodyMatch = norm(readback.body).includes(norm(copy.body));
    report.match = { title: titleMatch, body: bodyMatch };
    report.pass = titleMatch && bodyMatch;
    if (!report.pass) {
      report.failReason = { detail: 'readback_mismatch', match: report.match };
    }
  } catch (e) {
    report.pass = false;
    report.failReason = { detail: String(e?.message || e) };
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

/**
 * @param {import('playwright').Page} page
 * @param {{ preflightPass: boolean; inputPass: boolean }} gates
 * @param {typeof TEST_COPY} [copy]
 */
export async function runSaveDraft(page, gates, copy = TEST_COPY) {
  const startedAt = new Date().toISOString();
  const titleSha = sha256Text(copy.title);
  const report = {
    phase: 'SAVE_DRAFT',
    startedAt,
    pass: false,
    verdict: 'PENDING',
    skipped: false,
    saveDraftExecuted: false,
    publishExecuted: false,
    saveClicked: false,
    publishClicked: false,
    approvalFlag: isSaveDraftApproved(),
    testCopy: { id: copy.id, titleSha256: titleSha, bodySha256: sha256Text(copy.body) },
    url: sanitizeUrl(page.url()),
    postIdentifier: null,
    reopenMatch: null,
    existingPostsModified: false,
  };

  if (!isSaveDraftApproved()) {
    report.skipped = true;
    report.verdict = 'BLOCKED_NO_APPROVAL';
    report.reason = 'NAVER_SAVE_DRAFT_APPROVED !== 1';
    report.finishedAt = new Date().toISOString();
    return report;
  }

  if (!gates.preflightPass || !gates.inputPass) {
    report.skipped = true;
    report.verdict = 'BLOCKED_UPSTREAM';
    report.reason = 'upstream_gate_failed';
    report.finishedAt = new Date().toISOString();
    return report;
  }

  const priorVerified = await findVerifiedRun(titleSha);
  if (priorVerified) {
    report.skipped = true;
    report.verdict = 'BLOCKED_DUPLICATE_HISTORY';
    report.reason = 'verified_run_exists_in_history';
    report.postIdentifier = priorVerified.postIdentifier || null;
    report.finishedAt = new Date().toISOString();
    return report;
  }

  try {
    if (!/PostWriteForm\.naver/.test(page.url()) || /PostUpdateForm\.naver/.test(page.url())) {
      throw new Error('REFUSED: wrong editor surface');
    }

    const semantics = await verifySaveButtonSemantics(page);
    report.saveButtonVerification = semantics;
    if (!semantics.confirmedTempSave) {
      report.verdict = 'VERIFY_REQUIRED';
      report.reason = 'save_button_not_confirmed_as_temp_save';
      report.finishedAt = new Date().toISOString();
      return report;
    }

    const draftOpen = await openDraftListPanel(page);
    report.draftListProbeBeforeSave = draftOpen;
    const duplicateInList = draftOpen.opened && (await draftListContainsTitle(page, copy.title));
    report.duplicateTitleInDraftListBeforeSave = duplicateInList;
    if (duplicateInList) {
      report.verdict = 'BLOCKED_DUPLICATE_DRAFT_LIST';
      report.reason = 'test_title_already_in_draft_list';
      report.skipped = true;
      await page.keyboard.press('Escape').catch(() => {});
      report.finishedAt = new Date().toISOString();
      return report;
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);

    const saveBtn = page.getByRole('button', { name: '저장', exact: true }).first();
    if ((await saveBtn.count()) < 1) {
      report.verdict = 'VERIFY_REQUIRED';
      report.reason = 'save_button_missing';
      report.finishedAt = new Date().toISOString();
      return report;
    }

    await saveBtn.click({ force: true });
    report.saveClicked = true;
    report.saveDraftExecuted = true;
    await page.waitForTimeout(2500);

    const afterUrl = page.url();
    report.urlAfterSave = sanitizeUrl(afterUrl);
    report.postIdentifier =
      (afterUrl.match(/logNo=(\d+)/) || [])[1] ||
      (afterUrl.match(/\/(\d{10,})(?:\?|$)/) || [])[1] ||
      null;

    const saveHints = await page.evaluate(() => {
      const bodyText = document.body?.innerText || '';
      return {
        hints: ['저장됨', '저장', '임시저장', '자동 저장', '자동저장'].filter((k) => bodyText.includes(k)),
        publishStillVisible: [...document.querySelectorAll('button')].some(
          (b) => (b.innerText || '').trim() === '발행',
        ),
      };
    });
    report.saveHints = saveHints;

    await openDraftListPanel(page);
    const inList = await draftListContainsTitle(page, copy.title);
    report.draftListContainsTitleAfterSave = inList;
    if (!inList) {
      report.verdict = 'VERIFY_REQUIRED';
      report.reason = 'draft_not_found_in_list_after_save';
      report.finishedAt = new Date().toISOString();
      return report;
    }

    const titleLoc = page.getByText(copy.title, { exact: false }).first();
    if ((await titleLoc.count()) < 1) {
      report.verdict = 'VERIFY_REQUIRED';
      report.reason = 'draft_list_entry_not_clickable';
      report.finishedAt = new Date().toISOString();
      return report;
    }
    await titleLoc.click({ force: true });
    await page.waitForTimeout(2000);
    await page.waitForSelector(SEL.title, { timeout: 60000 }).catch(() => {});

    const reopened = await readTitleBodyFromDom(page);
    report.reopenReadback = reopened;
    const titleMatch = norm(reopened.title).includes(norm(copy.title));
    const bodyMatch = norm(reopened.body).includes(norm(copy.body));
    report.reopenMatch = { title: titleMatch, body: bodyMatch };
    report.pass = titleMatch && bodyMatch;
    report.verdict = report.pass ? 'PASS' : 'VERIFY_REQUIRED';
    if (!report.pass) {
      report.reason = 'reopen_readback_mismatch';
    }

    await appendDraftHistory({
      testCopyId: copy.id,
      titleSha256: titleSha,
      verified: report.pass,
      postIdentifier: report.postIdentifier,
      saveDraftExecuted: true,
    });
  } catch (e) {
    report.pass = false;
    report.verdict = 'VERIFY_REQUIRED';
    report.reason = String(e?.message || e);
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

/**
 * Phase 3 end-to-end: fresh form → preflight → input → save-draft (approval-gated).
 * @param {import('playwright').Page} page
 * @param {{ fresh?: boolean; copy?: typeof TEST_COPY }} [opts]
 */
export async function runPhase3Pipeline(page, opts = {}) {
  const copy = opts.copy || TEST_COPY;
  const out = {
    lastPhase: null,
    freshNavigation: false,
    preflight: null,
    input_test: null,
    draft_verify: null,
  };

  if (opts.fresh !== false) {
    await navigateFreshWriteForm(page);
    out.freshNavigation = true;
  }

  out.preflight = await runPreflight(page, { copy });
  await writeReport('preflight.json', out.preflight);
  out.lastPhase = 'PREFLIGHT';
  if (!out.preflight.pass) return out;

  out.input_test = await runInputTest(page, copy);
  await writeReport('input_test.json', out.input_test);
  out.lastPhase = 'INPUT_TEST';
  if (!out.input_test.pass) return out;

  const semantics = await verifySaveButtonSemantics(page);
  out.saveButtonVerification = semantics;

  out.draft_verify = await runSaveDraft(
    page,
    {
      preflightPass: true,
      inputPass: true,
    },
    copy,
  );
  if (out.saveButtonVerification && !out.draft_verify.saveButtonVerification) {
    out.draft_verify.saveButtonVerification = out.saveButtonVerification;
  }
  out.draft_verify.prepareComplete = true;
  out.lastPhase = 'SAVE_DRAFT';
  await writeReport('draft_verify.json', out.draft_verify);

  return out;
}

/**
 * @param {string} name
 * @param {object} payload
 */
export async function writeReport(name, payload) {
  await mkdir(REPORT_DIR, { recursive: true });
  const path = join(REPORT_DIR, name);
  await writeFile(path, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return path;
}

/**
 * @param {import('playwright').Page} page
 * @param {'preflight' | 'input' | 'save-draft' | 'phase3' | 'all'} phase
 */
export async function runPhases(page, phase = 'all') {
  if (phase === 'phase3' || phase === 'save-draft') {
    return runPhase3Pipeline(page, { fresh: true });
  }

  const out = { lastPhase: null, preflight: null, input_test: null, draft_verify: null };
  if (phase === 'preflight' || phase === 'all') {
    out.preflight = await runPreflight(page);
    out.lastPhase = 'PREFLIGHT';
    await writeReport('preflight.json', out.preflight);
    if (!out.preflight.pass && phase === 'all') return out;
  }
  if (phase === 'input' || phase === 'all') {
    if (phase === 'input' && !out.preflight) {
      out.preflight = await runPreflight(page);
      await writeReport('preflight.json', out.preflight);
      if (!out.preflight.pass) {
        out.lastPhase = 'PREFLIGHT';
        return out;
      }
    }
    out.input_test = await runInputTest(page);
    out.lastPhase = 'INPUT_TEST';
    await writeReport('input_test.json', out.input_test);
  }
  return out;
}

async function connectPage() {
  const { chromium } = await import('playwright');
  const cdp = process.env.NAVER_CDP_URL || process.env.PLAYWRIGHT_MCP_CDP;
  if (cdp) {
    const browser = await chromium.connectOverCDP(cdp);
    const ctx = browser.contexts()[0] || (await browser.newContext());
    const page =
      ctx.pages().find((p) => /blog\.naver\.com/.test(p.url())) || ctx.pages()[0] || (await ctx.newPage());
    return { browser, page, mode: 'cdp' };
  }
  throw new Error(
    'CDP not configured. Set NAVER_CDP_URL or run Phase 3 via user-playwright MCP (see run-new-write-phase3.mjs).',
  );
}

async function main() {
  const args = process.argv.slice(2);
  const phaseArg = args.find((a) => a.startsWith('--phase='))?.split('=')[1] || 'phase3';

  const { browser, page, mode } = await connectPage();
  try {
    const result = await runPhases(page, phaseArg);
    const ok =
      result.draft_verify?.verdict === 'PASS' ||
      result.input_test?.pass ||
      result.preflight?.pass;
    console.log(JSON.stringify({ ok, mode, ...result }, null, 2));
    process.exitCode = result.draft_verify?.pass ? 0 : result.input_test?.pass ? 0 : 1;
  } finally {
    if (mode === 'cdp') await browser.close().catch(() => {});
  }
}

if (process.argv[1] && process.argv[1].endsWith('naver-new-write-runner.mjs')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
