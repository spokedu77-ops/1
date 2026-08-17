/**
 * Search Admin Note documents and blocks in Supabase.
 *
 * Usage:
 *   node scripts/admin-note-search-data.mjs 공통보드 7월 면접 OT
 */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const TERMS = process.argv.slice(2).map((term) => term.trim()).filter(Boolean);
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

function normalize(value) {
  return String(value ?? '').toLocaleLowerCase('ko-KR');
}

function normalizeCompact(value) {
  return normalize(value).replace(/\s+/g, '');
}

function contentText(content) {
  if (!content || typeof content !== 'object') return String(content ?? '');
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
    if (typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };
  visit(content);
  return parts.join(' ');
}

async function fetchPages(table, select, configure, limit = 20000) {
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

function matchingTerms(text) {
  const haystack = normalize(text);
  const compactHaystack = normalizeCompact(text);
  return TERMS.filter((term) => {
    const normalizedTerm = normalize(term);
    if (/^[a-z0-9]{1,2}$/i.test(term)) {
      return new RegExp(`(^|[^a-z0-9])${normalizedTerm}([^a-z0-9]|$)`, 'i').test(haystack);
    }
    return haystack.includes(normalizedTerm)
      || compactHaystack.includes(normalizeCompact(term));
  });
}

function preview(text, max = 180) {
  const compact = String(text ?? '').replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

async function main() {
  if (TERMS.length === 0) {
    throw new Error('At least one search term is required.');
  }

  const [documents, blocks] = await Promise.all([
    fetchPages(
      'note_documents',
      'id,title,parent_id,deleted_at,updated_at',
      (query) => query.order('updated_at', { ascending: false }),
    ),
    fetchPages(
      'note_blocks',
      'id,document_id,parent_block_id,type,order_index,content,deleted_at,updated_at',
      (query) => query.order('updated_at', { ascending: false }),
    ),
  ]);

  const documentById = new Map(documents.map((doc) => [doc.id, doc]));
  const documentMatches = documents
    .map((doc) => ({
      doc,
      terms: matchingTerms(`${doc.title ?? ''} ${doc.id}`),
    }))
    .filter((item) => item.terms.length > 0);

  const blockMatches = blocks
    .map((block) => {
      const doc = documentById.get(block.document_id);
      const text = contentText(block.content);
      return {
        block,
        doc,
        text,
        terms: matchingTerms(`${doc?.title ?? ''} ${text} ${block.id}`),
      };
    })
    .filter((item) => item.terms.length > 0);

  console.log(`Admin Note search: ${TERMS.join(', ')}`);
  console.log(`documents=${documents.length}, blocks=${blocks.length}`);

  console.log(`\nDocument matches: ${documentMatches.length}`);
  for (const { doc, terms } of documentMatches.slice(0, 30)) {
    console.log(`- [${terms.join(', ')}] ${doc.title ?? '(untitled)'} <${doc.id}> deleted=${doc.deleted_at ?? 'no'} updated=${doc.updated_at}`);
  }

  console.log(`\nBlock matches: ${blockMatches.length}`);
  for (const { block, doc, text, terms } of blockMatches.slice(0, 80)) {
    console.log(`- [${terms.join(', ')}] doc="${doc?.title ?? 'unknown'}" <${block.document_id}> block=<${block.id}> parent=${block.parent_block_id ?? 'root'} type=${block.type} deleted=${block.deleted_at ?? 'no'} updated=${block.updated_at}`);
    console.log(`  ${preview(text)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
