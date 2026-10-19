#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const imgRoot = path.join(repo, 'public', 'images', 'spokedu');
const out = path.join(repo, 'docs/operations/public-website-refactor/MEDIA_AND_CONTENT_MATRIX.csv');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG']);

async function walk(dir, base = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const rel = path.join(base, e.name).replace(/\\/g, '/');
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(abs, rel)));
    else if (IMAGE_EXT.has(path.extname(e.name))) files.push(rel);
  }
  return files;
}

async function sha256(abs) {
  const buf = await readFile(abs);
  return createHash('sha256').update(buf).digest('hex');
}

async function main() {
  const files = (await walk(imgRoot)).sort();
  const hashGroups = new Map();
  for (const rel of files) {
    const h = await sha256(path.join(imgRoot, rel));
    const g = hashGroups.get(h) ?? [];
    g.push(rel);
    hashGroups.set(h, g);
  }

  const header =
    'page,section,component,asset,content_role,original_evidence,duplicate_group,decision,reason\n';
  const rows = files.map((rel) => {
    const h = [...hashGroups.entries()].find(([, list]) => list.includes(rel))?.[0] ?? '';
    const dup = hashGroups.get(h)?.length > 1 ? `sha256-${h.slice(0, 12)}` : '';
    const decision = dup ? 'review' : 'inventory';
    return [
      'inventory',
      'public/images/spokedu',
      '',
      `public/images/spokedu/${rel}#${h.slice(0, 16)}`,
      'file-scan',
      'expand-media-matrix.mjs',
      dup,
      decision,
      dup ? '동일 SHA — 사용 맥락 수동 검토' : '원본 파일 등록',
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(',');
  });

  await writeFile(out, header + rows.join('\n') + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, files: files.length, duplicateGroups: [...hashGroups.values()].filter((v) => v.length > 1).length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
