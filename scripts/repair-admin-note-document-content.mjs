import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLY = process.argv.includes('--apply');
const TITLE = process.argv.find((arg) => arg.startsWith('--title='))?.slice('--title='.length)
  ?? process.argv.slice(2).join(' ');
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

function compact(value) {
  return String(value ?? '').replace(/\s+/g, '').toLocaleLowerCase('ko-KR');
}

async function fetchAll(table, select, configure) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    query = configure(query);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeTextContent(block) {
  const content = block.content && typeof block.content === 'object' ? block.content : {};
  const text = typeof content.text === 'string' ? content.text.trim() : '';
  const htmlText = typeof content.html === 'string' ? stripHtml(content.html) : '';
  const legacyText = typeof content.legacyText === 'string' ? content.legacyText.trim() : '';
  const nextText = text || htmlText || legacyText;
  const next = { ...content };
  delete next.legacyText;
  delete next.legacyBody;
  delete next.legacyBodyHtml;
  delete next.placedInToggle;
  delete next.createdInsideToggle;
  if (block.type === 'toggle') {
    if (typeof next.title !== 'string' || !next.title.trim()) {
      next.title = nextText;
    }
    delete next.text;
    delete next.html;
    return next;
  }
  if (nextText) {
    next.text = nextText;
    if (typeof next.html !== 'string' || !stripHtml(next.html)) {
      next.html = `<p>${escapeHtml(nextText)}</p>`;
    }
  }
  return next;
}

function isEmptyTextBlock(block) {
  if (block.type !== 'text') return false;
  const content = block.content && typeof block.content === 'object' ? block.content : {};
  return ![
    content.text,
    stripHtml(content.html),
    content.title,
    content.legacyText,
    content.legacyBody,
  ].some((value) => typeof value === 'string' && value.trim());
}

function changed(a, b) {
  return JSON.stringify(a ?? {}) !== JSON.stringify(b ?? {});
}

async function main() {
  if (!TITLE.trim()) throw new Error('Provide --title');
  const documents = await fetchAll(
    'note_documents',
    'id,title,deleted_at',
    (query) => query.is('deleted_at', null),
  );
  const document = documents.find((doc) => compact(doc.title) === compact(TITLE))
    ?? documents.find((doc) => compact(doc.title).includes(compact(TITLE)));
  if (!document) throw new Error(`document not found: ${TITLE}`);

  const blocks = await fetchAll(
    'note_blocks',
    'id,document_id,parent_block_id,type,order_index,content,deleted_at,updated_at',
    (query) => query
      .eq('document_id', document.id)
      .is('deleted_at', null)
      .order('parent_block_id', { ascending: true, nullsFirst: true })
      .order('order_index', { ascending: true }),
  );
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const contentPatches = [];
  const emptyChildDeletes = [];

  for (const block of blocks) {
    const nextContent = normalizeTextContent(block);
    if (changed(block.content, nextContent)) {
      contentPatches.push({ id: block.id, before: block.content, after: nextContent });
    }
    const parent = block.parent_block_id ? byId.get(block.parent_block_id) : null;
    if (parent?.type === 'toggle' && isEmptyTextBlock(block)) {
      emptyChildDeletes.push(block);
    }
  }
  const deleteIds = new Set(emptyChildDeletes.map((block) => block.id));
  const remainingBlocks = blocks.filter((block) => !deleteIds.has(block.id));
  const blocksByParent = new Map();
  for (const block of remainingBlocks) {
    const key = block.parent_block_id ?? 'root';
    const siblings = blocksByParent.get(key) ?? [];
    siblings.push(block);
    blocksByParent.set(key, siblings);
  }
  const orderPatches = [];
  for (const siblings of blocksByParent.values()) {
    siblings
      .sort((a, b) => a.order_index - b.order_index || a.updated_at.localeCompare(b.updated_at))
      .forEach((block, index) => {
        if (block.order_index !== index) {
          orderPatches.push({ id: block.id, before: block.order_index, after: index });
        }
      });
  }

  console.log(`Admin Note document content repair ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`document="${document.title}" <${document.id}>`);
  console.log(`active blocks=${blocks.length}`);
  console.log(`content patches=${contentPatches.length}`);
  console.log(`empty toggle text deletes=${emptyChildDeletes.length}`);
  console.log(`order patches=${orderPatches.length}`);
  for (const patch of contentPatches.slice(0, 30)) {
    console.log(`- patch ${patch.id}`);
    console.log(`  before=${JSON.stringify(patch.before)}`);
    console.log(`  after=${JSON.stringify(patch.after)}`);
  }
  if (contentPatches.length > 30) console.log(`... ${contentPatches.length - 30} more patch(es)`);
  for (const block of emptyChildDeletes) {
    console.log(`- delete empty toggle child ${block.id} parent=${block.parent_block_id}`);
  }
  for (const patch of orderPatches) {
    console.log(`- order ${patch.id}: ${patch.before} -> ${patch.after}`);
  }

  if (!APPLY) return;

  const now = new Date().toISOString();
  for (const patch of contentPatches) {
    const { error } = await supabase
      .from('note_blocks')
      .update({ content: patch.after, updated_at: now })
      .eq('id', patch.id);
    if (error) throw error;
  }
  for (const patch of orderPatches) {
    const { error } = await supabase
      .from('note_blocks')
      .update({ order_index: patch.after, updated_at: now })
      .eq('id', patch.id);
    if (error) throw error;
  }
  if (emptyChildDeletes.length > 0) {
    const { error } = await supabase
      .from('note_blocks')
      .update({ deleted_at: now, updated_at: now })
      .in('id', emptyChildDeletes.map((block) => block.id));
    if (error) throw error;
  }
  console.log(`Applied ${contentPatches.length} content patch(es), ${orderPatches.length} order patch(es), deleted ${emptyChildDeletes.length} empty toggle child block(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
