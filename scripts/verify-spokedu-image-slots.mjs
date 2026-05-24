/**
 * PHOTO_REQUEST.md 슬롯 파일 존재 확인
 * Usage: node scripts/verify-spokedu-image-slots.mjs
 */
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../public/images/spokedu');
const DOC = join(ROOT, 'PHOTO_REQUEST.md');

const text = readFileSync(DOC, 'utf8');
const paths = [...text.matchAll(/`([a-z0-9_./-]+\.(?:jpg|webp|jpeg|png))`/gi)].map((m) => m[1]);

const unique = [...new Set(paths)];
const missing = [];
const ok = [];

for (const rel of unique) {
  const normalized = join(ROOT, ...rel.split('/'));
  if (!existsSync(normalized)) {
    missing.push(rel);
    continue;
  }
  const st = statSync(normalized);
  if (st.size < 8000) missing.push(`${rel} (too small: ${st.size}b)`);
  else ok.push(rel);
}

const report = { total: unique.length, ok: ok.length, missing, pass: missing.length === 0 };
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
