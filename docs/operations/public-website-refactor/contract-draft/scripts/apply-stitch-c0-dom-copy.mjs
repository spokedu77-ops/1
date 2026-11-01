/**
 * Apply STITCH_6_DOM_SLOTS.csv → app/spokedu/stitch/c0/bodies/*.html
 * SSOT: copy-slot-review/STITCH_6_DOM_SLOTS.csv (Stage 7 + final copy review).
 * Does not modify Stitch ZIP sources. Skips image slots (registry pending).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as parse5 from 'parse5';
import { hasBlockTextDescendant, normVisible, textFromNode } from './lib/stitch-dom-parse.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.join(__dirname, '..');
const REPO = path.join(__dirname, '../../../../..');
const BODIES = path.join(REPO, 'app/spokedu/stitch/c0/bodies');
const CSV_PATH = path.join(CONTRACT, 'copy-slot-review/STITCH_6_DOM_SLOTS.csv');

const ROUTE_TO_BODY = {
  '/': 'home.html',
  '/education': 'education.html',
  '/private': 'private.html',
  '/spomove': 'spomove.html',
  '/records': 'records.html',
  '/about': 'about.html',
};

function getAttr(node, name) {
  return node.attrs?.find((a) => a.name === name)?.value ?? '';
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cols = [];
    let cur = '';
    let q = false;
    for (const c of line) {
      if (c === '"') {
        q = !q;
        continue;
      }
      if (c === ',' && !q) {
        cols.push(cur);
        cur = '';
        continue;
      }
      cur += c;
    }
    cols.push(cur);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    return row;
  });
}

/** Match extractDomSlotsFromHtml: tag index is global preorder per tag name. */
function buildPathIndex(documentNode) {
  const tagCounts = {};
  const index = new Map();

  function walk(node, stack) {
    if (!node || node.nodeName === '#text' || node.nodeName === '#comment') return;
    const tag = node.nodeName;
    tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    const pathKey = `${tag}[${tagCounts[tag]}]`;
    const full = [...stack, pathKey].join('>');
    index.set(full, node);
    const nextStack = [...stack, pathKey];
    for (const ch of node.childNodes ?? []) walk(ch, nextStack);
  }

  for (const ch of documentNode.childNodes ?? []) walk(ch, []);
  return index;
}

function isMaterialIconSpan(node) {
  if (node.nodeName !== 'span') return false;
  const cls = getAttr(node, 'class');
  return cls.includes('material-symbols');
}

function hasStructuralChild(el) {
  for (const ch of el.childNodes ?? []) {
    if (ch.nodeName === '#text' || ch.nodeName === 'br') continue;
    if (isMaterialIconSpan(ch)) continue;
    return true;
  }
  return false;
}

/** Preserve grid/card/button DOM — text + material icons (+ br) only. */
function applyTextCopy(el, newCopy) {
  if (hasStructuralChild(el)) return false;
  const preserved = [];
  for (const ch of el.childNodes ?? []) {
    if (isMaterialIconSpan(ch) || ch.nodeName === 'br') preserved.push(ch);
  }
  const next = [];
  const text = newCopy === '—' || newCopy === '-' ? '—' : newCopy;
  if (text) next.push({ nodeName: '#text', value: text });
  for (const p of preserved) next.push(p);
  el.childNodes = next;
  return true;
}

/** Card / footer blocks: replace visible text nodes only, keep element tree. */
function applyTextCopyDeep(el, stitchOriginal, newCopy) {
  const textNodes = [];
  function collect(n) {
    if (n.nodeName === '#text') textNodes.push(n);
    else if (n.childNodes?.length) {
      for (const c of n.childNodes) {
        if (isMaterialIconSpan(c)) continue;
        collect(c);
      }
    }
  }
  collect(el);
  if (!textNodes.length) return false;
  const full = textNodes.map((n) => n.value).join('');
  if (!textsMatch(full, stitchOriginal)) return false;
  const text = newCopy === '—' || newCopy === '-' ? '—' : newCopy;
  textNodes[0].value = text;
  for (let i = 1; i < textNodes.length; i += 1) textNodes[i].value = '';
  return true;
}

function pathDepth(domPath) {
  return (domPath.match(/>/g) ?? []).length;
}

/** Footer nav rows map to `<li>`; visible copy lives on the single child `<a>`. */
function resolveApplyTarget(el) {
  if (el?.nodeName === 'li') {
    const elements = (el.childNodes ?? []).filter(
      (n) => n.nodeName && n.nodeName !== '#text' && n.nodeName !== 'br',
    );
    if (elements.length === 1 && elements[0].nodeName === 'a') return elements[0];
  }
  return el;
}

function textsMatch(a, b) {
  const na = normVisible(a);
  const nb = normVisible(b);
  if (na === nb) return true;
  if (na.length >= 12 && nb.length >= 12 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

function shouldSkipRow(row) {
  if (row.role === 'image' || row.tag === 'img') return 'image_role';
  const copy = (row.spokedu_copy ?? '').trim();
  if (copy.includes('COPY_SLOT_IMAGE_REGISTRY') || copy.startsWith('(이미지')) return 'image_pending';
  const orig = normVisible(row.stitch_original);
  const next = normVisible(copy);
  if (orig === next) return 'unchanged';
  return null;
}

function main() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const byRoute = new Map();
  for (const row of rows) {
    if (!byRoute.has(row.route)) byRoute.set(row.route, []);
    byRoute.get(row.route).push(row);
  }

  const report = {
    applied: [],
    skipped: { unchanged: 0, image_pending: 0, image_role: 0, path_miss: 0, text_mismatch: 0, complex_dom: 0 },
    exceptions: [],
  };

  for (const [route, routeRows] of byRoute) {
    const bodyFile = ROUTE_TO_BODY[route];
    if (!bodyFile) continue;
    const bodyPath = path.join(BODIES, bodyFile);
    const fragment = fs.readFileSync(bodyPath, 'utf8');
    const wrapped = `<!DOCTYPE html><html><head></head><body>${fragment}</body></html>`;
    const doc = parse5.parse(wrapped);
    const pathIndex = buildPathIndex(doc);

    const sortedRows = [...routeRows].sort(
      (a, b) => pathDepth(b.dom_path) - pathDepth(a.dom_path),
    );

    for (const row of sortedRows) {
      const skip = shouldSkipRow(row);
      if (skip === 'unchanged') {
        report.skipped.unchanged += 1;
        continue;
      }
      if (skip) {
        report.skipped[skip] += 1;
        continue;
      }

      const el = pathIndex.get(row.dom_path);
      if (!el) {
        report.skipped.path_miss += 1;
        report.exceptions.push({ id: row.dom_slot_id, reason: 'path_miss', path: row.dom_path });
        continue;
      }

      const applyEl = resolveApplyTarget(el);

      const current =
        applyEl.nodeName === 'img'
          ? getAttr(applyEl, 'data-alt') || getAttr(applyEl, 'alt') || ''
          : normVisible(textFromNode(el));

      if (!textsMatch(current, row.stitch_original)) {
        report.skipped.text_mismatch += 1;
        report.exceptions.push({
          id: row.dom_slot_id,
          reason: 'text_mismatch',
          expected: row.stitch_original.slice(0, 80),
          actual: current.slice(0, 80),
        });
        continue;
      }

      const copy = row.spokedu_copy.trim();
      const allowDeep = !hasBlockTextDescendant(applyEl);
      const appliedOk =
        applyTextCopy(applyEl, copy) ||
        (allowDeep && applyTextCopyDeep(applyEl, row.stitch_original, copy));
      if (!appliedOk) {
        report.skipped.complex_dom += 1;
        report.exceptions.push({ id: row.dom_slot_id, reason: 'complex_dom', path: row.dom_path });
        continue;
      }
      report.applied.push({
        id: row.dom_slot_id,
        route,
        from: row.stitch_original.slice(0, 60),
        to: row.spokedu_copy.slice(0, 60),
      });
    }

    const bodyNode = pathIndex.get('html[1]>body[1]');
    const out = parse5.serialize(bodyNode).replace(/^<body[^>]*>/, '').replace(/<\/body>$/, '').trim();
    fs.writeFileSync(bodyPath, out, 'utf8');
  }

  const outPath = path.join(CONTRACT, 'copy-slot-review/STITCH_C0_COPY_APPLY_REPORT.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({
    applied: report.applied.length,
    skipped: report.skipped,
    exceptions: report.exceptions.length,
    outPath,
  }, null, 2));
}

throw new Error('Legacy aggregate/partial-match apply is disabled. Use apply-stitch-c0-recovery.mjs with the reviewed mapping and --evidence.');
