/**
 * Admin Storage 업로드
 * requireAdmin()으로 앱 기준 관리자만 허용 후, Service Role로 업로드 → Storage RLS와 무관
 * POST FormData: path, file, contentType(optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { BUCKET_NAME } from '@/app/lib/admin/constants/storage';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const path = formData.get('path');
    const file = formData.get('file');
    const contentType = (formData.get('contentType') as string) || 'image/webp';

    if (typeof path !== 'string' || !path.trim()) {
      return NextResponse.json({ error: 'path 필수' }, { status: 400 });
    }
    const normalizedPath = path.trim().replace(/^\/+/, '');
    if (normalizedPath.includes('..')) {
      return NextResponse.json({ error: 'path에 허용되지 않는 문자가 있습니다.' }, { status: 400 });
    }
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'file 필수' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(normalizedPath, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      devLogger.error('[storage/upload]', error);
      return NextResponse.json(
        { error: `Storage 업로드 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ path: normalizedPath });
  } catch (err) {
    devLogger.error('[storage/upload]', err);
    return NextResponse.json(
      { error: '업로드 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
