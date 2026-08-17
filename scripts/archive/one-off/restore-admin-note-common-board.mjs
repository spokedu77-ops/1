import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLY = process.argv.includes('--apply');
const START = process.argv.find((arg) => arg.startsWith('--start='))?.slice('--start='.length)
  ?? '2026-07-19T14:18:00.000Z';
const END = process.argv.find((arg) => arg.startsWith('--end='))?.slice('--end='.length)
  ?? '2026-07-19T14:19:00.000Z';
const TITLE = process.argv.find((arg) => arg.startsWith('--title='))?.slice('--title='.length)
  ?? '공통보드';
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

function textFromContent(content) {
  if (!content || typeof content !== 'object') return '';
  const values = [];
  const visit = (value) => {
    if (value == null) return;
    if (typeof value === 'string') {
      values.push(value.replace(/<[^>]*>/g, ' '));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(content);
  return values.join(' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  const documents = await fetchAll(
    'note_documents',
    'id,title,deleted_at',
    (query) => query.is('deleted_at', null),
  );
  const document = documents.find((doc) => compact(doc.title) === compact(TITLE));
  if (!document) throw new Error(`document not found: ${TITLE}`);

  const blocks = await fetchAll(
    'note_blocks',
    'id,document_id,parent_block_id,type,order_index,content,deleted_at,deleted_by,updated_at',
    (query) => query
      .eq('document_id', document.id)
      .gte('deleted_at', START)
      .lt('deleted_at', END)
      .order('order_index', { ascending: true }),
  );

  const byType = blocks.reduce((acc, block) => {
    acc[block.type] = (acc[block.type] ?? 0) + 1;
    return acc;
  }, {});
  const deletedParents = new Set(blocks.map((block) => block.id));
  const childrenWithRestoredParents = blocks.filter((block) =>
    block.parent_block_id && deletedParents.has(block.parent_block_id),
  ).length;

  console.log(`Admin Note common board restore ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`document="${document.title}" <${document.id}>`);
  console.log(`window=${START}..${END}`);
  console.log(`matched blocks=${blocks.length}`);
  console.log(`by type=${JSON.stringify(byType)}`);
  console.log(`children whose parent is also restored=${childrenWithRestoredParents}`);
  for (const block of blocks.slice(0, 20)) {
    console.log(`- ${block.id} parent=${block.parent_block_id ?? 'root'} type=${block.type} deleted=${block.deleted_at} text="${textFromContent(block.content).slice(0, 120)}"`);
  }
  if (blocks.length > 20) console.log(`... ${blocks.length - 20} more`);

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to restore these soft-deleted blocks.');
    return;
  }

  const ids = blocks.map((block) => block.id);
  for (let index = 0; index < ids.length; index += PAGE_SIZE) {
    const chunk = ids.slice(index, index + PAGE_SIZE);
    const { error } = await supabase
      .from('note_blocks')
      .update({ deleted_at: null, deleted_by: null, updated_at: new Date().toISOString() })
      .in('id', chunk);
    if (error) throw error;
  }
  console.log(`Restored ${ids.length} block(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
