import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('is_active', true)
    .in('role', ['teacher', 'admin'])
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ teachers: data ?? [] });
}
