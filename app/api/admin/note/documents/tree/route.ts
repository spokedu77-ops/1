import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { allocateSlugForActiveRow, slugifyTitle } from '@/app/lib/server/noteDocumentSlug';
import { devLogger } from '@/app/lib/logging/devLogger';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const supabase = getServiceSupabase();

    if (action === 'createSubPage') {
      const parentDocumentId = typeof body.parentDocumentId === 'string'
        ? body.parentDocumentId
        : null;
      if (!parentDocumentId) {
        return NextResponse.json({ error: 'parentDocumentId required' }, { status: 400 });
      }
      const title = typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : 'Untitled';
      const slug = await allocateSlugForActiveRow(supabase, slugifyTitle(title), null);
      const { data, error } = await supabase.rpc('note_create_subpage_transaction', {
        p_title: title,
        p_slug: slug,
        p_parent_document_id: parentDocumentId,
        p_parent_block_id: typeof body.parentBlockId === 'string' ? body.parentBlockId : null,
        p_order_index: typeof body.orderIndex === 'number' ? body.orderIndex : 0,
        p_actor_id: auth.userId,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json(data);
    }

    if (action === 'reparentDocument') {
      const documentId = typeof body.documentId === 'string' ? body.documentId : null;
      if (!documentId) {
        return NextResponse.json({ error: 'documentId required' }, { status: 400 });
      }
      const { data, error } = await supabase.rpc('note_reparent_document_transaction', {
        p_document_id: documentId,
        p_new_parent_id: typeof body.newParentId === 'string' ? body.newParentId : null,
        p_actor_id: auth.userId,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  } catch (error) {
    devLogger.error('[admin/note/documents/tree]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 },
    );
  }
}
