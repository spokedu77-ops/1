import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { fetchEquipmentCapabilities } from '@/app/lib/equipment/capabilities';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const capabilities = await fetchEquipmentCapabilities(getServiceSupabase());
    return NextResponse.json(
      { capabilities },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch {
    return NextResponse.json({ error: '환경 상태를 불러오지 못했습니다.' }, { status: 500 });
  }
}
