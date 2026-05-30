/**
 * SPOKEDU MASTER 카피 깨짐(모지바케) 스캔
 * Usage: node scripts/spokedu-master-copy-scan.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SCAN_ROOTS = [
  join(root, 'app/spokedu-master'),
  join(root, 'app/api/spokedu-master'),
];

const SKIP_FILES = new Set([
  join(root, 'app/spokedu-master/lib/clean.ts'),
]);

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const BAD = /[\uFFFD]|怨|諛|吏|媛|蹂|鍮|湲|醫|嫄|珥|獄|筌|揶|癰|疫|椰/;

function isDetectorLine(line) {
  return /BROKEN_TEXT_PATTERN|fromCharCode\(0xfffd\)|\.test\(value\)|\/\[\\uFFFD|includes\('/.test(line) && /\/|test|Pattern|fromCharCode/.test(line);
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === 'node_modules') continue;
      walk(path, files);
    } else if (EXT.has(extname(name))) {
      files.push(path);
    }
  }
  return files;
}

const hits = [];
for (const scanRoot of SCAN_ROOTS) {
  for (const file of walk(scanRoot)) {
    if (SKIP_FILES.has(file)) continue;
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (isDetectorLine(line)) return;
      if (BAD.test(line)) hits.push(`${file}:${index + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
}

if (hits.length > 0) {
  console.error('FAIL: suspicious copy / mojibake');
  hits.slice(0, 30).forEach((line) => console.error(line));
  if (hits.length > 30) console.error(`... and ${hits.length - 30} more`);
  process.exit(1);
}

console.log('OK: no mojibake patterns in spokedu-master sources');
