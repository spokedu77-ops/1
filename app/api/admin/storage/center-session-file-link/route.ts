/**
 * 센터 첨부: 관리자 검증 후 짧은 JSON만 반환(signedUrl + 파일명).
 * 본문은 브라우저가 Supabase에 직접 받아 Vercel 왕복·청크 분할 없이 빠르게 다운로드.
 */
import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { displayNameForDownload } from '@/app/lib/feedbackValidation';
import {
  CENTER_SESSION_FILES_BUCKET,
  resolveCenterSessionFileForAdmin,
} from '@/app/lib/server/centerSessionFileStorage';

export const maxDuration = 60;

export async function POST(req: Request) {
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
    return NextResponse.json({ error: 'sessionId, fileIndex가 필요합니다.' }, { status: 400 });
  }

  try {
    const svc = getServiceSupabase();
    const resolved = await resolveCenterSessionFileForAdmin(svc, sessionId, fileIndex);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { objectPath, fileUrl, fileIndex: idx, feedbackFields } = resolved.data;

    const { data: signed, error: signErr } = await svc.storage
      .from(CENTER_SESSION_FILES_BUCKET)
      .createSignedUrl(objectPath, 7200);

    if (signErr || !signed?.signedUrl) {
      devLogger.error('[center-session-file-link] createSignedUrl', signErr);
      return NextResponse.json({ error: '스토리지 접근 URL을 만들지 못했습니다.' }, { status: 502 });
    }

    const filename = displayNameForDownload(fileUrl, idx, feedbackFields.center_document_names ?? null);

    return NextResponse.json({ signedUrl: signed.signedUrl, filename });
  } catch (err) {
    devLogger.error('[center-session-file-link]', err);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
