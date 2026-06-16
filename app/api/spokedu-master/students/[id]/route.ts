import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return access.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'student id is required' }, { status: 400 });
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
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'student not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('spokedu_master_students')
    .update({ deleted_at: new Date().toISOString() })
    .eq('owner_id', access.userId)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
