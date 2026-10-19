#!/usr/bin/env node
/**
 * A) File inventory under public/images/spokedu
 * B) DOM usage rows from local production server (Playwright)
 * Output: MEDIA_AND_CONTENT_MATRIX.csv + IMAGE_SIMILARITY_CONTACT_SHEET.jpg (when sharp available)
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { normalizeImageSrc, stabilizePublicPage } from './capture-page-utils.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const imgRoot = path.join(repo, 'public', 'images', 'spokedu');
const outCsv = path.join(repo, 'docs/operations/public-website-refactor/MEDIA_AND_CONTENT_MATRIX.csv');
const outSheet = path.join(repo, 'docs/operations/public-website-refactor/IMAGE_SIMILARITY_CONTACT_SHEET.jpg');
const port = process.env.REFACTOR_CAPTURE_PORT ?? '3055';
const base = `http://127.0.0.1:${port}`;

const ROUTES = [
  '/',
  '/education',
  '/private',
  '/spomove',
  '/spomove/catalog',
  '/spokedu-lab',
  '/records',
  '/about',
  '/spomat',
  '/partners',
  '/contact',
];

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG']);

async function walk(dir, baseRel = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const rel = path.join(baseRel, e.name).replace(/\\/g, '/');
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(abs, rel)));
    else if (IMAGE_EXT.has(path.extname(e.name))) files.push(rel);
  }
  return files;
}

async function sha256File(abs) {
  const buf = await readFile(abs);
  return createHash('sha256').update(buf).digest('hex');
}

async function dHash(abs) {
  const raw = await sharp(abs)
    .rotate()
    .resize(9, 8, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();
  let bits = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = raw[y * 9 + x];
      const right = raw[y * 9 + x + 1];
      bits += left < right ? '1' : '0';
    }
  }
  return bits;
}

function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d++;
  return d;
}

async function waitLocal() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/`)).status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('local server timeout');
}

async function collectUsage(browser) {
  const rows = [];
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    const stability = await stabilizePublicPage(page, `${base}${route}`);
    const shots = await page.evaluate(() => {
      const sectionTitle = (el) => {
        let node = el;
        while (node && node !== document.body) {
          if (node.tagName === 'SECTION' || node.tagName === 'MAIN') {
            const h = node.querySelector('h1, h2, h3');
            if (h?.textContent?.trim()) return h.textContent.trim().slice(0, 80);
          }
          node = node.parentElement;
        }
        return '';
      };

      const items = [];
      for (const img of document.querySelectorAll('img')) {
        const rect = img.getBoundingClientRect();
        const style = window.getComputedStyle(img);
        if (style.display === 'none' || rect.width < 8) continue;
        items.push({
          src: img.currentSrc || img.src,
          alt: (img.alt || '').slice(0, 120),
          section: sectionTitle(img),
        });
      }
      return items;
    });

    for (const item of shots) {
      const normalized = normalizeImageSrc(item.src, base);
      rows.push({
        rowKind: 'usage',
        page: route,
        section: item.section || '—',
        component: 'dom-img',
        asset: normalized,
        contentRole: item.alt || 'decorative',
        duplicateGroup: '',
        decision: stability.imagesReady ? 'JUSTIFIED_REUSE' : 'REVIEW_REQUIRED',
        reason: `capture-stability pending=${stability.pendingImageCount} broken=${stability.brokenImageCount}`,
      });
    }
    await page.close();
  }
  return rows;
}

async function buildContactSheet(groups, absForRel) {
  const thumbs = [];
  for (const group of groups.slice(0, 12)) {
    for (const rel of group.files.slice(0, 2)) {
      const buf = await sharp(absForRel(rel)).rotate().resize(160, 120, { fit: 'cover' }).jpeg().toBuffer();
      thumbs.push({ rel, buf });
    }
  }
  if (!thumbs.length) return;
  const cols = 4;
  const w = 168;
  const h = 128;
  const canvas = sharp({
    create: {
      width: cols * w,
      height: Math.ceil(thumbs.length / cols) * h,
      channels: 3,
      background: '#eef2f8',
    },
  });
  const composites = thumbs.map((t, i) => ({
    input: t.buf,
    left: (i % cols) * w + 4,
    top: Math.floor(i / cols) * h + 4,
  }));
  await canvas.composite(composites).jpeg({ quality: 82 }).toFile(outSheet);
}

function csvEscape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

let srv;
try {
  const files = (await walk(imgRoot)).sort();
  const inventory = [];
  const hashGroups = new Map();
  const dhashList = [];

  for (const rel of files) {
    const abs = path.join(imgRoot, rel);
    const sha = await sha256File(abs);
    const meta = await sharp(abs).metadata();
    const list = hashGroups.get(sha) ?? [];
    list.push(rel);
    hashGroups.set(sha, list);
    const dh = await dHash(abs);
    dhashList.push({ rel, dh });
    inventory.push({
      rowKind: 'asset',
      page: '',
      section: 'public/images/spokedu',
      component: '',
      asset: `/images/spokedu/${rel}`,
      contentRole: 'file-inventory',
      sha256: sha,
      width: meta.width ?? '',
      height: meta.height ?? '',
      duplicateGroup: list.length > 1 ? `sha256-${sha.slice(0, 12)}` : '',
      decision: list.length > 1 ? 'REVIEW_REQUIRED' : 'NOT_APPLICABLE',
      reason: list.length > 1 ? '동일 SHA — 사용 맥락 연결 필요' : '미사용 여부는 usage 행과 대조',
    });
  }

  const similarGroups = [];
  for (let i = 0; i < dhashList.length; i++) {
    for (let j = i + 1; j < dhashList.length; j++) {
      if (hamming(dhashList[i].dh, dhashList[j].dh) <= 8) {
        similarGroups.push([dhashList[i].rel, dhashList[j].rel]);
      }
    }
  }

  srv = spawn('npm run start', { cwd: repo, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  await waitLocal();
  const browser = await chromium.launch();
  const usageRows = await collectUsage(browser);
  await browser.close();

  const usedAssets = new Set(
    usageRows.map((r) => r.asset).filter((a) => a.startsWith('/images/')),
  );

  for (const row of inventory) {
    if (usedAssets.has(row.asset)) row.decision = 'FIXED';
    row.originalEvidence = row.sha256.slice(0, 16);
  }

  const header =
    'row_kind,page,section,component,asset,content_role,sha256,width,height,duplicate_group,decision,reason\n';

  const lines = [];
  for (const row of inventory) {
    lines.push(
      [
        row.rowKind,
        row.page,
        row.section,
        row.component,
        row.asset,
        row.contentRole,
        row.sha256,
        row.width,
        row.height,
        row.duplicateGroup,
        row.decision,
        row.reason,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  for (const row of usageRows) {
    lines.push(
      [
        row.rowKind,
        row.page,
        row.section,
        row.component,
        row.asset,
        row.contentRole,
        '',
        '',
        '',
        row.duplicateGroup,
        row.decision,
        row.reason,
      ]
        .map(csvEscape)
        .join(','),
    );
  }

  await writeFile(outCsv, header + lines.join('\n') + '\n', 'utf8');

  const shaDupGroups = [...hashGroups.values()].filter((g) => g.length > 1).map((files) => ({ files }));
  await mkdir(path.dirname(outSheet), { recursive: true });
  await buildContactSheet(shaDupGroups, (rel) => path.join(imgRoot, rel));

  console.log(
    JSON.stringify(
      {
        ok: true,
        assets: files.length,
        usageRows: usageRows.length,
        shaDuplicateGroups: shaDupGroups.length,
        visualSimilarPairs: similarGroups.length,
        contactSheet: outSheet,
        csv: outCsv,
      },
      null,
      2,
    ),
  );
} finally {
  if (srv) srv.kill('SIGTERM');
}
