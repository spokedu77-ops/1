import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';

const BUCKET = 'spokedu-inventory-images';
const MAX_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image file required' }, { status: 400 });
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension || file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Unsupported image type or size' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');
  const path = `sha256/${digest.slice(0, 2)}/${digest}.${extension}`;
  const supabase = getServiceSupabase();
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    devLogger.error('[admin/inventory/images]', { message: error.message });
    return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
  }

  if (error) {
    const { data: existing, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
    if (downloadError || !existing) return NextResponse.json({ error: 'Existing image verification failed' }, { status: 500 });
    const existingDigest = createHash('sha256').update(Buffer.from(await existing.arrayBuffer())).digest('hex');
    if (existingDigest !== digest) return NextResponse.json({ error: 'Image digest collision' }, { status: 409 });
  }

  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, path, publicUrl, sha256: digest, size: bytes.length, mime: file.type });
}
