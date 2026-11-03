#!/usr/bin/env node
/**
 * Apply equipment migrations via Supabase CLI (no DATABASE_URL in .env).
 * One-time setup (interactive):
 *   npx supabase@3 login
 *   npx supabase@3 link --project-ref mwgvserdyflsqyhcqecp
 * Then:
 *   npm run db:equipment:cli
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PREFIXES = [
  '20261030110000_',
  '20261030120000_',
  '20261030130000_',
  '20261030200000_',
  '20261030210000_',
  '20261102120000_',
];

function supabase(args) {
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return spawnSync(cmd, ['--yes', 'supabase@3', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
}

function equipmentFiles() {
  return readdirSync(resolve(repoRoot, 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql') && PREFIXES.some((p) => f.startsWith(p)))
    .sort();
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = equipmentFiles();
  if (files.length === 0) {
    console.error('[equipment-cli] no migration files');
    process.exit(1);
  }

  console.log('[equipment-cli] Supabase CLI path (교구 6개만, 전체 db push 아님)');
  if (dryRun) {
    console.log('[equipment-cli] dry-run files:', files.join(', '));
    return;
  }

  for (const file of files) {
    const path = resolve(repoRoot, 'supabase/migrations', file);
    console.log('[equipment-cli] applying', file, '…');
    const r = supabase(['db', 'query', '--remote', '--yes', '-f', path]);
    if (r.status !== 0) {
      console.error(r.stdout || r.stderr || '[equipment-cli] failed');
      console.error('');
      console.error('처음이면 한 번만 실행:');
      console.error('  npx supabase@3 login');
      console.error('  npx supabase@3 link --project-ref mwgvserdyflsqyhcqecp');
      process.exit(r.status ?? 1);
    }
    console.log('[equipment-cli] OK', file);
  }
  console.log('[equipment-cli] done — /admin/inventory 새로고침');
}

main();
