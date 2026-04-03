import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

export const runtime = 'nodejs';

type BundleInfoRow = {
  bundle_key: string;
  address: string | null;
  phone: string | null;
  child_info: string | null;
  tuition_paid: boolean;
  notes: string | null;
  extra: Record<string, unknown>;
  updated_at: string;
};

function parseBundleKey(raw: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const bundleKey = parseBundleKey(searchParams.get('bundleKey'));
  if (!bundleKey) {
    return NextResponse.json({ error: 'bundleKey가 필요합니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('class_bundle_info')
    .select('bundle_key, address, phone, child_info, tuition_paid, notes, extra, updated_at')
    .eq('bundle_key', bundleKey)
    .maybeSingle();

  if (error) {
    devLogger.error('[class-bundle-info GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ info: null }, { status: 200 });
  }

  const row = data as BundleInfoRow;
  return NextResponse.json({
    info: {
      bundleKey: row.bundle_key,
      address: row.address,
      phone: row.phone,
      childInfo: row.child_info,
      tuitionPaid: row.tuition_paid,
      notes: row.notes,
      extra: row.extra ?? {},
      updatedAt: row.updated_at,
    },
  });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const bundleKey = parseBundleKey(typeof body.bundleKey === 'string' ? body.bundleKey : null);
  if (!bundleKey) {
    return NextResponse.json({ error: 'bundleKey가 필요합니다.' }, { status: 400 });
  }

  const address = typeof body.address === 'string' ? body.address : body.address == null ? null : String(body.address);
  const phone = typeof body.phone === 'string' ? body.phone : body.phone == null ? null : String(body.phone);
  const childInfo =
    typeof body.childInfo === 'string' ? body.childInfo : body.childInfo == null ? null : String(body.childInfo);
  const notes = typeof body.notes === 'string' ? body.notes : body.notes == null ? null : String(body.notes);
  const tuitionPaid = typeof body.tuitionPaid === 'boolean' ? body.tuitionPaid : false;
  const extra =
    body.extra && typeof body.extra === 'object' && !Array.isArray(body.extra)
      ? (body.extra as Record<string, unknown>)
      : {};

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('class_bundle_info')
    .upsert(
      {
        bundle_key: bundleKey,
        address,
        phone,
        child_info: childInfo,
        tuition_paid: tuitionPaid,
        notes,
        extra,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'bundle_key' }
    )
    .select('bundle_key, address, phone, child_info, tuition_paid, notes, extra, updated_at')
    .single();

  if (error) {
    devLogger.error('[class-bundle-info PUT]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as BundleInfoRow;
  return NextResponse.json({
    info: {
      bundleKey: row.bundle_key,
      address: row.address,
      phone: row.phone,
      childInfo: row.child_info,
      tuitionPaid: row.tuition_paid,
      notes: row.notes,
      extra: row.extra ?? {},
      updatedAt: row.updated_at,
    },
  });
}
