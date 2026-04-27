import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const weeklyBestId = typeof id === 'string' ? id.trim() : '';
  if (!weeklyBestId) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('weekly_best').delete().eq('id', weeklyBestId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

