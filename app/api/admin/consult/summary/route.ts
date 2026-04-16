import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

type ConsultRow = {
  id: string;
  parent_name: string;
  phone: string | null;
  child_age: string | null;
  content: string;
  consult_type: string;
  status: string;
  created_at: string;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();

    const [{ count, error: countError }, { data: latest, error: latestError }] = await Promise.all([
      supabase
        .from('consultations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('consultations')
        .select('id, parent_name, phone, child_age, content, consult_type, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    if (countError) {
      return NextResponse.json({ ok: false, error: countError.message }, { status: 500 });
    }
    if (latestError) {
      return NextResponse.json({ ok: false, error: latestError.message }, { status: 500 });
    }

    const latestPending = (latest?.[0] ?? null) as ConsultRow | null;
    const pendingCount = typeof count === 'number' ? count : 0;

    return NextResponse.json({ ok: true, pendingCount, latestPending });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

