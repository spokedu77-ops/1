/**
 * 스포키듀 구독 공용 콘텐츠 API.
 * GET: 로그인 사용자만 published_value 조회 (scope·keys별).
 * PATCH: Admin 전용 draft 저장 (낙관적 락).
 * POST: Admin 전용 draft → published 반영.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import {
  getContentQuerySchema,
  patchContentBodySchema,
  PUBLIC_SCOPE_KEYS,
  CATALOG_SCOPE_KEYS,
  type PatchContentBody,
} from '@/app/lib/spokedu-pro/schemas';

/** GET: scope=public | catalog, keys=hero,theme,... (필요한 만큼만) */
export async function GET(request: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = getContentQuerySchema.safeParse({
    scope: searchParams.get('scope') ?? 'public',
    keys: searchParams.get('keys') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }
  const { scope, keys } = parsed.data;
  const allowedKeys = scope === 'public' ? [...PUBLIC_SCOPE_KEYS] : [...CATALOG_SCOPE_KEYS];
  const requested = keys.filter((k) => (allowedKeys as readonly string[]).includes(k));
  if (requested.length === 0) {
    return NextResponse.json({ data: {} });
  }

  const supabase = getServiceSupabase();
  const { data: rows, error } = await supabase
    .from('spokedu_pro_content')
    .select('key, published_value, published_at')
    .in('key', requested);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const data: Record<string, { value: unknown; published_at: string | null }> = {};
  for (const row of rows ?? []) {
    data[row.key] = { value: row.published_value ?? {}, published_at: row.published_at ?? null };
  }
  return NextResponse.json({ data });
}

/** PATCH: Admin only. draft 저장. expectedVersion 불일치 시 409 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = patchContentBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  const { key, value, expectedVersion } = parsed.data as PatchContentBody;

  const supabase = getServiceSupabase();

  const { data: existing } = await supabase.from('spokedu_pro_content').select('version, draft_value').eq('key', key).maybeSingle();

  if (existing && expectedVersion !== undefined && existing.version !== expectedVersion) {
    return NextResponse.json(
      { error: 'Conflict', message: 'Version mismatch. Refresh and try again.', currentVersion: existing.version },
      { status: 409 }
    );
  }

  const newValue = value !== undefined ? value : (existing?.draft_value ?? {});
  const newVersion = (existing?.version ?? 0) + 1;
  const now = new Date().toISOString();

  // 저장 시 곧바로 반영: draft와 published 동시 갱신 (초안/발행 분리 없음)
  if (existing === null) {
    const { error: insertError } = await supabase.from('spokedu_pro_content').insert({
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
      .from('spokedu_pro_content')
      .update({
        draft_value: newValue,
        published_value: newValue,
        draft_updated_at: now,
        published_at: now,
        version: newVersion,
      })
      .eq('key', key);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, version: newVersion });
}

/** POST: Admin only. draft → published 반영 (게시). D3: version 증가 없음. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const keys: string[] = Array.isArray(body.keys) ? body.keys : body.key != null ? [body.key] : [];
  if (keys.length === 0) {
    return NextResponse.json({ error: 'keys array or key required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  for (const key of keys) {
    const { data: row } = await supabase.from('spokedu_pro_content').select('draft_value').eq('key', key).maybeSingle();
    if (!row) continue;
    await supabase
      .from('spokedu_pro_content')
      .update({ published_value: row.draft_value, published_at: now })
      .eq('key', key);
  }

  return NextResponse.json({ ok: true });
}
