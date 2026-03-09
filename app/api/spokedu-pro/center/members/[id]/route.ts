/**
 * /api/spokedu-pro/center/members/[id]
 * DELETE — 멤버 제거 (owner만 가능)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!DB_READY) return NextResponse.json({ error: 'DB not ready' }, { status: 503 });

  const { id } = await params;
  const supabase = getServiceSupabase();

  // owner 센터 확인
  const { data: ownedCenter } = await supabase
    .from('spokedu_pro_centers')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!ownedCenter) return NextResponse.json({ error: 'No center found' }, { status: 404 });

  const { error } = await supabase
    .from('spokedu_pro_center_members')
    .delete()
    .eq('id', id)
    .eq('center_id', ownedCenter.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
