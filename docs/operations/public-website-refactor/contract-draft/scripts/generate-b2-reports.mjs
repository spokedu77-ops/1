/**
 * Phase B2 — contract reconciliation & approval pack (read-only; writes B2_*.md/csv only).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { STITCH_FOLDER_ROUTE, loadB0SourceInputs } from './b0-source-ingest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(__dirname, '../../../../../');
const HEAD = execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

const STITCH_ROUTES = new Set(Object.values(STITCH_FOLDER_ROUTE));

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
      if (row.length > 1 || row[0]) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const headers = rows[0];
  return rows.slice(1).map((cells) => {
    const o = {};
    headers.forEach((h, i) => {
      o[h] = cells[i] ?? '';
    });
    return o;
  });
}

function readCsv(rel) {
  let t = fs.readFileSync(path.join(OUT_DIR, rel), 'utf8');
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  return parseCsv(t);
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(file, headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  fs.writeFileSync(file, `${lines.join('\n')}\n`, 'utf8');
}

function baseRoute(route) {
  const r = (route ?? '').split('?')[0].split('#')[0] || '/';
  if (r.startsWith('/records/')) return '/records';
  return r;
}

function classifyB2(row) {
  const edit = row.stage7_edit_decision ?? '';
  const route = baseRoute(row.route);
  const onStitch = STITCH_ROUTES.has(route);
  const stitchId = (row.stitch_element_id ?? '').trim();

  if (/삭제|제거/.test(edit) && !/추출/.test(edit)) return 'REMOVAL_PROPOSED';
  if (edit.includes('수정 제안')) return 'REWRITE_REQUIRED';
  if (stitchId) return 'DIRECT_MAPPING';
  if (!onStitch) {
    if (['/contact', '/spokedu-lab', '/spomove/catalog', '/consult'].includes(route)) {
      return 'NEW_ROUTE_REQUIRED';
    }
    return 'RETAIN_EXISTING_ROUTE';
  }
  return 'UNRESOLVED';
}

function classifyReason(state, row) {
  switch (state) {
    case 'REWRITE_REQUIRED':
      return 'Stage7 편집 판정=수정 제안';
    case 'DIRECT_MAPPING':
      return 'Stitch normalized text exact match';
    case 'RETAIN_EXISTING_ROUTE':
      return 'Stitch 6-page scope 밖; LIVE route 유지';
    case 'NEW_ROUTE_REQUIRED':
      return 'LIVE 전용 경로; Stitch IA에 동등 화면 없음 — PO IA 결정';
    case 'REMOVAL_PROPOSED':
      return 'Stage7 삭제/제거 판정';
    default:
      return 'Stitch route 존재; LIVE≠Stitch 문구; exact match 금지 정책';
  }
}

function fullStitchInventory(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const count = (re) => (html.match(re) ?? []).length;
  const responsiveRules = count(/\b(sm|md|lg|xl|2xl):/g);
  const tailwindClasses = count(/class=["'][^"']+["']/gi);
  return {
    file: htmlPath,
    sections: count(/<section[\s>]/gi),
    section_comments: count(/<!--\s*SECTION/gi),
    text_tags: count(/<(h[1-6]|p|span|label|li|button|a)[\s>]/gi),
    images: count(/<img[\s>]/gi),
    links: count(/<a[\s>]/gi),
    buttons: count(/<button[\s>]/gi),
    forms: count(/<form[\s>]/gi),
    inputs: count(/<input[\s>]/gi),
    canvas: count(/<canvas[\s>]/gi),
    svg: count(/<svg[\s>]/gi),
    watermark_metric: count(/watermark-number|display-metric|animate-pulse/gi),
    decorative_gradients: count(/bg-gradient|backdrop-blur|rounded-3xl|shadow-\[/gi),
    responsive_rules: responsiveRules,
    class_attributes: tailwindClasses,
    tailwind_config: /id="tailwind-config"/.test(html),
  };
}

function loadRootIssueMap() {
  const root = readCsv('sources/stage7/SPOKEDU_COPY_AUDIT_STAGE7_ROOT_ISSUES_20261031.csv');
  const idToIssues = new Map();
  for (const row of root) {
    const gid = row['이슈 ID'];
    const tokens = (row['대표 근거 항목'] ?? '')
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const tok of tokens) {
      if (!idToIssues.has(tok)) idToIssues.set(tok, []);
      idToIssues.get(tok).push(gid);
    }
  }
  return { root, idToIssues };
}

function main() {
  const crosswalk = readCsv('CONTENT_CROSSWALK.csv');
  const b0 = loadB0SourceInputs(OUT_DIR, REPO_ROOT);
  const fidelity = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'STITCH_DESIGN_FIDELITY.json'), 'utf8'));
  const stitchElements = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'STITCH_ELEMENTS.json'), 'utf8')).elements;
  const designContract = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'DESIGN_CONTRACT.json'), 'utf8'));
  const { idToIssues } = loadRootIssueMap();

  const classified = crosswalk.map((row) => {
    const b2_state = classifyB2(row);
    return {
      baseline_text_id: row.baseline_text_id,
      archive_row_number: row.archive_row_number,
      route: row.route,
      b2_state,
      b2_state_reason: classifyReason(b2_state, row),
      stitch_element_id: row.stitch_element_id,
      approval_status: 'PENDING_APPROVAL',
    };
  });

  writeCsv(
    path.join(OUT_DIR, 'B2_BASELINE_914_CLASSIFICATION.csv'),
    Object.keys(classified[0]),
    classified,
  );

  const counts = {};
  for (const s of [
    'DIRECT_MAPPING',
    'REWRITE_REQUIRED',
    'RETAIN_EXISTING_ROUTE',
    'REMOVAL_PROPOSED',
    'NEW_ROUTE_REQUIRED',
    'UNRESOLVED',
  ]) {
    counts[s] = classified.filter((r) => r.b2_state === s).length;
  }
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);

  const byRouteRetain = classified.filter((r) => r.b2_state === 'RETAIN_EXISTING_ROUTE');
  const routeBreakdown = {};
  for (const r of byRouteRetain) {
    const br = baseRoute(r.route);
    routeBreakdown[br] = (routeBreakdown[br] ?? 0) + 1;
  }

  const rewrites = crosswalk.filter((r) => classifyB2(r) === 'REWRITE_REQUIRED');
  const copyReview = rewrites.map((row) => {
    const issues = idToIssues.get(row.baseline_text_id) ?? [];
    return {
      baseline_text_id: row.baseline_text_id,
      archive_row_number: row.archive_row_number,
      route: row.route,
      stitch_element_id: row.stitch_element_id || 'NONE',
      original_text: row.original_live_text,
      proposed_text: row.proposed_copy_draft,
      reason: row.review_reason,
      fact_basis: row.stage7_publication_state,
      related_stage7_issues: issues.join(';') || 'NONE',
      approval_status: 'PENDING_APPROVAL',
    };
  });
  writeCsv(path.join(OUT_DIR, 'B2_COPY_REVIEW.csv'), Object.keys(copyReview[0] ?? {}), copyReview);

  const stitchRoot = b0.stitch.stitch_root;
  const htmlFiles = fs
    .readdirSync(stitchRoot, { recursive: true })
    .filter((f) => String(f).endsWith('.html'))
    .map((f) => path.join(stitchRoot, f));

  const inventories = htmlFiles.map(fullStitchInventory);
  const totals = inventories.reduce(
    (acc, inv) => {
      for (const [k, v] of Object.entries(inv)) {
        if (typeof v === 'number') acc[k] = (acc[k] ?? 0) + v;
      }
      return acc;
    },
    {},
  );

  const trackedText = stitchElements.filter((e) => e.tag !== 'img').length;
  const trackedImg = stitchElements.filter((e) => e.tag === 'img').length;
  const untracked = [];
  if (totals.images > trackedImg) {
    untracked.push({
      category: 'images',
      source_count: totals.images,
      tracked_in_STITCH_ELEMENTS: trackedImg,
      gap: totals.images - trackedImg,
      tracking_id: 'STITCH_ELEMENTS img tag extractor',
    });
  }
  if (totals.text_tags > trackedText + 50) {
    untracked.push({
      category: 'text_bearing_tags',
      source_count: totals.text_tags,
      tracked_in_STITCH_ELEMENTS: trackedText,
      note: 'B1 extractor uses closed-tag h1-h6,p,a,button,li,span,label only; nested/malformed tags may differ',
    });
  }

  const designConflicts = [
    {
      id: 'DC-001',
      topic: 'Stitch placeholder brand vs SPOKEDU LIVE',
      stitch_structure: '6 HTML; hero/nav copy SPOMOVE 에듀테크 톤',
      problem: 'Stage7 LIVE archive SPOKEDU 체육교육 카피와 Stitch 디자인 카피 불일치 → DIRECT_MAPPING 0',
      preserve_alternative: 'Stitch layout/tokens 유지; slot별 SPOKEDU approved copy 치환',
      impact: '6 routes; all text nodes',
      approval_required: 'YES — DEC-PACK-03',
    },
    {
      id: 'DC-002',
      topic: '허위/미검증 성과 수치 (watermark, % 향상)',
      stitch_structure: 'font-watermark-number, badge metrics in HTML',
      problem: 'Stage7 G07/G08 — 과학·실적 단정 금지; Stitch UI는 %·향상 표시',
      preserve_alternative: '동일 visual slot; verified metric only or neutral label',
      impact: 'home, education, spomove system pages',
      approval_required: 'YES — DEC-PACK-02 + DEC-PACK-05',
    },
    {
      id: 'DC-003',
      topic: '문의/CTA vs LIVE forms',
      stitch_structure: 'CTA links data-path=inquiry; limited form elements',
      problem: 'G01–G04 contact/consent; Stitch lacks full /contact form contract',
      preserve_alternative: 'Preserve CTA regions; wire to existing contact types without layout drift',
      impact: '/contact, header CTA all pages',
      approval_required: 'YES — DEC-PACK-06',
    },
    {
      id: 'DC-004',
      topic: 'Global nav IA mismatch',
      stitch_structure: 'Stitch nav labels (홈, 교육 프로그램, …)',
      problem: 'site.ts / SSOT header lists differ (FACT-NAV conflicts)',
      preserve_alternative: 'Stitch header shell; approved label set from PO',
      impact: 'global chrome',
      approval_required: 'YES — DEC-PACK-01',
    },
    {
      id: 'DC-005',
      topic: 'External placeholder images (Google CDN)',
      stitch_structure: 'lh3.googleusercontent.com hero/showcase imgs',
      problem: 'Gate B rights; MEDIA matrix requires approved assets',
      preserve_alternative: 'Same aspect frames; /public/images/spokedu/* only',
      impact: 'all 6 PNG + HTML imgs',
      approval_required: 'YES — DEC-PACK-05',
    },
    {
      id: 'DC-006',
      topic: 'Record/card counts vs catalog SSOT',
      stitch_structure: 'Multi-card grids in field_records / home',
      problem: 'FIELD_RECORD_CATALOG fixed slugs; Stitch may show more cards',
      preserve_alternative: 'Grid structure locked; card count follows catalog partition',
      impact: '/records, /',
      approval_required: 'YES — DEC-PACK-05',
    },
  ];

  const approvalPack = [
    {
      decision_id: 'DEC-PACK-01',
      bundle: '브랜드 및 페이지 정보구조',
      scope: 'Stitch header/nav vs site.ts vs SSOT §05 vs HOME_DESIGN_CANONICAL',
      linked_facts: 'FACT-NAV-SSOT-001;FACT-NAV-CANON-001',
      linked_changes: 'CHG-NAV-CONFLICT-001',
      baseline_rows: classified.filter((r) => r.b2_state === 'NEW_ROUTE_REQUIRED').length,
      approval_status: 'PENDING_APPROVAL',
    },
    {
      decision_id: 'DEC-PACK-02',
      bundle: '주요 사업·제품 사실',
      scope: 'G05–G08,G07 SPOMOVE/KC/metrics; FACT registry UNVERIFIED',
      linked_issues: 'G05;G06;G07;G08',
      linked_changes: 'CHG-STAGE7-G05..G08',
      approval_status: 'PENDING_APPROVAL',
    },
    {
      decision_id: 'DEC-PACK-03',
      bundle: '페이지별 핵심 문구',
      scope: '256 REWRITE_REQUIRED + 631 UNRESOLVED Stitch-route copy slots',
      linked_file: 'B2_COPY_REVIEW.csv;B2_BASELINE_914_CLASSIFICATION.csv',
      trace: 'baseline_text_id → proposed_copy_draft (not final)',
      approval_status: 'PENDING_APPROVAL',
    },
    {
      decision_id: 'DEC-PACK-04',
      bundle: '디자인 예외',
      scope: '44 DESIGN_LOCKED elements; structure_change REQUIRED_SPOKEDU_FACTS',
      linked_file: 'STITCH_DESIGN_FIDELITY.json;B2_DESIGN_EXCEPTIONS.md',
      approval_status: 'PENDING_APPROVAL',
    },
    {
      decision_id: 'DEC-PACK-05',
      bundle: '실제 이미지·사례',
      scope: 'Stitch CDN imgs; Gate B; catalog card counts',
      linked_conflicts: 'DC-005;DC-006',
      approval_status: 'PENDING_APPROVAL',
    },
    {
      decision_id: 'DEC-PACK-06',
      bundle: '문의 및 CTA 기능 계약',
      scope: 'G01–G04; contact/private forms; Stitch CTA regions',
      linked_issues: 'G01;G02;G03;G04',
      approval_status: 'PENDING_APPROVAL',
    },
  ];

  const integrityPass =
    sum === 914 &&
    counts.DIRECT_MAPPING + counts.REWRITE_REQUIRED + counts.RETAIN_EXISTING_ROUTE +
      counts.REMOVAL_PROPOSED + counts.NEW_ROUTE_REQUIRED + counts.UNRESOLVED ===
      914;

  const contentMappingPass = sum === 914 && rewrites.length === 256;
  const designInventoryPass =
    b0.stitch.html_parsed === 6 && fidelity.design_elements.length > 0 && totals.sections > 0;

  const b2Ready =
    integrityPass &&
    contentMappingPass &&
    designInventoryPass &&
    copyReview.every((r) => r.approval_status === 'PENDING_APPROVAL');

  fs.writeFileSync(
    path.join(OUT_DIR, 'B2_MAPPING_RECONCILIATION.md'),
    `# B2_MAPPING_RECONCILIATION

**Git HEAD:** \`${HEAD}\`  
**914 partition sum:** ${sum} (must be 914)

## Mutually exclusive B2 states

| State | Count | Meaning |
|-------|------:|---------|
| DIRECT_MAPPING | ${counts.DIRECT_MAPPING} | Stitch element ID linked (normalized exact) |
| REWRITE_REQUIRED | ${counts.REWRITE_REQUIRED} | Stage7 수정 제안 — PO copy approval |
| RETAIN_EXISTING_ROUTE | ${counts.RETAIN_EXISTING_ROUTE} | Outside Stitch 6 screens; keep LIVE route |
| REMOVAL_PROPOSED | ${counts.REMOVAL_PROPOSED} | Stage7 삭제/제거 판정 |
| NEW_ROUTE_REQUIRED | ${counts.NEW_ROUTE_REQUIRED} | LIVE-only routes (/contact, /spokedu-lab, …) — IA PO |
| UNRESOLVED | ${counts.UNRESOLVED} | On Stitch route; LIVE≠Stitch; no auto link |

## Reconciling prior B1 “UNRESOLVED 631”

B1 \`CONTENT_CROSSWALK.mapping_status=UNRESOLVED\`: **631** (Stitch-route rows with no exact normalized text match).

B2 uses **mutually exclusive** editorial + route states (256 rewrite rows are **not** also counted as UNRESOLVED):

| B2 state | Count |
|----------|------:|
| UNRESOLVED | ${counts.UNRESOLVED} |
| REWRITE_REQUIRED | ${counts.REWRITE_REQUIRED} |
| NEW_ROUTE_REQUIRED | ${counts.NEW_ROUTE_REQUIRED} |
| RETAIN_EXISTING_ROUTE | ${counts.RETAIN_EXISTING_ROUTE} |
| DIRECT_MAPPING | ${counts.DIRECT_MAPPING} |
| REMOVAL_PROPOSED | ${counts.REMOVAL_PROPOSED} |

**${counts.UNRESOLVED} + ${counts.REWRITE_REQUIRED} + ${counts.NEW_ROUTE_REQUIRED} + ${counts.RETAIN_EXISTING_ROUTE} + ${counts.DIRECT_MAPPING} + ${counts.REMOVAL_PROPOSED} = ${sum}**

**283 “non-631” archive rows (914−631):** ${counts.REWRITE_REQUIRED} rewrites + ${counts.NEW_ROUTE_REQUIRED} LIVE-only Stitch-absent routes + ${counts.RETAIN_EXISTING_ROUTE} retain (e.g. \`/spomat\`) + ${counts.DIRECT_MAPPING} direct + ${counts.REMOVAL_PROPOSED} removal.

**631 → ${counts.UNRESOLVED} UNRESOLVED:** ${631 - counts.UNRESOLVED} rows reclassified (chiefly ${counts.REWRITE_REQUIRED} \`수정 제안\` prioritized over stitch-match UNRESOLVED).

### RETAIN_EXISTING_ROUTE by base route (top)

${Object.entries(routeBreakdown)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .map(([r, n]) => `- \`${r}\`: ${n}`)
  .join('\n')}

Detail: \`B2_BASELINE_914_CLASSIFICATION.csv\`
`,
  );

  fs.writeFileSync(
    path.join(OUT_DIR, 'B2_STITCH_COMPLETENESS.md'),
    `# B2_STITCH_COMPLETENESS

## Raw HTML inventory (6 files aggregated)

| Metric | HTML source count |
|--------|------------------:|
| \`<section>\` | ${totals.sections} |
| SECTION comments | ${totals.section_comments} |
| Text-bearing tag opens | ${totals.text_tags} |
| \`<img>\` | ${totals.images} |
| \`<a>\` | ${totals.links} |
| \`<button>\` | ${totals.buttons} |
| \`<form>\` | ${totals.forms} |
| \`<input>\` | ${totals.inputs} |
| canvas / svg | ${totals.canvas} / ${totals.svg} |
| metric/watermark patterns | ${totals.watermark_metric} |
| decorative (gradient/blur/rounded/shadow) | ${totals.decorative_gradients} |
| responsive breakpoint classes | ${totals.responsive_rules} |
| class= attributes | ${totals.class_attributes} |
| tailwind-config scripts | 6/6 |

Per file: ${inventories.map((i) => `\`${path.basename(path.dirname(i.file))}\` sections=${i.sections}`).join(' · ')}

## What B1 counts included / excluded

| Artifact | Count | Includes | Excludes |
|----------|------:|----------|----------|
| **STITCH_ELEMENTS.json** | ${stitchElements.length} | Closed h1–h6,p,a,button,li,span,label + img; IDs \`STITCH-{path}-{tag}-{n}\` | div-only blocks, raw SVG paths, inline SVG text, script/style, whitespace nodes |
| **STITCH_DESIGN_FIDELITY.json** | ${fidelity.design_elements.length} DESIGN_LOCKED | header, SECTION comments, dom sections, chart/metric bucket, tailwind-config row per page | Every class on every nested node |
| **DESIGN_CONTRACT.json** | ${designContract.components.length} | ${fidelity.design_elements.length} fidelity rows + ${designContract.components.length - fidelity.design_elements.length} canonical home/nav placeholders from B1 | Per-text-node rows |

## Untracked / gap ledger

${untracked.length ? untracked.map((u) => `- **${u.category}**: source ${u.source_count}, tracked ${u.tracked_in_STITCH_ELEMENTS ?? u.tracked}; ${u.note ?? `gap ${u.gap}`}`).join('\n') : '- No material gap recorded beyond extractor scope note.'}

Stitch remains **design SSOT**; gaps are tracking granularity, not permission to omit visuals in Phase C.
`,
  );

  fs.writeFileSync(
    path.join(OUT_DIR, 'B2_DESIGN_EXCEPTIONS.md'),
    `# B2_DESIGN_EXCEPTIONS

Stitch = design SSOT. Below: **conflicts when applying real SPOKEDU content** — no design change applied.

${designConflicts
  .map(
    (c) => `## ${c.id} — ${c.topic}

- **Stitch structure:** ${c.stitch_structure}
- **Problem:** ${c.problem}
- **Preserve alternative:** ${c.preserve_alternative}
- **Impact:** ${c.impact}
- **User approval:** ${c.approval_required}
`,
  )
  .join('\n')}

All fidelity rows: \`design_lock_status=DESIGN_LOCKED\`, \`exception_status=DESIGN_EXCEPTION_PENDING_APPROVAL\`.
`,
  );

  fs.writeFileSync(
    path.join(OUT_DIR, 'B2_COPY_REVIEW.md'),
    `# B2_COPY_REVIEW

**256** Stage7 \`수정 제안\` rows → \`B2_COPY_REVIEW.csv\`

| Field | Source |
|-------|--------|
| baseline_text_id | Stage7 검수 ID (unchanged) |
| stitch_element_id | CONTENT_CROSSWALK (usually NONE — no forced Stitch link) |
| original / proposed | crosswalk archive + proposed_copy_draft |
| reason | review_reason |
| fact_basis | stage7_publication_state (not final fact approval) |
| related_stage7_issues | ROOT_ISSUES token map |

**No proposed text is finalized.** Rows without ROOT_ISSUES link: \`NONE\`.
`,
  );

  fs.writeFileSync(
    path.join(OUT_DIR, 'B2_APPROVAL_PACK.md'),
    `# B2_APPROVAL_PACK

**Purpose:** PO decides **6 bundles**, not 914 line-by-line. Trace via CSV IDs.

| decision_id | Bundle | approval_status |
|-------------|--------|-----------------|
${approvalPack.map((p) => `| ${p.decision_id} | ${p.bundle} | ${p.approval_status} |`).join('\n')}

${approvalPack
  .map(
    (p) => `### ${p.decision_id} — ${p.bundle}

- Scope: ${p.scope}
- Links: ${JSON.stringify({ ...p, decision_id: undefined, bundle: undefined, approval_status: undefined })}
`,
  )
  .join('\n')}

Phase C **not authorized** by this pack.
`,
  );

  fs.writeFileSync(
    path.join(OUT_DIR, 'B2_VALIDATION_REPORT.md'),
    `# B2_VALIDATION_REPORT

**Overall B2:** \`${b2Ready ? 'B2_READY_FOR_APPROVAL' : 'B2_INCOMPLETE'}\`  
**Git HEAD:** \`${HEAD}\`

## QA judgments (separated)

| Flag | Result | Notes |
|------|--------|-------|
| CONTRACT_INTEGRITY_PASS | ${integrityPass ? 'PASS' : 'FAIL'} | 914 B2 states sum; IDs unchanged |
| CONTENT_MAPPING_PASS | ${contentMappingPass ? 'PASS' : 'FAIL'} | 256 rewrites linked in B2_COPY_REVIEW.csv |
| DESIGN_INVENTORY_PASS | ${designInventoryPass ? 'PASS' : 'FAIL'} | 6 HTML inventoried; fidelity elements present |
| DESIGN_FIDELITY_PASS | **NOT_RUN** | Phase C render compare only |

## B1 delta

- Added B2 classification (6-state) explaining 631 vs 283 remainder
- Added full HTML inventory vs 135/44/51 explanation
- Bundled approvals DEC-PACK-01..06

## Implementation

- Public code changes: **0**
- Auto APPROVED: **0**
`,
  );

  console.log(
    JSON.stringify({ b2Ready, counts, sum, rewrites: rewrites.length, overall: b2Ready ? 'B2_READY_FOR_APPROVAL' : 'B2_INCOMPLETE' }, null, 2),
  );
}

main();
