import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const TITLE = process.argv.find((arg) => arg.startsWith('--title='))?.slice('--title='.length)
  ?? process.argv.slice(2).join(' ')
  ?? '';
const INCLUDE_DELETED = process.argv.includes('--deleted');
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

function readText(content) {
  if (!content || typeof content !== 'object') return '';
  const parts = [];
  for (const key of ['title', 'text', 'html', 'body', 'legacyText', 'legacyBody']) {
    const value = content[key];
    if (typeof value === 'string') {
      parts.push(key === 'html' ? stripHtml(value) : value.trim());
    }
  }
  return parts.filter(Boolean).join(' | ');
}

function visibleText(content) {
  if (!content || typeof content !== 'object') return '';
  if (typeof content.title === 'string' && content.title.trim()) return content.title.trim();
  if (typeof content.text === 'string' && content.text.trim()) return content.text.trim();
  if (typeof content.html === 'string' && stripHtml(content.html)) return stripHtml(content.html);
  return '';
}

function legacyText(content) {
  if (!content || typeof content !== 'object') return '';
  if (typeof content.legacyText === 'string' && content.legacyText.trim()) return content.legacyText.trim();
  if (typeof content.legacyBody === 'string' && content.legacyBody.trim()) return content.legacyBody.trim();
  return '';
}

function summarizeBlock(block) {
  return `${block.id} parent=${block.parent_block_id ?? 'root'} order=${block.order_index} type=${block.type} deleted=${block.deleted_at ?? 'no'} updated=${block.updated_at} text="${readText(block.content).slice(0, 180)}"`;
}

async function main() {
  if (!TITLE.trim()) throw new Error('Provide document title, e.g. --title=최지훈 업무노트');
  const documents = await fetchAll(
    'note_documents',
    'id,title,deleted_at,updated_at',
    (query) => query.order('updated_at', { ascending: false }),
  );
  const document = documents.find((doc) => compact(doc.title) === compact(TITLE))
    ?? documents.find((doc) => compact(doc.title).includes(compact(TITLE)));
  if (!document) throw new Error(`document not found: ${TITLE}`);

  let blockQuery = (query) => query
    .eq('document_id', document.id)
    .order('deleted_at', { ascending: false, nullsFirst: false })
    .order('parent_block_id', { ascending: true, nullsFirst: true })
    .order('order_index', { ascending: true })
    .order('updated_at', { ascending: false });
  if (!INCLUDE_DELETED) {
    blockQuery = (query) => query
      .eq('document_id', document.id)
      .is('deleted_at', null)
      .order('parent_block_id', { ascending: true, nullsFirst: true })
      .order('order_index', { ascending: true })
      .order('updated_at', { ascending: false });
  }
  const blocks = await fetchAll(
    'note_blocks',
    'id,document_id,parent_block_id,type,order_index,content,deleted_at,updated_at',
    blockQuery,
  );
  const active = blocks.filter((block) => !block.deleted_at);
  const activeById = new Map(active.map((block) => [block.id, block]));
  const deleted = blocks.filter((block) => block.deleted_at);
  const missingParents = active.filter((block) => block.parent_block_id && !activeById.has(block.parent_block_id));
  const emptyWithLegacy = active.filter((block) => !visibleText(block.content) && legacyText(block.content));
  const divergentLegacy = active.filter((block) => {
    const visible = visibleText(block.content);
    const legacy = legacyText(block.content);
    return visible && legacy && visible !== legacy && legacy.includes(visible);
  });
  const siblingKeyCounts = new Map();
  for (const block of active) {
    const key = `${block.parent_block_id ?? 'root'}:${block.order_index}`;
    siblingKeyCounts.set(key, (siblingKeyCounts.get(key) ?? 0) + 1);
  }
  const duplicateOrder = active.filter((block) =>
    (siblingKeyCounts.get(`${block.parent_block_id ?? 'root'}:${block.order_index}`) ?? 0) > 1,
  );
  const deletedByTime = deleted.reduce((acc, block) => {
    const key = block.deleted_at;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Admin Note document audit: "${document.title}" <${document.id}>`);
  console.log(`active=${active.length}, deleted=${deleted.length}, total=${blocks.length}`);
  console.log(`missing active parents=${missingParents.length}`);
  console.log(`empty active content with legacy=${emptyWithLegacy.length}`);
  console.log(`visible/legacy divergent=${divergentLegacy.length}`);
  console.log(`duplicate sibling order=${duplicateOrder.length}`);
  console.log(`deleted groups=${JSON.stringify(deletedByTime, null, 2)}`);

  const sections = [
    ['missing active parents', missingParents],
    ['empty with legacy', emptyWithLegacy],
    ['divergent legacy', divergentLegacy],
    ['duplicate order', duplicateOrder],
    ['active outline', active],
    ['deleted recent', deleted],
  ];
  for (const [label, list] of sections) {
    console.log(`\n${label}: ${list.length}`);
    for (const block of list.slice(0, label === 'active outline' ? 120 : 40)) {
      console.log(`- ${summarizeBlock(block)}`);
    }
    if (list.length > (label === 'active outline' ? 120 : 40)) {
      console.log(`... ${list.length - (label === 'active outline' ? 120 : 40)} more`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
