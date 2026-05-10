import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { BUCKET_NAME } from '@/app/lib/admin/constants/storage';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function safeExtension(fileName: string, contentType: string): string {
  const fromName = fileName.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 8) return fromName;
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/gif') return 'gif';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/svg+xml') return 'svg';
  return 'jpg';
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const documentId = formData.get('documentId');
    const file = formData.get('file');

    if (typeof documentId !== 'string' || !documentId.trim()) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }
    if (!file || typeof file !== 'object') {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }

    const blob = file as File;
    const contentType = blob.type || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 파일만 업로드할 수 있습니다.' }, { status: 400 });
    }
    if (blob.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: '이미지는 10MB 이하만 업로드할 수 있습니다.' }, { status: 400 });
    }

    const ext = safeExtension(blob.name || '', contentType);
    const path = `note-assets/${documentId}/${crypto.randomUUID()}.${ext}`;
    const body = new Uint8Array(await blob.arrayBuffer());
    const supabase = getServiceSupabase();

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, body, {
      contentType,
      upsert: false,
    });
    if (error) {
      devLogger.error('[admin/note/upload] storage error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return NextResponse.json({ path, url: data.publicUrl });
  } catch (err) {
    devLogger.error('[admin/note/upload] exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
