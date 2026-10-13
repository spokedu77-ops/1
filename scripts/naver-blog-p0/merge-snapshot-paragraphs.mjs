#!/usr/bin/env node
/** snapshot JSON + paragraphs JSON → stdout (run-verify 입력용) */
import { readFileSync, writeFileSync } from 'node:fs';

const [snapshotPath, paragraphsPath, outPath] = process.argv.slice(2);
if (!snapshotPath || !paragraphsPath) {
  console.error('Usage: merge-snapshot-paragraphs.mjs <snapshot.json> <paragraphs.json> [out.json]');
  process.exit(2);
}
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
snapshot.paragraphs = JSON.parse(readFileSync(paragraphsPath, 'utf8'));
const out = JSON.stringify(snapshot, null, 2);
if (outPath) writeFileSync(outPath, out);
else process.stdout.write(out);
