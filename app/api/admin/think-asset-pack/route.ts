/**
 * Admin — think_asset_packs upsert (Service Role, RLS 우회)
 * Asset Hub 등 클라이언트 직접 upsert가 막힐 때 사용
 * POST JSON: { id, name, theme?, assets_json, expected_updated_at? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { isSpomoveOnlyAdmin, isSpomoveAssetPack } from '@/app/lib/server/spomoveAdminScope';
import {
  hasOnlyAllowedSpomoveGuideVideoRefs,
  SPOMOVE_CONTENT_PACK_ID,
  SPOMOVE_GUIDE_VIDEO_PACK_ID,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { validateSpomovePublishedGuidesForSave } from '@/app/lib/spomove/validateSpomovePublishedGuidesForSave';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin({ scope: 'spomove' });
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (isSpomoveOnlyAdmin(auth.email) && !isSpomoveAssetPack(id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const theme = typeof body?.theme === 'string' ? body.theme.trim() : null;
    const assets_json = body?.assets_json;
    const expectedUpdatedAt =
      typeof body?.expected_updated_at === 'string' && body.expected_updated_at.trim()
        ? body.expected_updated_at.trim()
        : null;
    if (!id || !name || assets_json === undefined || assets_json === null) {
      return NextResponse.json({ error: 'id, name, assets_json 필수' }, { status: 400 });
    }

    if (id === SPOMOVE_CONTENT_PACK_ID) {
      const issues = validateSpomovePublishedGuidesForSave(assets_json);
      if (issues.length > 0) {
        return NextResponse.json(
          {
            error: '게시할 수 없는 SPOMOVE 공식 가이드가 있습니다.',
            issues,
          },
          { status: 400 }
        );
      }
    }

    if (id === SPOMOVE_GUIDE_VIDEO_PACK_ID && !hasOnlyAllowedSpomoveGuideVideoRefs(assets_json)) {
      return NextResponse.json(
        { error: 'YouTube·Vimeo 링크 또는 Premium private bucket의 MP4/WebM 경로만 저장할 수 있습니다.' },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();
    const updatedAt = new Date().toISOString();

    if (expectedUpdatedAt) {
      const { data: updatedRow, error: updateError } = await supabase
        .from('think_asset_packs')
        .update({ name, theme, assets_json, updated_at: updatedAt })
        .eq('id', id)
        .eq('updated_at', expectedUpdatedAt)
        .select('updated_at')
        .maybeSingle();

      if (updateError) {
        devLogger.error('[think-asset-pack]', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      if (updatedRow) {
        return NextResponse.json({ ok: true, updated_at: updatedRow.updated_at as string });
      }

      const { data: latest, error: readError } = await supabase
        .from('think_asset_packs')
        .select('updated_at, assets_json')
        .eq('id', id)
        .maybeSingle();

      if (readError) {
        devLogger.error('[think-asset-pack]', readError);
        return NextResponse.json({ error: readError.message }, { status: 500 });
      }

      if (!latest) {
        return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
      }

      return NextResponse.json(
        {
          error: '다른 관리자가 먼저 저장했습니다.',
          conflict: true,
          updated_at: latest.updated_at as string,
          assets_json: latest.assets_json,
        },
        { status: 409 },
      );
    }

    const { data: existing, error: readError } = await supabase
      .from('think_asset_packs')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (readError) {
      devLogger.error('[think-asset-pack]', readError);
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('think_asset_packs')
        .update({ name, theme, assets_json, updated_at: updatedAt })
        .eq('id', id);

      if (updateError) {
        devLogger.error('[think-asset-pack]', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, updated_at: updatedAt });
    }

    const { error: insertError } = await supabase.from('think_asset_packs').insert({
      id,
      name,
      theme,
      assets_json,
      updated_at: updatedAt,
    });

    if (insertError) {
      devLogger.error('[think-asset-pack]', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated_at: updatedAt });
  } catch (err) {
    devLogger.error('[think-asset-pack]', err);
    return NextResponse.json({ error: '저장 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
