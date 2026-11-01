/**
 * Phase B1 — SPOKEDU_PHASE_B0_SOURCE_INPUTS.zip ingest + Stitch parse (read-only).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { extractDomSlotsFromHtml } from './lib/stitch-dom-parse.mjs';

export const B0_INPUT_ZIP = 'SPOKEDU_PHASE_B0_SOURCE_INPUTS.zip';
export const STITCH_INNER_ZIP = 'stitch_editorial_website_redesign.zip';
export const SOURCE_MANIFEST_NAME = 'SOURCE_INPUT_MANIFEST.json';

export const ROUTE_BY_STITCH_BASENAME = {
  index: '/',
  home: '/',
  education: '/education',
  private: '/private',
  spomove: '/spomove',
  catalog: '/spomove/catalog',
  records: '/records',
  about: '/about',
  contact: '/contact',
  lab: '/spokedu-lab',
  'spokedu-lab': '/spokedu-lab',
  spomat: '/spomat',
};

export const STITCH_FOLDER_ROUTE = {
  home_spomove: '/',
  education_programs_spomove: '/education',
  private_lesson_spomove: '/private',
  about_spomove: '/about',
  field_records_spomove: '/records',
  spomove_system_spomove: '/spomove',
};

export const ROUTE_IMPL_HINT = {
  '/': 'app/spokedu/components/home-web/home-web-landing.tsx',
  '/education': 'app/spokedu/components/education-hub-landing.tsx',
  '/private': 'app/spokedu/components/private-landing.tsx',
  '/spomove': 'app/spokedu/components/spomove-program-landing.tsx',
  '/spomove/catalog': 'app/spokedu/components/spomove-public-catalog.tsx',
  '/records': 'app/spokedu/components/records-v0-landing.tsx',
  '/about': 'app/spokedu/components/about-landing.tsx',
  '/contact': 'app/spokedu/components/contact-form-shell.tsx',
  '/spokedu-lab': 'app/spokedu-master/landing (CommercialLanding)',
  '/spomat': 'app/spokedu/components/spomat-landing.tsx',
};

export function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const esc = (p) => p.replace(/'/g, "''");
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${esc(zipPath)}' -DestinationPath '${esc(destDir)}' -Force"`,
    { stdio: 'pipe' },
  );
}

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function findFirstFile(root, basename) {
  return walkFiles(root).find((f) => path.basename(f).toLowerCase() === basename.toLowerCase()) ?? null;
}

function findAllByExt(root, ext) {
  const e = ext.toLowerCase();
  return walkFiles(root).filter((f) => f.toLowerCase().endsWith(e));
}

export function normText(s) {
  return (s ?? '')
    .replace(/\s+/g, '')
    .replace(/[#>*]/g, '')
    .replace(/[「」"'“”]/g, '')
    .trim();
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHtmlElements(htmlPath, stitchRoot) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const relFromRoot = stitchRoot
    ? path.relative(stitchRoot, htmlPath).replace(/\\/g, '/')
    : path.basename(htmlPath);
  const pageSlug = relFromRoot
    .replace(/\.html$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const route = inferRouteFromPath(htmlPath);

  const { slots } = extractDomSlotsFromHtml(html, { route, pageSlug, relFromRoot });
  const elements = slots.map((s, i) => ({
    stitch_element_id: s.dom_slot_id.replace(/^DOM-/, 'STITCH-'),
    source_page: pageSlug,
    route,
    tag: s.tag,
    text: s.stitch_original,
    href: s.href ?? '',
    source_file: relFromRoot,
    dom_path: s.dom_path,
    page_section: s.page_section,
    role: s.role,
  }));

  return { pageSlug, route, relFromRoot, elements, raw_length: html.length };
}

function inferRouteFromPath(htmlPath) {
  const lowerPath = htmlPath.replace(/\\/g, '/').toLowerCase();
  for (const [folder, route] of Object.entries(STITCH_FOLDER_ROUTE)) {
    if (lowerPath.includes(`/${folder}/`) || lowerPath.includes(`${folder}/`)) return route;
  }
  const pageSlug = path.basename(htmlPath, path.extname(htmlPath)).toLowerCase();
  return inferRoute(pageSlug, htmlPath);
}

function inferRoute(pageSlug, htmlPath) {
  const base = pageSlug.replace(/^\d+[_-]?/, '');
  if (ROUTE_BY_STITCH_BASENAME[base]) return ROUTE_BY_STITCH_BASENAME[base];
  for (const [key, route] of Object.entries(ROUTE_BY_STITCH_BASENAME)) {
    if (base.includes(key)) return route;
  }
  const lowerPath = htmlPath.toLowerCase();
  for (const [key, route] of Object.entries(ROUTE_BY_STITCH_BASENAME)) {
    if (lowerPath.includes(key)) return route;
  }
  return 'UNRESOLVED_ROUTE';
}

function extractTailwindConfig(html) {
  const m = html.match(/<script id="tailwind-config">([\s\S]*?)<\/script>/i);
  return m ? m[1].trim() : '';
}

function extractSectionComments(html) {
  const sections = [];
  const re = /<!--\s*SECTION\s+(\d+):\s*([^-]+?)-->/gi;
  let m;
  while ((m = re.exec(html))) {
    sections.push({ index: Number(m[1]), label: m[2].trim() });
  }
  return sections;
}

function extractDomSections(html) {
  const out = [];
  const re = /<section([^>]*)>/gi;
  let m;
  let i = 0;
  while ((m = re.exec(html))) {
    i++;
    const attrs = m[1] ?? '';
    const cls = attrs.match(/class=["']([^"']+)["']/i)?.[1] ?? '';
    out.push({ dom_index: i, class_attr: cls.slice(0, 800) });
  }
  return out;
}

function detectChartLike(html) {
  const hits = [];
  const patterns = [
    { id: 'canvas', re: /<canvas[^>]*>/gi },
    { id: 'svg-block', re: /<svg[\s\S]*?<\/svg>/gi },
    { id: 'chart-keyword', re: /chart|gauge|dashboard|metric|watermark-number/gi },
  ];
  for (const p of patterns) {
    const matches = html.match(p.re);
    if (matches?.length) hits.push({ kind: p.id, count: matches.length });
  }
  return hits;
}

export function buildStitchDesignFidelity(stitchRoot, extractRoot) {
  const assetPaths = [];
  for (const htmlAbs of findAllByExt(stitchRoot, '.html')) {
    assetPaths.push(htmlAbs);
  }
  for (const img of walkFiles(stitchRoot).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
    assetPaths.push(img);
  }
  const designMd = findFirstFile(stitchRoot, 'DESIGN.md');
  if (designMd) assetPaths.push(designMd);

  const assets = assetPaths.map((abs) => ({
    path: path.relative(extractRoot, abs).replace(/\\/g, '/'),
    sha256: sha256File(abs),
    size_bytes: fs.statSync(abs).size,
  }));

  const pages = [];
  const designElements = [];
  let elementSeq = 0;

  for (const htmlAbs of findAllByExt(stitchRoot, '.html')) {
    const html = fs.readFileSync(htmlAbs, 'utf8');
    const relFromRoot = path.relative(stitchRoot, htmlAbs).replace(/\\/g, '/');
    const route = inferRouteFromPath(htmlAbs);
    const pageSlug = relFromRoot
      .replace(/\.html$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    const sectionComments = extractSectionComments(html);
    const domSections = extractDomSections(html);
    const charts = detectChartLike(html);
    const tailwindConfig = extractTailwindConfig(html);

    pages.push({
      source_html: path.relative(extractRoot, htmlAbs).replace(/\\/g, '/'),
      stitch_folder: relFromRoot.split('/')[0] ?? pageSlug,
      target_route: route,
      implementation_hint: ROUTE_IMPL_HINT[route] ?? 'UNRESOLVED',
      section_comment_count: sectionComments.length,
      dom_section_count: domSections.length,
      chart_like: charts,
      tailwind_config_present: tailwindConfig.length > 0,
      screen_png: assets.find((a) => a.path.includes(pageSlug.split('_')[0]) && a.path.endsWith('.png'))
        ?.path,
    });

    const headerMatch = html.match(/<header([^>]*)>/i);
    if (headerMatch) {
      elementSeq++;
      designElements.push(makeDesignElement(elementSeq, pageSlug, route, relFromRoot, {
        kind: 'header',
        label: 'global header',
        class_attr: (headerMatch[1].match(/class=["']([^"']+)["']/i)?.[1] ?? '').slice(0, 800),
      }));
    }

    sectionComments.forEach((sec, idx) => {
      elementSeq++;
      const dom = domSections[idx] ?? domSections[domSections.length - 1];
      designElements.push(
        makeDesignElement(elementSeq, pageSlug, route, relFromRoot, {
          kind: 'section',
          label: sec.label,
          section_index: sec.index,
          class_attr: dom?.class_attr ?? '',
        }),
      );
    });

    domSections.forEach((dom, idx) => {
      if (sectionComments[idx]) return;
      elementSeq++;
      designElements.push(
        makeDesignElement(elementSeq, pageSlug, route, relFromRoot, {
          kind: 'section',
          label: `dom-section-${dom.dom_index}`,
          section_index: dom.dom_index,
          class_attr: dom.class_attr,
        }),
      );
    });

    if (charts.length) {
      elementSeq++;
      designElements.push(
        makeDesignElement(elementSeq, pageSlug, route, relFromRoot, {
          kind: 'chart_or_metric_ui',
          label: JSON.stringify(charts),
          class_attr: '',
        }),
      );
    }

    elementSeq++;
    designElements.push(
      makeDesignElement(elementSeq, pageSlug, route, relFromRoot, {
        kind: 'tailwind_config',
        label: 'tailwind-config script',
        class_attr: tailwindConfig.slice(0, 400),
      }),
    );
  }

  const designMdText = designMd ? fs.readFileSync(designMd, 'utf8') : '';

  return {
    phase: 'B1_CONTRACT_ONLY',
    design_source_of_truth: 'Google Stitch stitch_editorial_website_redesign.zip',
    design_fidelity_pass: false,
    design_fidelity_pass_reason:
      'Phase B1: inventory and lock contract only — no Phase C render QA, content substitution, or visual diff',
    assets,
    design_md: designMd
      ? { path: path.relative(extractRoot, designMd).replace(/\\/g, '/'), sha256: sha256File(designMd) }
      : null,
    pages,
    design_elements: designElements,
    visual_qa_plan: {
      viewports: [390, 768, 1024, 1440],
      compare: 'stitch screen.png vs implementation screenshot',
      dimensions: [
        'section order',
        'element position',
        'grid alignment',
        'spacing',
        'typography hierarchy',
        'color background',
        'image frames',
        'charts dashboards',
        'CTA regions',
        'responsive layout',
      ],
      mobile_note: 'No separate mobile stitch screens — validate via tokens/structure/responsive rules in DESIGN.md',
    },
    design_md_excerpt_chars: designMdText.length,
  };
}

function makeDesignElement(seq, pageSlug, route, relHtml, meta) {
  return {
    design_element_id: `STITCH-DES-${pageSlug}-${String(seq).padStart(4, '0')}`,
    source_page: relHtml,
    source_element_location: meta.label,
    element_kind: meta.kind,
    section_index: meta.section_index ?? '',
    original_styles: meta.class_attr,
    protected_visual_attributes: 'layout,spacing,typography tokens,rounded frames,watermark numbers,gradients per Stitch',
    implementation_target_component: ROUTE_IMPL_HINT[route] ?? 'TBD_PHASE_C',
    content_substitution: 'REQUIRED_SPOKEDU_FACTS_UNAPPROVED',
    structure_change_required: 'UNKNOWN_PENDING_CONTENT_FIT',
    design_lock_status: 'DESIGN_LOCKED',
    exception_status: 'DESIGN_EXCEPTION_PENDING_APPROVAL',
    user_approval_status: 'PENDING_APPROVAL',
  };
}

export function validateSourceManifest(manifest, extractRoot) {
  const entries = manifest.files ?? manifest.entries ?? manifest.assets ?? [];
  const mismatches = [];
  let checked = 0;
  for (const entry of entries) {
    const rel = (entry.path ?? entry.relative_path ?? entry.name ?? '').replace(/\\/g, '/');
    const expected = (entry.sha256 ?? entry.sha256_hex ?? '').toLowerCase();
    if (!rel) continue;
    const abs = path.join(extractRoot, rel);
    if (!fs.existsSync(abs)) {
      mismatches.push({ path: rel, reason: 'missing' });
      continue;
    }
    checked++;
    if (expected) {
      const actual = sha256File(abs);
      if (actual !== expected) mismatches.push({ path: rel, reason: 'hash_mismatch', expected, actual });
    }
  }
  return { checked, mismatches, entry_count: entries.length };
}

export function resolveB0Zip(outDir, repoRoot) {
  const candidates = [
    path.join(outDir, 'sources', B0_INPUT_ZIP),
    path.join(outDir, 'sources', 'b0-inputs', B0_INPUT_ZIP),
  ];
  const extra = [];
  const cursorProjects = path.join(process.env.USERPROFILE || '', '.cursor', 'projects');
  if (fs.existsSync(cursorProjects)) {
    for (const proj of fs.readdirSync(cursorProjects)) {
      extra.push(...walkFiles(path.join(cursorProjects, proj, 'attachments')).filter((f) => f.endsWith(B0_INPUT_ZIP)));
    }
  }
  if (fs.existsSync(path.join(repoRoot, '.cursor'))) {
    extra.push(...walkFiles(path.join(repoRoot, '.cursor')).filter((f) => f.endsWith(B0_INPUT_ZIP)));
  }
  for (const p of [...candidates, ...extra]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function loadB0SourceInputs(outDir, repoRoot) {
  const extractRoot = path.join(outDir, 'sources', 'b0-extracted');
  const zipPath = resolveB0Zip(outDir, repoRoot);
  const result = {
    zip_path: zipPath,
    zip_present: Boolean(zipPath),
    extract_root: extractRoot,
    manifest_path: null,
    manifest_valid: false,
    manifest_validation: null,
    stitch: {
      html_files: [],
      html_parsed: 0,
      html_expected: 6,
      screen_images: [],
      screen_images_count: 0,
      screen_images_expected: 6,
      design_md_path: null,
      design_md_present: false,
      elements: [],
      element_id_duplicates: [],
    },
    stage7_from_bundle: false,
  };

  if (!zipPath) return result;

  extractZip(zipPath, extractRoot);

  const manifestPath =
    findFirstFile(extractRoot, SOURCE_MANIFEST_NAME) ??
    path.join(extractRoot, SOURCE_MANIFEST_NAME);
  if (fs.existsSync(manifestPath)) {
    result.manifest_path = manifestPath;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    result.manifest_validation = validateSourceManifest(manifest, path.dirname(manifestPath));
    result.manifest_valid = result.manifest_validation.mismatches.length === 0;
  }

  let stitchRoot = extractRoot;
  const innerZip = findFirstFile(extractRoot, STITCH_INNER_ZIP);
  if (innerZip) {
    const stitchExtract = path.join(extractRoot, 'stitch-unpacked');
    extractZip(innerZip, stitchExtract);
    stitchRoot = stitchExtract;
  } else {
    const alt = path.join(extractRoot, 'stitch');
    if (fs.existsSync(alt)) stitchRoot = alt;
  }

  result.stitch.design_md_path = findFirstFile(stitchRoot, 'DESIGN.md');
  result.stitch.design_md_present = Boolean(result.stitch.design_md_path);

  result.stitch.html_files = findAllByExt(stitchRoot, '.html').map((f) =>
    path.relative(extractRoot, f).replace(/\\/g, '/'),
  );
  const imageExts = ['.png', '.jpg', '.jpeg', '.webp'];
  result.stitch.screen_images = walkFiles(stitchRoot)
    .filter((f) => imageExts.some((e) => f.toLowerCase().endsWith(e)))
    .map((f) => path.relative(extractRoot, f).replace(/\\/g, '/'));
  result.stitch.screen_images_count = result.stitch.screen_images.length;

  const allElements = [];
  const idSeen = new Map();
  for (const htmlAbs of findAllByExt(stitchRoot, '.html')) {
    const parsed = extractHtmlElements(htmlAbs, stitchRoot);
    result.stitch.html_parsed++;
    for (const el of parsed.elements) {
      allElements.push(el);
      idSeen.set(el.stitch_element_id, (idSeen.get(el.stitch_element_id) ?? 0) + 1);
    }
  }
  result.stitch.elements = allElements;
  result.stitch.element_id_duplicates = [...idSeen.entries()]
    .filter(([, n]) => n > 1)
    .map(([id, n]) => ({ id, count: n }));

  result.stitch.stitch_root = stitchRoot;
  result.stitch.fidelity = buildStitchDesignFidelity(stitchRoot, extractRoot);

  const stage7InBundle = findFirstFile(extractRoot, 'SPOKEDU_COPY_AUDIT_STAGE7_BASELINE_914_CROSSWALK_20261031.csv');
  result.stage7_from_bundle = Boolean(stage7InBundle);

  return result;
}

export function matchBaselineToStitch(crosswalkRow, stitchElements) {
  const route = crosswalkRow['경로'] ?? crosswalkRow.route ?? '';
  const routeNorm = route.split('?')[0].split('#')[0] || '/';
  const recordRoute = routeNorm.startsWith('/records/') ? '/records' : routeNorm;

  const onRoute = stitchElements.filter(
    (e) => e.route === recordRoute || e.route === routeNorm || (recordRoute === '/records' && e.route === '/records'),
  );

  const sources = [
    crosswalkRow['원문 대장 문자 그대로'],
    crosswalkRow['검수 원문'],
    crosswalkRow.original_live_text,
    crosswalkRow.audit_review_text,
  ].filter(Boolean);

  for (const src of sources) {
    const n = normText(src);
    if (!n) continue;
    for (const el of onRoute) {
      if (normText(el.text) === n) {
        return {
          stitch_element_id: el.stitch_element_id,
          mapping_status: 'EXACT_MATCH',
          confidence: '1.0',
          review_reason: 'Normalized string equality on same route (no semantic inference)',
          stitch_source_file: el.source_file,
        };
      }
    }
  }

  if (onRoute.length === 0) {
    return {
      stitch_element_id: '',
      mapping_status: 'NO_MAPPING',
      confidence: '0',
      review_reason: 'No Stitch HTML mapped to this route',
      stitch_source_file: '',
    };
  }

  return {
    stitch_element_id: '',
    mapping_status: 'UNRESOLVED',
    confidence: '0',
    review_reason: 'Stitch page present but no exact normalized text match — not auto-linked',
    stitch_source_file: onRoute[0]?.source_file ?? '',
  };
}

export function buildStitchDesignComponents(stitchBundle, designMdText) {
  const fidelity = stitchBundle.stitch.fidelity;
  if (fidelity?.design_elements?.length) {
    return fidelity.design_elements.map((el) => ({
      component_id: el.design_element_id,
      source_page: el.source_page,
      source_element: el.source_element_location,
      original_structure: `${el.element_kind} section_index=${el.section_index}`,
      original_styles: el.original_styles,
      protected_attributes: el.protected_visual_attributes,
      proposed_exceptions: '',
      exception_reason: el.structure_change_required,
      content_substitution: el.content_substitution,
      design_lock_status: el.design_lock_status,
      exception_status: el.exception_status,
      implementation_target: el.implementation_target_component,
      affected_breakpoints: '390,768,1024,1440',
      approval_status: el.user_approval_status,
      evidence_source: STITCH_INNER_ZIP,
    }));
  }
  const components = [];
  for (const htmlRel of stitchBundle.stitch.html_files) {
    const base = path.basename(htmlRel, '.html');
    components.push({
      component_id: `DES-STITCH-${base}`,
      source_page: base,
      source_element: htmlRel,
      original_structure: `HTML source (${htmlRel})`,
      original_styles: designMdText ? 'See DESIGN.md in bundle' : 'DESIGN.md missing',
      protected_attributes: 'layout,typography,color,spacing per DESIGN.md',
      design_lock_status: 'DESIGN_LOCKED',
      approval_status: 'PENDING_APPROVAL',
      evidence_source: STITCH_INNER_ZIP,
    });
  }
  return components;
}
