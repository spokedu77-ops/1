#!/usr/bin/env node
/**
 * ESLint 결과를 ruleId별로 집계 (JSON stdout 파싱)
 * 사용: npx eslint . --format json | node scripts/eslint-rule-count.mjs
 * 또는: npx eslint . --format json -o .eslint-tmp.json && node scripts/eslint-rule-count.mjs .eslint-tmp.json
 */
import fs from 'fs';

const inputPath = process.argv[2];
const raw = inputPath
  ? fs.readFileSync(inputPath, 'utf8')
  : fs.readFileSync(0, 'utf8');

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('JSON parse failed:', e.message);
  process.exit(1);
}

const byRule = {};
let total = 0;
for (const file of data) {
  for (const msg of file.messages || []) {
    const id = msg.ruleId || '(unknown)';
    byRule[id] = (byRule[id] || 0) + 1;
    total += 1;
  }
}

const sorted = Object.entries(byRule).sort((a, b) => b[1] - a[1]);
console.log(`TOTAL_MESSAGES\t${total}`);
console.log('RULE\tCOUNT');
for (const [rule, count] of sorted) {
  console.log(`${rule}\t${count}`);
}
