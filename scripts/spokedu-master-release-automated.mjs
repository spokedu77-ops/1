import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://localhost:3000').replace(/\/$/, '');
const SKIP_SMOKE = process.argv.includes('--skip-smoke');
const OUTPUT_DIR = join(process.cwd(), 'commercial-verification');

const SMOKE_FLOWS = [
  'unauth',
  '403',
  'student',
  'record',
  'report',
  'library',
  'shop',
  'mobile',
  'deletion',
].join(',');

function runNode(script, args = []) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    ok: (result.status ?? 1) === 0,
    exitCode: result.status ?? 1,
    durationMs: Date.now() - startedAt,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function extractLastJson(text) {
  const match = String(text).match(/\{[\s\S]*\}\s*$/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function extractSmokeFlows(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{') && line.includes('"flow"'))
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function main() {
  console.log(`[release-automated] base=${BASE}`);
  const steps = [];

  console.log('[release-automated] running verification-report...');
  const verification = runNode('scripts/spokedu-master-commercial-verification-report.mjs', [BASE]);
  steps.push({
    id: 'verification_report',
    ok: verification.ok,
    exitCode: verification.exitCode,
    durationMs: verification.durationMs,
    detail: extractLastJson(verification.stdout) ?? undefined,
  });

  let smokeFlows = [];
  if (!SKIP_SMOKE) {
    console.log(`[release-automated] running commercial smoke (flows=${SMOKE_FLOWS})...`);
    const smoke = runNode('scripts/spokedu-master-commercial-smoke-qa.mjs', [
      BASE,
      `--flow=${SMOKE_FLOWS}`,
    ]);
    smokeFlows = extractSmokeFlows(smoke.stdout);
    const failedFlows = smokeFlows.filter((flow) => flow.ok === false);
    steps.push({
      id: 'commercial_smoke_operational',
      ok: smoke.ok && failedFlows.length === 0,
      exitCode: smoke.exitCode,
      durationMs: smoke.durationMs,
      detail: {
        flows: smokeFlows,
        failed: failedFlows.map((flow) => flow.flow),
      },
      stderrTail: smoke.stderr.trim() ? smoke.stderr.trim().slice(-500) : undefined,
    });
  }

  const failed = steps.filter((step) => !step.ok);
  const report = {
    ok: failed.length === 0,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    phase: 'release-automated-no-payment',
    paymentDeferred: true,
    steps,
    blockers: failed.map((step) => step.id),
    next: failed.length === 0
      ? 'Complete production env secrets and manual release checklist; defer Toss sandbox until ready'
      : `Fix failed steps: ${failed.map((step) => step.id).join(', ')}`,
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = join(OUTPUT_DIR, 'release-automated-report.json');
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[release-automated] wrote ${outputPath}`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
