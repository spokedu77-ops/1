/**
 * Stitch HTML → display-text slots (parse5 DOM). Preserves dom_path + section comments.
 */
import fs from 'node:fs';
import * as parse5 from 'parse5';

const TEXT_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'label', 'li', 'span', 'div']);
const SKIP_TAGS = new Set(['script', 'style', 'svg', 'path']);
const MATERIAL_ONLY = /^[\s\uE000-\uF8FF]*$/;

export function normVisible(s) {
  return (s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function getAttr(node, name) {
  return node.attrs?.find((a) => a.name === name)?.value ?? '';
}

function textFromNode(node) {
  if (!node) return '';
  if (node.nodeName === '#text') return node.value ?? '';
  if (SKIP_TAGS.has(node.nodeName)) return '';
  let out = '';
  for (const ch of node.childNodes ?? []) out += textFromNode(ch);
  return out;
}

function isMaterialIconSpan(node) {
  if (node.nodeName !== 'span') return false;
  const cls = getAttr(node, 'class');
  if (!cls.includes('material-symbols')) return false;
  const t = normVisible(textFromNode(node));
  return t.length <= 2;
}

function hasBlockTextDescendant(node) {
  for (const ch of node.childNodes ?? []) {
    const t = ch.nodeName;
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', 'a', 'li'].includes(t)) return true;
    if (hasBlockTextDescendant(ch)) return true;
  }
  return false;
}

function shouldEmitElement(node) {
  const tag = node.nodeName;
  if (tag === 'img') return true;
  if (!TEXT_TAGS.has(tag)) return false;
  if (tag === 'div' && hasBlockTextDescendant(node)) return false;
  if (tag === 'span') {
    const cls = getAttr(node, 'class');
    const allowSpan =
      cls.includes('font-watermark') ||
      cls.includes('display-metric') ||
      cls.includes('font-label-md') ||
      cls.includes('font-label-sm') ||
      cls.includes('font-body-sm');
    if (!allowSpan) return false;
  }
  if (isMaterialIconSpan(node)) return false;
  const t = normVisible(textFromNode(node));
  if (t.length < 2) return false;
  if (t === 'S' && tag === 'span') return false;
  return true;
}

function slotRole(tag, text, classes) {
  if (tag === 'img') return 'image';
  if (classes.includes('font-watermark-number') || classes.includes('watermark-number')) return 'decorative_number';
  if (classes.includes('font-display-metric') || classes.includes('display-metric')) return 'metric_display';
  if (tag === 'a' || tag === 'button') return 'cta';
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'p') return 'body';
  if (text.startsWith('#')) return 'tag_chip';
  return 'label';
}

function extractSectionComments(html) {
  const sections = [];
  const re = /<!--\s*SECTION\s+(\d+):\s*([^-]+?)-->/gi;
  let m;
  while ((m = re.exec(html))) {
    sections.push({ index: m.index, label: `SECTION ${m[1]}: ${m[2].trim()}` });
  }
  return sections;
}

function sectionAt(sections, nodeIndex) {
  let label = 'UNLABELED';
  for (const s of sections) {
    if (s.index <= nodeIndex) label = s.label;
    else break;
  }
  return label;
}

/** Approximate node start index by serializing prefix — for section mapping */
let htmlSource = '';

function buildDomPath(stack) {
  return stack.map((s) => s).join('>');
}

export function extractDomSlotsFromHtml(html, meta) {
  htmlSource = html;
  const sections = extractSectionComments(html);
  const doc = parse5.parse(html);
  const slots = [];
  const seen = new Set();
  let nodeCounter = 0;
  const tagCounts = {};

  function walk(node, stack, inMain, inFooter, inHeader) {
    if (!node) return;
    nodeCounter++;

    if (node.nodeName === 'header') inHeader = true;
    if (node.nodeName === 'main') inMain = true;
    if (node.nodeName === 'footer') inFooter = true;

    if (node.nodeName === 'comment') {
      for (const ch of node.childNodes ?? []) walk(ch, stack, inMain, inFooter, inHeader);
      return;
    }

    if (node.nodeName !== '#text' && node.nodeName !== '#comment') {
      const tag = node.nodeName;
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      const pathKey = `${tag}[${tagCounts[tag]}]`;
      const nextStack = [...stack, pathKey];

      if (shouldEmitElement(node)) {
        const classes = getAttr(node, 'class');
        const text =
          tag === 'img'
            ? getAttr(node, 'data-alt') || getAttr(node, 'alt') || getAttr(node, 'src')
            : normVisible(textFromNode(node));
        const norm = normVisible(text);
        const region = inFooter ? 'footer' : inHeader ? 'header' : inMain ? 'main' : 'other';
        const dedupeKey = `${region}|${meta.route}|${norm.slice(0, 120)}`;
        if (!seen.has(dedupeKey) || tag === 'img') {
          seen.add(dedupeKey);
          const idxGuess = html.indexOf(text.slice(0, Math.min(24, text.length)));
          slots.push({
            dom_slot_id: `DOM-${meta.pageSlug}-${slots.length + 1}`,
            stitch_element_id_legacy: '',
            route: meta.route,
            source_file: meta.relFromRoot,
            dom_path: buildDomPath(nextStack),
            page_section: sectionAt(sections, idxGuess >= 0 ? idxGuess : 0),
            region,
            tag,
            role: slotRole(tag, text, classes),
            stitch_original: text.slice(0, 800),
            href: tag === 'img' ? getAttr(node, 'src') : getAttr(node, 'href'),
            data_path: getAttr(node, 'data-path'),
            css_classes: classes.slice(0, 200),
          });
        }
      }

      for (const ch of node.childNodes ?? []) walk(ch, nextStack, inMain, inFooter, inHeader);
      return;
    }

    for (const ch of node.childNodes ?? []) walk(ch, stack, inMain, inFooter, inHeader);
  }

  for (const ch of doc.childNodes ?? []) walk(ch, [], false, false, false);

  return { slots, slotCount: slots.length, sections: sections.map((s) => s.label) };
}

export function extractDomSlotsFromFile(htmlPath, meta) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  return extractDomSlotsFromHtml(html, meta);
}

/** All visible text in main+footer for coverage check */
export function collectAllVisibleText(html) {
  const doc = parse5.parse(html);
  const parts = [];
  function walk(node, ctx) {
    if (!node) return;
    if (node.nodeName === 'main') ctx = 'main';
    if (node.nodeName === 'footer') ctx = 'footer';
    if (node.nodeName === 'header') ctx = 'header';
    if (node.nodeName === '#text') {
      const t = normVisible(node.value);
      if (t.length >= 2 && !MATERIAL_ONLY.test(t)) parts.push({ ctx, t });
    }
    if (!SKIP_TAGS.has(node.nodeName)) {
      for (const ch of node.childNodes ?? []) walk(ch, ctx);
    }
  }
  for (const ch of doc.childNodes ?? []) walk(ch, 'root');
  return parts;
}
