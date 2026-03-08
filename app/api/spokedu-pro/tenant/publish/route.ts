/**
 * 스포키듀 구독 테넌트 게시. POST: 본인 draft → published 반영.
 * D3: publish는 published_value/published_at만 갱신. version 증가 없음.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

async function getUserId(request: NextRequest): Promise<string | null> {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const keys: string[] = Array.isArray(body.keys) ? body.keys : body.key != null ? [body.key] : [];
  if (keys.length === 0) {
    return NextResponse.json({ error: 'keys array or key required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  for (const key of keys) {
    const { data: row } = await supabase
      .from('spokedu_pro_tenant_content')
      .select('draft_value')
      .eq('owner_id', userId)
      .eq('key', key)
      .maybeSingle();
    if (!row) continue;
    await supabase
      .from('spokedu_pro_tenant_content')
      .update({ published_value: row.draft_value, published_at: now })
      .eq('owner_id', userId)
      .eq('key', key);
  }

  return NextResponse.json({ ok: true });
}
