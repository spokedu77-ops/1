/**
 * /api/spokedu-pro/center
 * GET   — 현재 센터 정보 조회
 * PATCH — 센터 프로필 수정 (name, address, phone)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!DB_READY) return NextResponse.json({ error: 'DB not ready' }, { status: 503 });

  const supabase = getServiceSupabase();
  const { data: center, error } = await supabase
    .from('spokedu_pro_centers')
    .select('id, name, address, phone, created_at')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!center) return NextResponse.json({ error: 'No center found' }, { status: 404 });

  return NextResponse.json({ ok: true, center });
}

export async function PATCH(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!DB_READY) return NextResponse.json({ error: 'DB not ready' }, { status: 503 });

  let body: { name?: string; address?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: center, error } = await supabase
    .from('spokedu_pro_centers')
    .update({
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.address !== undefined ? { address: body.address } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('owner_id', user.id)
    .select('id, name, address, phone')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, center });
}
