import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { planPromoteDocumentBlocksToRoot } from '@/app/lib/note/noteBlockTree';

export type PublicNoteDocument = {
  id: string;
  title: string;
  updated_at: string;
  share_token: string;
};

export type PublicNoteBlock = {
  id: string;
  parent_block_id?: string | null;
  type: string;
  order_index: number;
  content: Record<string, unknown> | null;
};

export async function getPublicNoteByToken(token: string) {
  if (!token || token.length < 8) return null;

  const supabase = getServiceSupabase();
  const { data: document, error: docError } = await supabase
    .from('note_documents')
    .select('id, title, updated_at, share_token, is_public')
    .eq('share_token', token)
    .eq('is_public', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (docError || !document?.share_token) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from('note_blocks')
      .select('id, parent_block_id, type, order_index, content')
    .eq('document_id', document.id)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  if (blocksError) return null;

  const pageIds = (blocks ?? [])
    .filter((block) => block.type === 'page')
    .map((block) => {
      const content = block.content as Record<string, unknown> | null;
      return typeof content?.page_document_id === 'string' ? content.page_document_id : null;
    })
    .filter((id): id is string => !!id);

  const publicPages: Record<string, string> = {};
  if (pageIds.length > 0) {
    const { data: publicDocs } = await supabase
      .from('note_documents')
      .select('id, share_token')
      .in('id', pageIds)
      .eq('is_public', true)
      .is('deleted_at', null)
      .not('share_token', 'is', null);

    for (const doc of publicDocs ?? []) {
      if (doc.share_token) publicPages[doc.id] = doc.share_token;
    }
  }

  return {
    document: {
      id: document.id,
      title: document.title,
      updated_at: document.updated_at,
      share_token: document.share_token,
    } satisfies PublicNoteDocument,
    blocks: planPromoteDocumentBlocksToRoot((blocks ?? []) as PublicNoteBlock[]).blocks,
    publicPages,
  };
}
