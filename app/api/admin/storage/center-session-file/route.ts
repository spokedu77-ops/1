import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { displayNameForDownload, type FeedbackFields } from '@/app/lib/feedbackValidation';

export const maxDuration = 120;

const ALLOWED_BUCKET = 'session-files';
const CENTER_TYPES = new Set(['regular_center', 'one_day_center']);

function decodeObjectPath(pathFromUrl: string): string {
  return pathFromUrl
    .split('/')
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .join('/');
}

/** Supabase Storage 공개/서명 URL에서 버킷·객체 경로만 추출 (호스트 일치 검증) */
function parseSessionFilesStorageRef(url: string): { bucket: string; objectPath: string } | null {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return null;
    const expectedHost = new URL(base).host;
    const u = new URL(url);
    if (u.host !== expectedHost) return null;

    const p = u.pathname;
    const publicMatch = p.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (publicMatch?.[1] && publicMatch[2]) {
      return { bucket: publicMatch[1], objectPath: decodeObjectPath(publicMatch[2]) };
    }
    const signMatch = p.match(/^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/);
    if (signMatch?.[1] && signMatch[2]) {
      return { bucket: signMatch[1], objectPath: decodeObjectPath(signMatch[2]) };
    }
    return null;
  } catch {
    return null;
  }
}

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
    const { data: row, error: fetchErr } = await svc
      .from('sessions')
      .select('id, session_type, file_url, feedback_fields')
      .eq('id', sessionId)
      .maybeSingle();

    if (fetchErr) {
      devLogger.error('[center-session-file] session fetch', fetchErr);
      return NextResponse.json({ error: '세션을 불러오지 못했습니다.' }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }

    const sessionType = String((row as { session_type?: string }).session_type || '');
    if (!CENTER_TYPES.has(sessionType)) {
      return NextResponse.json({ error: '센터 수업 첨부만 다운로드할 수 있습니다.' }, { status: 400 });
    }

    const fileUrlsRaw = (row as { file_url?: unknown }).file_url;
    const fileUrls = Array.isArray(fileUrlsRaw)
      ? fileUrlsRaw.filter((u): u is string => typeof u === 'string')
      : [];

    if (fileIndex >= fileUrls.length) {
      return NextResponse.json({ error: '파일 인덱스가 유효하지 않습니다.' }, { status: 400 });
    }

    const fileUrl = fileUrls[fileIndex]!;
    const ref = parseSessionFilesStorageRef(fileUrl);
    if (!ref || ref.bucket !== ALLOWED_BUCKET) {
      return NextResponse.json({ error: '허용되지 않은 저장소 URL입니다.' }, { status: 400 });
    }

    const ffRaw = (row as { feedback_fields?: unknown }).feedback_fields;
    const ff =
      ffRaw && typeof ffRaw === 'object' && !Array.isArray(ffRaw) ? (ffRaw as FeedbackFields) : {};
    const downloadName = displayNameForDownload(fileUrl, fileIndex, ff.center_document_names ?? null);

    const { data: fileBlob, error: dlErr } = await svc.storage.from(ALLOWED_BUCKET).download(ref.objectPath);
    if (dlErr || !fileBlob) {
      devLogger.error('[center-session-file] storage download', dlErr);
      return NextResponse.json({ error: '스토리지에서 파일을 읽지 못했습니다.' }, { status: 502 });
    }

    const buf = await fileBlob.arrayBuffer();
    const mime = typeof fileBlob.type === 'string' && fileBlob.type.length > 0 ? fileBlob.type : 'application/octet-stream';
    const encoded = encodeURIComponent(downloadName);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    devLogger.error('[center-session-file]', err);
    return NextResponse.json({ error: '다운로드 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
