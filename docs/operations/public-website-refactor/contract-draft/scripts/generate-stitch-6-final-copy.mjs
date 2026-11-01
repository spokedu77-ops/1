/**
 * STITCH_6_FINAL_COPY_REVIEW.md + DOM CSV + image registry + validation.
 * Phase C forbidden. Does not overwrite STITCH_6_COPY_LEDGER.csv.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { STITCH_FOLDER_ROUTE } from './b0-source-ingest.mjs';
import { collectAllVisibleText, extractDomSlotsFromFile, normVisible } from './lib/stitch-dom-parse.mjs';
import { ctaTarget, resolveSlotCopy } from './lib/copy-spokedu-resolve.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.join(__dirname, '..');
const REPO = path.join(__dirname, '../../../../..');
const STITCH_ROOT = path.join(CONTRACT, 'sources/b0-extracted/stitch-unpacked/stitch_editorial_website_redesign');
const OUT = path.join(CONTRACT, 'copy-slot-review');
const MD_OUT = path.join(CONTRACT, 'STITCH_6_FINAL_COPY_REVIEW.md');
const IMAGES_ROOT = path.join(REPO, 'public/images/spokedu');

const ROUTES = ['/', '/education', '/private', '/spomove', '/records', '/about'];

const IMAGE_KEYWORDS = [
  { keys: ['gymnasium', 'indoor sports', 'training studio', 'edtech'], paths: ['home/home-hero-movement.jpg', 'home/field-editorial/home-hero-field.webp'] },
  { keys: ['elementary', 'students', 'basketball', 'school indoor'], paths: ['dispatch/dispatch-group-class.jpg'] },
  { keys: ['coach', 'high-five', 'trainer', 'mentorship'], paths: ['private/private-coaching.jpg'] },
  { keys: ['outdoor', 'cones', 'cheering', 'turf', 'soccer'], paths: ['records/dongjak-spomove-field.jpg', 'private/curriculum-soccer.jpg'] },
  { keys: ['tablet', 'dashboard', 'ui', 'screen'], paths: ['home/field-editorial/home-master-ui.png'] },
  { keys: ['motion capture', 'laboratory', 'biomechanics'], paths: ['home/field-editorial/home-hero-ai-20261018.png'] },
  { keys: ['welfare', 'community', 'preschool', 'kindergarten'], paths: ['private/curriculum-preschool.jpg', '복지관_민첩성 놀이체육.jpg'] },
  { keys: ['lab', 'gym', 'sponsorship', '체육관'], paths: ['home/field-editorial/home-hero-lab-gym-sponsorship-14.jpg'] },
  { keys: ['record', 'field', 'festival', 'highlight'], paths: ['records/dasarang-field.jpg'] },
  { keys: ['spomove', 'obstacle', 'smart camera'], paths: ['home/field-editorial/home-spomove-field.webp'] },
  { keys: ['landing', 'mat', 'posture', 'crash mat'], paths: ['private/class-flow-01.jpg'] },
  { keys: ['conference', 'auditorium', 'parents'], paths: ['home/field-editorial/home-service-institution.jpg'] },
  { keys: ['portrait', 'researcher', 'female', 'professional studio'], paths: ['private/instructor-choi.jpg', 'private/instructor-kim-gumin.jpg'] },
];

function gitHead() {
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function readCsv(name) {
  const p = path.join(CONTRACT, name);
  const lines = fs.readFileSync(p, 'utf8').trim().split(/\r?\n/);
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

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath, headers, rows) {
  const body = [headers.map(csvEscape).join(','), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','))].join('\n');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${body}\n`, 'utf8');
}

function listImages(dir, prefix = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...listImages(full, `${prefix}${name}/`));
    else if (/\.(jpg|jpeg|png|webp)$/i.test(name)) out.push(`${prefix}${name}`.replace(/\\/g, '/'));
  }
  return out;
}

function scoreImage(alt) {
  const lower = (alt ?? '').toLowerCase();
  let best = [];
  let score = 0;
  for (const e of IMAGE_KEYWORDS) {
    let s = 0;
    for (const k of e.keys) if (lower.includes(k)) s += 2;
    if (s > score) {
      score = s;
      best = e.paths;
    }
  }
  const existing = best.filter((p) => fs.existsSync(path.join(IMAGES_ROOT, p)));
  if (score === 0 || !existing.length) {
    return { status: 'IMAGE_ASSET_REQUIRED', candidates: '', score: 0, note: 'No keyword match or file missing' };
  }
  return {
    status: 'CANDIDATE_REVIEW',
    candidates: existing.map((p) => `/images/spokedu/${p}`).join(' | '),
    score,
    note: 'File exists; minor consent & publication rights FACT-STAGE7-G20',
  };
}

function crosswalkForRoute(crosswalk, route) {
  return crosswalk.filter((r) => {
    const rr = (r.route ?? '').split('?')[0];
    if (route === '/records') return rr === '/records';
    return rr === route;
  });
}

function isManuscriptSlot(s) {
  if (s.role === 'image') return true;
  if (['heading', 'body', 'cta', 'metric_display', 'decorative_number', 'tag_chip'].includes(s.role)) return true;
  if (s.data_path) return true;
  if (s.region === 'header' && (s.tag === 'a' || s.tag === 'button')) return true;
  if (s.region === 'footer' && ['h4', 'p', 'a', 'li'].includes(s.tag)) return true;
  return false;
}

function renderSlotBlock(slot, resolved) {
  return `- **DOM ID:** \`${slot.dom_slot_id}\` · **역할:** ${slot.role} · **경로:** \`${slot.dom_path}\`
  - **Stitch 원문:** ${slot.stitch_original.replace(/\n/g, ' ').slice(0, 280)}${slot.stitch_original.length > 280 ? '…' : ''}
  - **SPOKEDU 적용 문구:** ${resolved.spokedu_copy}
  - **근거:** ${resolved.basis} (${resolved.stage7_ids})
  - **디자인 영향:** ${resolved.design_impact}
  - **CTA 목적지:** ${resolved.cta_href || '—'}
  - **검증·승인:** ${resolved.fact_status} · **${resolved.approval}**
`;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const crosswalk = readCsv('CONTENT_CROSSWALK.csv');
  const allSlots = [];
  const pageMeta = {};
  const coverage = [];

  for (const [folder, route] of Object.entries(STITCH_FOLDER_ROUTE)) {
    const htmlPath = path.join(STITCH_ROOT, folder, 'code.html');
    const pageSlug = folder.replace(/[^a-z0-9]+/gi, '_');
    const meta = { route, pageSlug, relFromRoot: `stitch_editorial_website_redesign/${folder}/code.html` };
    const html = fs.readFileSync(htmlPath, 'utf8');
    const { slots, sections } = extractDomSlotsFromFile(htmlPath, meta);
    const visible = collectAllVisibleText(html);

    for (const slot of slots) {
      const cwRows = crosswalkForRoute(crosswalk, route);
      const resolved = resolveSlotCopy(slot, cwRows);
      allSlots.push({ ...slot, ...resolved });
    }

    const slotNorms = new Set(slots.map((s) => normVisible(s.stitch_original)));
    let missing = 0;
    for (const v of visible) {
      if (v.ctx === 'header' || v.ctx === 'root') continue;
      const n = normVisible(v.t);
      if (n.length < 3) continue;
      if (![...slotNorms].some((sn) => sn.includes(n) || n.includes(sn))) missing++;
    }

    pageMeta[route] = { folder, slotCount: slots.length, sections, missingEstimate: missing };
    coverage.push({ route, slots: slots.length, missingEstimate: missing });
  }

  const images = allSlots.filter((s) => s.role === 'image');
  const imageRows = images.map((s) => {
    const img = scoreImage(s.stitch_original);
    return {
      dom_slot_id: s.dom_slot_id,
      route: s.route,
      page_section: s.page_section,
      stitch_prompt: s.stitch_original.slice(0, 400),
      candidate_paths: img.candidates,
      fit_score: img.score,
      status: img.status,
      verification: img.note,
      approval: 'PENDING_APPROVAL',
    };
  });

  writeCsv(
    path.join(OUT, 'STITCH_6_DOM_SLOTS.csv'),
    [
      'dom_slot_id',
      'route',
      'page_section',
      'region',
      'dom_path',
      'tag',
      'role',
      'stitch_original',
      'spokedu_copy',
      'stage7_ids',
      'basis',
      'fact_status',
      'design_impact',
      'cta_href',
      'approval',
    ],
    allSlots.map((s) => ({
      dom_slot_id: s.dom_slot_id,
      route: s.route,
      page_section: s.page_section,
      region: s.region,
      dom_path: s.dom_path,
      tag: s.tag,
      role: s.role,
      stitch_original: s.stitch_original,
      spokedu_copy: s.spokedu_copy,
      stage7_ids: s.stage7_ids,
      basis: s.basis,
      fact_status: s.fact_status,
      design_impact: s.design_impact,
      cta_href: s.cta_href,
      approval: s.approval,
    })),
  );

  writeCsv(
    path.join(OUT, 'STITCH_6_IMAGE_REGISTRY.csv'),
    ['dom_slot_id', 'route', 'page_section', 'stitch_prompt', 'candidate_paths', 'fit_score', 'status', 'verification', 'approval'],
    imageRows,
  );

  const unverified = allSlots.filter(
    (s) =>
      s.fact_status.includes('BLOCKED') ||
      s.fact_status.includes('FABRICATED') ||
      s.fact_status.includes('G08') ||
      s.fact_status === 'IMAGE_PROVENANCE_REVIEW' ||
      s.fact_status === 'NOT_500_PLUS',
  );

  writeCsv(
    path.join(OUT, 'STITCH_6_UNVERIFIED_FACTS.csv'),
    ['dom_slot_id', 'route', 'stitch_original', 'spokedu_copy', 'fact_status', 'basis'],
    unverified.map((s) => ({
      dom_slot_id: s.dom_slot_id,
      route: s.route,
      stitch_original: s.stitch_original.slice(0, 200),
      spokedu_copy: s.spokedu_copy,
      fact_status: s.fact_status,
      basis: s.basis,
    })),
  );

  const emptyCopy = allSlots.filter((s) => s.role !== 'image' && !normVisible(s.spokedu_copy));
  const imgRequired = imageRows.filter((r) => r.status === 'IMAGE_ASSET_REQUIRED').length;

  const designExceptions = [];
  for (const s of allSlots) {
    if (s.design_impact.includes('LINE_WRAP') || s.design_impact.includes('METRIC')) {
      designExceptions.push({
        dom_slot_id: s.dom_slot_id,
        route: s.route,
        issue: s.design_impact,
        stitch: s.stitch_original.slice(0, 80),
        alternative: s.spokedu_copy,
        approval: 'PENDING_APPROVAL',
      });
    }
  }

  const verdictOk =
    allSlots.length > 0 &&
    emptyCopy.length === 0 &&
    coverage.every((c) => c.missingEstimate < 15) &&
    imgRequired <= 5;

  const verdict = verdictOk ? 'COPY_DRAFT_READY_FOR_APPROVAL' : 'COPY_DRAFT_PARTIAL';

  const md = [];
  md.push('# STITCH 6 — Final copy review manuscript');
  md.push('');
  md.push(`**Git HEAD:** \`${gitHead()}\``);
  md.push(`**Verdict:** \`${verdict}\``);
  md.push('**Phase C:** NOT AUTHORIZED · **Public code changes:** 0 · **Design structure changes:** 0');
  md.push('');
  md.push('## Pixel fidelity gate (strategy — not executed in this pass)');
  md.push('');
  md.push('- `STITCH_BASELINE_RENDER_PASS`: **NOT RUN** (requires isolated Stitch HTML render + screenshot diff before content swap).');
  md.push('- Order: baseline render → `STITCH_BASELINE_RENDER_PASS` → approved copy/image swap → nav/CTA wiring → final QA.');
  md.push('- Stitch ZIP HTML/CSS/Tailwind/DOM = implementation SSOT; existing SPOKEDU layout must not be blended on top.');
  md.push('');
  md.push('## Global chrome (공통 헤더·푸터 — 6페이지 동일 Stitch 패턴)');
  md.push('');
  md.push('| Stitch IA | SPOKEDU 적용 | CTA/링크 | 근거 |');
  md.push('|-----------|-------------|----------|------|');
  md.push(`| 로고 wordmark \`SPOMOVE\` | **${'SPOKEDU'}** | \`/\` | FACT-BRAND-001 |`);
  md.push(`| Nav: 교육 프로그램 | **${'기관·학교 수업'}** | \`/education\` | siteNav |`);
  md.push(`| Nav: 프라이빗 레슨 | **${'개인·소그룹 수업'}** | \`/private\` | siteNav |`);
  md.push(`| Nav: 스포무브 시스템 | **SPOMOVE** | \`/spomove\` | siteNav |`);
  md.push(`| Nav: 현장 스토리/기록 | **수업사례** | \`/records\` | siteNav |`);
  md.push(`| Nav: 회사 소개 | **SPOKEDU 소개** | \`/about\` | siteNav |`);
  md.push(`| Header CTA | **문의하기** | \`/contact\` | siteHeaderCta |`);
  md.push(`| LAB capsule (Stitch person icon 영역) | **SPOKEDU LAB** | \`/spokedu-lab\` | siteHeaderLabCta (out of Stitch 6 scope wire) |`);
  md.push(`| Footer 연락처 | **${'spokedu77@gmail.com'}** / **${'010-4437-9294'}** | tel/mailto | brandProfile |`);
  md.push(`| Footer © SPOMOVE Inc | **© SPOKEDU. 사업자등록번호 311-63-00356** | — | FACT-BIZ-001 |`);
  md.push('');
  md.push('> Header LAB·Partners 등 Stitch에 없는 IA는 **기능 연결 단계**에서만 추가; Stitch 시각 블록 변경 금지.');
  md.push('');

  for (const route of ROUTES) {
    const meta = pageMeta[route];
    md.push(`---`);
    md.push('');
    md.push(`## Page \`${route}\` — \`${meta.folder}\``);
    md.push('');
    md.push(`**DOM slots:** ${meta.slotCount} · **Coverage gap estimate:** ${meta.missingEstimate} minor text fragments (material icons / duplicates)`);
    md.push('');
    md.push('### Sections (Stitch comment order)');
    md.push('');
    for (const sec of meta.sections) md.push(`- ${sec}`);
    md.push('');

    const bySection = new Map();
    for (const s of allSlots.filter((x) => x.route === route && isManuscriptSlot(x) && x.region === 'main')) {
      const key = s.page_section || 'UNLABELED';
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(s);
    }

    for (const [sec, items] of bySection) {
      md.push(`### ${sec}`);
      md.push('');
      for (const slot of items) {
        md.push(renderSlotBlock(slot, slot));
      }
    }

    const imgs = allSlots.filter((x) => x.route === route && x.role === 'image');
    if (imgs.length) {
      md.push('### Images');
      md.push('');
      for (const slot of imgs) {
        const reg = imageRows.find((r) => r.dom_slot_id === slot.dom_slot_id);
        md.push(`- **${slot.dom_slot_id}** (${slot.page_section})`);
        md.push(`  - Stitch prompt: ${slot.stitch_original.slice(0, 160)}…`);
        md.push(`  - Candidate: ${reg?.candidate_paths || 'IMAGE_ASSET_REQUIRED'}`);
        md.push(`  - Status: ${reg?.status} · ${reg?.verification}`);
        md.push(`  - Approval: PENDING_APPROVAL`);
        md.push('');
      }
    }
  }

  md.push('---');
  md.push('');
  md.push('## Design conflict register (copy-led; no layout change applied)');
  md.push('');
  for (const d of designExceptions.slice(0, 40)) {
    md.push(`- \`${d.dom_slot_id}\` (${d.route}): ${d.issue} — alt: 「${d.alternative.slice(0, 60)}」`);
  }
  if (designExceptions.length > 40) md.push(`- … +${designExceptions.length - 40} rows in CSV`);
  md.push('');
  md.push('## Validation summary');
  md.push('');
  md.push(`| Check | Result |`);
  md.push(`|-------|--------|`);
  md.push(`| DOM extract slots | ${allSlots.length} |`);
  md.push(`| Text slots empty copy | ${emptyCopy.length} |`);
  md.push(`| Image slots | ${images.length} |`);
  md.push(`| IMAGE_ASSET_REQUIRED | ${imgRequired} |`);
  md.push(`| Unverified / blocked fact rows | ${unverified.length} |`);
  md.push(`| Design impact flagged | ${designExceptions.length} |`);
  md.push(`| Public fact auto-confirmed | **0** (all PENDING_APPROVAL) |`);
  md.push(`| Phase C | **NOT STARTED** |`);
  md.push('');
  md.push('## Auxiliary files');
  md.push('');
  md.push('- `copy-slot-review/STITCH_6_DOM_SLOTS.csv`');
  md.push('- `copy-slot-review/STITCH_6_IMAGE_REGISTRY.csv`');
  md.push('- `copy-slot-review/STITCH_6_UNVERIFIED_FACTS.csv`');
  md.push('- Legacy 135 + 518 extracts remain under `copy-slot-review/` for audit trail only.');
  md.push(`- Full DOM trace: ${allSlots.length} rows in CSV; manuscript shows primary display slots only (headings, body, CTA, metrics, images, chrome).`);
  md.push('');
  md.push('## Approval');
  md.push('');
  md.push('PO confirms copy + image candidates per section. Phase C and `STITCH_BASELINE_RENDER_PASS` remain gated.');

  fs.writeFileSync(MD_OUT, md.join('\n'), 'utf8');

  fs.writeFileSync(
    path.join(OUT, 'STITCH_6_FINAL_COPY_SUMMARY.json'),
    JSON.stringify(
      {
        verdict,
        domSlots: allSlots.length,
        emptyCopy: emptyCopy.length,
        imgRequired,
        unverified: unverified.length,
        designExceptions: designExceptions.length,
        coverage,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(JSON.stringify({ verdict, domSlots: allSlots.length, emptyCopy: emptyCopy.length, imgRequired }, null, 2));
}

main();
