/**
 * Admin Note content integrity audit/repair.
 *
 * Dry run:
 *   node scripts/admin-note-content-integrity.mjs
 *
 * Apply safe duplicate paste repairs:
 *   node scripts/admin-note-content-integrity.mjs --apply
 */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLY = process.argv.includes('--apply');
const PAGE_SIZE = 1000;
const LIMIT = Number.parseInt(
  process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) ?? '50000',
  10,
);

const KNOWN_PASTE_SIGNATURES = [
  [
    '\uC218\uC5C5 \uC548\uB0B4 \uBC0F \uD53C\uB4DC\uBC31',
    '\uC218\uC5C5 \uC870\uC815',
    '\uB3C4\uC2DD\uD654 \u2192 \uC2E4\uC0AC\uD654',
    '\uC720\uD29C\uBE0C',
    '\uC591\uCC9C 1\uD638 \uCD9C\uAC15',
  ],
  [
    '\uC218\uC5C5 \uC548\uB0B4 \uBC0F \uD53C\uB4DC\uBC31 / \uC218\uC5C5 \uC870\uC815',
    '\uC720\uD29C\uBE0C \uC5C5\uB85C\uB4DC',
    '\uB3C4\uC2DD\uD654 \u2192 \uC2E4\uC0AC\uD654',
  ],
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const supabase = createClient(
  requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
);

async function fetchPages(table, select, configure, limit = LIMIT) {
  const rows = [];
  for (let from = 0; from < limit; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE - 1, limit - 1);
    let query = supabase.from(table).select(select).range(from, to);
    query = configure(query);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function textOf(content) {
  const parts = [];
  const visit = (value) => {
    if (value == null) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      parts.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(content);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function normalizedContentKey(block) {
  const text = textOf(block.content);
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\b(true|false|null)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isKnownDuplicatePaste(key, rows) {
  if (rows.length < 2) return false;
  if (key.includes('NOTE_BLOCKS_JSON')) return true;
  return KNOWN_PASTE_SIGNATURES.some((signature) => signature.every((needle) => key.includes(needle)));
}

function sortVisual(rows) {
  return [...rows].sort((left, right) => (
    String(left.document_id).localeCompare(String(right.document_id))
    || String(left.parent_block_id ?? '').localeCompare(String(right.parent_block_id ?? ''))
    || (left.order_index ?? 0) - (right.order_index ?? 0)
    || String(left.id).localeCompare(String(right.id))
  ));
}

async function main() {
  const documents = await fetchPages(
    'note_documents',
    'id,title,parent_id,deleted_at,updated_at',
    (query) => query.order('updated_at', { ascending: false }),
    LIMIT,
  );
  const documentById = new Map(documents.map((document) => [document.id, document]));
  const activeDocumentIds = new Set(documents.filter((document) => !document.deleted_at).map((document) => document.id));

  const blocks = await fetchPages(
    'note_blocks',
    'id,document_id,parent_block_id,type,content,order_index,version,deleted_at,updated_at',
    (query) => query.is('deleted_at', null).order('updated_at', { ascending: false }),
    LIMIT,
  );

  const groups = new Map();
  for (const block of blocks) {
    if (!activeDocumentIds.has(block.document_id)) continue;
    const key = normalizedContentKey(block);
    if (key.length < 30) continue;
    const rows = groups.get(key) ?? [];
    rows.push(block);
    groups.set(key, rows);
  }

  const knownDuplicateGroups = [];
  const suspiciousDuplicateGroups = [];
  for (const [key, rows] of groups.entries()) {
    if (rows.length < 2) continue;
    const sorted = sortVisual(rows);
    const item = {
      count: sorted.length,
      key,
      keep: sorted[0],
      deleteRows: sorted.slice(1),
    };
    if (isKnownDuplicatePaste(key, sorted)) knownDuplicateGroups.push(item);
    else if (sorted.length >= 5 && key.length >= 80) suspiciousDuplicateGroups.push(item);
  }

  let deleted = 0;
  const errors = [];
  if (APPLY) {
    const now = new Date().toISOString();
    for (const group of knownDuplicateGroups) {
      for (const block of group.deleteRows) {
        const { error } = await supabase
          .from('note_blocks')
          .update({
            deleted_at: now,
            updated_at: now,
            version: (block.version ?? 1) + 1,
          })
          .eq('id', block.id)
          .is('deleted_at', null);
        if (error) errors.push({ id: block.id, message: error.message });
        else deleted += 1;
      }
    }
  }

  const renderGroup = (group) => ({
    count: group.count,
    document: documentById.get(group.keep.document_id)?.title ?? group.keep.document_id,
    document_id: group.keep.document_id,
    keep: {
      id: group.keep.id,
      parent_block_id: group.keep.parent_block_id,
      order_index: group.keep.order_index,
    },
    deleteCount: group.deleteRows.length,
    text: group.key.slice(0, 240),
  });

  console.log(JSON.stringify({
    mode: APPLY ? 'repair' : 'audit',
    documents: documents.length,
    activeBlocks: blocks.length,
    knownDuplicateGroups: knownDuplicateGroups.length,
    knownDuplicateBlocksToDelete: knownDuplicateGroups.reduce((sum, group) => sum + group.deleteRows.length, 0),
    suspiciousDuplicateGroups: suspiciousDuplicateGroups.length,
    deleted,
    errors,
    knownDuplicates: knownDuplicateGroups.slice(0, 12).map(renderGroup),
    suspiciousDuplicates: suspiciousDuplicateGroups.slice(0, 12).map(renderGroup),
  }, null, 2));

  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
