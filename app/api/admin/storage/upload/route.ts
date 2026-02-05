/**
 * Admin Storage 업로드 (서버에서 실행 → 쿠키 기반 admin 세션으로 Storage RLS 통과)
 * POST FormData: path, file, contentType(optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { BUCKET_NAME } from '@/app/lib/admin/constants/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const path = formData.get('path');
    const file = formData.get('file');
    const contentType = (formData.get('contentType') as string) || 'image/webp';

    if (typeof path !== 'string' || !path.trim()) {
      return NextResponse.json({ error: 'path 필수' }, { status: 400 });
    }
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'file 필수' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('[storage/upload]', error);
      return NextResponse.json(
        { error: `Storage 업로드 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ path });
  } catch (err) {
    console.error('[storage/upload]', err);
    return NextResponse.json(
      { error: '업로드 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
