/**
 * 스포키듀 구독 테넌트(개별) 콘텐츠 API. (v1)
 * D7: Deprecated. 2026-06-01 이후 제거 예정. v2에서는 view/center, view/user로 alias.
 * GET/PATCH: owner_id = auth.uid(). POST(publish)는 tenant/publish 라우트에서.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { z } from 'zod';
import { getTenantQuerySchema, patchTenantBodySchema, TENANT_KEYS } from '@/app/lib/spokedu-pro/schemas';
type PatchTenantBody = z.infer<typeof patchTenantBodySchema>;

async function getUserId(request: NextRequest): Promise<string | null> {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  return user?.id ?? null;
}

/** GET: 로그인 사용자 본인 테넌트 published_value만. keys=tenant_roadmap,tenant_favorites,... */
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = getTenantQuerySchema.safeParse({ keys: searchParams.get('keys') ?? '' });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }
  const requested = parsed.data.keys.filter((k) => (TENANT_KEYS as readonly string[]).includes(k));
  if (requested.length === 0) return NextResponse.json({ data: {} });

  const supabase = getServiceSupabase();
  const { data: rows, error } = await supabase
    .from('spokedu_pro_tenant_content')
    .select('key, published_value, published_at')
    .eq('owner_id', userId)
    .in('key', requested);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const data: Record<string, { value: unknown; published_at: string | null }> = {};
  for (const row of rows ?? []) {
    data[row.key] = { value: row.published_value ?? {}, published_at: row.published_at ?? null };
  }
  return NextResponse.json({ data });
}

/** PATCH: 본인 draft 저장. expectedVersion 불일치 시 409 */
export async function PATCH(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = patchTenantBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  const { key, value, expectedVersion } = parsed.data as PatchTenantBody;

  const supabase = getServiceSupabase();
  const { data: existing } = await supabase
    .from('spokedu_pro_tenant_content')
    .select('id, version, draft_value')
    .eq('owner_id', userId)
    .eq('key', key)
    .maybeSingle();

  if (existing && expectedVersion !== undefined && existing.version !== expectedVersion) {
    return NextResponse.json(
      { error: 'Conflict', message: 'Version mismatch.', currentVersion: existing.version },
      { status: 409 }
    );
  }

  const newValue = value !== undefined ? value : (existing?.draft_value ?? {});
  const newVersion = (existing?.version ?? 0) + 1;
  const now = new Date().toISOString();

  // 저장 시 곧바로 반영: draft와 published 동시 갱신
  if (existing === null) {
    const { error: insertError } = await supabase.from('spokedu_pro_tenant_content').insert({
      owner_id: userId,
      key,
      draft_value: newValue,
      published_value: newValue,
      draft_updated_at: now,
      published_at: now,
      version: newVersion,
    });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  } else {
    const { error: updateError } = await supabase
      .from('spokedu_pro_tenant_content')
      .update({
        draft_value: newValue,
        published_value: newValue,
        draft_updated_at: now,
        published_at: now,
        version: newVersion,
      })
      .eq('owner_id', userId)
      .eq('key', key);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, version: newVersion });
}
