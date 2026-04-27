import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = Number.parseInt(id, 10);
  if (!Number.isFinite(parsed)) {
    return NextResponse.json({ error: '유효하지 않은 id입니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('notices').delete().eq('id', parsed);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

