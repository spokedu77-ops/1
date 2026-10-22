import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

const COLUMNS = 'tier_id, fee_private, fee_group, fee_center_main, fee_center_assist';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await getServiceSupabase()
    .from('teacher_tier_fees')
    .select(COLUMNS)
    .order('tier_id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'teacher_tier_fees_fetch_failed' }, { status: 500 });
  }

  return NextResponse.json(
    { fees: data ?? [] },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
