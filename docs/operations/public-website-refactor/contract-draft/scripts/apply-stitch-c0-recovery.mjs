/** Recover the reviewed mapping from immutable Stitch HTML; never flatten aggregates. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import JSZip from 'jszip';
import * as parse5 from 'parse5';

const args = process.argv.slice(2);
const option = (key) => args[args.indexOf(key) + 1];
if (!args.includes('--mapping') || !args.includes('--evidence')) throw new Error('--mapping and --evidence required');
const evidence = path.resolve(option('--evidence'));
fs.mkdirSync(evidence, { recursive: true });
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const attr = (n, k) => n?.attrs?.find((a) => a.name === k)?.value ?? '';
const elements = (n) => (n.childNodes ?? []).filter((c) => c.tagName);
const icon = (n) => attr(n, 'class').includes('material-symbols');
const text = (n) => n.nodeName === '#text' ? n.value : ['svg', 'script', 'style'].includes(n.nodeName) ? '' : (n.childNodes ?? []).map(text).join('');
function csv(t) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) { if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r' || c === '\n') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.slice(1).map((r) => Object.fromEntries(rows[0].map((h, i) => [h.replace(/^\uFEFF/, ''), r[i] ?? ''])));
}
function index(doc) {
  const counts = {}, map = new Map();
  function walk(n, stack) {
    if (['#text', '#comment'].includes(n.nodeName)) return;
    const tag = n.nodeName; counts[tag] = (counts[tag] ?? 0) + 1;
    const key = [...stack, `${tag}[${counts[tag]}]`]; map.set(key.join('>'), n);
    for (const c of n.childNodes ?? []) walk(c, key);
  }
  for (const n of doc.childNodes) walk(n, []);
  return map;
}
// Original elements/classes/graphics are authoritative. Carry current text at the
// same element positions before applying the explicitly reviewed repairs.
function carryText(original, current) {
  const a = elements(original), b = elements(current);
  if (a.length !== b.length || a.some((n, i) => n.tagName !== b[i].tagName)) throw new Error('Element topology differs; recovery blocked');
  if (original.tagName !== 'body' && attr(original, 'class') !== attr(current, 'class')) throw new Error(`Design classes differ: ${original.tagName}; recovery blocked`);
  if (original.tagName === 'img' && attr(original, 'src') !== attr(current, 'src')) throw new Error('Image differs; recovery blocked');
  a.forEach((n, i) => carryText(n, b[i]));
  let i = 0;
  original.childNodes = (current.childNodes ?? []).map((n) => {
    const next = n.tagName ? a[i++] : { ...n, parentNode: original };
    next.parentNode = original; return next;
  });
}
function setLeaf(n, value) {
  if (icon(n) || elements(n).some((c) => !icon(c) && c.tagName !== 'br')) throw new Error('Non-leaf or icon target blocked');
  const tokens = elements(n).filter(icon).map(text);
  const nodes = (n.childNodes ?? []).filter((c) => c.nodeName === '#text');
  if (!nodes.length) { const node = { nodeName: '#text', value: '', parentNode: n }; n.childNodes.unshift(node); nodes.push(node); }
  nodes[0].value = value;
  nodes.slice(1).forEach((c) => { c.value = ''; });
  if (JSON.stringify(elements(n).filter(icon).map(text)) !== JSON.stringify(tokens)) throw new Error('Icon changed');
}
const mapping = csv(fs.readFileSync(option('--mapping'), 'utf8'));
const packageZip = await JSZip.loadAsync(fs.readFileSync(path.join(process.env.USERPROFILE, 'Downloads/SPOKEDU_CODEX_HANDOFF_SOURCES_20261102.zip')));
const zip = await JSZip.loadAsync(await packageZip.file('sources/stitch/stitch_editorial_website_redesign.zip').async('nodebuffer'));
const pages = [['/', 'home', 'home_spomove'], ['/education', 'education', 'education_programs_spomove'], ['/private', 'private', 'private_lesson_spomove'], ['/spomove', 'spomove', 'spomove_system_spomove'], ['/records', 'records', 'field_records_spomove'], ['/about', 'about', 'about_spomove']];
const result = { changes: [], preserved: [], files: [], pending: [] };
const candidates = [];
for (const [route, id, folder] of pages) {
  const html = await zip.file(`stitch_editorial_website_redesign/${folder}/code.html`).async('string');
  const file = `app/spokedu/stitch/c0/bodies/${id}.html`, before = fs.readFileSync(file, 'utf8');
  const srcDoc = parse5.parse(html), src = index(srcDoc);
  const cur = index(parse5.parse(`<!doctype html><html><head></head><body>${before}</body></html>`));
  const rows = mapping.filter((r) => r.route === route);
  for (const r of rows) {
    const a = src.get(r.source_dom_path), b = cur.get(r.source_dom_path);
    if (!a || !b) throw new Error(`Path mismatch ${r.id}`);
    const visible = (n) => n.tagName === 'img' ? attr(n, 'data-alt') || attr(n, 'alt') : norm(text(n));
    if (visible(a) !== r.source_exact || visible(b) !== r.current_exact) throw new Error(`Exact text mismatch ${r.id}`);
    if (a.tagName !== b.tagName) throw new Error(`Tag mismatch ${r.id}`);
  }
  carryText(src.get('html[1]>body[1]'), cur.get('html[1]>body[1]'));
  function record(r, operation, fn) {
    const n = src.get(r.source_dom_path), old = parse5.serializeOuter(n);
    fn(n);
    if (old !== parse5.serializeOuter(n)) result.changes.push({ id: r.id, route, operation, before: old, after: parse5.serializeOuter(n) });
  }
  for (const r of rows) {
    if (r.id === 'DOM-private_lesson_spomove-85') {
      const n = src.get(r.source_dom_path), form = n.parentNode;
      if (n.tagName !== 'button' || form.tagName !== 'form' || attr(n, 'type') !== 'submit') throw new Error('Private CTA shape mismatch');
      const beforeForm = parse5.serializeOuter(form);
      form.attrs = form.attrs.filter((a) => a.name !== 'onsubmit' && a.name !== 'action' && a.name !== 'method');
      form.attrs.push({ name: 'action', value: '/contact' }, { name: 'method', value: 'get' });
      result.changes.push({ id: r.id, route, operation: 'remove fake submission alert; connect consultation to contact without sending phone', before: beforeForm, after: parse5.serializeOuter(form) });
    }
    if (r.status.startsWith('복구안 / 브랜드')) {
      record(r, 'restore separated S badge and wordmark', (n) => {
        const source = index(parse5.parse(html)).get(r.source_dom_path);
        const spans = elements(n), originals = elements(source);
        if (spans.length !== 2 || norm(text(originals[0])) !== 'S' || norm(text(originals[1])) !== 'SPOMOVE') throw new Error(`Brand shape mismatch ${r.id}`);
        setLeaf(spans[0], 'S'); setLeaf(spans[1], r.target_exact);
        (n.childNodes ?? []).filter((c) => c.nodeName === '#text').forEach((c) => { c.value = ''; });
      });
    } else if (r.status === '복구안 / 기존 공통 원고') {
      record(r, 'apply reviewed exact common copy', (n) => setLeaf(n, r.target_exact));
    }
    if (r.status === '보류 / 링크 매핑 충돌' && r.target_exact === 'SPOKEDU LAB') {
      record(r, 'wire existing LAB destination', (n) => {
        const a = n.tagName === 'a' ? n : elements(n).find((c) => c.tagName === 'a');
        if (!a || norm(text(a)) !== r.target_exact || attr(a, 'data-path') !== 'field-records') throw new Error(`LAB mismatch ${r.id}`);
        a.attrs.find((x) => x.name === 'data-path').value = 'spokedu-lab';
      });
    }
    if (r.status === '복구 / 아이콘 오매핑') {
      record(r, 'remove copy from icon frame', (n) => { if (!elements(n).every(icon)) throw new Error('Not an icon frame'); for (const c of n.childNodes) if (c.nodeName === '#text') c.value = ''; });
    }
    if (r.status === '보류 / 기존 QC 역할 충돌' || r.id === 'DOM-about_spomove-84') {
      record(r, 'remove confirmed wrong-role boilerplate; reserve pending copy slot', (n) => {
        setLeaf(n, ''); n.attrs.push({ name: 'data-stitch-copy-pending', value: r.id });
      });
      result.pending.push({ id: r.id, reason: 'Known QC boilerplate removed; final value not supplied' });
    }
    if (route === '/' && ['DOM-home_spomove-28', 'DOM-home_spomove-30'].includes(r.id)) {
      record(r, 'remove stray parent text; keep image and badge pending', (n) => {
        if (!elements(n).length) throw new Error('Missing image frame');
        for (const c of n.childNodes) if (c.nodeName === '#text') c.value = '';
      });
      result.pending.push({ id: r.id, reason: 'No approved badge value; no source KPI reinstated' });
    }
    if (route === '/' && r.id === 'DOM-home_spomove-10') {
      record(r, 'restore H1 emphasis using unchanged existing text', (n) => {
        if (norm(text(n)) !== 'SPOKEDU 체육교육 · SPOMOVE 프로그램') throw new Error('Unexpected Home H1');
        const span = elements(n).find((c) => c.tagName === 'span');
        setLeaf(n.childNodes ? { ...n, childNodes: n.childNodes.filter((c) => c.nodeName === '#text') } : n, 'SPOKEDU 체육교육 · ');
        setLeaf(span, 'SPOMOVE 프로그램');
        if (norm(text(n)) !== r.current_exact) throw new Error('H1 copy changed');
      });
    }
    if (route === '/' && ['DOM-home_spomove-22', 'DOM-home_spomove-34', 'DOM-home_spomove-42', 'DOM-home_spomove-100', 'DOM-home_spomove-116'].includes(r.id)) {
      record(r, 'remove confirmed duplicate/wrong-role copy; reserve pending slot', (n) => {
        setLeaf(n, ''); n.attrs.push({ name: 'data-stitch-copy-pending', value: r.id });
      });
      result.pending.push({ id: r.id, reason: 'Wrong-role duplicate removed; final copy not supplied' });
    }
  }
  // Every untouched leaf must retain the text from the pre-recovery implementation.
  const changedRoots = result.changes.filter((r) => r.route === route).map((r) => rows.find((s) => s.id === r.id).source_dom_path);
  for (const r of rows) if (!changedRoots.some((p) => r.source_dom_path === p || r.source_dom_path.startsWith(p + '>') || p.startsWith(r.source_dom_path + '>'))) {
    const a = src.get(r.source_dom_path), b = cur.get(r.source_dom_path);
    if (norm(text(a)) !== norm(text(b))) throw new Error(`Existing copy lost ${r.id}`);
    result.preserved.push(r.id);
  }
  const body = src.get('html[1]>body[1]'), after = parse5.serialize(body).trim();
  candidates.push({ file, before, after, id, html });
  result.files.push({ file, before: hash(before), after: hash(after), source: hash(html) });
}
// All six candidates validate before any body is replaced. Preserve exact backups.
for (const c of candidates) {
  fs.writeFileSync(path.join(evidence, `${c.id}.before.html`), c.before);
  fs.writeFileSync(path.join(evidence, `${c.id}.candidate.html`), c.after);
  fs.writeFileSync(path.join(evidence, `${c.id}.reference.html`), c.html.replace(/(<body[^>]*>)[\s\S]*?(<\/body>)/i, (_, a, b) => a + c.after + b));
}
if (args.includes('--apply')) for (const c of candidates) fs.writeFileSync(c.file, c.after);
fs.writeFileSync(path.join(evidence, 'recovery.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ applied: args.includes('--apply'), changes: result.changes.length, slots: new Set(result.changes.map((r) => r.id)).size, preserved: result.preserved.length, files: result.files, pending: result.pending }, null, 2));
