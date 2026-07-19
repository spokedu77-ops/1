/**
 * Compare note_block_ops text writes with materialized note_blocks.
 *
 * Dry run:
 *   node scripts/admin-note-ops-materialization-integrity.mjs
 */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import {
  collectOpsMaterializationIssues,
  countOpsMaterializationIssues,
} from './lib/admin-note-ops-materialization-integrity-core.mjs';
import { isEphemeralQaDocumentTitle } from './note-qa/cleanupEphemeralDocs.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const PAGE_SIZE = 1000;
const LIMIT = Number.parseInt(
  process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) ?? '30000',
  10,
);
const DOC = process.argv.find((arg) => arg.startsWith('--document='))?.slice('--document='.length);
const STRICT_SUSPICIOUS = process.argv.includes('--strict-suspicious');
const REPORT_WARNINGS = STRICT_SUSPICIOUS || process.argv.includes('--warnings');
const INCLUDE_DELETED = process.argv.includes('--include-deleted');
const INCLUDE_QA = process.argv.includes('--include-qa');
const STRICT_ORDER = process.argv.includes('--strict-order');

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

function preview(value, max = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function printIssues(label, items, documentsById) {
  console.log(`${label}: ${items.length}`);
  for (const issue of items.slice(0, 30)) {
    const doc = documentsById.get(issue.documentId);
    const destructive = issue.destructive
      ? ` destructive=${issue.destructive.kind} seq=${issue.destructive.op.seq}`
      : '';
    const op = issue.patchOp ?? issue.op;
    const topology = issue.expectedOrder !== undefined
      ? ` expected={doc:${issue.expectedDocument},parent:${issue.expectedParent ?? 'root'},order:${issue.expectedOrder}} actual={doc:${issue.actualDocument},parent:${issue.actualParent ?? 'root'},order:${issue.actualOrder}}`
      : '';
    console.log(
      `  - doc="${doc?.title ?? 'unknown'}" <${issue.documentId ?? 'unknown'}> block=<${issue.blockId}> seq=${op?.seq ?? '?'}${destructive}${topology} text="${preview(issue.expectedText)}"`,
    );
  }
  if (items.length > 30) console.log(`  ... ${items.length - 30} more`);
}

async function main() {
  const documents = await fetchPages(
    'note_documents',
    'id,title,parent_id,deleted_at,updated_at',
    (query) => query.order('updated_at', { ascending: false }),
  );
  const scopedDocuments = documents.filter((doc) => {
    if (DOC && doc.id !== DOC && doc.title !== DOC) return false;
    if (!INCLUDE_DELETED && doc.deleted_at) return false;
    if (!INCLUDE_QA && isEphemeralQaDocumentTitle(doc.title)) return false;
    return true;
  });
  const documentIds = new Set(scopedDocuments.map((doc) => doc.id));
  const documentsById = new Map(documents.map((doc) => [doc.id, doc]));

  const blocks = await fetchPages(
    'note_blocks',
    'id,document_id,parent_block_id,type,order_index,content,deleted_at,updated_at',
    (query) => query.order('updated_at', { ascending: false }),
    LIMIT * 2,
  );
  const ops = await fetchPages(
    'note_block_ops',
    'id,document_id,seq,payload,created_at',
    (query) => query.order('created_at', { ascending: false }),
    LIMIT,
  );

  const scopedOps = ops.filter((op) => documentIds.has(op.document_id));
  const issues = collectOpsMaterializationIssues(blocks, scopedOps, { strictOrder: STRICT_ORDER });
  const hardTotal = issues.missingLatestText.length
    + issues.staleMaterializedText.length
    + issues.staleMaterializedTopology.length;
  const total = countOpsMaterializationIssues(issues);

  console.log(`Admin Note ops materialization audit (${documentIds.size} docs, ${blocks.length} blocks, ${scopedOps.length} ops)`);
  printIssues('missing latest text', issues.missingLatestText, documentsById);
  printIssues('stale materialized text', issues.staleMaterializedText, documentsById);
  printIssues('stale materialized topology', issues.staleMaterializedTopology, documentsById);
  if (REPORT_WARNINGS) {
    printIssues('suspicious text then delete/empty', issues.suspiciousTextThenDelete, documentsById);
  }

  if (hardTotal > 0 || (STRICT_SUSPICIOUS && issues.suspiciousTextThenDelete.length > 0)) {
    process.exitCode = 1;
    console.log(`\nFound ${total} ops/materialization issue(s).`);
    return;
  }
  console.log('\nNo hard ops/materialization issues found.');
  if (!REPORT_WARNINGS && issues.suspiciousTextThenDelete.length > 0) {
    console.log(`Historical delete/empty events are hidden by default; pass --warnings to inspect ${issues.suspiciousTextThenDelete.length} event(s).`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
