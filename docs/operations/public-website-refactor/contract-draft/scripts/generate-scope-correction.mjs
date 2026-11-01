/**
 * Scope correction — Stitch 6 pages only (contract docs; no public code).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { STITCH_FOLDER_ROUTE, normText } from './b0-source-ingest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..');
const HEAD = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

const STITCH_SIX = new Set(['/', '/education', '/private', '/spomove', '/records', '/about']);

function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = '',
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
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
  const h = rows[0];
  return rows.slice(1).map((cells) => {
    const o = {};
    h.forEach((x, i) => {
      o[x] = cells[i] ?? '';
    });
    return o;
  });
}

function readCsv(name) {
  let t = fs.readFileSync(path.join(OUT, name), 'utf8');
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  return parseCsv(t);
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(name, headers, rows) {
  fs.writeFileSync(
    path.join(OUT, name),
    `${[headers.map(csvEscape).join(','), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','))].join('\n')}\n`,
    'utf8',
  );
}

function normalizeRoute(route) {
  return (route ?? '').split('?')[0].split('#')[0] || '/';
}

function executionScope(route) {
  const r = normalizeRoute(route);
  if (r.startsWith('/records/') && r !== '/records') {
    return {
      execution_scope: 'OUT_OF_SCOPE_RETAIN_UNCHANGED',
      scope_reason: 'Stitch scope excludes /records/* detail; retain unchanged',
    };
  }
  const base = r.startsWith('/records/') ? '/records' : r;
  if (STITCH_SIX.has(base)) {
    return {
      execution_scope: 'IN_SCOPE_STITCH_6',
      scope_reason: `Stitch 6-page redesign target (${base})`,
    };
  }
  return {
    execution_scope: 'OUT_OF_SCOPE_RETAIN_UNCHANGED',
    scope_reason: 'No Stitch HTML for this route; retain route/function/copy',
  };
}

function main() {
  const b2class = readCsv('B2_BASELINE_914_CLASSIFICATION.csv');
  const crosswalk = readCsv('CONTENT_CROSSWALK.csv');
  const crossById = Object.fromEntries(crosswalk.map((r) => [`${r.baseline_text_id}#${r.archive_row_number}`, r]));
  const crossByReview = Object.fromEntries(crosswalk.map((r) => [r.baseline_text_id, r]));

  const scoped914 = b2class.map((row) => {
    const ex = executionScope(row.route);
    const cw = crossById[`${row.baseline_text_id}#${row.archive_row_number}`] ?? crossByReview[row.baseline_text_id];
    return {
      ...row,
      ...ex,
      b2_state_preserved: row.b2_state,
      stage7_edit: cw?.stage7_edit_decision ?? '',
    };
  });
  writeCsv(
    'B2_BASELINE_914_EXECUTION_SCOPE.csv',
    Object.keys(scoped914[0]),
    scoped914,
  );

  const scopeCounts = { IN_SCOPE_STITCH_6: 0, OUT_OF_SCOPE_RETAIN_UNCHANGED: 0 };
  for (const r of scoped914) scopeCounts[r.execution_scope]++;

  const inScopeRows = scoped914.filter((r) => r.execution_scope === 'IN_SCOPE_STITCH_6');
  const inScopeRewrites = inScopeRows.filter((r) => r.b2_state === 'REWRITE_REQUIRED');

  const stitchElements = JSON.parse(fs.readFileSync(path.join(OUT, 'STITCH_ELEMENTS.json'), 'utf8')).elements;
  const inScopeElements = stitchElements.filter((e) => STITCH_SIX.has(e.route));

  const isRecordsLanding = (route) => {
    const r = normalizeRoute(route);
    return r === '/records';
  };
  const stage7OnScope = crosswalk.filter(
    (r) => executionScope(r.route).execution_scope === 'IN_SCOPE_STITCH_6' && (normalizeRoute(r.route) !== '/records' || isRecordsLanding(r.route)),
  );

  const ledger = [];
  for (const el of inScopeElements) {
    let linked_id = '';
    let source_original = '';
    let draft_copy = '';
    let fact_basis = '';
    for (const row of stage7OnScope) {
      const nEl = normText(el.text);
      const nO = normText(row.original_live_text);
      const nA = normText(row.audit_review_text);
      if (nEl && (nEl === nO || nEl === nA)) {
        linked_id = row.baseline_text_id;
        source_original = row.original_live_text;
        draft_copy = row.proposed_copy_draft || row.original_live_text;
        fact_basis = row.stage7_publication_state;
        break;
      }
    }
    if (!linked_id) {
      draft_copy = 'TBD_PO_SLOT_ASSIGNMENT';
      fact_basis = 'Stitch placeholder — replace with verified SPOKEDU copy; no auto semantic map';
    }
    ledger.push({
      stitch_element_id: el.stitch_element_id,
      route: el.route,
      stitch_source_file: el.source_file,
      tag: el.tag,
      stitch_text: el.text.slice(0, 500),
      linked_baseline_text_id: linked_id,
      source_original: (source_original || '').slice(0, 500),
      draft_spokedu_copy: draft_copy.slice(0, 500),
      approval_status: 'PENDING_APPROVAL',
      design_impact: el.tag === 'img' ? 'IMAGE_FRAME_LOCKED' : 'TEXT_SLOT_LOCKED',
      verification_ref: linked_id ? 'Stage7 crosswalk exact normalized match' : 'DEC-PACK-03;DEC-PACK-05',
    });
  }

  writeCsv(path.join('STITCH_6_COPY_LEDGER.csv'), Object.keys(ledger[0] ?? {}), ledger);

  const imageMapping = inScopeElements
    .filter((e) => e.tag === 'img')
    .map((el) => ({
      stitch_element_id: el.stitch_element_id,
      route: el.route,
      stitch_source_file: el.source_file,
      stitch_cdn_href: el.href ?? '',
      stitch_alt_or_prompt: (el.text ?? '').slice(0, 500),
      approved_public_asset_path: 'TBD_PO_IMAGE_ASSIGNMENT',
      fact_or_photo_basis: 'TBD — verified SPOKEDU photo or licensed asset; no Stitch placeholder as fact',
      approval_status: 'PENDING_APPROVAL',
      design_impact: 'IMAGE_FRAME_LOCKED',
      verification_ref: 'DEC-PACK-05',
    }));
  writeCsv(
    'STITCH_6_IMAGE_MAPPING.csv',
    Object.keys(imageMapping[0] ?? {}),
    imageMapping,
  );

  const byPage = {};
  for (const route of STITCH_SIX) {
    const matchRoute = (rowRoute) => {
      const nr = normalizeRoute(rowRoute);
      if (route === '/records') return nr === '/records';
      return nr === route;
    };
    byPage[route] = {
      stitch_text_elements: ledger.filter((r) => r.route === route).length,
      stage7_archive_rows: inScopeRows.filter((r) => matchRoute(r.route)).length,
      rewrite_proposals_in_scope: inScopeRewrites.filter((r) => matchRoute(r.route)).length,
    };
  }

  const rewriteExtract = inScopeRewrites.map((row) => {
    const cw = crossByReview[row.baseline_text_id];
    return {
      baseline_text_id: row.baseline_text_id,
      route: row.route,
      execution_scope: 'IN_SCOPE_STITCH_6',
      original_text: (cw?.original_live_text ?? '').slice(0, 300),
      proposed_draft: (cw?.proposed_copy_draft ?? '').slice(0, 300),
      stitch_element_id: cw?.stitch_element_id || 'UNASSIGNED_SLOT',
      approval_status: 'PENDING_APPROVAL',
      included_in_stitch_6_execution: 'YES',
    };
  });
  writeCsv('STITCH_6_REWRITE_SUBSET.csv', Object.keys(rewriteExtract[0] ?? {}), rewriteExtract);

  const pending = [
    'DEC-PACK-01 — Stitch nav labels vs SPOKEDU site.ts (6 pages only)',
    'DEC-PACK-03 — STITCH_6_COPY_LEDGER draft slots',
    'DEC-PACK-04 — Design exceptions on 6 pages',
    'DEC-PACK-05 — Images: Stitch CDN → approved /public/images/spokedu',
    'DEC-PACK-06 — /education & /private CTA → existing contact flows (no /contact page refactor)',
    'G01–G04 — consent/API (verify only; fix out of scope unless CTA on 6 pages)',
  ];

  const md = `# SCOPE_CORRECTION — Stitch 6 pages only

**Git HEAD:** \`${HEAD}\`  
**Phase C:** **NOT STARTED**

## Final scope

| Stitch route | HTML folder |
|--------------|-------------|
| \`/\` | \`home_spomove/code.html\` |
| \`/education\` | \`education_programs_spomove/code.html\` |
| \`/private\` | \`private_lesson_spomove/code.html\` |
| \`/spomove\` | \`spomove_system_spomove/code.html\` |
| \`/records\` | \`field_records_spomove/code.html\` (landing only) |
| \`/about\` | \`about_spomove/code.html\` |

## Out of scope (retain unchanged)

\`/spokedu-lab\`, \`/spomat\`, \`/spomove/catalog\`, \`/contact\`, \`/records/*\` detail, \`/partners\`, all other routes.

**213 \`NEW_ROUTE_REQUIRED\` B2 rows → execution \`OUT_OF_SCOPE_RETAIN_UNCHANGED\` (not deleted).**

## 914 archive + execution layer

| Layer | Count |
|-------|------:|
| B2 classification preserved | 914 (\`B2_BASELINE_914_CLASSIFICATION.csv\`) |
| \`IN_SCOPE_STITCH_6\` | ${scopeCounts.IN_SCOPE_STITCH_6} |
| \`OUT_OF_SCOPE_RETAIN_UNCHANGED\` | ${scopeCounts.OUT_OF_SCOPE_RETAIN_UNCHANGED} |

Detail: \`B2_BASELINE_914_EXECUTION_SCOPE.csv\`

## Copy work (not 914 bulk apply)

| Metric | Count |
|--------|------:|
| Stitch text/media elements (6 routes) | ${inScopeElements.length} |
| \`STITCH_6_COPY_LEDGER\` rows | ${ledger.length} |
| Stage7 \`수정 제안\` on 6 routes | ${inScopeRewrites.length} (subset of 256) |
| 256 total rewrites (reference) | 256 — **${rewriteExtract.length} in scope** |

Per page summary:

${[...STITCH_SIX]
  .map(
    (r) =>
      `- \`${r}\`: ${byPage[r].stitch_text_elements} stitch elements; ${byPage[r].rewrite_proposals_in_scope} rewrite proposals (stage7 in-scope rows ${byPage[r].stage7_archive_rows})`,
  )
  .join('\n')}

## Deliverables

1. \`STITCH_6_COPY_LEDGER.csv\` — per Stitch element
2. \`STITCH_6_IMAGE_MAPPING.csv\` — ${imageMapping.length} image frames (CDN → approved asset TBD)
3. \`STITCH_6_REWRITE_SUBSET.csv\` — in-scope editorial proposals only
4. Design exceptions — \`B2_DESIGN_EXCEPTIONS.md\` (6-page conflicts)
5. Out-of-scope code changes: **0** (generator-only; \`app/spokedu/**\` untouched)
6. Pending approval — below

## Pending user approval

${pending.map((p) => `- ${p}`).join('\n')}

## Principles

- Stage7 = fact/copy **reference** only
- Stitch = **design SSOT**
- No finalized copy without \`PENDING_APPROVAL\` → explicit PO sign-off per DEC-PACK

## B2 delta

- Added execution scope layer; did **not** remove B2 states or 914 rows
- \`NEW_ROUTE_REQUIRED\` remains in B2 file but **excluded from execution**
`;

  fs.writeFileSync(path.join(OUT, 'SCOPE_CORRECTION.md'), md);

  fs.writeFileSync(
    path.join(OUT, 'STITCH_6_SCOPE_SUMMARY.json'),
    `${JSON.stringify(
      {
        git_head: HEAD,
        scopeCounts,
        inScopeRewrites: inScopeRewrites.length,
        ledgerRows: ledger.length,
        imageMappingRows: imageMapping.length,
        outOfScopeNewRouteRequired: scoped914.filter((r) => r.b2_state === 'NEW_ROUTE_REQUIRED').length,
        allNewRouteExecutionScope: 'OUT_OF_SCOPE_RETAIN_UNCHANGED',
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    JSON.stringify(
      {
        in_scope: scopeCounts.IN_SCOPE_STITCH_6,
        out_scope: scopeCounts.OUT_OF_SCOPE_RETAIN_UNCHANGED,
        rewrites_in_scope: inScopeRewrites.length,
        ledger: ledger.length,
      },
      null,
      2,
    ),
  );
}

main();
