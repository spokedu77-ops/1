import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { requireMoveReportTrackInstructor } from '@/app/lib/server/moveReportAuth';
import { rankSpecialPeAssets, type SpecialPeAsset } from '@/app/lib/move-report/track/assetRecommendation';
import type { DisplayDirection } from '@/app/lib/move-report/track/learningLoop';

export const dynamic = 'force-dynamic';

const DIRECTIONS = new Set<DisplayDirection>(['adjust', 'generalize', 'advance', 'transfer']);

export async function GET(request: Request) {
  const auth = await requireMoveReportTrackInstructor();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const skill = url.searchParams.get('skill')?.trim() ?? '';
  const level = Number(url.searchParams.get('level'));
  const direction = url.searchParams.get('direction') as DisplayDirection | null;

  if (!skill || !Number.isInteger(level) || level < 1 || level > 5 || !direction || !DIRECTIONS.has(direction)) {
    return NextResponse.json({ error: 'Invalid recommendation query' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('mr_special_pe_asset_catalog')
    .select('*')
    .eq('primary_skill', skill)
    .eq('active', true);

  if (error) {
    return NextResponse.json({ error: '추천 자산을 불러오지 못했습니다.' }, { status: 500 });
  }

  const recommendations = rankSpecialPeAssets((data ?? []) as SpecialPeAsset[], {
    level,
    direction,
    limit: 3,
  });

  return NextResponse.json({ data: { recommendations } });
}
