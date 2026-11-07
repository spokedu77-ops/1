#!/usr/bin/env node
/**
 * One-shot local Next.js dev bootstrap (Windows-friendly).
 * - Validates repo root, .env.local, node_modules
 * - Frees stale LISTENING on the dev port
 * - Starts a single `next dev` and waits until HTTP responds
 *
 * Usage: npm run dev:local
 *        node scripts/dev-local.mjs --check   (exit 0 if already healthy)
 */
import { spawn, execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.DEV_LOCAL_PORT || 3000);
const host = process.env.DEV_LOCAL_HOST || '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
const checkOnly = process.argv.includes('--check');
const skipKill = process.argv.includes('--no-kill-port');

process.chdir(repoRoot);

function log(msg) {
  console.log(`[dev:local] ${msg}`);
}

function fail(msg, code = 1) {
  console.error(`[dev:local] ${msg}`);
  process.exit(code);
}

function ensureRepo() {
  if (!existsSync(resolve(repoRoot, 'package.json')) || !existsSync(resolve(repoRoot, 'next.config.ts'))) {
    fail(`Not the coach-app repo root: ${repoRoot}`);
  }
}

function ensureNodeModules() {
  if (existsSync(resolve(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next'))) return;
  log('node_modules/next missing — running npm install (once)…');
  execSync('npm install', { stdio: 'inherit', cwd: repoRoot });
}

function ensureEnvLocal() {
  const envPath = resolve(repoRoot, '.env.local');
  const examplePath = resolve(repoRoot, '.env.example');
  if (!existsSync(envPath)) {
    if (!existsSync(examplePath)) fail('Missing .env.local and .env.example');
    copyFileSync(examplePath, envPath);
    log('Created .env.local from .env.example — fill Supabase keys, then re-run.');
    fail('Configure NEXT_PUBLIC_SUPABASE_URL and keys in .env.local', 2);
  }
  let text = readFileSync(envPath, 'utf8');
  const required = [
    ['NEXT_PUBLIC_SUPABASE_URL', /NEXT_PUBLIC_SUPABASE_URL\s*=\s*\S+/],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', /NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*\S+/],
  ];
  for (const [name, re] of required) {
    if (!re.test(text)) {
      fail(`.env.local missing ${name}. Copy from Supabase dashboard or .env.example.`, 2);
    }
  }
  const equipmentDefaults = [
    ['NEXT_PUBLIC_EQUIPMENT_UI', 'ledger'],
    ['EQUIPMENT_WRITE_MODE', 'ledger'],
  ];
  let patched = false;
  for (const [key, value] of equipmentDefaults) {
    if (!new RegExp(`^${key}=`, 'm').test(text)) {
      if (!text.endsWith('\n')) text += '\n';
      text += `\n# dev-local bootstrap\n${key}=${value}\n`;
      patched = true;
    }
  }
  if (patched) {
    writeFileSync(envPath, text, 'utf8');
    log('Appended equipment ledger env defaults to .env.local');
  }
}

function pidsOnPortWin32(p) {
  try {
    const out = execSync(`netstat -ano -p tcp | findstr :${p} | findstr LISTENING`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

async function ensureAuthReachable() {
  const text = readFileSync(resolve(repoRoot, '.env.local'), 'utf8');
  const value = (name) => {
    const match = text.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm'));
    return match?.[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  };
  const url = value('NEXT_PUBLIC_SUPABASE_URL');
  const key = value('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  try {
    const response = await fetch(new URL('/auth/v1/settings', url), {
      headers: { apikey: key },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      fail(`Supabase auth check failed (HTTP ${response.status}). Check .env.local credentials.`, 2);
    }
    log('Supabase auth connection verified.');
  } catch (error) {
    const codes = [error?.cause?.code, ...(error?.cause?.errors ?? []).map((item) => item.code)];
    if (codes.includes('EACCES') || codes.includes('EPERM')) {
      fail('Supabase auth connection blocked by process permissions. Restart npm run dev:local with network access; login cannot work in this sandbox.', 2);
    }
    fail('Supabase auth connection unavailable. Check network access before opening local login.', 2);
  }
}

function killPidsWin32(pids) {
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      log(`Freed port ${port} (stopped PID ${pid})`);
    } catch {
      /* already gone */
    }
  }
}

function freePortIfNeeded() {
  if (skipKill) return;
  if (process.platform === 'win32') {
    const pids = pidsOnPortWin32(port);
    if (pids.length) killPidsWin32(pids);
    return;
  }
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    if (out) {
      for (const pid of out.split(/\s+/)) {
        try {
          process.kill(Number(pid), 'SIGTERM');
          log(`Freed port ${port} (signal PID ${pid})`);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* port free */
  }
}

function waitForPortOpen(ms = 60_000) {
  const start = Date.now();
  return new Promise((resolvePromise, reject) => {
    const tick = () => {
      const socket = createConnection({ port, host }, () => {
        socket.end();
        resolvePromise(true);
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > ms) reject(new Error('timeout waiting for port'));
        else setTimeout(tick, 400);
      });
    };
    tick();
  });
}

async function waitForHttpReady(ms = 120_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(`${baseUrl}/`, { redirect: 'follow' });
      const html = await res.text();
      if (res.ok && (html.includes('__next') || html.includes('_next'))) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Next.js did not respond in time');
}

async function isAlreadyHealthy() {
  try {
    const res = await fetch(`${baseUrl}/`, { redirect: 'follow' });
    const html = await res.text();
    return res.ok && (html.includes('__next') || html.includes('_next'));
  } catch {
    return false;
  }
}

async function main() {
  ensureRepo();
  ensureNodeModules();
  ensureEnvLocal();
  await ensureAuthReachable();

  if (await isAlreadyHealthy()) {
    log(`Already running at ${baseUrl}`);
    if (checkOnly) process.exit(0);
    log('Use --no-kill-port and stop the other process if you need a fresh server.');
    process.exit(0);
  }

  if (checkOnly) fail(`Dev server not healthy at ${baseUrl}`, 3);

  freePortIfNeeded();

  const nextCli = resolve(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  log(`Starting Next.js at ${baseUrl} …`);

  const child = spawn(process.execPath, [nextCli, 'dev', '-p', String(port), '-H', host], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  child.on('error', (err) => fail(String(err)));

  await waitForPortOpen().catch(() => fail('Dev process did not bind to port'));
  await waitForHttpReady().catch(() => {
    child.kill('SIGTERM');
    fail('Dev server bound but HTTP health check failed');
  });

  log(`Ready: ${baseUrl}`);
  log('Admin inventory: /admin/inventory');

  child.on('exit', (code, signal) => {
    if (signal) process.exit(1);
    process.exit(code ?? 0);
  });
}

main().catch((e) => fail(e.message ?? String(e)));
