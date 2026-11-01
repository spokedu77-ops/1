/**
 * COPY SLOT FINALIZATION — review drafts only (does not overwrite STITCH_6_COPY_LEDGER.csv).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normText, STITCH_FOLDER_ROUTE } from './b0-source-ingest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.join(__dirname, '..');
const REVIEW = path.join(CONTRACT, 'copy-slot-review');
const REPO = path.join(__dirname, '../../../../..');
const STITCH_ROOT = path.join(
  CONTRACT,
  'sources/b0-extracted/stitch-unpacked/stitch_editorial_website_redesign',
);
const IMAGES_ROOT = path.join(REPO, 'public/images/spokedu');

const GIT_HEAD = (() => {
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
})();

const STITCH_SIX = ['/', '/education', '/private', '/spomove', '/records', '/about'];

const PLACEHOLDER_PATTERNS = [
  { re: /\d+\s*만\s*건/, fact: 'FACT-STAGE7-G08', label: 'UNVERIFIED_METRIC' },
  { re: /\d+\s*%\s*(향상|증가|신뢰)/, fact: 'FACT-STAGE7-G07', label: 'UNVERIFIED_METRIC' },
  { re: /99\.\d\s*%/, fact: 'FACT-STAGE7-G08', label: 'UNVERIFIED_METRIC' },
  { re: /500\s*\+|2,500\s*\+|2\s*500\s*\+/, fact: 'FACT-STAGE7-G08', label: 'UNVERIFIED_METRIC' },
  { re: /UNIST|서울대\s*체육|CVPR|IEEE|국가대표|강\s*준\s*석|박\s*성\s*훈|최\s*동\s*건/, fact: 'FACT-STAGE7-G09', label: 'FABRICATED_PERSON_OR_AFFILIATION' },
  { re: /SPOMOVE\s*OS|바이오메카닉|120\s*프레임|0\.12°/, fact: 'FACT-STAGE7-G07', label: 'UNVERIFIED_TECH_CLAIM' },
  { re: /contact@spomove|1588-4920|SPOMOVE\s*Inc/, fact: 'FACT-BIZ-001', label: 'STITCH_PLACEHOLDER_BRAND' },
];

const NAV_STITCH_TO_LIVE = [
  { stitch: '홈', draft: 'SPOKEDU', ids: 'FACT-NAV-SSOT-001', basis: 'site.ts — 홈은 브랜드 루트' },
  { stitch: '교육 프로그램', draft: '기관·학교 수업', ids: 'HOME-019', basis: 'siteNav + Stage7 기관 출강' },
  { stitch: '프라이뿗 레슨', draft: '개인·소그룹 수업', ids: 'HOME-013', basis: 'siteNav' },
  { stitch: '프라이빗 레슨', draft: '개인·소그룹 수업', ids: 'HOME-013', basis: 'siteNav' },
  { stitch: '스포무브 시스템', draft: 'SPOMOVE', ids: 'HOME-030', basis: 'siteNav SPOMOVE' },
  { stitch: '현장 스토리/기록', draft: '수업사례', ids: 'RC-I001', basis: 'siteNav records' },
  { stitch: '회사 소개', draft: 'SPOKEDU 소개', ids: 'AB-L001', basis: 'siteNav about' },
  { stitch: '수업 문의하기', draft: '문의하기', ids: 'FACT-NAV-SSOT-001', basis: 'siteHeaderCta' },
];

const FOOTER_LINK_MAP = {
  'AI 기초 신체 밸런스': { draft: 'SPOMOVE', ids: 'HOME-030', section: 'footer/솔루션' },
  '엘리트 전담 맞춤 코칭': { draft: '개인·소그룹', ids: 'HOME-013', section: 'footer/체육수업' },
  '정밀 모션 추적 진단': { draft: 'SPOMOVE', ids: 'HOME-031', section: 'footer/솔루션' },
  '모션 AI 비전 알고리즘': { draft: 'SPOMOVE', ids: 'HOME-031', section: 'footer/솔루션' },
  '현장 분석 데이터 로그': { draft: 'SPOKEDU LAB', ids: 'HOME-024', section: 'footer/솔루션' },
  '연구 협력 기관 (UNIST 등)': { draft: '스포키듀 소개', ids: 'AB-L021', section: 'footer/SPOKEDU', note: 'Stitch 허위 연구기관 → 회사 소개 링크로 치환 검토' },
  '센터 대관 및 레슨 예약': { draft: '문의하기', ids: 'FACT-NAV-SSOT-001', section: 'footer/문의' },
};

const BRAND_FIELD_MAP = {
  'contact@spomove.ai': { draft: 'spokedu77@gmail.com', ids: 'FACT-BIZ-001', fact: 'CODE_SSOT brandProfile.email' },
  '02-1588-4920': { draft: '010-4437-9294', ids: 'FACT-BIZ-001', fact: 'CODE_SSOT brandProfile.phone' },
  '© 2025 SPOMOVE Inc. All rights reserved. Intellectual Sports AI Portal.': {
    draft: '© SPOKEDU. 사업자등록번호 311-63-00356',
    ids: 'FACT-BIZ-001',
    fact: 'brandProfile + footer legal',
  },
  SPOMOVE: { draft: 'SPOKEDU', ids: 'FACT-BRAND-001', fact: 'Stitch wordmark → SPOKEDU company brand' },
};

/** Stitch-only copy → Stage7 baseline (any route on page) */
const STITCH_PHRASE_HINTS = [
  { routes: ['/'], needle: '스포츠 교육의 새로운 기준', id: 'HOME-002' },
  { routes: ['/'], needle: '초등 늘봄 방과후', id: 'HOME-003' },
  { routes: ['/'], needle: '무료 맞춤 상담', id: 'HOME-008' },
  { routes: ['/'], needle: '교육 프로그램 보기', id: 'HOME-008' },
  { routes: ['/'], needle: '데이터 기반의 체계적인', id: 'HOME-029' },
  { routes: ['/'], needle: '현장에서 꽃피는', id: 'RC-I001' },
  { routes: ['/'], needle: '누적 출강 학교', id: 'RC-I004' },
  { routes: ['/'], needle: '누적 운영 클래스', id: 'RC-I005' },
  { routes: ['/'], needle: 'AI 모션 분석', id: 'HOME-001' },
  { routes: ['/education'], needle: '기관·학교', id: 'EDU-001' },
  { routes: ['/education'], needle: '누적 출강', id: 'EDU-010' },
  { routes: ['/private'], needle: '프라이빗', id: 'PRV-001' },
  { routes: ['/spomove'], needle: 'SPOMOVE', id: 'SPM-001' },
  { routes: ['/records'], needle: 'Field', id: 'RC-I001' },
  { routes: ['/records'], needle: '운영 사례', id: 'RC-I001' },
  { routes: ['/about'], needle: '미션', id: 'AB-L001' },
];

const ROUTE_HERO_FALLBACK = {
  '/': {
    section: 'SECTION 1: HERO',
    slots: [
      {
        stitchHint: 'AI 모션 분석',
        draft: 'SPOKEDU · 아동·청소년 맞춤 체육교육',
        ids: 'HOME-001',
        edit: '유지',
      },
      {
        stitchHint: '스포츠 교육의 새로운 기준',
        draft: '아이와 현장의 조건에 맞춰 움직이고 싶게 만드는 체육수업을 설계합니다.',
        ids: 'HOME-002',
        edit: '유지',
        design: 'LINE_WRAP_RISK',
      },
      {
        stitchHint: '초등 늘봄 방과후',
        draft: '학교·키움센터·복지관의 기관 수업부터 1:1·소그룹 수업까지.',
        ids: 'HOME-003',
        edit: '수정 제안',
      },
      {
        stitchHint: '무료 맞춤 상담',
        draft: '맞춤 수업 상담하기',
        ids: 'HOME-008',
        edit: '추출 결합·유지',
      },
      {
        stitchHint: '교육 프로그램 보기',
        draft: '수업 유형 살펴보기',
        ids: 'HOME-008',
        edit: '추출 결합·유지',
      },
    ],
  },
};

const IMAGE_KEYWORDS = [
  { keys: ['hero', 'gymnasium', 'training studio', 'edtech', 'indoor sports gym'], paths: ['home/home-hero-movement.jpg', 'home/field-editorial/home-hero-field.webp'] },
  { keys: ['elementary', 'students', 'basketball', 'agility', 'school indoor'], paths: ['dispatch/dispatch-group-class.jpg', 'home/home-dispatch-scene.jpg'] },
  { keys: ['coach', 'mentorship', 'stretching', 'posture', 'high-five', 'trainer'], paths: ['private/private-coaching.jpg', 'home/field-editorial/home-hero-coaching.jpg'] },
  { keys: ['outdoor', 'school ground', 'cones', 'cheering'], paths: ['home/home-hero-spomove-class.JPG', 'records/dongjak-spomove-field.jpg'] },
  { keys: ['elite', 'track', 'sensor', 'biomechanics', 'laboratory', 'motion capture'], paths: ['private/curriculum-running.jpg', 'home/field-editorial/home-hero-ai-20261018.png'] },
  { keys: ['report', 'dashboard', 'tablet', 'mobile', 'ui'], paths: ['home/field-editorial/home-master-ui.png', 'home/home-cta-ai-v2.png'] },
  { keys: ['welfare', 'community', '복지'], paths: ['복지관_민첩성 놀이체육.jpg', 'home/field-editorial/home-service-institution.jpg'] },
  { keys: ['lab', 'gym', 'sponsorship', '체육관'], paths: ['home/field-editorial/home-hero-lab-gym-sponsorship-14.jpg', '스포키듀 랩 체육관 협찬 14.JPG'] },
  { keys: ['record', 'story', 'field', 'festival', 'highlight'], paths: ['records/dasarang-field.jpg', 'records/gangdong-health-pe.jpg'] },
  { keys: ['spomove', 'program', 'screen', 'obstacle'], paths: ['programs/program-gate-spomove.png', 'home/field-editorial/home-spomove-field.webp'] },
  { keys: ['private', 'small group', '1:1'], paths: ['private/private-small-group.jpg', 'private/class-flow-01.jpg'] },
  { keys: ['about', 'mission', 'professional academic'], paths: ['home/field-editorial/home-why-field.webp', 'DSC06463.jpg'] },
  { keys: ['soccer', 'football', '축구'], paths: ['private/curriculum-soccer.jpg', '협찬수업_축구_볼컨트롤기초_001.jpg'] },
  { keys: ['jump rope', '줄넘기'], paths: ['private/curriculum-jumprope.jpg', '복지관_긴줄넘기.jpg'] },
  { keys: ['integrated', 'special', '특수'], paths: ['records/shinwol-integrated-pe.jpg', 'records/donghaeng-special-pe.jpg'] },
];

function readCsv(name) {
  const p = path.join(CONTRACT, name);
  const lines = fs.readFileSync(p, 'utf8').trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cols = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
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

function writeCsv(rel, headers, rows) {
  const body = [headers.map(csvEscape).join(','), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','))].join('\n');
  fs.mkdirSync(REVIEW, { recursive: true });
  fs.writeFileSync(path.join(REVIEW, rel), `${body}\n`, 'utf8');
}

function listImageFiles(dir, prefix = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...listImageFiles(full, `${prefix}${name}/`));
    else if (/\.(jpg|jpeg|png|webp|svg|gif)$/i.test(name)) out.push(`${prefix}${name}`.replace(/\\/g, '/'));
  }
  return out;
}

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBlockTags(html, tag) {
  const results = [];
  const open = `<${tag}`;
  let i = 0;
  while (i < html.length) {
    const start = html.indexOf(open, i);
    if (start === -1) break;
    if (html[start + open.length] !== ' ' && html[start + open.length] !== '>') {
      i = start + 1;
      continue;
    }
    const gt = html.indexOf('>', start);
    if (gt === -1) break;
    let depth = 1;
    let j = gt + 1;
    while (j < html.length && depth > 0) {
      const nextOpen = html.indexOf(`<${tag}`, j);
      const nextClose = html.indexOf(`</${tag}>`, j);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        j = nextOpen + open.length;
        continue;
      }
      depth--;
      if (depth === 0) {
        const inner = html.slice(gt + 1, nextClose);
        const text = stripTags(inner);
        if (text.length >= 2 && text.length <= 2000) results.push({ text, index: start, tag });
        j = nextClose + `</${tag}>`.length;
        break;
      }
      j = nextClose + 1;
    }
    i = j;
  }
  return results;
}

function extractSupplementalSlots(html, route) {
  const tags = ['h1', 'h2', 'h3', 'h4', 'p', 'button', 'a', 'span'];
  const slots = [];
  let n = 0;
  for (const tag of tags) {
    for (const block of extractBlockTags(html, tag)) {
      if (tag === 'span' && block.text.length > 80) continue;
      if (tag === 'a' && block.text.length > 120) continue;
      n++;
      slots.push({
        slot_id: `SUPP-${route.replace(/\//g, '_') || 'root'}-${tag}-${n}`,
        route,
        page_section: detectSection(html, block.index),
        tag,
        stitch_original: block.text,
      });
    }
  }
  return slots;
}

function detectSection(html, index) {
  const head = html.slice(0, index);
  const sections = [...head.matchAll(/<!--\s*SECTION\s+(\d+):\s*([^-]+?)-->/gi)];
  if (!sections.length) return 'UNLABELED';
  const last = sections[sections.length - 1];
  return `SECTION ${last[1]}: ${last[2].trim()}`;
}

function loadStitchHtmlByRoute() {
  const map = {};
  for (const [folder, route] of Object.entries(STITCH_FOLDER_ROUTE)) {
    const htmlPath = path.join(STITCH_ROOT, folder, 'code.html');
    if (fs.existsSync(htmlPath)) map[route] = fs.readFileSync(htmlPath, 'utf8');
  }
  return map;
}

function findSectionForText(html, text) {
  if (!html || !text) return 'UNLABELED';
  const snippet = text.slice(0, 40).replace(/\s+/g, ' ').trim();
  if (snippet.length < 6) return 'UNLABELED';
  const idx = html.indexOf(snippet.slice(0, 20));
  if (idx === -1) return 'UNLABELED';
  return detectSection(html, idx);
}

function pickDraftFromCrosswalk(row) {
  const edit = row.stage7_edit_decision ?? '';
  const proposed = (row.proposed_copy_draft ?? '').trim();
  const original = (row.original_live_text ?? '').trim();
  if (edit === '수정 제안' && proposed) return { draft: proposed, basis: `Stage7 수정 제안 (${row.baseline_text_id})` };
  if (edit === '유지' && original) return { draft: original.replace(/^#+\s*/, ''), basis: `Stage7 유지 (${row.baseline_text_id})` };
  if (proposed) return { draft: proposed, basis: `Stage7 proposed (${row.baseline_text_id})` };
  if (original) return { draft: original.replace(/^#+\s*/, ''), basis: `LIVE archive (${row.baseline_text_id})` };
  return null;
}

function crosswalkForRoute(crosswalk, route) {
  return crosswalk.filter((r) => {
    const rr = (r.route ?? '').split('?')[0];
    if (route === '/records') return rr === '/records';
    return rr === route;
  });
}

function tokenSet(s) {
  const n = normText(s).replace(/[#*]/g, '');
  const tokens = n.match(/[\uac00-\ud7a3]{2,}|[a-z0-9]{3,}/gi) ?? [];
  return new Set(tokens.map((t) => t.toLowerCase()));
}

function tokenOverlapScore(a, b) {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

function rowById(crosswalk, id) {
  return crosswalk.find((r) => r.baseline_text_id === id);
}

function matchPhraseHints(text, route, crosswalk) {
  for (const hint of STITCH_PHRASE_HINTS) {
    if (!hint.routes.includes(route)) continue;
    if (!text.includes(hint.needle)) continue;
    const row = rowById(crosswalk, hint.id);
    if (row) return { row, method: `phrase_hint_${hint.id}` };
  }
  return null;
}

function matchCrosswalk(stitchText, routeRows, minOverlap = 0.45) {
  const nSt = normText(stitchText);
  if (!nSt) return null;
  let best = null;
  let bestScore = 0;
  for (const row of routeRows) {
    const candidates = [row.original_live_text, row.audit_review_text, row.proposed_copy_draft];
    const nO = normText(row.original_live_text);
    const nA = normText(row.audit_review_text);
    const nP = normText(row.proposed_copy_draft);
    if (nSt === nO || nSt === nA || nSt === nP) return { row, method: 'exact_normalized' };
    if (nO.length >= 10 && (nSt.includes(nO) || nO.includes(nSt))) {
      return { row, method: 'substring_original' };
    }
    for (const c of candidates) {
      const score = tokenOverlapScore(stitchText, c);
      if (score > bestScore && score >= minOverlap) {
        bestScore = score;
        best = { row, method: `token_overlap_${score.toFixed(2)}` };
      }
    }
  }
  return best;
}

function placeholderFlags(text) {
  const flags = [];
  for (const p of PLACEHOLDER_PATTERNS) {
    if (p.re.test(text)) flags.push({ fact: p.fact, label: p.label });
  }
  return flags;
}

function designImpact(stitchText, draft, tag) {
  const parts = ['TEXT_SLOT_LOCKED'];
  if (tag === 'img') parts[0] = 'IMAGE_FRAME_LOCKED';
  const flags = placeholderFlags(stitchText);
  if (flags.some((f) => f.label.includes('METRIC'))) parts.push('METRIC_SLOT_NEUTRALIZE');
  if ((draft?.length ?? 0) > (stitchText?.length ?? 0) * 1.35) parts.push('LINE_WRAP_RISK');
  if ((draft?.length ?? 0) > (stitchText?.length ?? 0) * 1.8) parts.push('HEIGHT_OVERFLOW_RISK');
  return parts.join(';');
}

function factStatus(flags, hasEvidence, isImage) {
  if (isImage) return 'IMAGE_PROVENANCE_REVIEW_REQUIRED';
  if (flags.some((f) => f.label.includes('FABRICATED'))) return 'FABRICATED_CONTENT_REPLACE_REQUIRED';
  if (flags.some((f) => f.label.includes('METRIC') || f.label.includes('TECH'))) return 'METRIC_OR_CLAIM_VERIFICATION_REQUIRED';
  if (flags.some((f) => f.label.includes('PLACEHOLDER'))) return 'CODE_SSOT_VERIFIED';
  if (hasEvidence) return 'STAGE7_OR_CODE_SSOT_REFERENCED';
  return 'PO_SLOT_ASSIGNMENT_REQUIRED';
}

function resolveTextSlot(el, routeRows, htmlByRoute, crosswalkAll, minOverlap = 0.45) {
  const text = (el.text ?? '').trim();
  const tag = el.tag;
  const route = el.route;
  const html = htmlByRoute[route];
  let section = findSectionForText(html, text);
  if (text.length > 400) section = 'PARSER_ARTIFACT_AGGREGATE (see DECOMPOSED)';

  if (tag === 'img') return null;

  for (const [key, meta] of Object.entries(BRAND_FIELD_MAP)) {
    if (text.includes(key) || normText(text) === normText(key)) {
      return {
        section,
        linked_ids: meta.ids,
        source_original: text.slice(0, 500),
        draft: meta.draft,
        rationale: meta.fact,
        fact_status: 'CODE_SSOT_VERIFIED',
        flags: placeholderFlags(text),
      };
    }
  }

  for (const nav of NAV_STITCH_TO_LIVE) {
    if (text === nav.stitch || text.includes(nav.stitch)) {
      return {
        section: section.includes('footer') ? 'global/header-nav' : section,
        linked_ids: nav.ids,
        source_original: text,
        draft: nav.draft,
        rationale: nav.basis,
        fact_status: 'STAGE7_OR_CODE_SSOT_REFERENCED',
        flags: placeholderFlags(text),
      };
    }
  }

  if (FOOTER_LINK_MAP[text]) {
    const m = FOOTER_LINK_MAP[text];
    return {
      section: m.section,
      linked_ids: m.ids,
      source_original: text,
      draft: m.draft,
      rationale: m.note ?? 'footerNavGroups semantic map',
      fact_status: m.note ? 'METRIC_OR_CLAIM_VERIFICATION_REQUIRED' : 'STAGE7_OR_CODE_SSOT_REFERENCED',
      flags: placeholderFlags(text),
    };
  }

  const hint = matchPhraseHints(text, route, crosswalkAll);
  if (hint) {
    const picked = pickDraftFromCrosswalk(hint.row);
    const flags = placeholderFlags(text);
    return {
      section,
      linked_ids: hint.row.baseline_text_id,
      source_original: (hint.row.original_live_text ?? '').slice(0, 500),
      draft: picked?.draft ?? '',
      rationale: hint.method,
      fact_status: factStatus(flags, true, false),
      flags,
    };
  }

  const hit = matchCrosswalk(text, routeRows, minOverlap);
  if (hit) {
    const picked = pickDraftFromCrosswalk(hit.row);
    const flags = placeholderFlags(text);
    return {
      section,
      linked_ids: hit.row.baseline_text_id,
      source_original: (hit.row.original_live_text ?? '').slice(0, 500),
      draft: picked?.draft ?? '',
      rationale: `${hit.method}; ${hit.row.review_reason?.slice(0, 120) ?? ''}`,
      fact_status: factStatus(flags, true, false),
      flags,
    };
  }

  if (text.length > 400) {
    return {
      section,
      linked_ids: 'MULTI;see_DECOMPOSED',
      source_original: text.slice(0, 500),
      draft: '[AGGREGATE] Stitch parser merged page copy — apply DECOMPOSED rows per slot',
      rationale: 'b0 li-1 aggregate; do not paste verbatim',
      fact_status: 'PARSER_ARTIFACT',
      flags: placeholderFlags(text),
    };
  }

  const flags = placeholderFlags(text);
  if (flags.length) {
    return {
      section,
      linked_ids: flags.map((f) => f.fact).join('|'),
      source_original: text,
      draft: '[REPLACE] Stitch placeholder — PO must assign verified copy; do not publish as-is',
      rationale: 'Stitch fictional metric/claim detected',
      fact_status: flags[0].label,
      flags,
    };
  }

  return {
    section,
    linked_ids: '',
    source_original: text,
    draft: '',
    rationale: 'No semantic Stage7 match — PO assignment',
    fact_status: 'PO_SLOT_ASSIGNMENT_REQUIRED',
    flags: [],
  };
}

function decomposeAggregate(el, routeRows, htmlByRoute) {
  const mega = normText(el.text);
  const out = [];
  const html = htmlByRoute[el.route] ?? '';
  for (const row of routeRows) {
    const nO = normText(row.original_live_text);
    if (nO.length < 8) continue;
    const inMega = mega.includes(nO) || tokenOverlapScore(el.text, row.original_live_text) >= 0.5;
    if (!inMega) continue;
    const picked = pickDraftFromCrosswalk(row);
    out.push({
      parent_stitch_element_id: el.stitch_element_id,
      route: el.route,
      section: findSectionForText(html, row.original_live_text),
      stage7_id: row.baseline_text_id,
      stitch_fragment: row.original_live_text.slice(0, 200),
      draft_spokedu_copy: picked?.draft ?? '',
      match_method: 'aggregate_substring',
      fact_verification_status: factStatus(placeholderFlags(row.original_live_text), true, false),
      approval_status: 'PENDING_APPROVAL',
    });
  }
  const fallbacks = ROUTE_HERO_FALLBACK[el.route]?.slots ?? [];
  for (const fb of fallbacks) {
    if (!mega.includes(normText(fb.stitchHint))) continue;
    out.push({
      parent_stitch_element_id: el.stitch_element_id,
      route: el.route,
      section: ROUTE_HERO_FALLBACK[el.route].section,
      stage7_id: fb.ids,
      stitch_fragment: fb.stitchHint,
      draft_spokedu_copy: fb.draft,
      match_method: 'hero_fallback_map',
      fact_verification_status: fb.design ? 'STAGE7_OR_CODE_SSOT_REFERENCED' : 'STAGE7_OR_CODE_SSOT_REFERENCED',
      approval_status: 'PENDING_APPROVAL',
    });
  }
  return out;
}

function scoreImage(alt, paths) {
  const lower = (alt ?? '').toLowerCase();
  let best = [];
  let bestScore = 0;
  for (const entry of IMAGE_KEYWORDS) {
    let score = 0;
    for (const k of entry.keys) if (lower.includes(k)) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = entry.paths;
    }
  }
  if (bestScore === 0) {
    for (const p of paths) {
      const pl = p.toLowerCase();
      if (elRouteHint(lower, pl)) {
        best = [p];
        bestScore = 1;
        break;
      }
    }
  }
  return { candidates: best, score: bestScore };
}

function elRouteHint(alt, pathLower) {
  if (alt.includes('record') && pathLower.includes('records/')) return true;
  if (alt.includes('private') && pathLower.includes('private/')) return true;
  if (alt.includes('education') && pathLower.includes('dispatch/')) return true;
  return false;
}

function resolveImageSlot(el, imagePaths) {
  const alt = el.text ?? '';
  const { candidates, score } = scoreImage(alt, imagePaths);
  const existing = candidates.filter((p) => fs.existsSync(path.join(IMAGES_ROOT, p)));
  if (score === 0 || existing.length === 0) {
    return {
      candidate_paths: '',
      fit_notes: 'No confident keyword match in /public/images/spokedu',
      status: 'IMAGE_ASSET_REQUIRED',
    };
  }
  return {
    candidate_paths: existing.slice(0, 3).map((p) => `/images/spokedu/${p}`).join(' | '),
    fit_notes: `Keyword score ${score}; verify minor consent & publication rights (FACT-STAGE7-G20)`,
    status: 'CANDIDATE_MATCH_REVIEW_REQUIRED',
  };
}

function main() {
  fs.mkdirSync(REVIEW, { recursive: true });
  const elements = JSON.parse(fs.readFileSync(path.join(CONTRACT, 'STITCH_ELEMENTS.json'), 'utf8')).elements;
  const crosswalk = readCsv('CONTENT_CROSSWALK.csv');
  const htmlByRoute = loadStitchHtmlByRoute();
  const imagePaths = listImageFiles(IMAGES_ROOT);

  const ledger = [];
  const decomposed = [];
  const factRequired = [];
  const designConflicts = [];
  const pending = new Set();

  for (const el of elements.filter((e) => STITCH_SIX.includes(e.route))) {
    const routeRows = crosswalkForRoute(crosswalk, el.route);
    if (el.tag === 'img') {
      const img = resolveImageSlot(el, imagePaths);
      ledger.push({
        slot_id: el.stitch_element_id,
        route: el.route,
        page_section: findSectionForText(htmlByRoute[el.route], el.text),
        stitch_source_file: el.source_file,
        tag: el.tag,
        stitch_original: (el.text ?? '').slice(0, 500),
        draft_spokedu_copy: '',
        stage7_ids: '',
        change_rationale: img.fit_notes,
        fact_verification_status: img.status === 'IMAGE_ASSET_REQUIRED' ? 'IMAGE_ASSET_REQUIRED' : 'IMAGE_PROVENANCE_REVIEW_REQUIRED',
        user_approval_status: 'PENDING_APPROVAL',
        design_impact: 'IMAGE_FRAME_LOCKED',
        image_candidate_paths: img.candidate_paths,
      });
      if (img.status === 'IMAGE_ASSET_REQUIRED') factRequired.push({ slot_id: el.stitch_element_id, route: el.route, issue: 'IMAGE_ASSET_REQUIRED' });
      pending.add(`IMG ${el.stitch_element_id}`);
      continue;
    }

    const resolved = resolveTextSlot(el, routeRows, htmlByRoute, crosswalk);
    if (el.text.length > 400) decomposed.push(...decomposeAggregate(el, routeRows, htmlByRoute));

    const draft = resolved.draft;
    const emptyDraft = !draft || draft.startsWith('[REPLACE]') || draft.startsWith('[AGGREGATE]');
    if (emptyDraft && el.text.length <= 400) pending.add(`${el.stitch_element_id}: ${el.text.slice(0, 40)}`);

    const dImpact = designImpact(el.text, draft.replace(/^\[.*?\]\s*/, ''), el.tag);
    if (dImpact.includes('LINE_WRAP') || dImpact.includes('METRIC')) {
      designConflicts.push({
        slot_id: el.stitch_element_id,
        route: el.route,
        stitch_excerpt: el.text.slice(0, 80),
        design_impact: dImpact,
        linked_dc: dImpact.includes('METRIC') ? 'DC-002' : 'DC-001',
      });
    }
    if (resolved.fact_status.includes('VERIFICATION') || resolved.fact_status.includes('FABRICATED') || resolved.fact_status.includes('PO_')) {
      factRequired.push({
        slot_id: el.stitch_element_id,
        route: el.route,
        fact_verification_status: resolved.fact_status,
        stage7_ids: resolved.linked_ids,
      });
    }

    ledger.push({
      slot_id: el.stitch_element_id,
      route: el.route,
      page_section: resolved.section,
      stitch_source_file: el.source_file,
      tag: el.tag,
      stitch_original: (el.text ?? '').slice(0, 500),
      draft_spokedu_copy: draft,
      stage7_ids: resolved.linked_ids,
      change_rationale: resolved.rationale,
      fact_verification_status: resolved.fact_status,
      user_approval_status: 'PENDING_APPROVAL',
      design_impact: dImpact,
      image_candidate_paths: '',
    });
  }

  const supplemental = [];
  for (const route of STITCH_SIX) {
    const html = htmlByRoute[route];
    if (!html) continue;
    const existingNorm = new Set(
      ledger.filter((r) => r.route === route).map((r) => normText(r.stitch_original)),
    );
    for (const slot of extractSupplementalSlots(html, route)) {
      const n = normText(slot.stitch_original);
      if (existingNorm.has(n)) continue;
      const routeRows = crosswalkForRoute(crosswalk, route);
      const resolved = resolveTextSlot(
        { ...slot, text: slot.stitch_original, tag: slot.tag },
        routeRows,
        htmlByRoute,
        crosswalk,
        0.32,
      );
      supplemental.push({
        slot_id: slot.slot_id,
        route: slot.route,
        page_section: slot.page_section,
        tag: slot.tag,
        stitch_original: slot.stitch_original.slice(0, 500),
        draft_spokedu_copy: resolved.draft,
        stage7_ids: resolved.linked_ids,
        change_rationale: `HTML supplement (missing from STITCH_ELEMENTS li aggregate); ${resolved.rationale}`,
        fact_verification_status: resolved.fact_status,
        user_approval_status: 'PENDING_APPROVAL',
        design_impact: designImpact(slot.stitch_original, resolved.draft, slot.tag),
      });
      existingNorm.add(n);
    }
  }

  const filled = ledger.filter(
    (r) =>
      r.tag !== 'img' &&
      r.draft_spokedu_copy &&
      !r.draft_spokedu_copy.startsWith('[REPLACE]') &&
      !r.draft_spokedu_copy.startsWith('[AGGREGATE]'),
  ).length;
  const textSlots = ledger.filter((r) => r.tag !== 'img').length;
  const imgCandidates = ledger.filter((r) => r.tag === 'img' && r.image_candidate_paths).length;
  const imgRequired = ledger.filter((r) => r.tag === 'img' && r.fact_verification_status === 'IMAGE_ASSET_REQUIRED').length;

  const suppFilled = supplemental.filter((s) => s.draft_spokedu_copy && !s.draft_spokedu_copy.startsWith('[REPLACE]')).length;
  const verdict =
    filled >= 60 &&
    suppFilled >= supplemental.length * 0.35 &&
    imgCandidates >= 25 &&
    imgRequired <= 5
      ? 'COPY_SLOT_DRAFT_READY_FOR_REVIEW'
      : 'COPY_SLOT_DRAFT_PARTIAL';

  writeCsv(
    'COPY_SLOT_LEDGER_DRAFT.csv',
    [
      'slot_id',
      'route',
      'page_section',
      'stitch_source_file',
      'tag',
      'stitch_original',
      'draft_spokedu_copy',
      'stage7_ids',
      'change_rationale',
      'fact_verification_status',
      'user_approval_status',
      'design_impact',
      'image_candidate_paths',
    ],
    ledger,
  );
  writeCsv(
    'COPY_SLOT_DECOMPOSED_DRAFT.csv',
    [
      'parent_stitch_element_id',
      'route',
      'section',
      'stage7_id',
      'stitch_fragment',
      'draft_spokedu_copy',
      'match_method',
      'fact_verification_status',
      'approval_status',
    ],
    decomposed,
  );
  writeCsv(
    'COPY_SLOT_IMAGE_MAPPING_DRAFT.csv',
    ['slot_id', 'route', 'page_section', 'stitch_alt_prompt', 'candidate_public_paths', 'fit_status', 'verification_ref'],
    ledger
      .filter((r) => r.tag === 'img')
      .map((r) => ({
        slot_id: r.slot_id,
        route: r.route,
        page_section: r.page_section,
        stitch_alt_prompt: r.stitch_original,
        candidate_public_paths: r.image_candidate_paths,
        fit_status: r.fact_verification_status,
        verification_ref: 'FACT-STAGE7-G20;DEC-PACK-05',
      })),
  );
  writeCsv('COPY_SLOT_FACT_VERIFICATION_REQUIRED.csv', ['slot_id', 'route', 'fact_verification_status', 'stage7_ids'], factRequired);
  writeCsv(
    'COPY_SLOT_DESIGN_CONFLICTS.csv',
    ['slot_id', 'route', 'stitch_excerpt', 'design_impact', 'linked_dc'],
    designConflicts,
  );

  writeCsv(
    'COPY_SLOT_HTML_SUPPLEMENT_DRAFT.csv',
    [
      'slot_id',
      'route',
      'page_section',
      'tag',
      'stitch_original',
      'draft_spokedu_copy',
      'stage7_ids',
      'change_rationale',
      'fact_verification_status',
      'user_approval_status',
      'design_impact',
    ],
    supplemental,
  );

  for (const route of STITCH_SIX) {
    const rows = ledger.filter((r) => r.route === route && r.tag !== 'img');
    const md = [
      `# Copy draft — \`${route}\``,
      '',
      `Text slots: ${rows.length}`,
      '',
      ...rows.map(
        (r) =>
          `## ${r.slot_id}\n- **Section:** ${r.page_section}\n- **Stitch:** ${r.stitch_original.replace(/\n/g, ' ').slice(0, 200)}\n- **Draft:** ${r.draft_spokedu_copy || '_(empty)_'}\n- **Stage7:** ${r.stage7_ids || '—'}\n- **Fact:** ${r.fact_verification_status}\n- **Design:** ${r.design_impact}\n`,
      ),
    ].join('\n');
    fs.writeFileSync(path.join(REVIEW, `COPY_DRAFT_PAGE${route.replace(/\//g, '_') || '_root'}.md`), md, 'utf8');
  }

  const report = `# COPY SLOT DRAFT REPORT

**Git HEAD ref:** \`${GIT_HEAD}\`  
**Verdict:** \`${verdict}\`  
**Phase C:** NOT AUTHORIZED

## Summary

| Metric | Value |
|--------|------:|
| Stitch elements tracked | ${ledger.length} |
| Text slots | ${textSlots} |
| Text slots with assignable draft (excl. aggregate/replace placeholders) | ${filled} |
| Decomposed sub-slots (mega \`li-1\` aggregates) | ${decomposed.length} |
| HTML supplement slots (not in 135 extract) | ${supplemental.length} |
| Supplement with draft | ${suppFilled} |
| Image slots | ${ledger.filter((r) => r.tag === 'img').length} |
| Image candidate matches | ${imgCandidates} |
| IMAGE_ASSET_REQUIRED | ${imgRequired} |
| Fact verification queue | ${factRequired.length} |
| Design conflict rows | ${designConflicts.length} |

## Outputs (review only — canonical \`STITCH_6_COPY_LEDGER.csv\` unchanged)

- \`COPY_SLOT_LEDGER_DRAFT.csv\`
- \`COPY_SLOT_DECOMPOSED_DRAFT.csv\`
- \`COPY_SLOT_HTML_SUPPLEMENT_DRAFT.csv\`
- \`COPY_SLOT_FACT_VERIFICATION_REQUIRED.csv\`
- \`COPY_SLOT_DESIGN_CONFLICTS.csv\`
- \`COPY_DRAFT_PAGE_*.md\` (6 routes)
- \`COPY_SLOT_PENDING_APPROVAL.md\`

## Rules applied

- SPOKEDU = company brand; SPOMOVE = in-house program; SPOMAT separate; LAB within entitled features
- No unverified metrics or fabricated affiliations published verbatim
- Stage7 \`수정 제안\` → proposed draft; \`유지\` → LIVE text; all \`PENDING_APPROVAL\`

## Pending approval

All drafts remain **PENDING_APPROVAL**. PO sign-off required before Phase C.
`;
  fs.writeFileSync(path.join(REVIEW, 'COPY_SLOT_DRAFT_REPORT.md'), report, 'utf8');
  fs.writeFileSync(
    path.join(REVIEW, 'COPY_SLOT_PENDING_APPROVAL.md'),
    `# Pending approval (${pending.size} tracked items)\n\n${[...pending].slice(0, 80).map((p) => `- ${p}`).join('\n')}\n${pending.size > 80 ? `\n… and ${pending.size - 80} more (see ledger).\n` : ''}`,
    'utf8',
  );

  fs.writeFileSync(
    path.join(REVIEW, 'COPY_SLOT_DRAFT_SUMMARY.json'),
    JSON.stringify(
      {
        verdict,
        ledgerRows: ledger.length,
        textFilled: filled,
        textSlots,
        decomposed: decomposed.length,
        imgCandidates,
        imgRequired,
        factQueue: factRequired.length,
        designConflicts: designConflicts.length,
        supplementalSlots: supplemental.length,
        supplementalWithDraft: suppFilled,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(JSON.stringify({ verdict, filled, textSlots, decomposed: decomposed.length, imgCandidates, imgRequired }, null, 2));
}

main();
