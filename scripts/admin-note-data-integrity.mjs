/**
 * Admin Note data integrity audit/repair.
 *
 * Dry run:
 *   node scripts/admin-note-data-integrity.mjs
 *
 * Apply safe repairs:
 *   node scripts/admin-note-data-integrity.mjs --apply
 *
 * The canonical child-document parent is the active page block. note_documents.parent_id
 * is only a projection, so this script reports and optionally repairs projection drift
 * and missing page blocks for projected children.
 */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import {
  collectIssues,
  countIssues,
} from './lib/admin-note-data-integrity-core.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLY = process.argv.includes('--apply');
const LIMIT = Number.parseInt(
  process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) ?? '5000',
  10,
);
const PAGE_SIZE = 1000;
const MUTATION_CHUNK_SIZE = 500;

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

async function loadData() {
  const fetchPages = async (table, select, configure, limit) => {
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
  };

  const documents = await fetchPages(
    'note_documents',
    'id,title,parent_id,deleted_at,updated_at',
    (query) => query.order('updated_at', { ascending: false }),
    LIMIT,
  );

  const blocks = await fetchPages(
    'note_blocks',
    'id,document_id,parent_block_id,type,order_index,content,deleted_at,updated_at',
    (query) => query.order('updated_at', { ascending: false }),
    LIMIT * 4,
  );

  return {
    documents,
    blocks,
  };
}

async function applyRepairs(issues) {
  const now = new Date().toISOString();
  let repaired = 0;

  const chunks = (values, size = MUTATION_CHUNK_SIZE) => {
    const out = [];
    for (let index = 0; index < values.length; index += size) {
      out.push(values.slice(index, index + size));
    }
    return out;
  };

  for (const doc of issues.selfParentDocuments) {
    const { error } = await supabase
      .from('note_documents')
      .update({ parent_id: null, updated_at: now })
      .eq('id', doc.id);
    if (error) throw error;
    repaired += 1;
  }

  for (const { doc, canonicalParent } of issues.staleParentDocuments) {
    const { error } = await supabase
      .from('note_documents')
      .update({ parent_id: canonicalParent, updated_at: now })
      .eq('id', doc.id);
    if (error) throw error;
    repaired += 1;
  }

  for (const { child, parent } of issues.missingPageBlocks) {
    if (!parent) continue;
    const { data: lastRoot, error: orderError } = await supabase
      .from('note_blocks')
      .select('order_index')
      .eq('document_id', parent.id)
      .is('parent_block_id', null)
      .is('deleted_at', null)
      .order('order_index', { ascending: false })
      .limit(1);
    if (orderError) throw orderError;
    const nextOrder = typeof lastRoot?.[0]?.order_index === 'number'
      ? lastRoot[0].order_index + 1
      : 0;
    const { error } = await supabase
      .from('note_blocks')
      .insert({
        document_id: parent.id,
        parent_block_id: null,
        type: 'page',
        order_index: nextOrder,
        content: {
          page_document_id: child.id,
          title: child.title || 'Untitled',
          repairedBy: 'admin-note-data-integrity',
        },
        created_at: now,
        updated_at: now,
      });
    if (error) throw error;
    repaired += 1;
  }

  for (const link of issues.selfPageLinks) {
    const { error } = await supabase
      .from('note_blocks')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', link.id);
    if (error) throw error;
    repaired += 1;
  }

  for (const { links } of issues.duplicatePageLinks) {
    const staleIds = links.slice(1).map((link) => link.id);
    if (staleIds.length === 0) continue;
    const { error } = await supabase
      .from('note_blocks')
      .update({ deleted_at: now, updated_at: now })
      .in('id', staleIds);
    if (error) throw error;
    repaired += staleIds.length;
  }

  const orphanedBlockIds = [
    ...issues.missingBlockParents.map((block) => block.id),
    ...issues.crossDocumentBlockParents.map(({ block }) => block.id),
  ];
  if (orphanedBlockIds.length > 0) {
    const { error } = await supabase
      .from('note_blocks')
      .update({ parent_block_id: null, updated_at: now })
      .in('id', [...new Set(orphanedBlockIds)]);
    if (error) throw error;
    repaired += new Set(orphanedBlockIds).size;
  }

  const blocksInDeletedDocs = issues.activeBlocksInDeletedDocuments.map(({ block }) => block.id);
  if (blocksInDeletedDocs.length > 0) {
    const uniqueIds = [...new Set(blocksInDeletedDocs)];
    for (const chunk of chunks(uniqueIds)) {
      const { error } = await supabase
        .from('note_blocks')
        .update({ deleted_at: now, updated_at: now })
        .in('id', chunk)
        .is('deleted_at', null);
      if (error) throw error;
    }
    repaired += uniqueIds.length;
  }

  return repaired;
}

function printIssueList(label, items, render) {
  console.log(`${label}: ${items.length}`);
  for (const item of items.slice(0, 12)) {
    console.log(`  - ${render(item)}`);
  }
  if (items.length > 12) console.log(`  ... ${items.length - 12} more`);
}

async function main() {
  const { documents, blocks } = await loadData();
  const issues = collectIssues(documents, blocks);
  const total = countIssues(issues);

  console.log(`Admin Note data integrity ${APPLY ? 'repair' : 'audit'} (${documents.length} docs, ${blocks.length} blocks)`);
  printIssueList('self parent documents', issues.selfParentDocuments, (doc) => `${doc.title} <${doc.id}>`);
  printIssueList('stale parent projections', issues.staleParentDocuments, ({ doc, canonicalParent }) => (
    `${doc.title} <${doc.id}> parent_id=${doc.parent_id ?? 'null'} canonical=${canonicalParent ?? 'null'}`
  ));
  printIssueList('missing page blocks for projected children', issues.missingPageBlocks, ({ child, parent }) => (
    `${child.title} <${child.id}> parent=${parent?.title ?? 'missing'} <${child.parent_id}>`
  ));
  printIssueList('self page links', issues.selfPageLinks, (block) => `${block.id} document=${block.document_id}`);
  printIssueList('duplicate active page links', issues.duplicatePageLinks, ({ child, links }) => (
    `${child?.title ?? 'unknown'} <${child?.id ?? 'unknown'}> links=${links.map((link) => link.id).join(',')}`
  ));
  printIssueList('missing block parents', issues.missingBlockParents, (block) => `${block.id} parent=${block.parent_block_id}`);
  printIssueList('cross-document block parents', issues.crossDocumentBlockParents, ({ block, parent }) => (
    `${block.id} doc=${block.document_id} parent=${parent.id} parentDoc=${parent.document_id}`
  ));
  printIssueList('active blocks in deleted documents', issues.activeBlocksInDeletedDocuments, ({ block, document }) => (
    `${block.id} doc=${document.title ?? document.id} <${document.id}> docDeleted=${document.deleted_at}`
  ));

  if (!APPLY) {
    console.log(`\nDry run complete. ${total} issue group item(s) found. Use --apply for safe repairs.`);
    return;
  }

  let currentIssues = issues;
  let currentTotal = total;
  let repairedTotal = 0;
  for (let pass = 1; currentTotal > 0 && pass <= 5; pass += 1) {
    const repaired = await applyRepairs(currentIssues);
    repairedTotal += repaired;
    if (repaired === 0) break;

    const nextData = await loadData();
    currentIssues = collectIssues(nextData.documents, nextData.blocks);
    currentTotal = countIssues(currentIssues);
  }

  console.log(`\nApplied ${repairedTotal} safe repair(s).`);
  if (currentTotal > 0) {
    console.log(`${currentTotal} issue group item(s) remain after repair passes.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
