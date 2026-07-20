/**
 * Admin Note block invariant audit.
 *
 * Dry run recent documents:
 *   node scripts/admin-note-block-invariants.mjs
 *
 * Target real documents by title/id:
 *   node scripts/admin-note-block-invariants.mjs --title=최지훈 --title=공통보드
 *   node scripts/admin-note-block-invariants.mjs --doc=7c095438-335b-4318-a3fb-09145f01d24a
 *   node scripts/admin-note-block-invariants.mjs --all
 *   node scripts/admin-note-block-invariants.mjs --all --summary
 *
 * Apply deterministic order repairs and prune unwanted blank visible rows:
 *   node scripts/admin-note-block-invariants.mjs --title=김윤기 --apply --prune-empty
 */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import {
  auditBlockInvariants,
  countCriticalInvariantIssues,
  countWarningInvariantIssues,
  readBlockText,
} from './note-qa/blockInvariants.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const LIMIT = Number.parseInt(
  process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) ?? '30',
  10,
);
const TITLE_FILTERS = process.argv
  .filter((arg) => arg.startsWith('--title='))
  .map((arg) => arg.slice('--title='.length).trim())
  .filter(Boolean);
const DOC_IDS = process.argv
  .filter((arg) => arg.startsWith('--doc='))
  .map((arg) => arg.slice('--doc='.length).trim())
  .filter(Boolean);
const ALL = process.argv.includes('--all');
const APPLY = process.argv.includes('--apply');
const PRUNE_EMPTY = process.argv.includes('--prune-empty');
const SUMMARY = process.argv.includes('--summary');
const MUTATION_CHUNK_SIZE = 200;
const PAGE_SIZE = 1000;

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

async function loadDocuments() {
  const results = [];
  if (ALL) {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('note_documents')
        .select('id,title,deleted_at,updated_at')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) break;
    }
    return rows;
  }

  if (DOC_IDS.length > 0) {
    const { data, error } = await supabase
      .from('note_documents')
      .select('id,title,deleted_at,updated_at')
      .in('id', DOC_IDS);
    if (error) throw error;
    results.push(...(data ?? []));
  }

  if (TITLE_FILTERS.length > 0) {
    for (const title of TITLE_FILTERS) {
      const { data, error } = await supabase
        .from('note_documents')
        .select('id,title,deleted_at,updated_at')
        .is('deleted_at', null)
        .ilike('title', `%${title}%`)
        .order('updated_at', { ascending: false })
        .limit(LIMIT);
      if (error) throw error;
      results.push(...(data ?? []));
    }
    return [...new Map(results.map((document) => [document.id, document])).values()];
  }

  if (results.length > 0) {
    return [...new Map(results.map((document) => [document.id, document])).values()];
  }

  const { data, error } = await supabase
    .from('note_documents')
    .select('id,title,deleted_at,updated_at')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(LIMIT);
  if (error) throw error;
  return data ?? [];
}

async function loadBlocks(documentIds) {
  if (documentIds.length === 0) return [];
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('note_blocks')
      .select('id,document_id,parent_block_id,type,order_index,content,deleted_at,updated_at')
      .in('document_id', documentIds)
      .is('deleted_at', null)
      .order('document_id', { ascending: true })
      .order('parent_block_id', { ascending: true, nullsFirst: true })
      .order('order_index', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return [...new Map(rows.map((block) => [block.id, block])).values()];
}

function printList(label, items, render) {
  console.log(`${label}: ${items.length}`);
  for (const item of items.slice(0, 8)) {
    console.log(`  - ${render(item)}`);
  }
  if (items.length > 8) console.log(`  ... ${items.length - 8} more`);
}

function describeBlock(block) {
  return `${block.id} ${block.type} order=${block.order_index} text="${readBlockText(block).slice(0, 48)}"`;
}

function printDocumentAudit(document, blocks) {
  const issues = auditBlockInvariants(blocks);
  const critical = countCriticalInvariantIssues(issues);
  const warnings = countWarningInvariantIssues(issues);

  if (SUMMARY && critical === 0 && warnings === 0) {
    console.log(`${document.title ?? 'Untitled'} <${document.id}> blocks=${blocks.length} ok`);
    return { critical, warnings };
  }

  console.log(`\n${document.title ?? 'Untitled'} <${document.id}> blocks=${blocks.length} critical=${critical} warnings=${warnings}`);
  printList('  missing parents', issues.missingParents, describeBlock);
  printList('  cross-document parents', issues.crossDocumentParents, ({ block, parent }) => (
    `${describeBlock(block)} parent=${parent.id} parentDoc=${parent.document_id}`
  ));
  printList('  cycles', issues.cycles, ({ path }) => path.join(' -> '));
  printList('  forbidden parents', issues.forbiddenParents, ({ block, parent }) => (
    `${describeBlock(block)} parentType=${parent?.type ?? 'root'} parent=${parent?.id ?? 'root'}`
  ));
  printList('  duplicate sibling orders', issues.duplicateSiblingOrders, ({ parentId, order, blocks: dupes }) => (
    `parent=${parentId} order=${order} blocks=${dupes.map((block) => block.id).join(',')}`
  ));
  printList('  non-contiguous sibling orders', issues.nonContiguousSiblingOrders, ({ parentId, orders }) => (
    `parent=${parentId} orders=${orders.join(',')}`
  ));
  printList('  empty visible rows (warning)', issues.emptyVisibleBlocks, describeBlock);

  return { critical, warnings };
}

function buildOrderRepairs(blocks) {
  const groups = new Map();
  for (const block of blocks) {
    const parentKey = block.parent_block_id ?? '__root__';
    const group = groups.get(parentKey) ?? [];
    group.push(block);
    groups.set(parentKey, group);
  }

  const repairs = [];
  for (const siblings of groups.values()) {
    const sorted = [...siblings].sort((left, right) => (
      (left.order_index ?? 0) - (right.order_index ?? 0)
      || String(left.updated_at ?? '').localeCompare(String(right.updated_at ?? ''))
      || String(left.id).localeCompare(String(right.id))
    ));
    sorted.forEach((block, index) => {
      if (block.order_index !== index) {
        repairs.push({ id: block.id, order_index: index });
      }
    });
  }
  return repairs;
}

function buildStructuralRepairs(blocks) {
  const issues = auditBlockInvariants(blocks);
  const repairIds = new Set([
    ...issues.missingParents.map((block) => block.id),
    ...issues.crossDocumentParents.map(({ block }) => block.id),
    ...issues.cycles.map(({ block }) => block.id),
    ...issues.forbiddenParents.map(({ block }) => block.id),
  ]);
  return [...repairIds];
}

async function applyDocumentRepairs(document, blocks) {
  const now = new Date().toISOString();
  let workingBlocks = blocks;
  const structuralRepairIds = buildStructuralRepairs(workingBlocks);
  for (let index = 0; index < structuralRepairIds.length; index += MUTATION_CHUNK_SIZE) {
    const chunk = structuralRepairIds.slice(index, index + MUTATION_CHUNK_SIZE);
    if (chunk.length === 0) continue;
    const { error } = await supabase
      .from('note_blocks')
      .update({ parent_block_id: null, updated_at: now })
      .in('id', chunk)
      .is('deleted_at', null);
    if (error) throw error;
  }
  if (structuralRepairIds.length > 0) {
    const repairSet = new Set(structuralRepairIds);
    workingBlocks = workingBlocks.map((block) => (
      repairSet.has(block.id)
        ? { ...block, parent_block_id: null, updated_at: now }
        : block
    ));
  }

  let orderRepairCount = 0;
  const applyOrderRepairs = async () => {
    const orderRepairs = buildOrderRepairs(workingBlocks);
    for (const repair of orderRepairs) {
      const { error } = await supabase
        .from('note_blocks')
        .update({ order_index: repair.order_index, updated_at: now })
        .eq('id', repair.id);
      if (error) throw error;
    }
    orderRepairCount += orderRepairs.length;
  };

  await applyOrderRepairs();

  let pruned = 0;
  if (PRUNE_EMPTY) {
    const issues = auditBlockInvariants(workingBlocks);
    const emptyIds = [...new Set(issues.emptyVisibleBlocks.map((block) => block.id))];
    for (let index = 0; index < emptyIds.length; index += MUTATION_CHUNK_SIZE) {
      const chunk = emptyIds.slice(index, index + MUTATION_CHUNK_SIZE);
      if (chunk.length === 0) continue;
      const { error } = await supabase
        .from('note_blocks')
        .update({ deleted_at: now, updated_at: now })
        .in('id', chunk)
        .is('deleted_at', null);
      if (error) throw error;
      pruned += chunk.length;
    }
    if (emptyIds.length > 0) {
      const emptySet = new Set(emptyIds);
      workingBlocks = workingBlocks.filter((block) => !emptySet.has(block.id));
      await applyOrderRepairs();
    }
  }

  console.log(`${document.title ?? document.id}: repaired structure=${structuralRepairIds.length} order=${orderRepairCount} prunedEmpty=${pruned}`);
  return structuralRepairIds.length + orderRepairCount + pruned;
}

async function main() {
  const documents = await loadDocuments();
  const blocks = await loadBlocks(documents.map((document) => document.id));
  const blocksByDocument = new Map();
  for (const block of blocks) {
    const list = blocksByDocument.get(block.document_id) ?? [];
    list.push(block);
    blocksByDocument.set(block.document_id, list);
  }

  let critical = 0;
  let warnings = 0;
  console.log(`Admin Note block invariant audit (${documents.length} docs, ${blocks.length} blocks)`);
  for (const document of documents) {
    const result = printDocumentAudit(document, blocksByDocument.get(document.id) ?? []);
    critical += result.critical;
    warnings += result.warnings;
  }

  if (APPLY) {
    let repaired = 0;
    for (const document of documents) {
      repaired += await applyDocumentRepairs(document, blocksByDocument.get(document.id) ?? []);
    }
    console.log(`\nApplied ${repaired} block repair(s). Re-run audit to verify.`);
    return;
  }

  console.log(`\nTotal critical=${critical} warnings=${warnings}`);
  if (critical > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
