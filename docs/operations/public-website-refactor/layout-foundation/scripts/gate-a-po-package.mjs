#!/usr/bin/env node
/** PO / ZIP 산출물은 repo에 두지 않음 — 기본: %USERPROFILE%\\Downloads\\SPOKEDU_GATE_A_PO_REVIEW */
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const foundation = path.join(here, '..');
const repo = path.resolve(here, '../../../../..');
const downloads =
  process.env.GATE_A_OUTPUT_DIR ??
  path.join(process.env.USERPROFILE ?? process.env.HOME ?? '', 'Downloads', 'SPOKEDU_GATE_A_PO_REVIEW');
const poRoot = downloads;

const PO_PAIRS = [
  { route: '/', viewports: [390, 1023, 1024, 1199, 1200, 1440], label: '홈' },
  { route: '/education', viewports: [390, 1440], label: '기관·학교' },
  { route: '/records', viewports: [390, 1440], label: '수업사례' },
  { route: '/spokedu-lab', viewports: [390, 1440], label: 'SPOKEDU LAB' },
  { route: '/spomove/catalog', viewports: [1199], label: 'SPOMOVE 카탈로그' },
];

function slug(route) {
  return route === '/' ? 'home' : route.replace(/\//g, '_').replace(/^_/, '');
}

async function sha256File(filePath) {
  const buf = await readFile(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

async function main() {
  const beforeM = JSON.parse(await readFile(path.join(foundation, 'CAPTURE_MANIFEST_BEFORE.json'), 'utf8'));
  const afterM = JSON.parse(await readFile(path.join(foundation, 'CAPTURE_MANIFEST_AFTER.json'), 'utf8'));
  let buildId = 'unknown';
  try {
    buildId = (await readFile(path.join(repo, '.next/BUILD_ID'), 'utf8')).trim();
  } catch {
    /* */
  }
  const widthQa = JSON.parse(await readFile(path.join(foundation, 'WIDTH_QA.json'), 'utf8'));

  await mkdir(path.join(poRoot, 'png', 'BEFORE'), { recursive: true });
  await mkdir(path.join(poRoot, 'png', 'AFTER'), { recursive: true });

  const verification = {
    generatedAt: new Date().toISOString(),
    gitHead: '7f32fc3a18925fe0e463471a494b45072f3ca753',
    finalBuildId: buildId,
    widthQaBuildId: widthQa.buildId,
    widthQaCapturedAt: widthQa.capturedAt,
    captureManifestNote:
      'BEFORE = HEAD hero CSS build (port 3070). AFTER = Gate A hero CSS build (port 3071). Files copied from BEFORE_AFTER/ without overwrite of originals.',
    viewportHeight: 900,
    viewportHeightMobile390: 844,
    pairs: [],
  };

  const htmlRows = [];

  for (const block of PO_PAIRS) {
    for (const vp of block.viewports) {
      for (const phase of ['BEFORE', 'AFTER']) {
        const manifest = phase === 'BEFORE' ? beforeM : afterM;
        const entry = manifest.entries.find((e) => e.route === block.route && e.viewport === vp);
        if (!entry) throw new Error(`missing manifest ${phase} ${block.route} ${vp}`);
        const src = path.join(foundation, 'BEFORE_AFTER', phase, entry.foldFile);
        const destName = `${slug(block.route)}-${vp}-fold-${phase}.png`;
        const dest = path.join(poRoot, 'png', phase, destName);
        await copyFile(src, dest);
        const diskSha = await sha256File(dest);
        const match = diskSha === entry.foldSha256;
        verification.pairs.push({
          route: block.route,
          label: block.label,
          viewport: vp,
          phase,
          sourcePath: `BEFORE_AFTER/${phase}/${entry.foldFile}`,
          packagePath: `png/${phase}/${destName}`,
          manifestSha256: entry.foldSha256,
          packageSha256: diskSha,
          shaMatch: match,
        });
      }
      const b = verification.pairs.find((p) => p.route === block.route && p.viewport === vp && p.phase === 'BEFORE');
      const a = verification.pairs.find((p) => p.route === block.route && p.viewport === vp && p.phase === 'AFTER');
      const same = b.manifestSha256 === a.manifestSha256;
      htmlRows.push({ block, vp, b, a, same });
    }
  }

  await writeFile(path.join(poRoot, 'PO_SHA_VERIFICATION.json'), JSON.stringify(verification, null, 2));

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>SPOKEDU Gate A — PO Visual Review</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; background: #f6f7f9; color: #14213a; }
    h1 { font-size: 1.35rem; }
    .meta { font-size: 0.9rem; color: #536279; margin-bottom: 24px; }
    section { background: #fff; border: 1px solid #dde3ee; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; }
    h2 { font-size: 1.1rem; margin: 0 0 8px; }
    .sha { font-size: 11px; font-family: ui-monospace, monospace; word-break: break-all; color: #64748b; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-left: 8px; }
    .badge.diff { background: #fef3c7; color: #92400e; }
    .badge.same { background: #e2e8f0; color: #475569; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
    .col h3 { font-size: 0.85rem; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
    img { width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; }
    @media (max-width: 900px) { .row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Gate A PO 시각 검수 — BEFORE / AFTER</h1>
  <p class="meta">
    Git HEAD <code>7f32fc3a18925fe0e463471a494b45072f3ca753</code> ·
    Final Build ID <code>${buildId}</code> ·
    WIDTH_QA Build <code>${widthQa.buildId}</code> ·
    기술 QA 154/154 (PO 승인 별도)
  </p>
  <p class="meta">Fold viewport height: 900px (390px width uses 844px height in full capture set). SHA: <code>PO_SHA_VERIFICATION.json</code></p>
${htmlRows
  .map(({ block, vp, b, a, same }) => {
    const badge = same
      ? '<span class="badge same">SHA identical</span>'
      : '<span class="badge diff">SHA differs — visual review required</span>';
    return `<section>
  <h2>${block.label} (${block.route}) — ${vp}px ${badge}</h2>
  <div class="sha">BEFORE ${b.manifestSha256}<br/>AFTER ${a.manifestSha256}</div>
  <div class="row">
    <div class="col"><h3>Before (HEAD hero CSS)</h3><img src="${b.packagePath}" alt="BEFORE ${block.route} ${vp}" loading="lazy" /></div>
    <div class="col"><h3>After (Gate A hero CSS)</h3><img src="${a.packagePath}" alt="AFTER ${block.route} ${vp}" loading="lazy" /></div>
  </div>
</section>`;
  })
  .join('\n')}
</body>
</html>`;

  await writeFile(path.join(poRoot, 'PO_VISUAL_REVIEW.html'), html);
  console.log(JSON.stringify({ ok: true, poRoot, pairs: verification.pairs.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
