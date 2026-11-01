/**
 * Read-only: build image review board HTML (does not touch bodies).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REVIEW = path.join(__dirname, '../copy-slot-review');
const REPO = path.join(__dirname, '../../../../..');
const BODIES = path.join(REPO, 'app/spokedu/stitch/c0/bodies');

function parseCsvSimple(text) {
  const out = [];
  let cur = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i += 1;
        } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      cur.push(f);
      f = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      cur.push(f);
      if (cur.some((x) => x.length)) out.push(cur);
      cur = [];
      f = '';
    } else f += c;
  }
  if (f.length || cur.length) {
    cur.push(f);
    out.push(cur);
  }
  return out;
}

const routeToBody = {
  '/': 'home.html',
  '/education': 'education.html',
  '/private': 'private.html',
  '/spomove': 'spomove.html',
  '/records': 'records.html',
  '/about': 'about.html',
};

const table = parseCsvSimple(fs.readFileSync(path.join(REVIEW, 'STITCH_6_IMAGE_REGISTRY.csv'), 'utf8'));
const hdr = table[0];
const col = (n) => hdr.indexOf(n);
const rows = table.slice(1);

const cards = rows.map((r) => {
  const id = r[col('dom_slot_id')];
  const route = r[col('route')];
  const body = fs.readFileSync(path.join(BODIES, routeToBody[route]), 'utf8');
  const promptStart = (r[col('stitch_prompt')] || '').slice(0, 48);
  const altEsc = promptStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = body.match(new RegExp(`data-alt="${altEsc}[^"]*" src="([^"]+)"`));
  const stitchSrc = m?.[1] || '';
  const candidates = (r[col('candidate_paths')] || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    id,
    route,
    section: r[col('page_section')],
    prompt: r[col('stitch_prompt')],
    candidates,
    fit: r[col('fit_score')],
    status: r[col('status')],
    verification: r[col('verification')],
    stitchSrc,
  };
});

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>Stitch C0 — Image QC Board (34)</title>
<style>
body{font-family:system-ui,sans-serif;margin:24px;background:#f8fafc;color:#0f172a}
h1{font-size:1.25rem}
.note{font-size:0.875rem;color:#475569;margin-bottom:24px;max-width:960px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
.card h2{font-size:0.8rem;margin:0 0 8px;color:#64748b}
.id{font-weight:700;font-size:0.95rem;margin-bottom:8px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.row img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px;background:#e2e8f0}
.cap{font-size:0.7rem;color:#64748b;margin-top:4px}
.meta{font-size:0.75rem;line-height:1.4;margin-top:10px}
.tag{display:inline-block;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:0.65rem}
</style>
</head>
<body>
<h1>Stitch 6 — 이미지 슬롯 검토판 (읽기 전용)</h1>
<p class="note">좌: 현재 bodies에 렌더되는 Stitch CDN 썸네일(미승인 placeholder). 우: 레지스트리 1순위 후보(로컬 <code>/public</code> 경로 — 브라우저에서 dev 서버 기준). <strong>자동 적용·승인 없음.</strong> fit_score·FACT-STAGE7-G20(미성년·게시권) 참고.</p>
<div class="grid">
${cards
  .map(
    (c) => `<article class="card">
<h2>${c.route} · ${c.section}</h2>
<div class="id">${c.id}</div>
<div class="row">
<div><img src="${c.stitchSrc}" alt="Stitch current"/><p class="cap">Stitch CDN (현재)</p></div>
<div><img src="${c.candidates[0] || ''}" alt="Candidate"/><p class="cap">후보 1: ${c.candidates[0] || '—'}</p></div>
</div>
<p class="meta"><span class="tag">${c.status} · fit ${c.fit}</span><br/>${c.verification}<br/><strong>Prompt:</strong> ${c.prompt.slice(0, 120)}…</p>
</article>`,
  )
  .join('\n')}
</div>
</body>
</html>`;

const out = path.join(REVIEW, 'STITCH_C0_IMAGE_QC_BOARD.html');
fs.writeFileSync(out, html, 'utf8');
console.log(JSON.stringify({ out, cards: cards.length }));
