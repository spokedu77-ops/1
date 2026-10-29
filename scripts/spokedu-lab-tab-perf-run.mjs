/** Frozen local production BEFORE/AFTER benchmark; never swaps working source. */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import nextEnv from '@next/env';
import { createServerClient } from '@supabase/ssr';
import { runTabPerfBench } from './spokedu-lab-tab-perf-bench.mjs';
import { ensureQaLoginInPersistentContext, launchPerfPersistentContext } from './lib/spokedu-lab-perf-session.mjs';
nextEnv.loadEnvConfig(process.cwd());
const arg = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const root = process.cwd();
const baselineSha = arg('baseline-sha', 'a8a93158375d8e664cda1dddd60bc547e749ba71');
const baseUrl = arg('baseUrl', 'http://localhost:3117');
if (new URL(baseUrl).hostname !== 'localhost') throw new Error('Local localhost required');
const iterations = Number(arg('iterations', '20'));
if (iterations < 20) throw new Error('At least 20 samples per leg required');
const delta = ['app/spokedu-master/components/layout/AppShell.tsx', 'app/spokedu-master/store/index.ts', 'app/spokedu-master/programs/page.tsx'];
const hash = f => createHash('sha256').update(readFileSync(join(root, f))).digest('hex');
const hashes = delta.map(hash);
const id = Date.now(), out = join(root, '.tmp', 'perf-runs'), frozen = arg('frozen', join(root, '.tmp', `tab-perf-frozen-${id}`));
const reuse = process.argv.includes('--reuse-before-build');
if (reuse && (!frozen.startsWith(join(root, '.tmp', 'tab-perf-frozen-')) || !existsSync(join(frozen, '.next/BUILD_ID')))) throw new Error('Valid prior isolated BEFORE build required');
mkdirSync(out, { recursive: true });
if (!reuse) { mkdirSync(frozen);
for (const p of ['app', 'components', 'data', 'lib', 'public', 'types', 'package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'proxy.ts', '.env.local']) {
  if (existsSync(join(root, p))) cpSync(join(root, p), join(frozen, p), { recursive: true });
}
symlinkSync(join(root, 'node_modules'), join(frozen, 'node_modules'), 'junction');
const config = join(frozen, 'next.config.ts');
writeFileSync(config, readFileSync(config, 'utf8').replaceAll('process.cwd()', JSON.stringify(root)));
}
const afterSources = delta.map(p => readFileSync(join(root, p), 'utf8'));
const scope = { frozen, baselineSha, delta,
  interpretation: 'Home/favorite/gateway performance deltas only. Accepted P0 Provider and current operational provider remain identical in both phases. Other source is frozen.',
  conditions: { viewport: '390x844', locale: 'ko-KR', iterations, headless: process.argv.includes('--headless'), throttling: 'none', api: 'real local production; no GET fixtures' } };
writeFileSync(join(out, `scope-${id}.json`), JSON.stringify(scope, null, 2));
console.log(JSON.stringify({ stage: 'scope', ...scope }));
function applyPhase(phase) {
  delta.forEach((file, i) => {
    let source = phase === 'AFTER' ? afterSources[i] : execFileSync('git', ['show', `${baselineSha}:${file}`], { cwd: root, encoding: 'utf8', windowsHide: true });
    if (phase === 'BEFORE' && i === 0) {
      const provider = afterSources[i].match(/                    <OperationalDataProvider[\s\S]*?<\/OperationalDataProvider>/)?.[0];
      const branch = /                    \{needsOperationalData \? \([\s\S]*?^                    \) : children\}/m;
      if (!provider || !branch.test(source)) throw new Error('Cannot preserve accepted Provider in baseline');
      source = source.replace(branch, provider).replace('  const hideChrome =', '  const canUseAttendance = accessGuard.snapshot?.canUseAttendance === true;\n  const hideChrome =');
    }
    if (reuse && phase === 'BEFORE' && readFileSync(join(frozen, file), 'utf8') !== source) throw new Error('Existing BEFORE source differs; rebuild instead of reuse');
    writeFileSync(join(frozen, file), source);
  });
}
let server, context;
function stopServer() {
  if (server) { try { execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); } catch {} server = undefined; }
}
async function build(phase) {
  stopServer();
  if (!(phase === 'BEFORE' && reuse)) {
  const log = openSync(join(out, `build-${phase}-${id}.log`), 'w');
  const result = spawnSync(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'build'], { cwd: frozen, stdio: ['ignore', log, log], windowsHide: true });
  closeSync(log);
  if (result.status !== 0) throw new Error(`${phase} build failed: build-${phase}-${id}.log`);
  }
  const fd = openSync(join(out, `server-${phase}-${id}.log`), 'w');
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', new URL(baseUrl).port || '80'], { cwd: frozen, stdio: ['ignore', fd, fd], windowsHide: true }); closeSync(fd);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error('Local server exited; inspect port ownership and server log');
    try { if ((await fetch(`${baseUrl}/spokedu-lab/login`)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Local production server failed to start');
}
try {
  applyPhase('BEFORE'); console.log('Building frozen BEFORE'); await build('BEFORE');
  context = await launchPerfPersistentContext({ headless: process.argv.includes('--headless') });
  const email = arg('qa-login', null);
  if (email) {
    if (!/^spm\.qa\.(?:lite|pro|trial|center)@spokedu\.test$/.test(email) || !process.env.SPM_QA_PASSWORD) throw new Error('Known QA credentials required');
    const cookies = new Map();
    const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: {
      getAll: () => [...cookies.values()], setAll: rows => rows.forEach(c => cookies.set(c.name, c)),
    } });
    const { error } = await auth.auth.signInWithPassword({ email, password: process.env.SPM_QA_PASSWORD });
    if (error) throw new Error(`QA sign-in failed (${error.status})`);
    await context.addCookies([...cookies.values()].filter(c => c.value).map(c => ({ name: c.name, value: c.value, domain: 'localhost', path: '/', sameSite: 'Lax', secure: false, httpOnly: false })));
  }
  const blockedWrites = [];
  await context.route('**/api/spokedu-master/**', route => {
    if (route.request().method() === 'GET') return route.continue();
    blockedWrites.push({ path: new URL(route.request().url()).pathname, method: route.request().method() });
    return route.fulfill({ status: 403, json: { error: 'Read-only performance QA' } });
  });
  await ensureQaLoginInPersistentContext(context, baseUrl, { loginBaseUrl: baseUrl });
  const res = await context.request.get(`${baseUrl}/api/spokedu-master/access`), access = await res.json();
  if (!access.canUseAttendance || !access.canUseSpomove) throw new Error('QA requires attendance and SPOMOVE access');
  console.log(JSON.stringify({ stage: 'auth', status: res.status(), plan: access.plan, attendance: access.canUseAttendance, spomove: access.canUseSpomove }));
  const before = await runTabPerfBench({ context, baseUrl, label: 'BEFORE', sha: baselineSha, iterations, collectTrace: true });
  console.log(JSON.stringify({ stage: 'BEFORE-done', summary: before.warmSpaT2 }));
  applyPhase('AFTER'); console.log('Building frozen AFTER'); await build('AFTER');
  await ensureQaLoginInPersistentContext(context, baseUrl, { loginBaseUrl: baseUrl });
  const after = await runTabPerfBench({ context, baseUrl, label: 'AFTER', sha: 'working-tree', iterations, collectTrace: true });
  const report = { scope, auth: { status: res.status(), plan: access.plan }, before, after, blockedWrites,
    goals: { warmSpaT2p50: after.warmSpaT2.p50 <= 300, warmSpaT2p95: after.warmSpaT2.p95 <= 500 },
    workingFilesUnchanged: delta.every((f, i) => hash(f) === hashes[i]) };
  const reportPath = join(out, `before-after-report-${id}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ stage: 'complete', before: before.warmSpaT2, after: after.warmSpaT2, goals: report.goals, reportPath }));
} finally {
  await context?.close(); stopServer();
  if (!delta.every((f, i) => hash(f) === hashes[i])) throw new Error('Working source changed externally during benchmark; review comparison');
}
