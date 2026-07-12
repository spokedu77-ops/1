import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadMasterQaEnv } from './lib/spokedu-master-qa-env.mjs';

const { loadEnvConfig } = nextEnv;
loadMasterQaEnv();

const BASE = (process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://localhost:3000').replace(/\/$/, '');
const OUTPUT_DIR = process.argv.includes('--stdout-only')
  ? null
  : join(process.cwd(), 'commercial-verification');

const VITEST_BIN = join(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs');
const ENTRY_COPY_CONTRACT_TEST = 'app/spokedu-master/masterEntryCopy.contract.test.ts';

const CHECKS = [
  { id: 'entry_copy_contract', kind: 'vitest', target: ENTRY_COPY_CONTRACT_TEST },
  { id: 'staging_payment_preflight', kind: 'node', script: 'scripts/spokedu-master-staging-payment-e2e.mjs', args: [] },
  { id: 'payment_no_toss', kind: 'node', script: 'scripts/spokedu-master-staging-payment-e2e.mjs', args: ['--mock-activation'] },
  { id: 'profile_persist', kind: 'node', script: 'scripts/spokedu-master-profile-persist-e2e.mjs', args: [] },
  { id: 'ops_readiness', kind: 'node', script: 'scripts/spokedu-master-ops-readiness.mjs', args: [] },
  { id: 'library_content', kind: 'node', script: 'scripts/spokedu-master-library-content-readiness.mjs', args: [] },
  { id: 'production_prep', kind: 'node', script: 'scripts/spokedu-master-production-prep.mjs', args: [] },
];

function extractLastJson(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (!line.startsWith('{')) continue;
    try {
      return JSON.parse(line);
    } catch {
      // keep scanning upward for multiline JSON blocks
    }
  }

  const match = String(text ?? '').match(/\{[\s\S]*\}\s*$/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function runCheck(check) {
  const startedAt = Date.now();

  if (check.kind === 'vitest') {
    const result = spawnSync(process.execPath, [VITEST_BIN, 'run', check.target], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const exitCode = result.status ?? 1;
    return {
      id: check.id,
      script: `vitest run ${check.target}`,
      ok: exitCode === 0,
      exitCode,
      durationMs: Date.now() - startedAt,
      detail: { phase: 'entry-copy-contract', target: check.target },
      stderrTail: result.stderr?.trim() ? result.stderr.trim().slice(-400) : undefined,
    };
  }

  const result = spawnSync(
    process.execPath,
    [check.script, BASE, ...check.args],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const exitCode = result.status ?? 1;

  return {
    id: check.id,
    script: check.script,
    ok: exitCode === 0,
    exitCode,
    durationMs: Date.now() - startedAt,
    detail: extractLastJson(stdout) ?? undefined,
    stderrTail: stderr.trim() ? stderr.trim().slice(-400) : undefined,
  };
}

function buildScore(results) {
  const passed = results.filter((item) => item.ok).length;
  const base = 76;
  const weights = {
    entry_copy_contract: 1,
    staging_payment_preflight: 1,
    payment_no_toss: 1,
    profile_persist: 1,
    ops_readiness: 1,
    library_content: 1,
    production_prep: 0,
  };
  const earned = results.reduce((sum, item) => sum + (item.ok ? (weights[item.id] ?? 0) : 0), 0);
  const maxEarned = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const score = base + earned;
  return {
    strictCommercialScore: score,
    maxWithoutTossSandbox: base + maxEarned,
    passed,
    total: results.length,
    nextMilestone: 'Toss sandbox real payment + webhook/subscription verification (+2~3)',
  };
}

function main() {
  console.log(`[commercial-verification] base=${BASE}`);
  const results = CHECKS.map((check) => {
    console.log(`[commercial-verification] running ${check.id}...`);
    const outcome = runCheck(check);
    console.log(`[commercial-verification] ${outcome.ok ? 'OK' : 'FAIL'} ${check.id} (${outcome.durationMs}ms)`);
    return outcome;
  });

  const failed = results.filter((item) => !item.ok);
  const score = buildScore(results);
  const report = {
    ok: failed.length === 0,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    phase: 'no-payment-commercial-gate',
    checks: results,
    score,
    blockers: failed.map((item) => item.id),
    warnings: results
      .flatMap((item) => {
        const direct = item.detail?.warnings ?? [];
        if (Array.isArray(direct) && direct.every((entry) => typeof entry === 'string')) return direct;
        if (Array.isArray(direct)) {
          return direct.map((entry) => (
            typeof entry === 'string'
              ? entry
              : `${entry.name}${entry.detail ? `: ${entry.detail}` : ''}`
          ));
        }
        return [];
      })
      .filter(Boolean),
    next: failed.length === 0
      ? 'Payment deferred: complete production env (CRON_SECRET, monitoring webhook, restore DB URL), release checklist manual items, then Toss sandbox when ready'
      : `Fix failed checks first: ${failed.map((item) => item.id).join(', ')}`,
  };

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (OUTPUT_DIR) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const outputPath = join(OUTPUT_DIR, 'commercial-verification-report.json');
    writeFileSync(outputPath, serialized, 'utf8');
    console.log(`[commercial-verification] wrote ${outputPath}`);
  }

  process.stdout.write(serialized);
  process.exit(report.ok ? 0 : 1);
}

main();
