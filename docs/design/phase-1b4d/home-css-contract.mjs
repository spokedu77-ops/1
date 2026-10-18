#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
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
const missing = allRefs.filter(({ name }) => !defined.has(name));
console.log(JSON.stringify({ missingCount: missing.length, missing }, null, 2));
process.exit(missing.length ? 1 : 0);
