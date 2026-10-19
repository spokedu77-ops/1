#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const foundation = path.join(here, '..');

async function main() {
  const qa = JSON.parse(await readFile(path.join(foundation, 'WIDTH_QA.json'), 'utf8'));
  const fails = qa.results.filter((r) => !r.pass);
  const ctaSelectorMiss = fails.filter((r) => r.ctaFailureKind === 'selector_miss');
  const ctaNotUsable = fails.filter((r) => r.failReasons?.includes('cta_not_usable') && r.ctaFailureKind === 'not_usable');
  const railMissing = fails.filter((r) => r.failReasons?.includes('rail_missing'));
  const firstScreen = fails.filter((r) => r.failReasons?.includes('first_screen_empty'));
  const pageErrors = fails.filter((r) => r.failReasons?.includes('page_errors'));

  let compare = null;
  try {
    const b = JSON.parse(await readFile(path.join(foundation, 'CAPTURE_MANIFEST_BEFORE.json'), 'utf8'));
    const a = JSON.parse(await readFile(path.join(foundation, 'CAPTURE_MANIFEST_AFTER.json'), 'utf8'));
    let same = 0;
    let diff = 0;
    const homeDiff = [];
    for (const be of b.entries) {
      const ae = a.entries.find((x) => x.route === be.route && x.viewport === be.viewport);
      if (!ae) continue;
      if (be.foldSha256 === ae.foldSha256) same += 1;
      else {
        diff += 1;
        if (be.route === '/') homeDiff.push({ viewport: be.viewport, before: be.foldSha256.slice(0, 12), after: ae.foldSha256.slice(0, 12) });
      }
    }
    compare = { same, diff, total: b.entries.length, homeDiff };
  } catch {
    compare = { error: 'manifest_missing' };
  }

  const summaryMd = `# WIDTH QA Summary (Gate A — corrected)

- Captured: ${qa.capturedAt}
- Git HEAD: ${qa.gitHead}
- Build ID: ${qa.buildId}
- Checks: ${qa.totalChecks} — **pass ${qa.passCount}**, **fail ${qa.failCount}**

## BEFORE/AFTER fold SHA compare
${compare.error ? `- ${compare.error}` : `- Identical folds: ${compare.same} / ${compare.total}\n- Different folds: ${compare.diff}\n- Home diffs: ${JSON.stringify(compare.homeDiff, null, 2)}`}

## Failure buckets
| Bucket | Count |
|--------|------:|
| rail_missing | ${railMissing.length} |
| first_screen_empty | ${firstScreen.length} |
| cta selector_miss | ${ctaSelectorMiss.length} |
| cta not_usable (real) | ${ctaNotUsable.length} |
| page_errors | ${pageErrors.length} |

## Failed checks (first 40)
${fails
  .slice(0, 40)
  .map(
    (r) =>
      `- \`${r.route}\` @ ${r.viewport}px — ${r.failReasons.join(', ')}${r.ctaFailureKind ? ` (cta: ${r.ctaFailureKind})` : ''}`,
  )
  .join('\n')}
${fails.length > 40 ? `\n… and ${fails.length - 40} more (see WIDTH_QA.json)\n` : ''}
`;

  let verdict = 'LAYOUT_FAIL';
  if (compare?.error) verdict = 'LAYOUT_EVIDENCE_INCOMPLETE';
  else if (compare?.diff === 0 && qa.failCount === 0) verdict = 'LAYOUT_TECHNICAL_PASS_PO_PENDING';
  else if (qa.failCount === 0 && compare?.diff > 0) verdict = 'LAYOUT_TECHNICAL_PASS_PO_PENDING';
  else if (qa.failCount > 0) verdict = 'LAYOUT_FAIL';

  let heroNote = '';
  try {
    const hb = JSON.parse(await readFile(path.join(foundation, 'HERO_BREAKPOINT_METRICS_BEFORE.json'), 'utf8'));
    const ha = JSON.parse(await readFile(path.join(foundation, 'HERO_BREAKPOINT_METRICS_AFTER.json'), 'utf8'));
    heroNote = hb.rows
      .map((b) => {
        const a = ha.rows.find((r) => r.viewport === b.viewport);
        return `- ${b.viewport}px: grid \`${b.gridTemplateColumns}\` → \`${a?.gridTemplateColumns ?? '?'}\`; areas \`${b.gridTemplateAreas}\` → \`${a?.gridTemplateAreas ?? '?'}\``;
      })
      .join('\n');
  } catch {
    heroNote = '(hero metrics missing)';
  }

  const verdictMd = `# GATE A Verdict

**Status:** \`${verdict}\`

## Evidence
- WIDTH_QA: ${qa.passCount}/${qa.totalChecks} pass (${qa.failCount} fail — see buckets in WIDTH_QA_SUMMARY.md)
- BEFORE/AFTER: ${compare?.error ? 'incomplete' : `${compare.diff}/${compare.total} fold SHA differ; home @ 1024·1199 differ; 1023·1200 same (single-col both sides)`}
- Hero breakpoint metrics (1023–1200):
${heroNote}
- Screenshots: \`home-1024-fold.png\`, \`home-1199-fold.png\` under \`BEFORE_AFTER/{BEFORE,AFTER}/\`

## Gate A CSS intent (home hero)
- ≤1199: single column (\`copy → visual → actions\`)
- ≥1200: two-column + bleed (unchanged vs BEFORE at 1200)

## History
- Prior corrected run: **104/50** — archived as \`WIDTH_QA_HISTORY_104x50_2026-10-19.json\`
- Resolution log: \`GATE_A_FAILURE_RESOLUTION.md\`
`;

  await writeFile(path.join(foundation, 'WIDTH_QA_SUMMARY.md'), summaryMd);
  await writeFile(path.join(foundation, 'GATE_A_VERDICT.md'), verdictMd);
  console.log(JSON.stringify({ verdict, pass: qa.passCount, fail: qa.failCount, compare }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
