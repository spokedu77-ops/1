#!/usr/bin/env node
/**
 * Evidence runner — does NOT mutate working-tree CSS.
 * BEFORE/AFTER captures must be produced via isolated builds (see GATE_A_EVIDENCE_RUN.json notes).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const foundation = path.join(here, '..');
const repo = path.resolve(here, '../../../../..');

function run(cmd, env = {}) {
  const r = spawnSync(cmd, { cwd: repo, shell: true, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`failed: ${cmd}`);
}

async function main() {
  const head = spawnSync('git rev-parse HEAD', { cwd: repo, shell: true, encoding: 'utf8' }).stdout.trim();
  let buildIdVal = 'unknown';
  try {
    buildIdVal = (await readFile(path.join(repo, '.next/BUILD_ID'), 'utf8')).trim();
  } catch {
    /* */
  }

  console.log('=== Gate A evidence (current working-tree build only; no CSS swap) ===');
  run('node docs/operations/public-website-refactor/layout-foundation/scripts/gate-a-width-qa.mjs', {
    GATE_A_PORT: process.env.GATE_A_PORT ?? '3072',
    GATE_A_HEAD: head,
  });
  run('node docs/operations/public-website-refactor/layout-foundation/scripts/gate-a-summarize.mjs');

  await writeFile(
    path.join(foundation, 'GATE_A_EVIDENCE_RUN.json'),
    JSON.stringify(
      {
        head,
        buildId: buildIdVal,
        cssSwap: false,
        note: 'BEFORE/AFTER hero captures use CAPTURE_MANIFEST_* from isolated HEAD vs WIP builds; this runner never overwrites home-web.module.css',
        finishedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
