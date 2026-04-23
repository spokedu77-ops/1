import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(req);
  if (ip === 'unknown') {
    return NextResponse.json({ ok: false, error: 'IP를 확인할 수 없습니다.' }, { status: 400 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id가 필요합니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // IP와 id가 모두 일치할 때만 삭제 (타 IP 조작 방지)
  const { error } = await supabase
    .from('spomove_favorites')
    .delete()
    .eq('id', id)
    .eq('ip', ip);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
