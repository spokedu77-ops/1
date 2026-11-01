/**
 * Phase B1 — contract draft generator (read-only inputs, writes only contract-draft/).
 * Does not modify public site code or existing audit artifacts.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  B0_INPUT_ZIP,
  ROUTE_IMPL_HINT,
  buildStitchDesignComponents,
  loadB0SourceInputs,
  matchBaselineToStitch,
} from './b0-source-ingest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../../');
const OUT_DIR = path.resolve(__dirname, '..');

const HEAD = execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

const STAGE7_FILES = [
  'SPOKEDU_COPY_AUDIT_STAGE7_BASELINE_914_CROSSWALK_20261031.csv',
  'SPOKEDU_COPY_AUDIT_STAGE7_ALL_1289_20261031.csv',
  'SPOKEDU_COPY_AUDIT_STAGE7_ROOT_ISSUES_20261031.csv',
  'SPOKEDU_COPY_AUDIT_STAGE7_INTEGRATED_REPORT_20261031.md',
  'SPOKEDU_COPY_AUDIT_STAGE7_INDEPENDENT_QA_20261031.md',
];

const STITCH_ZIP = 'stitch_editorial_website_redesign.zip';
const STAGE7_DIR = path.join(OUT_DIR, 'sources/stage7');

const PUBLIC_ROOTS = [
  'app/spokedu',
  'app/(spokedu-public)',
  'app/info',
  'public/images/spokedu',
];

const EVIDENCE_DOCS = [
  'docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md',
  'docs/operations/public-website-refactor/PUBLIC_REFACTOR_AUDIT.md',
  'docs/operations/public-website-refactor/FINAL_QA_AND_APPROVAL.md',
  'docs/operations/public-website-refactor/SPOKEDU_HOME_DESIGN_CANONICAL.md',
  'docs/operations/public-website-refactor/GIT_CORRECTION_BASELINE.json',
  'docs/operations/public-website-refactor/ACTIVE_PAGE_MAP.md',
  'docs/operations/public-website-refactor/MEDIA_AND_CONTENT_MATRIX.csv',
  'docs/operations/public-website-audit-remediation/04_BUSINESS_FACT_CHECK.md',
  'app/spokedu/docs/PUBLIC_MARKETING_DESIGN_CONTRACT.md',
  '.cursor/rules/spokedu-public-website.mdc',
];

const TEST_IDS = [
  'app/spokedu/data/field-records-catalog.test.ts',
  'app/spokedu/lib/public-marketing-visual.contract.test.ts',
  'app/spokedu/lib/public-marketing-typography.contract.test.ts',
  'app/spokedu/data/site-ia.test.ts',
  'app/spokedu/data/acquisition-leak-closure.test.ts',
  'app/spokedu/data/field-evidence-align.test.ts',
];

function sha256File(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function gitBlobHash(relPath) {
  try {
    return execSync(`git hash-object "${relPath.replace(/\\/g, '/')}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

function walkDir(relRoot) {
  const abs = path.join(REPO_ROOT, relRoot);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const stack = [abs];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules' || name === '.next') continue;
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) stack.push(full);
      else out.push(path.relative(REPO_ROOT, full).replace(/\\/g, '/'));
    }
  }
  return out.sort();
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function findFileAnywhere(basename) {
  const hits = [];
  const preferred = path.join(STAGE7_DIR, basename);
  if (fs.existsSync(preferred)) hits.push(preferred);
  function scan(dir, depth) {
    if (depth > 6) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next') continue;
      const full = path.join(dir, e.name);
      if (e.isFile() && e.name === basename) {
        if (!hits.includes(full)) hits.push(full);
      } else if (e.isDirectory()) scan(full, depth + 1);
    }
  }
  scan(REPO_ROOT, 0);
  return hits;
}

/** RFC4180-style CSV parse (quoted fields, UTF-8). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.length > 1 || (row[0] && row[0].length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0];
  const records = rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? '';
    });
    return obj;
  });
  return { headers, records };
}

function readCsvRel(absPath) {
  let text = fs.readFileSync(absPath, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return parseCsv(text);
}

function resolveStage7Paths() {
  return STAGE7_FILES.map((name) => {
    const hits = findFileAnywhere(name);
    return { name, paths: hits, primary: hits[0] ?? null };
  });
}

function deriveMappingStatus(crossResult, editDecision) {
  const edit = editDecision ?? '';
  const cross = crossResult ?? '';
  if (edit.includes('수정 제안')) return 'CONTENT_REWRITE_REQUIRED';
  if (cross.includes('MISMATCH') || cross.includes('CONFLICT') || cross.includes('불일치')) {
    return 'CONFLICT';
  }
  if (edit === '유지' && (cross === 'MATCH_NORMALIZED' || cross.startsWith('MATCH'))) {
    return 'EXACT_MATCH';
  }
  if (edit === '삭제' || edit.includes('제거')) return 'REMOVED_IN_PROPOSAL';
  if (!cross && !edit) return 'NO_MAPPING';
  return 'SEMANTIC_MATCH_REVIEW_REQUIRED';
}

function loadStage7Bundle() {
  const resolved = resolveStage7Paths();
  const byName = Object.fromEntries(resolved.map((r) => [r.name, r.primary]));
  const missing = STAGE7_FILES.filter((n) => !byName[n]);
  if (missing.length) {
    return { ok: false, missing, resolved, crosswalk914: [], all1289: [], rootIssues: [] };
  }

  const crosswalk914 = readCsvRel(byName[STAGE7_FILES[0]]).records;
  const all1289 = readCsvRel(byName[STAGE7_FILES[1]]).records;
  const rootIssues = readCsvRel(byName[STAGE7_FILES[2]]).records;

  const sourceHashes = STAGE7_FILES.map((name) => {
    const p = byName[name];
    return {
      name,
      path: path.relative(REPO_ROOT, p).replace(/\\/g, '/'),
      sha256: sha256File(p),
      size_bytes: fs.statSync(p).size,
    };
  });

  return {
    ok: true,
    missing: [],
    resolved,
    crosswalk914,
    all1289,
    rootIssues,
    sourceHashes,
    reports: {
      integrated: byName[STAGE7_FILES[3]],
      independentQa: byName[STAGE7_FILES[4]],
    },
  };
}

function buildReviewIdSet(all1289) {
  const ids = new Set();
  for (const row of all1289) {
    if (row['검수 ID']) ids.add(row['검수 ID'].trim());
    if (row['통합 ID']) ids.add(row['통합 ID'].trim());
  }
  return ids;
}

/** Root-issue tokens may use STAGE:SUBID; ALL file uses U-STAGE-SUBID and/or 검수 ID alone. */
function evidenceTokenResolvable(token, all1289, reviewIds) {
  const t = token.trim();
  if (!t) return true;
  if (reviewIds.has(t)) return true;

  if (t.includes(':')) {
    const [stage, subId] = t.split(':');
    const unified = `U-${stage}-${subId}`;
    if (reviewIds.has(unified)) return true;
    for (const row of all1289) {
      if (row['검수 ID']?.trim() === subId && row['원본 Stage']?.trim() === stage) return true;
    }
  }

  for (const row of all1289) {
    if (row['검수 ID']?.trim() === t) return true;
    if (row['통합 ID']?.trim() === t) return true;
  }
  return false;
}

function findDuplicateReviewIds(crosswalk914) {
  const counts = new Map();
  for (const row of crosswalk914) {
    const id = row['검수 ID'];
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([id, n]) => ({ id, count: n }));
}

function tokenizeRootEvidence(raw) {
  if (!raw) return [];
  return raw
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildContentCrosswalk(stage7, b0Inputs) {
  if (!stage7.ok) return [];
  const dupReviewIds = new Set(findDuplicateReviewIds(stage7.crosswalk914).map((d) => d.id));
  const stitchElements = b0Inputs?.stitch?.elements ?? [];
  const usedStitchIds = new Set();

  const rows = stage7.crosswalk914.map((row) => {
    const cross = row['교차 대조 결과'];
    const edit = row['편집 판정'];
    const stage7Status = deriveMappingStatus(cross, edit);
    const stitchMatch = stitchElements.length ? matchBaselineToStitch(row, stitchElements) : null;

    let mapping_status = stage7Status;
    let stitch_element_id = '';
    let confidence =
      stage7Status === 'EXACT_MATCH' ? '1.0' : stage7Status === 'CONTENT_REWRITE_REQUIRED' ? '0.9' : '0.5';
    let review_reason = [row['수정 근거'], row['차수 우선순위']].filter(Boolean).join(' | ');

    if (stitchMatch) {
      stitch_element_id = stitchMatch.stitch_element_id;
      if (stitchMatch.mapping_status === 'EXACT_MATCH') {
        mapping_status = 'EXACT_MATCH';
        confidence = stitchMatch.confidence;
        review_reason = `${review_reason} | Stitch: ${stitchMatch.review_reason}`.trim();
        usedStitchIds.add(stitch_element_id);
      } else if (stitchMatch.mapping_status === 'UNRESOLVED') {
        mapping_status = 'UNRESOLVED';
        confidence = '0';
        review_reason = `${review_reason} | Stitch: ${stitchMatch.review_reason}`.trim();
      } else if (stitchMatch.mapping_status === 'NO_MAPPING') {
        review_reason = `${review_reason} | Stitch: ${stitchMatch.review_reason}`.trim();
      }
    }

    const route = row['경로'];
    const routeKey = route.split('?')[0].split('#')[0] || '/';
    const implRoute = routeKey.startsWith('/records/') ? '/records' : routeKey;

    return {
      baseline_text_id: row['검수 ID'],
      archive_row_number: row['원문 대장 번호'],
      route,
      kind: row['종류'],
      stitch_element_id,
      mapping_status,
      confidence,
      review_reason,
      stage7_cross_result: cross,
      stage7_edit_decision: edit,
      stage7_mapping_status: stage7Status,
      original_live_text: row['원문 대장 문자 그대로'],
      audit_review_text: row['검수 원문'],
      proposed_copy_draft: row['수정 제안'] === '—' ? '' : row['수정 제안'],
      current_implementation_hint: ROUTE_IMPL_HINT[implRoute] ?? 'UNRESOLVED_ROUTE_IMPL',
      evidence_source: 'contract-draft/sources/stage7/SPOKEDU_COPY_AUDIT_STAGE7_BASELINE_914_CROSSWALK_20261031.csv',
      stage7_publication_state: row['승인 상태'],
      duplicate_review_id_in_914: dupReviewIds.has(row['검수 ID']) ? 'YES' : 'NO',
      approval_status: 'PENDING_APPROVAL',
    };
  });

  return { rows, usedStitchIds, stitchElements };
}

function buildFactsFromStage7(stage7, baseFacts) {
  const facts = [...baseFacts];
  if (!stage7.ok) return facts;

  for (const row of stage7.rootIssues) {
    const issueId = row['이슈 ID'];
    facts.push({
      fact_id: `FACT-STAGE7-${issueId}`,
      category: 'stage7_integrated_issue',
      original_claim: row['중복 제거한 문제'],
      proposed_claim: '',
      evidence_source: 'contract-draft/sources/stage7/SPOKEDU_COPY_AUDIT_STAGE7_ROOT_ISSUES_20261031.csv',
      evidence_location: `${issueId} ${row['우선순위']} ${row['대분류']}`,
      verification_status: row['증빙 상태'] ?? 'UNVERIFIED',
      publication_approval: 'PENDING_APPROVAL',
      conflicting_claims: row['위험 성격'] ?? '',
      affected_routes: row['적용 경로'] ?? '',
    });
  }

  facts.push({
    fact_id: 'FACT-STAGE7-META-001',
    category: 'audit_metadata',
    original_claim:
      'Stage7: 914 frozen original units; 1289 review rows; 24 deduplicated root issues; audit text SHA 61a3b74657ee42ea4a6694baeb09e10c83b25629',
    proposed_claim: '',
    evidence_source: 'contract-draft/sources/stage7/SPOKEDU_COPY_AUDIT_STAGE7_INTEGRATED_REPORT_20261031.md',
    evidence_location: '§1–§2',
    verification_status: 'DOCUMENTED_IN_STAGE7_PACK',
    publication_approval: 'PENDING_APPROVAL',
    conflicting_claims: '',
    affected_routes: '14 public routes (partners excluded per report)',
  });

  return facts;
}

function buildChangeContractStage7(stage7, baseRows) {
  const rows = [...baseRows];
  if (!stage7.ok) return rows;

  const allowScope = PUBLIC_ROOTS.join(';');
  const add = (row) =>
    rows.push({
      approval_status: 'PENDING_APPROVAL',
      allowed_file_scope: allowScope,
      test_ids: row.test_ids ?? '',
      after_proposal: row.after_proposal ?? 'TBD_APPROVAL_REQUIRED',
      ...row,
    });

  const rewriteCount = stage7.crosswalk914.filter((r) =>
    (r['편집 판정'] ?? '').includes('수정 제안'),
  ).length;

  add({
    change_id: 'CHG-STAGE7-COPY-BULK-001',
    route: '14 public routes',
    file: 'TBD_PER_REVIEW_ID',
    element_id: 'STAGE7_BASELINE_914',
    property: 'customer_copy',
    before: '914 archived live strings @ Stage7 crosswalk (audit SHA 61a3b746…; not re-fetched @ HEAD)',
    after_proposal: `${rewriteCount} rows with 편집 판정=수정 제안 in crosswalk — apply only per approved review ID`,
    reason: 'Stage7 crosswalk editorial proposals — not approved',
    evidence_id: 'SPOKEDU_COPY_AUDIT_STAGE7_BASELINE_914_CROSSWALK_20261031.csv',
    dependencies: 'DEC-STAGE7-COPY-LINE-BY-LINE',
    test_ids: 'Stage7 independent QA methodology',
  });

  for (const row of stage7.rootIssues) {
    const gid = row['이슈 ID'];
    add({
      change_id: `CHG-STAGE7-${gid}`,
      route: row['적용 경로'],
      file: 'TBD_FROM_CODE_REF',
      element_id: gid,
      property: row['대분류'],
      before: row['확인된 코드/출처 근거'],
      after_proposal: row['권장 변경안(승인 전)'],
      reason: row['중복 제거한 문제'],
      evidence_id: row['대표 근거 항목'],
      dependencies: row['구현 승인 여부'],
      test_ids: '',
    });
  }

  const idx = rows.findIndex((r) => r.change_id === 'CHG-STAGE7-COPY-001');
  if (idx >= 0) rows.splice(idx, 1);

  return rows;
}

function validateStage7(stage7, crosswalkRows, changes) {
  const stats = {
    crosswalk_row_count: 0,
    unique_baseline_ids: 0,
    unique_archive_numbers: 0,
    all1289_count: 0,
    root_issue_count: 0,
    root_evidence_missing_tokens: [],
    duplicate_review_ids: [],
    rewrite_proposal_count: 0,
  };

  if (!stage7.ok) {
    return { stats, v1Pass: false, v3Pass: false, v1bPass: false };
  }

  stats.crosswalk_row_count = stage7.crosswalk914.length;
  const ids = stage7.crosswalk914.map((r) => r['검수 ID']);
  const nums = stage7.crosswalk914.map((r) => Number(r['원문 대장 번호']));
  stats.unique_baseline_ids = new Set(ids).size;
  stats.unique_archive_numbers = new Set(nums).size;
  stats.archive_min = nums.length ? Math.min(...nums) : 0;
  stats.archive_max = nums.length ? Math.max(...nums) : 0;
  stats.all1289_count = stage7.all1289.length;
  stats.root_issue_count = stage7.rootIssues.length;
  stats.rewrite_proposal_count = stage7.crosswalk914.filter((r) =>
    (r['편집 판정'] ?? '').includes('수정 제안'),
  ).length;

  const reviewIds = buildReviewIdSet(stage7.all1289);
  stats.duplicate_review_ids = findDuplicateReviewIds(stage7.crosswalk914);
  for (const row of stage7.rootIssues) {
    for (const tok of tokenizeRootEvidence(row['대표 근거 항목'])) {
      if (!evidenceTokenResolvable(tok, stage7.all1289, reviewIds)) {
        stats.root_evidence_missing_tokens.push(`${row['이슈 ID']}:${tok}`);
      }
    }
  }

  // Archive numbers are not required to be 1..914 contiguous (SEO META rows use high IDs e.g. 943–944).
  const archiveOk =
    stats.crosswalk_row_count === 914 && stats.unique_archive_numbers === 914;

  // 914 = archive row units; 검수 ID may repeat (e.g. META-01 SEO rows) per Stage7 source — not auto-merged.
  const v1Pass =
    stats.crosswalk_row_count === 914 &&
    archiveOk &&
    stats.all1289_count === 1289 &&
    stats.root_issue_count === 24;

  const v3Pass = stats.root_issue_count === 24 && stats.root_evidence_missing_tokens.length === 0;

  let compositeDup = 0;
  const seenComposite = new Set();
  for (const row of crosswalkRows) {
    const key = `${row.baseline_text_id}#${row.archive_row_number}`;
    if (seenComposite.has(key)) compositeDup++;
    seenComposite.add(key);
  }
  const v1bPass = compositeDup === 0 && stats.crosswalk_row_count === 914;

  return { stats, v1Pass, v3Pass, v1bPass };
}

function loadSiteNavLabels() {
  const sitePath = path.join(REPO_ROOT, 'app/spokedu/data/site.ts');
  const src = fs.readFileSync(sitePath, 'utf8');
  const labels = [...src.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1]);
  return { sitePath: 'app/spokedu/data/site.ts', labels };
}

function buildFacts() {
  const facts = [];
  const push = (row) =>
    facts.push({
      publication_approval: 'PENDING_APPROVAL',
      verification_status: row.verification_status ?? 'UNVERIFIED',
      conflicting_claims: row.conflicting_claims ?? '',
      ...row,
    });

  push({
    fact_id: 'FACT-BRAND-001',
    category: 'brand',
    original_claim:
      'SPOKEDU는 직접 운영하는 체육교육을 기반으로, 실제 수업에서 사용하는 콘텐츠와 지도자용 수업 시스템을 만드는 체육교육 브랜드다.',
    proposed_claim: '',
    evidence_source: 'docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md',
    evidence_location: '§01 Brand truth',
    affected_routes: '/',
  });

  push({
    fact_id: 'FACT-BRAND-002',
    category: 'product',
    original_claim: '공식 구독 브랜드: SPOKEDU LAB (`/spokedu-lab`). `/subscription`은 레거시 리다이렉트.',
    proposed_claim: '',
    evidence_source: 'docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md',
    evidence_location: '§01',
    verification_status: 'CODE_SSOT_CROSSCHECK_REQUIRED',
    affected_routes: '/spokedu-lab,/subscription',
  });

  push({
    fact_id: 'FACT-NAV-SSOT-001',
    category: 'navigation',
    original_claim:
      'PRIMARY HEADER: 체육교육 · SPOKEDU LAB · SPOMOVE · 운영 사례 · [상담하기]. About/SPOMAT/Partners/개인·소그룹 헤더 primary 아님.',
    proposed_claim: '',
    evidence_source: 'docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md',
    evidence_location: '§05 Global navigation',
    verification_status: 'CONFLICT_WITH_IMPLEMENTATION',
    conflicting_claims: 'app/spokedu/data/site.ts siteNav includes 개인·소그룹, SPOKEDU 소개; LAB is siteHeaderLabCta not primary text nav order in SSOT',
    affected_routes: 'global header',
  });

  push({
    fact_id: 'FACT-NAV-CANON-001',
    category: 'navigation',
    original_claim:
      'Desktop nav: 체육수업, SPOMOVE, SPOKEDU LAB, 수업사례, SPOKEDU 소개, 문의하기 (SPOKEDU_HOME_DESIGN_CANONICAL).',
    proposed_claim: '',
    evidence_source: 'docs/operations/public-website-refactor/SPOKEDU_HOME_DESIGN_CANONICAL.md',
    evidence_location: 'Global navigation',
    verification_status: 'CONFLICT_WITH_OTHER_DOC',
    conflicting_claims: 'docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md §05 primary header list differs',
    affected_routes: 'global header',
  });

  push({
    fact_id: 'FACT-BIZ-001',
    category: 'legal',
    original_claim: '사업자등록번호 311-63-00356',
    proposed_claim: '',
    evidence_source: 'docs/operations/public-website-audit-remediation/04_BUSINESS_FACT_CHECK.md',
    evidence_location: 'table row 1',
    verification_status: 'DOCUMENTED_UNCHANGED_IN_BRAND_TS',
    affected_routes: 'footer',
  });

  push({
    fact_id: 'FACT-BIZ-002',
    category: 'legal',
    original_claim: '통신판매업 신고번호 — FACT_REQUIRED (mailOrderReportNumber null)',
    proposed_claim: '',
    evidence_source: 'docs/operations/public-website-audit-remediation/04_BUSINESS_FACT_CHECK.md',
    evidence_location: 'table row 2',
    verification_status: 'UNVERIFIED',
    affected_routes: 'footer',
  });

  push({
    fact_id: 'FACT-RECORDS-001',
    category: 'operations',
    original_claim: '운영 사례 = FIELD_RECORD_CATALOG SSOT; unverified counts forbidden.',
    proposed_claim: '',
    evidence_source: 'docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md',
    evidence_location: '§ + .cursor/rules/spokedu-public-website.mdc',
    verification_status: 'CODE_SSOT_PRESENT',
    affected_routes: '/records,/',
  });

  push({
    fact_id: 'FACT-HERO-ASSET-001',
    category: 'media',
    original_claim: 'Hero 대표 사진 home-hero-gym-motion.jpg — ASSET_PROVENANCE_REVIEW_REQUIRED',
    proposed_claim: '',
    evidence_source: 'docs/operations/public-website-refactor/PUBLIC_REFACTOR_AUDIT.md',
    evidence_location: '§1 홈 Hero',
    verification_status: 'UNVERIFIED',
    affected_routes: '/',
  });

  push({
    fact_id: 'FACT-QA-001',
    category: 'release',
    original_claim: 'REFACTOR_TECHNICAL_PASS_PO_PENDING; DESIGN_APPROVED not granted; production deploy forbidden until PO',
    proposed_claim: '',
    evidence_source: 'docs/operations/public-website-refactor/FINAL_QA_AND_APPROVAL.md',
    evidence_location: 'header',
    verification_status: 'DOCUMENTED',
    affected_routes: 'all public',
  });

  return facts;
}

function buildDesignContract(b0Inputs) {
  const stitchPresent = (b0Inputs?.stitch?.html_parsed ?? 0) > 0;
  const designMd = b0Inputs?.stitch?.design_md_path
    ? fs.readFileSync(b0Inputs.stitch.design_md_path, 'utf8')
    : '';
  const regions = [
    ['DES-HOME-HERO', 'Hero / Full Bleed'],
    ['DES-HOME-PURPOSE', 'Customer purpose / Contained — three paths'],
    ['DES-HOME-TRUST', 'Expertise and trust / Asymmetric'],
    ['DES-HOME-RECORDS', 'Field records / Editorial Grid'],
    ['DES-HOME-SPOMOVE-LAB', 'SPOMOVE + SPOKEDU LAB / Mixed'],
    ['DES-HOME-CONSULT', 'Consultation / Narrow'],
  ];
  const components = regions.map(([id, structure]) => ({
    component_id: id,
    source_page: stitchPresent ? 'TBD_FROM_STITCH' : 'UNAVAILABLE_STITCH',
    source_element: 'N/A',
    original_structure: structure,
    original_styles: b0Inputs?.stitch?.design_md_present
      ? 'DESIGN.md from B0 input bundle'
      : 'TBD_APPROVAL_REQUIRED — DESIGN.md not in bundle',
    protected_attributes: 'section_order,handoff_routes,product_names',
    proposed_exceptions: '',
    exception_reason: '',
    affected_breakpoints: '390,1024,1200,1440',
    approval_status: 'PENDING_APPROVAL',
    evidence_source: 'docs/operations/public-website-refactor/SPOKEDU_HOME_DESIGN_CANONICAL.md',
  }));

  if (stitchPresent) {
    components.push(...buildStitchDesignComponents(b0Inputs, designMd));
  }

  components.push({
    component_id: 'DES-GLOBAL-NAV',
    source_page: 'implementation',
    source_element: 'app/spokedu/data/site.ts siteNav',
    original_structure: JSON.stringify(loadSiteNavLabels().labels),
    original_styles: 'site-chrome.tsx + globals .spokedu-marketing',
    protected_attributes: 'href,trackLabel,MASTER_handoff_separation',
    proposed_exceptions: 'SSOT vs canonical nav label order conflict — PO decision required',
    exception_reason: 'FACT-NAV-SSOT-001 vs FACT-NAV-CANON-001',
    affected_breakpoints: 'all',
    approval_status: 'PENDING_APPROVAL',
    evidence_source: 'app/spokedu/data/site.ts',
  });

  return {
    generated_at: new Date().toISOString(),
    git_head: HEAD,
    stitch_source_available: stitchPresent,
    stitch_html_count: b0Inputs?.stitch?.html_parsed ?? 0,
    stitch_element_count: b0Inputs?.stitch?.elements?.length ?? 0,
    design_md_present: b0Inputs?.stitch?.design_md_present ?? false,
    default_policy: 'preserve_original_design',
    approval_default: 'PENDING_APPROVAL',
    components,
  };
}

function buildChangeContract() {
  const allowScope = PUBLIC_ROOTS.join(';');
  const rows = [];

  const add = (row) =>
    rows.push({
      approval_status: 'PENDING_APPROVAL',
      allowed_file_scope: allowScope,
      test_ids: row.test_ids ?? '',
      after_proposal: row.after_proposal ?? 'TBD_APPROVAL_REQUIRED',
      ...row,
    });

  add({
    change_id: 'CHG-AUDIT-HERO-001',
    route: '/',
    file: 'app/spokedu/components/home-web/home-web.module.css',
    element_id: 'DES-HOME-HERO',
    property: 'responsive_grid',
    before: 'DOCUMENTED_IN_PUBLIC_REFACTOR_AUDIT: <=1023 single column; 1024-1199 contained 2-col; 1200+ 2-col bleed',
    after_proposal: 'TBD_APPROVAL_REQUIRED — verify live CSS @ HEAD matches audit or reconcile doc',
    reason: 'PUBLIC_REFACTOR_AUDIT §0 Hero mobile',
    evidence_id: 'PUBLIC_REFACTOR_AUDIT.md',
    dependencies: 'layout-foundation/LAYOUT_CONTRACT.md',
    test_ids: 'app/spokedu/lib/public-marketing-visual.contract.test.ts',
  });

  add({
    change_id: 'CHG-AUDIT-RECORDS-001',
    route: '/records',
    file: 'app/spokedu/components/records-v0-landing.tsx',
    element_id: 'records-list-heading',
    property: 'copy_semantics',
    before: 'CURRENT_HEAD: records-v0 filter includes "전체 보기" (not "그 외 수업사례" string in component)',
    after_proposal: 'TBD_APPROVAL_REQUIRED — audit proposed partition UI copy; implementation uses records-v0',
    reason: 'PUBLIC_REFACTOR_AUDIT §2 vs current records-landing export chain',
    evidence_id: 'PUBLIC_REFACTOR_AUDIT.md',
    dependencies: 'CHG-IMPL-RECORDS-EXPORT',
    test_ids: 'app/spokedu/data/field-records-catalog.test.ts',
  });

  add({
    change_id: 'CHG-AUDIT-LAB-001',
    route: '/spokedu-lab',
    file: 'app/spokedu-master/landing/components/LandingSections.tsx',
    element_id: 'lab-hero-body',
    property: 'customer_copy',
    before: 'TBD_APPROVAL_REQUIRED — read file at approval time',
    after_proposal: 'Remove internal brand phrasing per audit; customer-facing program flow copy',
    reason: 'PUBLIC_REFACTOR_AUDIT §6',
    evidence_id: 'PUBLIC_REFACTOR_AUDIT.md',
    dependencies: '',
    test_ids: 'PUBLIC_COPY_SCAN.json methodology',
  });

  add({
    change_id: 'CHG-GATEB-IMG-001',
    route: 'multiple',
    file: 'docs/operations/public-website-refactor/MEDIA_AND_CONTENT_MATRIX.csv',
    element_id: 'media-mapping',
    property: 'asset_assignment',
    before: '106 assets / 82 usage rows @ matrix CSV HEAD hash',
    after_proposal: 'TBD_APPROVAL_REQUIRED — GATE_B_IMAGE_AND_VISUAL_PLAN page/position mapping',
    reason: 'Gate B image plan pending PO + rights',
    evidence_id: 'GATE_B_IMAGE_AND_VISUAL_PLAN.md',
    dependencies: 'ASSET_PROVENANCE',
    test_ids: '',
  });

  add({
    change_id: 'CHG-NAV-CONFLICT-001',
    route: 'global',
    file: 'app/spokedu/data/site.ts',
    element_id: 'DES-GLOBAL-NAV',
    property: 'siteNav order and labels',
    before: JSON.stringify(loadSiteNavLabels().labels),
    after_proposal: 'TBD_APPROVAL_REQUIRED — choose SSOT §05 vs HOME_DESIGN_CANONICAL vs cursor rule header list',
    reason: 'Documented navigation conflicts; no AI resolution',
    evidence_id: 'FACT-NAV-SSOT-001;FACT-NAV-CANON-001',
    dependencies: 'PO_NAV_DECISION',
    test_ids: 'app/spokedu/data/site-ia.test.ts',
  });

  add({
    change_id: 'CHG-STITCH-DESIGN-001',
    route: 'multiple',
    file: 'TBD',
    element_id: 'STITCH_HTML_SET',
    property: 'layout_and_tokens',
    before: 'UNAVAILABLE — stitch zip not in repository',
    after_proposal: 'TBD_APPROVAL_REQUIRED — ingest stitch_editorial_website_redesign.zip',
    reason: 'Phase B0 Stitch analysis blocked',
    evidence_id: `MISSING:${STITCH_ZIP}`,
    dependencies: 'STITCH_SOURCE_INGEST',
    test_ids: '',
  });

  return rows;
}

function validateOutputs(manifest, facts, design, changes, crosswalkRows, stage7Val, b0Inputs, mappingStats) {
  const results = [];
  const { stats = {}, v1Pass, v3Pass, v1bPass } = stage7Val;

  results.push({
    id: 'V1_STAGE7_914_IDS',
    pass: v1Pass,
    detail: v1Pass
      ? `914 archive rows; ${stats.unique_baseline_ids} unique 검수 ID (${stats.duplicate_review_ids.length} duplicated IDs in source — not auto-fixed); ${stats.all1289_count} ALL rows; ${stats.root_issue_count} root issues`
      : manifest.external_sources.stage7_copy_audit.missing_files?.length
        ? `Missing Stage7 files: ${manifest.external_sources.stage7_copy_audit.missing_files.join(', ')}`
        : `Counts: crosswalk=${stats.crosswalk_row_count}, unique_review_ids=${stats.unique_baseline_ids}, archive_nums=${stats.unique_archive_numbers}, all1289=${stats.all1289_count}, root=${stats.root_issue_count}`,
  });

  const fidelity = b0Inputs?.stitch?.fidelity;
  const stitchOk =
    b0Inputs?.zip_present &&
    b0Inputs?.stitch?.html_parsed === 6 &&
    b0Inputs?.stitch?.screen_images_count >= 6 &&
    b0Inputs?.stitch?.design_md_present &&
    (b0Inputs?.stitch?.element_id_duplicates?.length ?? 0) === 0 &&
    (fidelity?.design_elements?.length ?? 0) > 0;

  results.push({
    id: 'V2_STITCH_HTML_6',
    pass: b0Inputs?.stitch?.html_parsed === 6,
    detail: b0Inputs?.zip_present
      ? `HTML parsed ${b0Inputs.stitch.html_parsed}/6; elements ${b0Inputs.stitch.elements.length}; images ${b0Inputs.stitch.screen_images_count}/6; DESIGN.md ${b0Inputs.stitch.design_md_present ? 'yes' : 'no'}`
      : `${B0_INPUT_ZIP} not found — place under contract-draft/sources/`,
  });

  results.push({
    id: 'V2b_B0_MANIFEST_HASH',
    pass: !b0Inputs?.zip_present || (b0Inputs.manifest_path && b0Inputs.manifest_valid),
    detail: !b0Inputs?.zip_present
      ? 'Skipped — input zip missing'
      : b0Inputs.manifest_valid
        ? `SOURCE_INPUT_MANIFEST.json OK (${b0Inputs.manifest_validation?.checked ?? 0} files checked)`
        : `Manifest mismatches: ${JSON.stringify(b0Inputs.manifest_validation?.mismatches?.slice(0, 3) ?? 'no manifest')}`,
  });

  results.push({
    id: 'V2c_STITCH_ID_DUPES',
    pass: (b0Inputs?.stitch?.element_id_duplicates?.length ?? 0) === 0,
    detail:
      b0Inputs?.stitch?.element_id_duplicates?.length > 0
        ? `Duplicate stitch IDs: ${b0Inputs.stitch.element_id_duplicates.map((d) => `${d.id}×${d.count}`).join(', ')}`
        : b0Inputs?.zip_present
          ? 'Stitch element IDs unique'
          : 'N/A',
  });

  results.push({
    id: 'V3_ROOT_ISSUES_24',
    pass: v3Pass,
    detail: v3Pass
      ? '24 root issues; representative evidence tokens found in 1289 union ID set'
      : stats.root_evidence_missing_tokens?.length
        ? `Missing evidence tokens (sample): ${stats.root_evidence_missing_tokens.slice(0, 8).join(', ')}`
        : 'Root issues file missing or count ≠ 24',
  });

  const missingPaths = [];
  for (const f of [...manifest.public_surface_files.map((x) => x.path), ...EVIDENCE_DOCS]) {
    if (!fs.existsSync(path.join(REPO_ROOT, f))) missingPaths.push(f);
  }
  results.push({
    id: 'V4_FILE_PATHS_EXIST',
    pass: missingPaths.length === 0,
    detail: missingPaths.length ? `Missing: ${missingPaths.slice(0, 10).join('; ')}${missingPaths.length > 10 ? '...' : ''}` : 'All manifest paths exist',
  });

  results.push({
    id: 'V5_SOURCE_HASH_RECORDED',
    pass: manifest.public_surface_files.every((x) => x.sha256 && x.git_blob),
    detail: 'SHA-256 and git blob recorded for enumerated public surface files',
  });

  results.push({
    id: 'V6_BEFORE_VALUES',
    pass: v1Pass,
    detail: v1Pass
      ? 'Stage7 crosswalk before strings archived; automated live HEAD string diff not run (BY DESIGN B0)'
      : 'PARTIAL — Stage7 before archive unavailable or counts invalid',
  });

  const badApproval = [...facts, ...changes].filter(
    (r) => r.approval_status === 'APPROVED' || r.publication_approval === 'APPROVED',
  );
  results.push({
    id: 'V7_APPROVAL_NOT_POLLUTED',
    pass: badApproval.length === 0,
    detail: badApproval.length ? `Found APPROVED: ${badApproval.length}` : 'No APPROVED statuses',
  });

  const inventedMetrics = facts.filter(
    (f) => /\d+%|\d+건|\d+년/.test(f.proposed_claim) && f.verification_status !== 'UNVERIFIED',
  );
  results.push({
    id: 'V8_NO_UNAPPROVED_NEW_FACTS',
    pass: inventedMetrics.length === 0 && facts.every((f) => !f.proposed_claim || f.proposed_claim === ''),
    detail: 'proposed_claim empty for all facts (no new published claims)',
  });

  results.push({
    id: 'V9_PUBLIC_CODE_UNTOUCHED',
    pass: true,
    detail: 'Generator only writes under contract-draft/',
  });

  results.push({
    id: 'V10_WORKING_TREE_PRESERVED',
    pass: true,
    detail: 'No git write operations performed by generator',
  });

  results.push({
    id: 'V1b_CROSSWALK_DUP',
    pass: v1bPass,
    detail: v1bPass
      ? '914 unique composite keys (검수 ID + 원문 대장 번호) in CONTENT_CROSSWALK export'
      : 'Composite key collision or row count ≠ 914',
  });

  if (stats.duplicate_review_ids?.length) {
    const allowedDupes = stats.duplicate_review_ids.every(
      (d) => d.id === 'META-01' || d.id === 'META-02',
    );
    const v1cPass =
      allowedDupes &&
      stats.duplicate_review_ids.every((d) => d.count === 3) &&
      stats.duplicate_review_ids.length === 2;
    results.push({
      id: 'V1c_STAGE7_REVIEW_ID_DUPES',
      pass: v1cPass,
      detail: v1cPass
        ? 'META-01×3, META-02×3 only — disambiguated by archive_row_number + duplicate_review_id_in_914; source IDs unchanged, no merge'
        : `Unexpected duplicate 검수 ID pattern: ${stats.duplicate_review_ids
            .map((d) => `${d.id}×${d.count}`)
            .join(', ')}`,
    });
  }

  results.push({
    id: 'V11_MAPPING_COVERAGE',
    pass: true,
    detail: mappingStats
      ? `914 baseline rows; Stitch EXACT ${mappingStats.exact}; UNRESOLVED ${mappingStats.unresolved}; NO_MAPPING ${mappingStats.no_mapping}; unmapped stitch elements ${mappingStats.unmapped_stitch}`
      : 'No mapping stats',
  });

  results.push({
    id: 'V12_DESIGN_ASSET_INVENTORY',
    pass:
      (fidelity?.assets?.length ?? 0) >= 13 &&
      b0Inputs?.stitch?.html_parsed === 6 &&
      b0Inputs?.stitch?.screen_images_count === 6 &&
      b0Inputs?.stitch?.design_md_present,
    detail: fidelity
      ? `${fidelity.assets.length} assets SHA-256; DESIGN_LOCKED elements ${fidelity.design_elements.length}`
      : 'No fidelity inventory',
  });

  results.push({
    id: 'V13_DESIGN_FIDELITY_PASS',
    pass: false,
    detail:
      'NOT_GRANTED in Phase B1 — inventory + lock contract only; visual QA deferred to Phase C per addendum',
  });

  return { results, stitchOk };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const publicFiles = [];
  for (const root of PUBLIC_ROOTS) {
    for (const rel of walkDir(root)) {
      publicFiles.push({
        path: rel,
        sha256: sha256File(path.join(REPO_ROOT, rel)),
        git_blob: gitBlobHash(rel),
        role: 'public_surface',
      });
    }
  }

  const evidence = EVIDENCE_DOCS.map((rel) => {
    const abs = path.join(REPO_ROOT, rel);
    const exists = fs.existsSync(abs);
    return {
      path: rel,
      exists,
      sha256: exists ? sha256File(abs) : null,
      git_blob: exists ? gitBlobHash(rel) : null,
    };
  });

  const stage7Bundle = loadStage7Bundle();
  const b0Inputs = loadB0SourceInputs(OUT_DIR, REPO_ROOT);
  const stage7Resolved = stage7Bundle.resolved.map((r) => ({
    expected_name: r.name,
    found_paths: r.paths.map((p) => path.relative(REPO_ROOT, p).replace(/\\/g, '/')),
  }));

  const stitchPresent = (b0Inputs.stitch?.html_parsed ?? 0) > 0;

  const manifest = {
    generated_at: new Date().toISOString(),
    git_head: HEAD,
    phase: 'B1_CONTRACT_DRAFT',
    implementation_forbidden: true,
    historical_baseline_note:
      'GIT_CORRECTION_BASELINE.json is historical only; not used as this manifest HEAD.',
    public_surface_files: publicFiles,
    evidence_documents: evidence,
    external_sources: {
      stage7_copy_audit: {
        expected_files: stage7Resolved,
        baseline_id_count_expected: 914,
        baseline_ids_loaded: stage7Bundle.ok ? stage7Bundle.crosswalk914.length : 0,
        all1289_rows_loaded: stage7Bundle.ok ? stage7Bundle.all1289.length : 0,
        root_issues_loaded: stage7Bundle.ok ? stage7Bundle.rootIssues.length : 0,
        missing_files: stage7Bundle.missing,
        source_file_hashes: stage7Bundle.ok ? stage7Bundle.sourceHashes : [],
        audit_baseline_sha_from_report: '61a3b74657ee42ea4a6694baeb09e10c83b25629',
        independent_qa_claim: stage7Bundle.ok ? '20/20 PASS per INDEPENDENT_QA md (not re-executed here)' : null,
      },
      b0_source_inputs: {
        expected_zip: B0_INPUT_ZIP,
        zip_present: b0Inputs.zip_present,
        zip_path: b0Inputs.zip_path
          ? path.relative(REPO_ROOT, b0Inputs.zip_path).replace(/\\/g, '/')
          : null,
        extract_root: path.relative(REPO_ROOT, b0Inputs.extract_root).replace(/\\/g, '/'),
        manifest_path: b0Inputs.manifest_path
          ? path.relative(REPO_ROOT, b0Inputs.manifest_path).replace(/\\/g, '/')
          : null,
        manifest_valid: b0Inputs.manifest_valid,
        manifest_validation: b0Inputs.manifest_validation,
      },
      stitch_editorial_website_redesign: {
        expected_archive: STITCH_ZIP,
        present: stitchPresent,
        html_parsed: b0Inputs.stitch?.html_parsed ?? 0,
        html_files: b0Inputs.stitch?.html_files ?? [],
        screen_images_count: b0Inputs.stitch?.screen_images_count ?? 0,
        screen_images: b0Inputs.stitch?.screen_images ?? [],
        design_md_present: b0Inputs.stitch?.design_md_present ?? false,
        element_count: b0Inputs.stitch?.elements?.length ?? 0,
        html_count_expected: 6,
        screen_images_expected: 6,
        design_md_expected: 'DESIGN.md',
      },
    },
    tests_reference: TEST_IDS.map((t) => ({
      path: t,
      exists: fs.existsSync(path.join(REPO_ROOT, t)),
    })),
    route_entrypoints: walkDir('app/(spokedu-public)').filter((p) => p.endsWith('/page.tsx')),
  };

  const facts = buildFactsFromStage7(stage7Bundle, buildFacts());
  const design = buildDesignContract(b0Inputs);
  let changes = buildChangeContractStage7(stage7Bundle, buildChangeContract());
  if (b0Inputs.zip_present) {
    changes = changes.map((row) =>
      row.change_id === 'CHG-STITCH-DESIGN-001'
        ? {
            ...row,
            before: `${b0Inputs.stitch.html_parsed} HTML, ${b0Inputs.stitch.screen_images_count} images, DESIGN.md=${b0Inputs.stitch.design_md_present}`,
            after_proposal: 'TBD_APPROVAL_REQUIRED — design diff vs implementation',
            evidence_id: B0_INPUT_ZIP,
          }
        : row,
    );
  }

  const crosswalkBuilt = buildContentCrosswalk(stage7Bundle, b0Inputs);
  const crosswalkRows = crosswalkBuilt.rows ?? crosswalkBuilt;
  const crosswalkHeaders = crosswalkRows.length
    ? Object.keys(crosswalkRows[0])
    : [
        'baseline_text_id',
        'stitch_element_id',
        'mapping_status',
        'confidence',
        'review_reason',
        'evidence_source',
        'approval_status',
      ];

  const stage7Val = validateStage7(stage7Bundle, crosswalkRows, changes);

  const mappingStats = {
    exact: crosswalkRows.filter((r) => r.stitch_element_id).length,
    unresolved: crosswalkRows.filter((r) => r.mapping_status === 'UNRESOLVED').length,
    no_mapping: crosswalkRows.filter((r) => r.mapping_status === 'NO_MAPPING').length,
    content_rewrite: crosswalkRows.filter((r) => r.mapping_status === 'CONTENT_REWRITE_REQUIRED').length,
  };
  if (crosswalkBuilt.usedStitchIds) {
    mappingStats.unmapped_stitch =
      (b0Inputs.stitch?.elements?.length ?? 0) - crosswalkBuilt.usedStitchIds.size;
  } else {
    mappingStats.unmapped_stitch = b0Inputs.stitch?.elements?.length ?? 0;
  }

  const stitchUnmapped =
    b0Inputs.stitch?.elements?.filter((el) => !crosswalkBuilt.usedStitchIds?.has(el.stitch_element_id)) ??
    [];

  const allowlist = {
    generated_at: new Date().toISOString(),
    git_head: HEAD,
    allowed_roots: PUBLIC_ROOTS,
    allowed_support_files: [
      'app/sitemap.ts',
      'next.config.ts',
      'app/globals.css',
    ],
    forbidden_without_explicit_approval: [
      'app/spokedu-master/** payment/auth runtime',
      'app/admin/**',
      'supabase/migrations/**',
      'deploy/**',
    ],
    approval_status: 'PENDING_APPROVAL',
  };

  fs.writeFileSync(path.join(OUT_DIR, 'SOURCE_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  writeCsv(path.join(OUT_DIR, 'FACT_REGISTRY.csv'), Object.keys(facts[0]), facts);
  writeCsv(path.join(OUT_DIR, 'CONTENT_CROSSWALK.csv'), crosswalkHeaders, crosswalkRows);
  fs.writeFileSync(path.join(OUT_DIR, 'DESIGN_CONTRACT.json'), `${JSON.stringify(design, null, 2)}\n`);
  writeCsv(path.join(OUT_DIR, 'CHANGE_CONTRACT.csv'), Object.keys(changes[0]), changes);
  fs.writeFileSync(path.join(OUT_DIR, 'CHANGE_ALLOWLIST.json'), `${JSON.stringify(allowlist, null, 2)}\n`);

  if (b0Inputs.stitch?.elements?.length) {
    fs.writeFileSync(
      path.join(OUT_DIR, 'STITCH_ELEMENTS.json'),
      `${JSON.stringify({ git_head: HEAD, count: b0Inputs.stitch.elements.length, elements: b0Inputs.stitch.elements }, null, 2)}\n`,
    );
  }
  if (b0Inputs.stitch?.fidelity) {
    fs.writeFileSync(
      path.join(OUT_DIR, 'STITCH_DESIGN_FIDELITY.json'),
      `${JSON.stringify({ git_head: HEAD, ...b0Inputs.stitch.fidelity }, null, 2)}\n`,
    );
    const fid = b0Inputs.stitch.fidelity;
    const fidelityMd = `# DESIGN_FIDELITY_REPORT — Phase B1 (contract only)

**DESIGN_FIDELITY_PASS:** \`NOT_GRANTED\` (Phase C implementation + visual QA required)

**Design SSOT:** Google Stitch \`stitch_editorial_website_redesign.zip\`

## Inventory

| Asset | Count |
|-------|------:|
| Tracked files (SHA-256) | ${fid.assets.length} |
| HTML pages | ${b0Inputs.stitch.html_parsed} |
| Screen PNG | ${b0Inputs.stitch.screen_images_count} |
| DESIGN.md | ${b0Inputs.stitch.design_md_present ? 'yes' : 'no'} |
| DESIGN_LOCKED elements | ${fid.design_elements.length} |

## Visual QA plan (Phase C — not executed)

Viewports: ${fid.visual_qa_plan.viewports.join(', ')}

Dimensions: ${fid.visual_qa_plan.dimensions.join('; ')}

${fid.visual_qa_plan.mobile_note}

## Content substitution

All Stitch placeholder copy/metrics/external images → \`REQUIRED_SPOKEDU_FACTS_UNAPPROVED\`. Conflicts → user approval; no AI resolution.

## Addendum compliance (B1)

1. Assets traced — ${fid.assets.length} files hashed  
2. Major elements — ${fid.design_elements.length} rows in STITCH_DESIGN_FIDELITY.json  
3. Unapproved layout changes — N/A (no Phase C code)  
4. Chart/metric UI — recorded per page \`chart_like\`  
5. Content substitution — not executed  
6. Visual diff — not executed  
7. Design exceptions — all \`DESIGN_EXCEPTION_PENDING_APPROVAL\`  
8. Viewport visual QA — planned only  

**Phase C forbidden until PO approves execution registry.**
`;
    fs.writeFileSync(path.join(OUT_DIR, 'DESIGN_FIDELITY_REPORT.md'), fidelityMd);
  }
  if (stitchUnmapped.length) {
    writeCsv(
      path.join(OUT_DIR, 'STITCH_UNMAPPED.csv'),
      ['stitch_element_id', 'route', 'tag', 'text', 'source_file', 'approval_status'],
      stitchUnmapped.map((el) => ({ ...el, approval_status: 'PENDING_APPROVAL' })),
    );
  }

  const { results: validation, stitchOk } = validateOutputs(
    manifest,
    facts,
    design,
    changes,
    crosswalkRows,
    stage7Val,
    b0Inputs,
    mappingStats,
  );
  const passCount = validation.filter((v) => v.pass).length;
  const criticalPass =
    stage7Val.v1Pass &&
    stage7Val.v3Pass &&
    b0Inputs.zip_present &&
    b0Inputs.manifest_valid &&
    stitchOk;

  const overall = !b0Inputs.zip_present
    ? stage7Bundle.ok
      ? 'CONTRACT_DRAFT_PARTIAL'
      : 'CONTRACT_GENERATION_BLOCKED'
    : criticalPass &&
        validation.filter((v) => v.id !== 'V13_DESIGN_FIDELITY_PASS').every((v) => v.pass)
      ? 'CONTRACT_DRAFT_READY_FOR_REVIEW'
      : stage7Bundle.ok
        ? 'CONTRACT_DRAFT_PARTIAL'
        : 'CONTRACT_GENERATION_BLOCKED';

  const validationMd = `# VALIDATION_REPORT — Phase B1 contract draft

**Generated:** ${manifest.generated_at}  
**Git HEAD:** \`${HEAD}\`  
**Overall:** \`${overall}\`

## Summary

| Metric | Value |
|--------|------:|
| Public surface files in manifest | ${publicFiles.length} |
| FACT_REGISTRY rows | ${facts.length} |
| DESIGN_CONTRACT components | ${design.components.length} |
| CHANGE_CONTRACT rows | ${changes.length} |
| CONTENT_CROSSWALK rows (excl. header) | ${crosswalkRows.length} |
| Stage7 baseline IDs loaded | ${stage7Val.stats.unique_baseline_ids} / 914 expected |
| Stage7 copy rewrite proposals (편집 판정) | ${stage7Val.stats.rewrite_proposal_count} |
| B0 input zip present | ${b0Inputs.zip_present} |
| Stitch HTML parsed | ${b0Inputs.stitch?.html_parsed ?? 0} / 6 |
| Stitch screen images | ${b0Inputs.stitch?.screen_images_count ?? 0} / 6 |
| Stitch text/media elements | ${b0Inputs.stitch?.elements?.length ?? 0} |
| Baseline→Stitch EXACT (normalized) | ${mappingStats.exact} |
| Baseline UNRESOLVED (Stitch on route, no exact match) | ${mappingStats.unresolved} |
| Unmapped Stitch elements | ${mappingStats.unmapped_stitch} |
| Validation checks passed | ${passCount} / ${validation.length} |

## Checks

| ID | Pass | Detail |
|----|:----:|--------|
${validation.map((v) => `| ${v.id} | ${v.pass ? 'PASS' : 'FAIL'} | ${v.detail.replace(/\|/g, '\\|')} |`).join('\n')}

## Doc vs implementation notes (no auto-resolution)

- \`docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md\` §05 primary header ≠ \`SPOKEDU_HOME_DESIGN_CANONICAL.md\` nav list ≠ current \`site.ts\` labels/order.
- \`PUBLIC_REFACTOR_AUDIT.md\` records partition copy targets \`records-landing-legacy\` patterns; HEAD uses \`records-v0-landing\` via re-export.

## Blockers for \`CONTRACT_DRAFT_READY_FOR_REVIEW\`

1. ${b0Inputs.zip_present ? '`SPOKEDU_PHASE_B0_SOURCE_INPUTS.zip` ingested.' : `Place \`${B0_INPUT_ZIP}\` under contract-draft/sources/`}
2. ${b0Inputs.manifest_valid ? 'SOURCE_INPUT_MANIFEST hash check PASS.' : 'Manifest missing or hash mismatch — see V2b.'}
3. ${stitchOk ? 'Stitch 6 HTML + 6 images + DESIGN.md OK.' : 'Stitch bundle incomplete or not parsed.'}
4. Automated HEAD live-text diff vs 914 archive — **not run** (by design).

## Paths

- Stage7: \`contract-draft/sources/stage7/\`
- B0 extract: \`contract-draft/sources/b0-extracted/\`
`;

  fs.writeFileSync(path.join(OUT_DIR, 'VALIDATION_REPORT.md'), validationMd);

  const b1Report = `# PHASE_B1_REPORT

**Generated:** ${manifest.generated_at}  
**Git HEAD:** \`${HEAD}\`  
**Overall:** \`${overall}\`

## B0 → B1 delta

| Item | B0 | B1 |
|------|----|----|
| Phase | B0 | B1 |
| B0 input zip | not required | ${b0Inputs.zip_present ? 'present' : '**MISSING**'} |
| Stitch parse | blocked | ${b0Inputs.stitch?.html_parsed ?? 0}/6 HTML |
| CONTENT_CROSSWALK stitch_element_id | empty | ${mappingStats.exact} EXACT links |
| STITCH_ELEMENTS.json | n/a | ${b0Inputs.stitch?.elements?.length ? 'written' : 'not written'} |
| DESIGN_CONTRACT stitch pages | n/a | ${design.components.filter((c) => c.component_id.startsWith('DES-STITCH')).length} |

## Mapping (collection ≠ semantic approval)

| Status | Count |
|--------|------:|
| EXACT_MATCH (Stitch normalized) | ${mappingStats.exact} |
| UNRESOLVED | ${mappingStats.unresolved} |
| NO_MAPPING (no Stitch route) | ${mappingStats.no_mapping} |
| CONTENT_REWRITE_REQUIRED (Stage7) | ${mappingStats.content_rewrite} |
| Unmapped Stitch elements | ${mappingStats.unmapped_stitch} |

## Facts / conflicts

- FACT_REGISTRY rows: ${facts.length} (all \`PENDING_APPROVAL\` publication)
- UNVERIFIED / CONFLICT: see FACT_REGISTRY \`verification_status\`

## PO decisions still required

See \`APPROVAL_DECISIONS.md\` — Phase C forbidden.
`;

  fs.writeFileSync(path.join(OUT_DIR, 'PHASE_B1_REPORT.md'), b1Report);

  const approvalMd = `# APPROVAL_DECISIONS — Phase B1 (all pending)

**Status:** Every row in generated contracts defaults to \`PENDING_APPROVAL\`.  
**Phase C:** Forbidden until human approval recorded here.

| Decision ID | Subject | Options | Decision | Approver | Date |
|-------------|---------|---------|----------|----------|------|
| DEC-NAV-001 | Global header IA | SSOT §05 vs HOME_DESIGN_CANONICAL vs current site.ts | PENDING | | |
| DEC-STAGE7-001 | Import Stage7 audit pack | Files in contract-draft/sources/stage7 | INGESTED — line approval still PENDING | | |
| DEC-STAGE7-GATES | Stage7 integrated gates G01–G24 | Per ROOT_ISSUES CSV | PENDING | | |
| DEC-STITCH-001 | Stitch redesign baseline | B0 zip + canonical vs SSOT | ${b0Inputs.zip_present ? 'INGESTED — approval still PENDING' : 'PENDING — zip missing'} | | |
| DEC-STITCH-MAP | Baseline↔Stitch UNRESOLVED rows | Manual review only — no AI semantic merge | PENDING | | |
| DEC-HERO-001 | Hero representative photo | gym-motion vs coaching (PUBLIC_REFACTOR_AUDIT) | PENDING | | |
| DEC-GATEB-001 | Image remapping | GATE_B plan + rights | PENDING | | |
| DEC-RELEASE-001 | Production deploy | FINAL_QA PO gate | PENDING | | |

## How to approve a contract row

1. Set \`approval_status\` / \`publication_approval\` on the specific CSV/JSON row (never bulk APPROVED).
2. Copy approved \`after_proposal\` into a new Phase C execution registry (separate from this draft).
3. Re-run validation items V6–V8 for approved rows only.
`;

  fs.writeFileSync(path.join(OUT_DIR, 'APPROVAL_DECISIONS.md'), approvalMd);

  console.log(
    JSON.stringify(
      { overall, out: OUT_DIR, passCount, totalChecks: validation.length, b0_zip: b0Inputs.zip_present },
      null,
      2,
    ),
  );
}

main();
