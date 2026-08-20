/**
 * Restore hard ops/materialization gaps reported by the Admin Note audit.
 *
 * Dry run: node scripts/repair-admin-note-ops-materialization.mjs
 * Apply:   node scripts/repair-admin-note-ops-materialization.mjs --apply
 */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import {
  collectOpsMaterializationIssues,
  readContentTextForOpsIntegrity,
} from './lib/admin-note-ops-materialization-integrity-core.mjs';
import { isEphemeralQaDocumentTitle } from './note-qa/cleanupEphemeralDocs.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLY = process.argv.includes('--apply');
const PAGE_SIZE = 1000;
const LIMIT = 30000;

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

function payloadOf(op) {
  return op?.payload && typeof op.payload === 'object' ? op.payload : {};
}

function latestTopology(blockId, ops, fallback) {
  const topology = { ...fallback };
  for (const op of ops) {
    const payload = payloadOf(op);
    if (payload.opType !== 'patch_fields' && payload.opType !== 'block_transaction') continue;
    const patch = Array.isArray(payload.patches)
      ? payload.patches.find((item) => item?.id === blockId)
      : null;
    if (!patch) continue;
    if (typeof patch.document_id === 'string') topology.document_id = patch.document_id;
    if (patch.parent_block_id === null || typeof patch.parent_block_id === 'string') {
      topology.parent_block_id = patch.parent_block_id;
    }
    if (typeof patch.order_index === 'number') topology.order_index = patch.order_index;
    if (typeof patch.type === 'string') topology.type = patch.type;
  }
  return topology;
}

function preview(value, max = 100) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function main() {
  const [documents, blocks, ops] = await Promise.all([
    fetchPages('note_documents', 'id,title,deleted_at', (query) => query.order('updated_at', { ascending: false })),
    fetchPages(
      'note_blocks',
      'id,document_id,parent_block_id,type,order_index,content,deleted_at,deleted_by,created_at,updated_at,version',
      (query) => query.order('updated_at', { ascending: false }),
      LIMIT * 2,
    ),
    fetchPages(
      'note_block_ops',
      'id,document_id,seq,payload,created_at',
      (query) => query.order('created_at', { ascending: false }),
    ),
  ]);

  const activeDocuments = documents.filter((doc) => !doc.deleted_at && !isEphemeralQaDocumentTitle(doc.title));
  const documentIds = new Set(activeDocuments.map((doc) => doc.id));
  const documentsById = new Map(documents.map((doc) => [doc.id, doc]));
  const scopedOps = ops
    .filter((op) => documentIds.has(op.document_id))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || Number(a.seq) - Number(b.seq));
  const issues = collectOpsMaterializationIssues(blocks, scopedOps);
  const targets = [...issues.missingLatestText, ...issues.staleMaterializedText];

  console.log(`Admin Note ops materialization repair ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`targets=${targets.length} missing=${issues.missingLatestText.length} stale=${issues.staleMaterializedText.length}`);
  if (issues.staleMaterializedTopology.length > 0) {
    throw new Error(`Refusing content-only repair: ${issues.staleMaterializedTopology.length} topology issue(s) also exist.`);
  }

  const plans = targets.map((issue) => {
    const createPayload = payloadOf(issue.createOp);
    const existing = issue.block ?? blocks.find((block) => block.id === issue.blockId) ?? null;
    const base = {
      document_id: existing?.document_id ?? createPayload.documentId ?? issue.documentId,
      parent_block_id: existing?.parent_block_id ?? createPayload.parent_block_id ?? null,
      order_index: existing?.order_index ?? createPayload.order_index ?? 0,
      type: existing?.type ?? createPayload.blockType ?? 'text',
    };
    const topology = latestTopology(issue.blockId, scopedOps, base);
    if (!topology.document_id || !documentIds.has(topology.document_id)) {
      throw new Error(`Target ${issue.blockId} has no active destination document.`);
    }
    return { issue, existing, topology };
  });

  for (const { issue, existing, topology } of plans) {
    const doc = documentsById.get(topology.document_id);
    console.log(
      `- ${existing ? (existing.deleted_at ? 'restore' : 'patch') : 'insert'} block=<${issue.blockId}> doc="${doc?.title ?? topology.document_id}" parent=${topology.parent_block_id ?? 'root'} order=${topology.order_index} type=${topology.type} text="${preview(issue.expectedText)}"`,
    );
  }
  if (!APPLY) return;

  const now = new Date().toISOString();
  let applied = 0;
  for (const { issue, existing, topology } of plans) {
    const { data: current, error: currentError } = await supabase
      .from('note_blocks')
      .select('id,content,deleted_at,updated_at')
      .eq('id', issue.blockId)
      .maybeSingle();
    if (currentError) throw currentError;
    if (current && !current.deleted_at && readContentTextForOpsIntegrity(current.content)) {
      throw new Error(`Concurrent active content detected for ${issue.blockId}; aborting.`);
    }

    if (current || existing) {
      const { error } = await supabase
        .from('note_blocks')
        .update({
          ...topology,
          content: issue.expectedContent,
          deleted_at: null,
          deleted_by: null,
          updated_at: now,
        })
        .eq('id', issue.blockId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('note_blocks').insert({
        id: issue.blockId,
        ...topology,
        content: issue.expectedContent,
        deleted_at: null,
        created_at: issue.createOp?.created_at ?? issue.patchOp?.created_at ?? now,
        updated_at: now,
        version: 1,
      });
      if (error) throw error;
    }
    applied += 1;
  }
  console.log(`Applied ${applied} repair(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
