#!/usr/bin/env node
/**
 * STATIC CSS CONTRACT — home-web TSX vs CSS module source selectors.
 * Exit 1 if any styles.xxx reference has no matching rule in home-web.module.css
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(docsDir, '../../..');
const homeDir = path.join(repoRoot, 'app/spokedu/components/home-web');
const cssPath = path.join(homeDir, 'home-web.module.css');

const COMPONENT_FILES = [
  'home-hero.tsx',
  'service-gateway.tsx',
  'spokedu-method.tsx',
  'field-records.tsx',
  'spomove-stage.tsx',
  'master-stage.tsx',
  'final-cta.tsx',
  'home-web-landing.tsx',
];

function extractCssClasses(cssText) {
  const set = new Set();
  for (const m of cssText.matchAll(/\.([a-zA-Z_][\w-]*)\s*[,{>:\s]/g)) set.add(m[1]);
  for (const m of cssText.matchAll(/\.([a-zA-Z_][\w-]*)\s*\{/g)) set.add(m[1]);
  return set;
}

function extractStyleRefs(tsxText, file) {
  const refs = new Set();
  for (const m of tsxText.matchAll(/styles\.([a-zA-Z_][\w]*)/g)) refs.add(m[1]);
  return [...refs].sort().map((name) => ({ file, name }));
}

const cssText = await readFile(cssPath, 'utf8');
const defined = extractCssClasses(cssText);
const allRefs = [];

for (const f of COMPONENT_FILES) {
  const text = await readFile(path.join(homeDir, f), 'utf8');
  allRefs.push(...extractStyleRefs(text, f));
}

const missing = [];
const report = [];

for (const { file, name } of allRefs) {
  const ok = defined.has(name);
  report.push({ file, class: name, defined: ok });
  if (!ok) missing.push({ file, class: name });
}

const out = { cssPath, totalRefs: allRefs.length, missingCount: missing.length, missing, report };
console.log(JSON.stringify(out, null, 2));

if (missing.length > 0) process.exit(1);
process.exit(0);
