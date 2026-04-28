import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

type Body = { ids: string[] };

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const ids = Array.isArray(body?.ids) ? body.ids.filter((v) => typeof v === 'string' && v.trim()) : [];
  if (ids.length === 0) return NextResponse.json({ error: 'no_ids' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'verified', updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

