import type { SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER_TITLES = new Set(['', '제목 없음', 'Untitled', 'untitled']);

export function isPlaceholderNoteTitle(title: string | null | undefined): boolean {
  const t = (title ?? '').trim();
  return PLACEHOLDER_TITLES.has(t);
}

export function normalizeNoteTitle(title: string): string {
  const t = title.trim();
  return t.length > 0 ? t : '제목 없음';
}

/** 부모 문서 page 블록 content.title → 하위 문서 실제 제목 동기화 */
export async function syncPageBlockTitlesForDocument(
  supabase: SupabaseClient,
  documentId: string,
  title: string,
): Promise<void> {
  const { data: blocks, error } = await supabase
    .from('note_blocks')
    .select('id, content')
    .eq('type', 'page')
    .is('deleted_at', null)
    .filter('content->>page_document_id', 'eq', documentId);

  if (error || !blocks?.length) return;

  await Promise.all(
    blocks.map((block) => {
      const content =
        block.content && typeof block.content === 'object'
          ? (block.content as Record<string, unknown>)
          : {};
      return supabase
        .from('note_blocks')
        .update({
          content: { ...content, title },
          updated_at: new Date().toISOString(),
        })
        .eq('id', block.id);
    }),
  );
}

type DocWithTitle = { id: string; title: string };

/** 문서 title이 비어 있으면 page 블록에 저장된 표시 제목으로 보정 */
export async function enrichDocumentsWithPageBlockTitles<T extends DocWithTitle>(
  supabase: SupabaseClient,
  documents: T[],
): Promise<T[]> {
  if (documents.length === 0) return documents;

  const needsEnrich = documents.filter((d) => isPlaceholderNoteTitle(d.title));
  if (needsEnrich.length === 0) return documents;

  const ids = needsEnrich.map((d) => d.id);
  const { data: blocks } = await supabase
    .from('note_blocks')
    .select('content')
    .eq('type', 'page')
    .is('deleted_at', null)
    .or(ids.map((id) => `content->>page_document_id.eq.${id}`).join(','));

  const titleByDocId = new Map<string, string>();
  for (const block of blocks ?? []) {
    const content = block.content as Record<string, unknown> | null;
    const pageDocId = typeof content?.page_document_id === 'string' ? content.page_document_id : '';
    const blockTitle = typeof content?.title === 'string' ? content.title.trim() : '';
    if (!pageDocId || isPlaceholderNoteTitle(blockTitle)) continue;
    const existing = titleByDocId.get(pageDocId);
    if (!existing || blockTitle.length > existing.length) {
      titleByDocId.set(pageDocId, blockTitle);
    }
  }

  if (titleByDocId.size === 0) return documents;

  return documents.map((doc) => {
    if (!isPlaceholderNoteTitle(doc.title)) return doc;
    const fromBlock = titleByDocId.get(doc.id);
    return fromBlock ? { ...doc, title: fromBlock } : doc;
  });
}
