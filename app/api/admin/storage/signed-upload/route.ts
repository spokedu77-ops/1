import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { BUCKET_NAME } from '@/app/lib/admin/constants/storage';
import { devLogger } from '@/app/lib/logging/devLogger';

type ReqBody = {
  path?: string;
  upsert?: boolean;
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => null)) as ReqBody | null;
    const path = typeof body?.path === 'string' ? body.path.trim().replace(/^\/+/, '') : '';
    if (!path) {
      return NextResponse.json({ error: 'path가 필요합니다.' }, { status: 400 });
    }
    if (path.includes('..')) {
      return NextResponse.json({ error: 'path에 허용되지 않는 문자가 있습니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    // supabase-js v2: createSignedUploadUrl(path, { upsert })
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(path, { upsert: body?.upsert !== false });

    if (error || !data) {
      devLogger.error('[storage/signed-upload]', error);
      return NextResponse.json({ error: error?.message ?? 'signed upload url 생성 실패' }, { status: 500 });
    }

    return NextResponse.json(
      {
        path: data.path ?? path,
        token: data.token,
        signedUrl: data.signedUrl,
      },
      { status: 200 }
    );
  } catch (err) {
    devLogger.error('[storage/signed-upload]', err);
    return NextResponse.json({ error: '서명 업로드 URL 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

