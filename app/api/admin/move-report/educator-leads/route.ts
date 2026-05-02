import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

export type EducatorLeadRow = {
  id: string;
  name: string;
  contact: string;
  role: string;
  organization: string | null;
  target_age_group: string;
  needed_feature: string;
  source: string;
  consent: boolean;
  meta: unknown;
  created_at: string;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('move_report_educator_leads')
      .select('id, name, contact, role, organization, target_age_group, needed_feature, source, consent, meta, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('[admin/move-report/educator-leads]', error);
      return NextResponse.json({ ok: false, error: '목록을 불러오지 못했어요.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, leads: (data ?? []) as EducatorLeadRow[] });
  } catch (e) {
    console.error('[admin/move-report/educator-leads] unexpected', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
