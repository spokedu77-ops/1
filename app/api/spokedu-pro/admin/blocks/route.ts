/**
 * 스포키듀 구독 Admin 전용: 공용·테넌트 블록의 draft/published/version 조회.
 * GET: requireAdmin. content 키 + tenant 키에 대해 draft_value, published_value, version 반환.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import {
  PUBLIC_SCOPE_KEYS,
  CATALOG_SCOPE_KEYS,
  TENANT_KEYS,
} from '@/app/lib/spokedu-pro/schemas';

const CONTENT_KEYS = [...PUBLIC_SCOPE_KEYS, ...CATALOG_SCOPE_KEYS];
type BlockEntry = {
  draft_value: unknown;
  published_value: unknown;
  version: number;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contentKeysParam = searchParams.get('contentKeys') ?? CONTENT_KEYS.join(',');
  const tenantKeysParam = searchParams.get('tenantKeys') ?? TENANT_KEYS.join(',');
  const contentKeys = contentKeysParam.split(',').map((k) => k.trim()).filter(Boolean)
    .filter((k) => (CONTENT_KEYS as readonly string[]).includes(k));
  const tenantKeys = tenantKeysParam.split(',').map((k) => k.trim()).filter(Boolean)
    .filter((k) => (TENANT_KEYS as readonly string[]).includes(k));

  const supabase = getServiceSupabase();
  const result: { content: Record<string, BlockEntry>; tenant: Record<string, BlockEntry> } = {
    content: {},
    tenant: {},
  };

  if (contentKeys.length > 0) {
    const { data: rows, error } = await supabase
      .from('spokedu_pro_content')
      .select('key, draft_value, published_value, version')
      .in('key', contentKeys);
    if (!error) {
      for (const row of rows ?? []) {
        result.content[row.key] = {
          draft_value: row.draft_value ?? {},
          published_value: row.published_value ?? {},
          version: row.version ?? 0,
        };
      }
    }
  }

  if (tenantKeys.length > 0) {
    const { data: rows, error } = await supabase
      .from('spokedu_pro_tenant_content')
      .select('key, draft_value, published_value, version')
      .eq('owner_id', user.id)
      .in('key', tenantKeys);
    if (!error) {
      for (const row of rows ?? []) {
        result.tenant[row.key] = {
          draft_value: row.draft_value ?? {},
          published_value: row.published_value ?? {},
          version: row.version ?? 0,
        };
      }
    }
  }

  return NextResponse.json(result);
}
