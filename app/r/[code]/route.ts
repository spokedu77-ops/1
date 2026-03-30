import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

function redirectToHome(req: NextRequest) {
  return NextResponse.redirect(new URL('/', req.url));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = (rawCode ?? '').toUpperCase().trim();

  // 규격 위반 시 홈으로 (유추 공격 방어)
  if (!/^[A-Z0-9]{6}$/.test(code)) return redirectToHome(req);

  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('sessions')
    .select('id')
    .eq('short_code', code)
    .single();

  const sessionId = (data as { id?: string } | null)?.id;
  if (!sessionId) return redirectToHome(req);

  return NextResponse.redirect(new URL(`/report/${sessionId}`, req.url), 308);
}

