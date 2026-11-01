/**
 * Read-only QC: applied copy vs UI role (no HTML writes).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REVIEW = path.join(__dirname, '../copy-slot-review');

function parseCsv(text) {
  const rows = [];
  let i = 0;
  const lines = text.replace(/\r\n/g, '\n');
  while (i < lines.length) {
    const row = [];
    while (i < lines.length) {
      if (lines[i] === '' && row.length === 0) {
        i += 1;
        continue;
      }
      let field = '';
      if (lines[i] === '"') {
        i += 1;
        while (i < lines.length) {
          if (lines[i] === '"') {
            if (lines[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i += 1;
              break;
            }
          } else {
            field += lines[i];
            i += 1;
          }
        }
        if (lines[i] === ',') i += 1;
      } else {
        const end = lines.indexOf('\n', i);
        const chunk = end === -1 ? lines.slice(i) : lines.slice(i, end);
        const comma = chunk.indexOf(',');
        if (comma === -1 && end === -1) {
          field = chunk;
          i = lines.length;
        } else {
          const linePart = end === -1 ? lines.slice(i) : lines.slice(i, end + 1);
          const c = linePart.indexOf(',');
          field = linePart.slice(0, c);
          i += c + 1;
          if (linePart[c] === '\n') {
            i = end === -1 ? lines.length : end + 1;
          }
        }
      }
      row.push(field);
      if (i < lines.length && (lines[i - 1] === '\n' || (row.length && lines[i] === '\n'))) break;
      if (i >= lines.length || lines[i] === '\n') {
        i += 1;
        break;
      }
    }
    if (row.length) rows.push(row);
    if (i >= lines.length) break;
  }
  return rows;
}

/** Minimal RFC-style row split for this CSV (fields may contain newlines in quotes). */
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

const HERO = 'SPOKEDU 체육교육 · SPOMOVE 프로그램';
const BOILER =
  '전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다. 현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.';

const table = parseCsvSimple(fs.readFileSync(path.join(REVIEW, 'STITCH_6_DOM_SLOTS.csv'), 'utf8'));
const hdr = table[0];
const col = (name) => hdr.indexOf(name);
const slots = table.slice(1).map((r) => ({
  dom_slot_id: r[col('dom_slot_id')],
  route: r[col('route')],
  section: r[col('section_comment')],
  role: r[col('role')],
  tag: r[col('tag')],
  stitch_original: r[col('stitch_original')],
  spokedu_copy: r[col('spokedu_copy')],
  gate: r[col('gate_id')],
  review_status: r[col('review_status')],
}));

const byId = new Map(slots.map((s) => [s.dom_slot_id, s]));
const report = JSON.parse(fs.readFileSync(path.join(REVIEW, 'STITCH_C0_COPY_APPLY_REPORT.json'), 'utf8'));

function uiKind(s) {
  const role = (s.role || '').toLowerCase();
  const tag = (s.tag || '').toLowerCase();
  if (tag === 'heading' || ['h1', 'h2', 'h3', 'h4'].includes(tag)) return 'Heading';
  if (tag === 'img' || role === 'image') return 'Image';
  if (role === 'metric_display' || /^\d/.test(s.stitch_original.trim())) return 'Metric';
  if (role === 'tag_chip') return 'Chart Label';
  if (/tracking|live feed|fps|confidence|dashboard|gauge|%/i.test(s.stitch_original)) return 'Dashboard';
  if (role === 'cta' || tag === 'button' || tag === 'a') return 'CTA';
  if (role === 'body' || tag === 'p') return 'Body';
  if (s.section?.includes('footer') || s.dom_slot_id?.includes('footer')) return 'Footer';
  if (role === 'label' || tag === 'span' || tag === 'div') return 'Metric Label';
  return 'Navigation';
}

const misplaced = [];
const boilerMis = [];

for (const a of report.applied) {
  const s = byId.get(a.id);
  if (!s) continue;
  const copy = (s.spokedu_copy || '').trim();
  const kind = uiKind(s);
  if (copy === HERO && kind !== 'Heading') {
    misplaced.push({
      id: a.id,
      route: s.route,
      uiKind: kind,
      tag: s.tag,
      role: s.role,
      current: copy,
      stitch_original: s.stitch_original.slice(0, 100),
      gate: s.gate,
      review_status: s.review_status,
    });
  }
  if (copy === BOILER && !['Body', 'Heading'].includes(kind)) {
    boilerMis.push({ id: a.id, route: s.route, uiKind: kind, stitch_original: s.stitch_original.slice(0, 80) });
  }
  if (copy === '—' || copy === '-') {
    /* metric masked — OK if was unverified */
  }
}

const heroCsvWrong = slots.filter(
  (s) => (s.spokedu_copy || '').trim() === HERO && uiKind(s) !== 'Heading',
);

console.log(
  JSON.stringify(
    {
      appliedHeroMisplaced: misplaced,
      appliedBoilerMisplaced: boilerMis,
      csvHeroNonHeadingCount: heroCsvWrong.length,
      csvHeroNonHeadingAppliedIds: heroCsvWrong
        .filter((s) => report.applied.some((a) => a.id === s.dom_slot_id))
        .map((s) => ({ id: s.dom_slot_id, uiKind: uiKind(s), tag: s.tag })),
    },
    null,
    2,
  ),
);
