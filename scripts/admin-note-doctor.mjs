/**
 * Admin Note doctor.
 *
 * One safe entry point for operational checks. Dry-run by default.
 *
 * Usage:
 *   node scripts/admin-note-doctor.mjs
 *   node scripts/admin-note-doctor.mjs --all
 *   node scripts/admin-note-doctor.mjs --doc=<document-id>
 *   node scripts/admin-note-doctor.mjs --title=<title>
 *   node scripts/admin-note-doctor.mjs --apply
 *   node scripts/admin-note-doctor.mjs --apply --prune-empty
 *   node scripts/admin-note-doctor.mjs --backup-only
 */
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const BACKUP_ONLY = args.includes('--backup-only');
const PRUNE_EMPTY = args.includes('--prune-empty');
const ALL = args.includes('--all');
const SUMMARY = args.includes('--summary') || ALL;
const BLOCK_FILTER_ARGS = args.filter((arg) =>
  arg.startsWith('--doc=')
  || arg.startsWith('--title=')
  || arg.startsWith('--limit='));
const PAGE_SIZE = 1000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for admin note backup`);
  return value;
}

function createSupabaseClient() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  );
}

function runStep(label, commandArgs) {
  console.log(`\n== ${label} ==`);
  console.log(`node ${commandArgs.join(' ')}`);
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function blockInvariantArgs() {
  const out = ['scripts/admin-note-block-invariants.mjs'];
  if (ALL) out.push('--all');
  if (SUMMARY) out.push('--summary');
  out.push(...BLOCK_FILTER_ARGS);
  if (APPLY) out.push('--apply');
  if (PRUNE_EMPTY) out.push('--prune-empty');
  return out;
}

function dataIntegrityArgs() {
  const out = ['scripts/admin-note-data-integrity.mjs'];
  if (APPLY) out.push('--apply');
  return out;
}

function contentIntegrityArgs() {
  const out = ['scripts/admin-note-content-integrity.mjs'];
  if (APPLY) out.push('--apply');
  return out;
}

function printMode() {
  console.log('Admin Note doctor');
  console.log(`mode=${APPLY ? 'apply' : BACKUP_ONLY ? 'backup-only' : 'dry-run'} all=${ALL ? 'yes' : 'no'} pruneEmpty=${PRUNE_EMPTY ? 'yes' : 'no'}`);
  if (BACKUP_ONLY) {
    console.log('Backup will be written locally. No repairs or audits will run.');
  } else if (!APPLY) {
    console.log('No writes will be made. Pass --apply to repair supported issues.');
  }
}

async function fetchAllRows(supabase, table, select, configure = (query) => query) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const query = configure(supabase.from(table).select(select).range(from, to));
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function writePreApplyBackup() {
  if (!APPLY && !BACKUP_ONLY) return null;
  const supabase = createSupabaseClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(process.cwd(), '.tmp', 'admin-note-backups', timestamp);
  await mkdir(dir, { recursive: true });

  const documents = await fetchAllRows(
    supabase,
    'note_documents',
    'id,title,parent_id,properties,deleted_at,created_at,updated_at',
    (query) => query.order('updated_at', { ascending: false }),
  );
  const blocks = await fetchAllRows(
    supabase,
    'note_blocks',
    'id,document_id,parent_block_id,type,order_index,content,deleted_at,created_at,updated_at,version',
    (query) => query.order('updated_at', { ascending: false }),
  );

  const payload = {
    createdAt: new Date().toISOString(),
    command: ['node', 'scripts/admin-note-doctor.mjs', ...args],
    counts: {
      documents: documents.length,
      blocks: blocks.length,
    },
    documents,
    blocks,
  };
  const file = path.join(dir, 'snapshot.json');
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Pre-apply backup written: ${file}`);
  return file;
}

async function main() {
  printMode();
  const backupFile = await writePreApplyBackup();
  if (BACKUP_ONLY) {
    console.log(`Backup-only complete: ${backupFile}`);
    return;
  }
  runStep('Document/page-link integrity audit', dataIntegrityArgs());
  runStep('Content integrity audit', contentIntegrityArgs());
  runStep('Block invariant audit', blockInvariantArgs());
  console.log('\nAdmin Note doctor complete.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
