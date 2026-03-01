/**
 * Admin Storage 삭제 (서버에서 실행 → 쿠키 기반 admin 세션으로 Storage RLS 통과)
 * POST JSON: { path: string } 또는 { paths: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { BUCKET_NAME } from '@/app/lib/admin/constants/storage';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body.path === 'string' ? body.path : undefined;
    const paths = Array.isArray(body.paths) ? body.paths.filter((p: unknown): p is string => typeof p === 'string') : undefined;

    let toRemove: string[] = path ? [path] : paths ?? [];
    toRemove = toRemove.map((p) => p.trim().replace(/^\/+/, '')).filter(Boolean);
    if (toRemove.length === 0) {
      return NextResponse.json({ error: 'path 또는 paths 필수' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.storage.from(BUCKET_NAME).remove(toRemove);

    if (error) {
      console.error('[storage/delete]', error);
      return NextResponse.json(
        { error: `Storage 삭제 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[storage/delete]', err);
    return NextResponse.json(
      { error: '삭제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
