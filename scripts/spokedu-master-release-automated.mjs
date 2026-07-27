import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://localhost:3000').replace(/\/$/, '');
const SKIP_SMOKE = process.argv.includes('--skip-smoke');
const SKIP_INTEGRITY = process.argv.includes('--skip-integrity');
const SKIP_CRAFT = process.argv.includes('--skip-craft');
const OUTPUT_DIR = join(process.cwd(), 'commercial-verification');

const SMOKE_FLOWS = [
  'unauth',
  '403',
  'entitlement matrix',
  'owner isolation',
  'student',
  'record',
  'report',
  'report to home',
  'day loop',
  'spomove session',
  'library',
  'shop',
  'mobile',
  'deletion',
].join(',');

function runNpm(script, args = []) {
  const startedAt = Date.now();
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCmd, ['run', script, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ci-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'ci-service-role-key',
    },
  });
  return {
    ok: (result.status ?? 1) === 0,
    exitCode: result.status ?? 1,
    durationMs: Date.now() - startedAt,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

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

  console.log('[release-automated] running production build...');
  const productionBuild = runNpm('build');
  steps.push({
    id: 'production_build',
    ok: productionBuild.ok,
    exitCode: productionBuild.exitCode,
    durationMs: productionBuild.durationMs,
    stderrTail: productionBuild.stderr.trim() ? productionBuild.stderr.trim().slice(-500) : undefined,
  });

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

  if (!SKIP_INTEGRITY) {
    console.log('[release-automated] running data-integrity (hard release gate)...');
    const integrity = runNpm('qa:spokedu-master:data-integrity');
    steps.push({
      id: 'data_integrity',
      ok: integrity.ok,
      exitCode: integrity.exitCode,
      durationMs: integrity.durationMs,
      detail: extractLastJson(integrity.stdout) ?? undefined,
      stderrTail: integrity.stderr.trim() ? integrity.stderr.trim().slice(-800) : undefined,
      note: 'Pass --skip-integrity only for local non-release dry runs. Missing DB URL fails this gate.',
    });
  } else {
    console.log('[release-automated] skipping data-integrity (--skip-integrity)');
  }

  if (!SKIP_CRAFT) {
    console.log('[release-automated] running craft-capture (hard B gate)...');
    const craft = runNode('scripts/spokedu-master-craft-capture-qa.mjs', [BASE]);
    steps.push({
      id: 'craft_capture',
      ok: craft.ok,
      exitCode: craft.exitCode,
      durationMs: craft.durationMs,
      detail: extractLastJson(craft.stdout) ?? undefined,
      stderrTail: craft.stderr.trim() ? craft.stderr.trim().slice(-500) : undefined,
      note: 'Pass --skip-craft only for local non-release dry runs. Soft-skip of library/bar is not allowed.',
    });
  } else {
    console.log('[release-automated] skipping craft-capture (--skip-craft)');
  }

  const failed = steps.filter((step) => !step.ok);
  const report = {
    ok: failed.length === 0,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    phase: 'release-automated-no-payment',
    paymentDeferred: true,
    integrityRequired: !SKIP_INTEGRITY,
    craftRequired: !SKIP_CRAFT,
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
