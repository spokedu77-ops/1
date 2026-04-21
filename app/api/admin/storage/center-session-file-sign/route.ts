import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { CENTER_SESSION_FILES_BUCKET, resolveCenterSessionFileForAdmin } from '@/app/lib/server/centerSessionFileStorage';

/** 짧은 JSON만 반환 — 대용량 파일은 Vercel 등 응답 한도를 피해 브라우저가 스토리지 URL에서 직접 받습니다. */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const b = body as { sessionId?: unknown; fileIndex?: unknown };
  const sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim() : '';
  const fileIndex =
    typeof b.fileIndex === 'number' && Number.isInteger(b.fileIndex) && b.fileIndex >= 0 ? b.fileIndex : -1;

  if (!sessionId || fileIndex < 0) {
    return NextResponse.json({ error: 'sessionId과 fileIndex(0 이상 정수)가 필요합니다.' }, { status: 400 });
  }

  try {
    const svc = getServiceSupabase();
    const resolved = await resolveCenterSessionFileForAdmin(svc, sessionId, fileIndex);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { objectPath } = resolved.data;
    const { data: signed, error: signErr } = await svc.storage
      .from(CENTER_SESSION_FILES_BUCKET)
      .createSignedUrl(objectPath, 600);

    if (signErr || !signed?.signedUrl) {
      devLogger.error('[center-session-file-sign] createSignedUrl', signErr);
      return NextResponse.json({ error: '서명 URL을 만들지 못했습니다.' }, { status: 502 });
    }

    return NextResponse.json({ signedUrl: signed.signedUrl }, { status: 200 });
  } catch (err) {
    devLogger.error('[center-session-file-sign]', err);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
