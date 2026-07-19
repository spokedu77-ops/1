import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DOCUMENT = process.argv.find((arg) => arg.startsWith('--document='))?.slice('--document='.length);
const TERM = process.argv.find((arg) => arg.startsWith('--term='))?.slice('--term='.length);
const LIMIT = Number.parseInt(process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) ?? '80', 10);

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

function textOf(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(textOf).join(' ');
  if (typeof value === 'object') return Object.values(value).map(textOf).join(' ');
  return '';
}

function preview(value, max = 260) {
  const text = textOf(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function resolveDocumentId() {
  if (!DOCUMENT) throw new Error('--document is required');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(DOCUMENT);
  let query = supabase
    .from('note_documents')
    .select('id,title')
    .limit(5);
  query = isUuid ? query.eq('id', DOCUMENT) : query.eq('title', DOCUMENT);
  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) throw new Error(`Document not found: ${DOCUMENT}`);
  return data[0];
}

async function main() {
  const doc = await resolveDocumentId();
  const { data, error } = await supabase
    .from('note_block_ops')
    .select('id,document_id,seq,op_type,payload,created_at')
    .eq('document_id', doc.id)
    .order('seq', { ascending: false })
    .limit(1000);
  if (error) throw error;

  const needle = TERM?.toLocaleLowerCase('ko-KR');
  const rows = (data ?? []).filter((op) => {
    if (!needle) return true;
    return textOf(op.payload).toLocaleLowerCase('ko-KR').includes(needle);
  });

  console.log(`Ops for "${doc.title}" <${doc.id}> term=${TERM ?? '(none)'} matches=${rows.length}`);
  for (const op of rows.slice(0, LIMIT)) {
    console.log(`- seq=${op.seq} type=${op.op_type} created=${op.created_at} id=<${op.id}>`);
    console.log(`  ${preview(op.payload)}`);
    console.log(`  raw=${JSON.stringify(op.payload)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
