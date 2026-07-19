import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DOCUMENT = process.argv.find((arg) => arg.startsWith('--document='))?.slice('--document='.length);
const LIMIT = Number.parseInt(process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) ?? '1000', 10);

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

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function visibleText(content) {
  if (!content || typeof content !== 'object') return '';
  if (typeof content.text === 'string' && content.text.trim()) return content.text.trim();
  if (typeof content.html === 'string' && stripHtml(content.html)) return stripHtml(content.html);
  if (typeof content.title === 'string' && content.title.trim()) return content.title.trim();
  return '';
}

function payloadBlockId(payload) {
  return payload?.blockId ?? payload?.block?.id ?? payload?.id ?? null;
}

function payloadContent(payload) {
  return payload?.content ?? payload?.block?.content ?? null;
}

function payloadParent(payload) {
  if (Object.hasOwn(payload ?? {}, 'parentBlockId')) return payload.parentBlockId;
  if (Object.hasOwn(payload ?? {}, 'parent_block_id')) return payload.parent_block_id;
  if (payload?.block && Object.hasOwn(payload.block, 'parent_block_id')) return payload.block.parent_block_id;
  if (payload?.block && Object.hasOwn(payload.block, 'parentBlockId')) return payload.block.parentBlockId;
  return undefined;
}

function payloadOrder(payload) {
  if (typeof payload?.orderIndex === 'number') return payload.orderIndex;
  if (typeof payload?.order_index === 'number') return payload.order_index;
  if (typeof payload?.block?.order_index === 'number') return payload.block.order_index;
  if (typeof payload?.block?.orderIndex === 'number') return payload.block.orderIndex;
  return undefined;
}

async function resolveDocumentId() {
  if (!DOCUMENT) throw new Error('--document is required');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(DOCUMENT);
  let query = supabase.from('note_documents').select('id,title').limit(5);
  query = isUuid ? query.eq('id', DOCUMENT) : query.eq('title', DOCUMENT);
  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) throw new Error(`Document not found: ${DOCUMENT}`);
  return data[0];
}

async function main() {
  const doc = await resolveDocumentId();
  const [{ data: blocks, error: blocksError }, { data: ops, error: opsError }] = await Promise.all([
    supabase
      .from('note_blocks')
      .select('id,document_id,parent_block_id,type,order_index,content,deleted_at,updated_at')
      .eq('document_id', doc.id)
      .order('order_index', { ascending: true })
      .limit(2000),
    supabase
      .from('note_block_ops')
      .select('seq,op_type,payload,created_at')
      .eq('document_id', doc.id)
      .order('seq', { ascending: true })
      .limit(LIMIT),
  ]);
  if (blocksError) throw blocksError;
  if (opsError) throw opsError;

  const latestOpByBlock = new Map();
  const latestTextOpByBlock = new Map();
  for (const op of ops ?? []) {
    const blockId = payloadBlockId(op.payload);
    if (!blockId) continue;
    latestOpByBlock.set(blockId, op);
    const text = visibleText(payloadContent(op.payload));
    if (text) latestTextOpByBlock.set(blockId, { ...op, text });
  }

  const active = (blocks ?? []).filter((block) => !block.deleted_at);
  const activeTodos = active.filter((block) => block.type === 'todo');
  const emptyTodos = activeTodos.filter((block) => !visibleText(block.content));
  const deletedTodoWithText = (blocks ?? [])
    .filter((block) => block.deleted_at && block.type === 'todo' && visibleText(block.content))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));

  console.log(`Todo audit for "${doc.title}" <${doc.id}>`);
  console.log(`active=${active.length}, activeTodos=${activeTodos.length}, emptyActiveTodos=${emptyTodos.length}, deletedTodoWithText=${deletedTodoWithText.length}`);
  console.log('\nActive todos:');
  for (const block of activeTodos) {
    const latestTextOp = latestTextOpByBlock.get(block.id);
    const latestOp = latestOpByBlock.get(block.id);
    console.log(`- id=${block.id} parent=${block.parent_block_id ?? 'root'} order=${block.order_index} updated=${block.updated_at}`);
    console.log(`  current=${JSON.stringify(visibleText(block.content))}`);
    console.log(`  latestTextOp=${latestTextOp ? `seq ${latestTextOp.seq} ${latestTextOp.created_at} ${JSON.stringify(latestTextOp.text)}` : 'none'}`);
    if (latestOp) {
      console.log(`  latestOp=seq ${latestOp.seq} type=${latestOp.op_type} parent=${payloadParent(latestOp.payload) ?? '(n/a)'} order=${payloadOrder(latestOp.payload) ?? '(n/a)'}`);
    }
  }
  console.log('\nEmpty active todos:');
  for (const block of emptyTodos) {
    console.log(`- id=${block.id} parent=${block.parent_block_id ?? 'root'} order=${block.order_index} latestText=${JSON.stringify(latestTextOpByBlock.get(block.id)?.text ?? '')}`);
  }
  console.log('\nDeleted todos with text, recent first:');
  for (const block of deletedTodoWithText.slice(0, 80)) {
    console.log(`- id=${block.id} parent=${block.parent_block_id ?? 'root'} order=${block.order_index} deleted=${block.deleted_at} updated=${block.updated_at}`);
    console.log(`  text=${JSON.stringify(visibleText(block.content))}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
