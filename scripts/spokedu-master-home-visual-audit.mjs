/**
 * MASTER 홈 비주얼(16:9 전용 썸네일) 점검 — 정적 data.ts + public 파일 존재
 * Usage: node scripts/spokedu-master-home-visual-audit.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'app/spokedu-master/lib/data.ts');
const source = readFileSync(dataPath, 'utf8');

const DEDICATED_PREFIX = '/images/spokedu-master/programs/';
const GENERIC_PATTERNS = [
  /\/images\/spokedu\/records\//,
  /\/images\/spokedu\/cases\/hero/,
  /\/images\/spokedu\/curriculum-instructor/,
  /img\.youtube\.com/,
];

function extractProgramBlocks(text) {
  return text.split(/\n  \{\n    id: '/).slice(1);
}

function parseImageUrls(block) {
  const urls = [];
  for (const match of block.matchAll(/(?:heroImageUrl|thumbnailUrl):\s*['"]([^'"]+)['"]/g)) {
    urls.push(match[1]);
  }
  return [...new Set(urls)];
}

function isDedicated(url) {
  return url.startsWith(DEDICATED_PREFIX);
}

function isGeneric(url) {
  return GENERIC_PATTERNS.some((pattern) => pattern.test(url));
}

function publicPath(url) {
  if (!url.startsWith('/images/')) return null;
  const segments = url.replace(/^\//, '').split('/');
  return join(root, 'public', ...segments);
}

function dedicatedHeroExists(url) {
  const file = publicPath(url);
  if (!file) return false;
  if (existsSync(file)) return true;
  if (url.endsWith('.jpeg')) {
    return existsSync(file.replace(/\.jpeg$/i, '.svg'));
  }
  return false;
}

const blocks = extractProgramBlocks(source);
const rows = blocks.map((block) => {
  const id = block.split("'")[0];
  const urls = parseImageUrls(block);
  const dedicated = urls.filter(isDedicated);
  const generic = urls.filter((url) => !isDedicated(url));
  const missing = urls
    .filter((url) => url.startsWith('/images/'))
    .filter((url) => !dedicatedHeroExists(url));
  const hasRules = /rules:\s*\[/.test(block) && !/rules:\s*\[\s*\]/.test(block);
  const isHot = /isHot:\s*true/.test(block);
  return { id, urls, dedicated, generic, missing, hasRules, isHot };
});

const hot = rows.filter((row) => row.isHot);
const dedicatedHot = hot.filter((row) => row.dedicated.length > 0);
const missingFiles = rows.flatMap((row) => row.missing.map((url) => ({ id: row.id, url })));

console.log('=== SPOKEDU MASTER home visual audit ===');
console.log(`HOT programs: ${hot.length}`);
console.log(`HOT with dedicated 16:9 path: ${dedicatedHot.length} / ${hot.length}`);
console.log(`Missing image files: ${missingFiles.length}`);

for (const row of rows.filter((r) => r.isHot)) {
  const visual = row.dedicated.length > 0 ? 'dedicated' : row.generic.length > 0 ? 'generic-fallback' : 'no-visual';
  const miss = row.missing.length > 0 ? ` MISSING:${row.missing.join(',')}` : '';
  console.log(`  HOT ${row.id} — ${visual}${miss}`);
}

if (missingFiles.length > 0) {
  console.error('\nMissing files (upload to public/ or fix data.ts):');
  for (const item of missingFiles) {
    console.error(`  ${item.id}: ${item.url}`);
  }
}

const targetDedicatedHot = 3;
if (dedicatedHot.length < targetDedicatedHot) {
  console.warn(`\nWARN: dedicated HOT visuals ${dedicatedHot.length} < ${targetDedicatedHot} (content task)`);
}

if (missingFiles.length > 0) {
  console.warn('\nContent backlog: upload 16:9 files under public/images/spokedu-master/programs/{slug}/hero.jpeg');
}

console.log('\nVisual audit finished (exit 0 — missing files are warnings until assets land).');
