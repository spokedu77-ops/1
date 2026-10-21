/**
 * SPOKEDU-LLM ARTICLE_FOR_NAVER.md → Naver Smart Editor 입력 모델 (Phase 4).
 * 원격 저장·발행 없음. 명시적 articleId 필수.
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const REPORT_DIR = join(REPO_ROOT, 'reports', 'naver-new');

export const ARTICLES_ROOT =
  process.env.SPOKEDU_ARTICLES_ROOT ??
  'C:\\Users\\joker\\SPOKEDU-LLM\\04_학습결과\\SPOKEDU_AUTOPILOT\\articles';

export const REVIEW_ROOT =
  process.env.SPOKEDU_NAVER_REVIEW_ROOT ?? 'C:\\Users\\joker\\SPOKEDU-Assistant\\reports\\naver_new';

/** @typedef {'SOURCE_REVIEW'|'READY_FOR_DRAFT'|'DRAFT_SAVED'|'DRAFT_VERIFIED'|'READY_FOR_PUBLISH'|'PUBLISHED_VERIFIED'|'VERIFY_REQUIRED'} WorkState */

export function sha256Text(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function sha256FileContent(content) {
  return sha256Text(content);
}

/**
 * @param {string} md
 */
export function parseArticleForNaver(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let title = '';
  const blocks = [];
  let buf = [];

  const flushParagraph = () => {
    const text = buf.join('\n').trim();
    buf = [];
    if (text) blocks.push({ type: 'paragraph', text });
  };

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)\s*$/);
    const h2 = line.match(/^##\s+(.+)\s*$/);
    if (h1 && !title) {
      flushParagraph();
      title = h1[1].trim();
      continue;
    }
    if (h2) {
      flushParagraph();
      blocks.push({ type: 'heading', text: h2[1].trim() });
      continue;
    }
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }
    if (/^#+\s/.test(line)) {
      throw new Error(`unsupported_markdown_heading: ${line.slice(0, 40)}`);
    }
    buf.push(line);
  }
  flushParagraph();

  const paragraphsForEditor = blocks.map((b) => b.text);
  const bodyPlain = paragraphsForEditor.join('\n\n');

  return {
    title,
    blocks,
    paragraphsForEditor,
    bodyPlain,
    markdownMarkersInOutput: paragraphsForEditor.some((p) => /^##\s/m.test(p) || /^#\s/m.test(p)),
  };
}

/**
 * @param {string} articleId
 */
export function articleMarkdownPath(articleId) {
  return join(ARTICLES_ROOT, articleId, 'ARTICLE_FOR_NAVER.md');
}

/**
 * @param {string} articleId
 */
export async function findReviewPackageForArticle(articleId) {
  const needle = join(articleId, 'ARTICLE_FOR_NAVER.md').replace(/\\/g, '/');
  const dirs = await readdir(REVIEW_ROOT, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const pkgPath = join(REVIEW_ROOT, d.name, 'package.json');
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
      const src = String(pkg.source || '').replace(/\\/g, '/');
      if (src.includes(needle)) {
        return { reviewId: d.name, pkgPath, pkg };
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

/**
 * @param {object} parsed
 * @param {object} pkg
 */
export function validateBlocksAgainstReview(parsed, pkg) {
  const pkgBlocks = pkg.blocks || [];
  if (pkgBlocks.length !== parsed.blocks.length) {
    return { pass: false, reason: 'block_count_mismatch', expected: pkgBlocks.length, actual: parsed.blocks.length };
  }
  for (let i = 0; i < pkgBlocks.length; i++) {
    const a = pkgBlocks[i];
    const b = parsed.blocks[i];
    if (a.type !== b.type || norm(a.text) !== norm(b.text)) {
      return {
        pass: false,
        reason: 'block_text_mismatch',
        index: i,
        expectedType: a.type,
        actualType: b.type,
      };
    }
  }
  return { pass: true };
}

function norm(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} articleId — explicit folder id under articles/
 */
export async function loadArticleBundle(articleId) {
  if (!articleId || !/^[a-f0-9]{16}$/i.test(articleId)) {
    throw new Error('REFUSED: set explicit articleId (16-char hex folder under articles/)');
  }
  const mdPath = articleMarkdownPath(articleId);
  const raw = await readFile(mdPath, 'utf8');
  const fileSha256 = sha256FileContent(raw);
  const parsed = parseArticleForNaver(raw);
  const review = await findReviewPackageForArticle(articleId);
  return { articleId, mdPath, raw, fileSha256, parsed, review };
}

/**
 * @param {object} bundle
 */
export function resolveWorkState(bundle) {
  const pkg = bundle.review?.pkg;
  const hashMatch = pkg ? fileSha256Matches(pkg, bundle.fileSha256) : false;
  const reviewStatus = pkg?.status ?? 'MISSING_REVIEW_PACKAGE';
  const hold = reviewStatus === 'HOLD_SOURCE_REVIEW' || pkg?.approval_granted === false;

  /** @type {WorkState} */
  let workflowState = 'VERIFY_REQUIRED';
  if (!bundle.review) {
    workflowState = 'VERIFY_REQUIRED';
  } else if (!hashMatch) {
    workflowState = 'VERIFY_REQUIRED';
  } else if (hold) {
    workflowState = 'SOURCE_REVIEW';
  } else if (pkg?.browser_write_allowed) {
    workflowState = 'READY_FOR_DRAFT';
  } else {
    workflowState = 'SOURCE_REVIEW';
  }

  return {
    workflowState,
    hashMatch,
    reviewStatus,
    reviewId: bundle.review?.reviewId ?? null,
    approvalGranted: pkg?.approval_granted ?? false,
    browserWriteAllowed: pkg?.browser_write_allowed ?? false,
    publishAllowed: pkg?.publish_allowed ?? false,
    draftSaveAllowed: hashMatch && !hold && pkg?.browser_write_allowed === true,
    publishAllowedByPackage: pkg?.publish_allowed === true,
    reviewFlags: pkg?.review_flags ?? [],
    priorApprovalInvalidated: pkg && !hashMatch,
    phase3TestDraftSeparate: true,
  };
}

function fileSha256Matches(pkg, actualSha256) {
  const expected = pkg.source_sha256 || pkg.sourceSha256;
  return expected === actualSha256;
}

/**
 * Naver 입력용 (Phase 3 runner 연동). 본문은 문단 배열로 Enter 삽입.
 * @param {ReturnType<typeof parseArticleForNaver>} parsed
 */
export function toNaverCopy(parsed, meta = {}) {
  return {
    id: meta.articleId ? `article-${meta.articleId}` : 'article',
    title: parsed.title,
    body: parsed.bodyPlain,
    paragraphs: parsed.paragraphsForEditor,
    ...meta,
  };
}

/**
 * @param {string} articleId
 */
export async function runPhase4ArticlePrep(articleId) {
  const bundle = await loadArticleBundle(articleId);
  const state = resolveWorkState(bundle);
  const pkg = bundle.review?.pkg;

  const conversion = pkg
    ? validateBlocksAgainstReview(bundle.parsed, pkg)
    : { pass: false, reason: 'no_review_package' };

  const markdownOk =
    !bundle.parsed.markdownMarkersInOutput &&
    bundle.parsed.title.length > 0 &&
    bundle.parsed.paragraphsForEditor.length > 0;

  const naverCopy = toNaverCopy(bundle.parsed, {
    articleId,
    reviewId: bundle.review?.reviewId,
  });

  const technicalPrepPass = state.hashMatch && conversion.pass && markdownOk;
  const titleMatch = !pkg?.title || norm(bundle.parsed.title) === norm(pkg.title);

  const report = {
    phase: 'PHASE4_ARTICLE_PREP',
    completedAt: new Date().toISOString(),
    articleId,
    reviewId: bundle.review?.reviewId ?? null,
    mdPath: bundle.mdPath.replace(/\\/g, '/'),
    reviewPackagePath: bundle.review?.pkgPath?.replace(/\\/g, '/') ?? null,
    hashes: {
      sourceFileSha256: bundle.fileSha256,
      reviewPackageSha256: pkg?.source_sha256 ?? null,
      match: state.hashMatch,
    },
    selectedExplicitly: true,
    autoLatestPick: false,
    conversion: {
      markdownOk,
      blocksValidation: conversion,
      paragraphCount: bundle.parsed.paragraphsForEditor.length,
      headingCount: bundle.parsed.blocks.filter((b) => b.type === 'heading').length,
    },
    workState: state,
    reviewLinkage: {
      review_flags: state.reviewFlags,
      created_at_utc: pkg?.created_at_utc ?? null,
      mode: pkg?.mode ?? null,
      classSourceCrosscheck: 'linked_via_review_package.json_source_path',
    },
    images: {
      attached: false,
      placeholdersUsed: false,
      records: [],
      note: 'No images in ARTICLE_FOR_NAVER.md; no synthetic image substitution.',
    },
    naverInputPreview: {
      title: naverCopy.title,
      paragraphCount: naverCopy.paragraphs.length,
      paragraphs: naverCopy.paragraphs,
      bodyPlainLength: naverCopy.body.length,
    },
    phase3Connection: {
      runnerModule: 'naver-new-write-runner.mjs',
      inputFn: 'runInputTest(page, naverCopy) / focusAndKeyboardInsert per paragraph with Enter',
      saveFn: 'runSaveDraft(page, gates, naverCopy)',
      remoteSaveExecutedThisPhase: false,
      remotePublishExecutedThisPhase: false,
      phase3PhTestDraftNotClaimedAsThisArticle: true,
    },
    prepPass: technicalPrepPass && titleMatch,
    draftSaveBlocked: !state.draftSaveAllowed,
    publishBlocked: true,
    blockedReason: !technicalPrepPass
      ? !state.hashMatch
        ? 'hash_mismatch_invalidates_approval'
        : !conversion.pass
          ? 'markdown_block_conversion_failed'
          : !markdownOk
            ? 'markdown_structure_invalid'
            : 'verify_required'
      : state.workflowState === 'SOURCE_REVIEW'
        ? 'HOLD_SOURCE_REVIEW_no_draft_until_review_cleared'
        : !state.draftSaveAllowed
          ? 'browser_write_not_allowed_in_review_package'
          : null,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeReport('phase4_article_prep.json', report);
  await writeReport('article_work_state.json', {
    articleId,
    reviewId: report.reviewId,
    workflowState: state.workflowState,
    updatedAt: report.completedAt,
    draftSaveAllowed: state.draftSaveAllowed,
    publishAllowed: false,
    hashMatch: state.hashMatch,
  });

  const previewMd = buildPreviewMarkdown(naverCopy, report);
  await writeFile(join(REPORT_DIR, 'naver_input_preview.md'), previewMd, 'utf8');

  return report;
}

/**
 * @param {object} copy
 * @param {object} report
 */
function buildPreviewMarkdown(copy, report) {
  const lines = [
    '# Naver input preview (Phase 4 — no remote write)',
    '',
    `- Article: \`${report.articleId}\``,
    `- Review: \`${report.reviewId ?? 'none'}\``,
    `- Work state: **${report.workState.workflowState}**`,
    `- Hash match: **${report.hashes.match}**`,
    `- Draft save allowed (package): **${report.workState.draftSaveAllowed}**`,
    '',
    '## Title',
    '',
    copy.title,
    '',
    '## Body paragraphs (editor order)',
    '',
  ];
  for (const p of copy.paragraphs) {
    lines.push(p);
    lines.push('');
  }
  return lines.join('\n');
}

async function writeReport(name, payload) {
  await writeFile(join(REPORT_DIR, name), JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

/** Phase 5 — FINAL 원고 (Phase 4.6) */
export const FINAL_EXPECTED_SHA256 =
  'df91e0b2df0eadabfc75ea06145c703177206139886d72a5f182e40e31d4b3a8';

function normFinal(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} articleId
 */
export function finalNaverInputJsonPath(articleId) {
  return join(ARTICLES_ROOT, articleId, 'FINAL_NAVER_INPUT.json');
}

/**
 * @param {string} articleId
 */
export function finalMarkdownPath(articleId) {
  return join(ARTICLES_ROOT, articleId, 'ARTICLE_FOR_NAVER_FINAL.md');
}

/**
 * @param {Array<{ type: string, text: string }>} blocks
 */
export function blocksToEditorParagraphs(blocks) {
  return blocks.map((b) => b.text);
}

/**
 * @param {object} pkg FINAL_NAVER_INPUT.json
 * @param {ReturnType<typeof parseArticleForNaver>} parsed
 */
export function validateFinalInputAgainstMarkdown(pkg, parsed, mdSha256, expectedSha256) {
  const issues = [];
  if (pkg.schema !== 'spokedu.naver.final_po_input.v1') {
    issues.push('schema_mismatch');
  }
  if (mdSha256 !== expectedSha256) {
    issues.push('markdown_sha256_mismatch');
  }
  if (pkg.source_sha256 !== expectedSha256) {
    issues.push('json_source_sha256_mismatch');
  }
  if (normFinal(pkg.title) !== normFinal(parsed.title)) {
    issues.push('title_mismatch');
  }

  const fromMd = blocksToEditorParagraphs(parsed.blocks);
  const fromJson = pkg.naverCopy?.paragraphs || [];
  if (fromMd.length !== fromJson.length) {
    issues.push('paragraph_count_mismatch');
  } else {
    for (let i = 0; i < fromMd.length; i++) {
      if (normFinal(fromMd[i]) !== normFinal(fromJson[i])) {
        issues.push({ paragraph_text_mismatch: i });
        break;
      }
    }
  }

  const headingCount = parsed.blocks.filter((b) => b.type === 'heading').length;
  const paragraphOnlyCount = parsed.blocks.filter((b) => b.type === 'paragraph').length;
  if (headingCount !== 3) issues.push({ heading_count: headingCount, expected: 3 });
  if (fromJson.length !== 19) issues.push({ editor_paragraph_count: fromJson.length, expected: 19 });
  if (normFinal(pkg.body) !== normFinal(parsed.bodyPlain)) {
    issues.push('body_plain_mismatch');
  }

  return {
    pass: issues.length === 0,
    issues,
    counts: {
      headings: headingCount,
      paragraphsOnly: paragraphOnlyCount,
      editorParagraphs: fromJson.length,
    },
  };
}

/**
 * @param {object} pkg
 */
export function finalPackageToRunnerCopy(pkg) {
  return {
    id: `final-${pkg.articleId}`,
    articleId: pkg.articleId,
    title: pkg.title,
    body: pkg.naverCopy.body,
    paragraphs: pkg.naverCopy.paragraphs,
    sourceSha256: pkg.source_sha256,
    permissions: pkg.permissions ?? {},
    publishAllowed: false,
  };
}

/**
 * Phase 5 local gate — FINAL md ↔ JSON (no browser).
 * @param {string} articleId
 * @param {string} [expectedSha256]
 */
export async function runPhase5LocalValidation(articleId, expectedSha256 = FINAL_EXPECTED_SHA256) {
  const jsonPath = finalNaverInputJsonPath(articleId);
  const pkg = JSON.parse(await readFile(jsonPath, 'utf8'));
  const mdPath = pkg.source || finalMarkdownPath(articleId);
  const mdRaw = await readFile(mdPath, 'utf8');
  /** Phase 4.6 해시는 UTF-8 LF 기준 — Windows CRLF 파일과 동일 내용이면 통과 */
  const mdNormalized = mdRaw.replace(/\r\n/g, '\n');
  const mdSha256 = sha256Text(mdNormalized);
  const parsed = parseArticleForNaver(mdNormalized);
  const alignment = validateFinalInputAgainstMarkdown(pkg, parsed, mdSha256, expectedSha256);
  const copy = finalPackageToRunnerCopy(pkg);

  const institutionOk = pkg.permissions?.institution_publication_approved === true;
  const draftSaveApprovalEnv = process.env.NAVER_SAVE_DRAFT_APPROVED === '1';

  return {
    phase: 'PHASE5_LOCAL_VALIDATION',
    completedAt: new Date().toISOString(),
    articleId,
    paths: {
      finalMarkdown: mdPath.replace(/\\/g, '/'),
      finalInputJson: jsonPath.replace(/\\/g, '/'),
    },
    hashes: {
      expectedSha256,
      markdownSha256: mdSha256,
      jsonSourceSha256: pkg.source_sha256,
      match: mdSha256 === expectedSha256 && pkg.source_sha256 === expectedSha256,
    },
    alignment,
    conversion: {
      title: parsed.title,
      headingCount: alignment.counts.headings,
      editorParagraphCount: alignment.counts.editorParagraphs,
      markdownMarkersInOutput: parsed.markdownMarkersInOutput,
      markdownToParagraphsPass:
        !parsed.markdownMarkersInOutput && alignment.pass && alignment.counts.editorParagraphs === 19,
    },
    naverCopy: {
      title: copy.title,
      paragraphCount: copy.paragraphs.length,
      titleSha256: sha256Text(copy.title),
      bodySha256: sha256Text(copy.body),
    },
    workflowState: alignment.pass ? 'AWAITING_DRAFT_SAVE_APPROVAL' : 'VERIFY_REQUIRED',
    gates: {
      localValidationPass: alignment.pass,
      draftSaveEnvApproval: draftSaveApprovalEnv,
      institutionPublicationApproved: institutionOk,
      draftSaveAllowedNow: alignment.pass && draftSaveApprovalEnv && institutionOk,
      publishAllowed: false,
      remoteSaveExecutedThisPhase: false,
      remotePublishExecutedThisPhase: false,
    },
    pass: alignment.pass && alignment.counts.headings === 3 && alignment.counts.editorParagraphs === 19,
    copy,
  };
}

/**
 * @param {object} localReport
 */
export async function writePhase5ConnectReport(localReport, remoteInput = null) {
  await mkdir(REPORT_DIR, { recursive: true });
  const payload = {
    ...localReport,
    remoteInput,
    phase5Complete: localReport.pass && !remoteInput?.saveDraftExecuted,
  };
  await writeFile(
    join(REPORT_DIR, 'phase5_final_connect.json'),
    JSON.stringify(payload, null, 2) + '\n',
    'utf8',
  );
  return payload;
}
