import type { getServiceSupabase } from '@/app/lib/server/adminAuth';

export async function softDeleteBlocksForDocument(
  supabase: ReturnType<typeof getServiceSupabase>,
  documentId: string,
  actorId: string,
  deletedAt: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('note_blocks')
    .update({
      deleted_at: deletedAt,
      deleted_by: actorId,
      updated_at: deletedAt,
      updated_by: actorId,
    })
    .eq('document_id', documentId)
    .is('deleted_at', null)
    .select('id');

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
