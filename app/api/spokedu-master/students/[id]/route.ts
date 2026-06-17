import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const { id } = await context.params;
  if (!id) {
    return privateNoStoreJson({ error: 'student id is required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: existing, error: existingError } = await supabase
    .from('spokedu_master_students')
    .select('id')
    .eq('owner_id', access.userId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingError) {
    return privateNoStoreJson({ error: existingError.message }, { status: 500 });
  }
  if (!existing) {
    return privateNoStoreJson({ error: 'student not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('spokedu_master_students')
    .update({ deleted_at: new Date().toISOString() })
    .eq('owner_id', access.userId)
    .eq('id', id);

  if (error) {
    return privateNoStoreJson({ error: error.message }, { status: 500 });
  }

  return privateNoStoreJson({ ok: true });
}
