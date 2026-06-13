/**
 * Admin — think_asset_packs upsert (Service Role, RLS 우회)
 * Asset Hub 등 클라이언트 직접 upsert가 막힐 때 사용
 * POST JSON: { id, name, theme?, assets_json }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const theme = typeof body?.theme === 'string' ? body.theme.trim() : null;
    const assets_json = body?.assets_json;
    if (!id || !name || assets_json === undefined || assets_json === null) {
      return NextResponse.json({ error: 'id, name, assets_json 필수' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from('think_asset_packs').upsert(
      {
        id,
        name,
        theme,
        assets_json,
        updated_at: updatedAt,
      },
      { onConflict: 'id' }
    );

    if (error) {
      devLogger.error('[think-asset-pack]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated_at: updatedAt });
  } catch (err) {
    devLogger.error('[think-asset-pack]', err);
    return NextResponse.json({ error: '저장 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
