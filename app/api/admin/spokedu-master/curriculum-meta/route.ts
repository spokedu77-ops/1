import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids') ?? '';
  const ids = idsParam
    .split(',')
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_program_meta')
    .select('curriculum_id,sm_tags,sm_theme,sm_grade,sm_space,sm_coach_script,sm_briefing_notes,sm_variation_method')
    .in('curriculum_id', ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
