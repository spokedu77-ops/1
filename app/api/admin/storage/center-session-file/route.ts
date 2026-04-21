import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import {
  CENTER_SESSION_FILES_BUCKET,
  resolveCenterSessionFileForAdmin,
} from '@/app/lib/server/centerSessionFileStorage';

/**
 * 청크 단위 프록시 — 각 응답 본문을 Vercel 등(약 4.5MB) 한도 아래로 유지.
 * 클라이언트는 byteStart/byteEnd로 반복 요청 후 Blob 합침 + 로컬에서 한글 파일명 저장.
 */
export const maxDuration = 300;

/** 한 요청당 최대 바이트 (헤더 여유 포함해 4.5MB 제한 회피) */
const MAX_BYTES_PER_CHUNK = 3 * 1024 * 1024;

async function readFirstNBytesFromStream(stream: ReadableStream<Uint8Array>, n: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (received < n) {
      const { done, value } = await reader.read();
      if (done) break;
      const need = n - received;
      if (value.length <= need) {
        chunks.push(value);
        received += value.length;
      } else {
        chunks.push(value.subarray(0, need));
        received += need;
        await reader.cancel();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
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

  const b = body as { sessionId?: unknown; fileIndex?: unknown; byteStart?: unknown; byteEnd?: unknown };
  const sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim() : '';
  const fileIndex =
    typeof b.fileIndex === 'number' && Number.isInteger(b.fileIndex) && b.fileIndex >= 0 ? b.fileIndex : -1;
  const byteStart =
    typeof b.byteStart === 'number' && Number.isInteger(b.byteStart) && b.byteStart >= 0 ? b.byteStart : -1;
  const byteEnd =
    typeof b.byteEnd === 'number' && Number.isInteger(b.byteEnd) && b.byteEnd >= 0 ? b.byteEnd : -1;

  if (!sessionId || fileIndex < 0 || byteStart < 0 || byteEnd < 0) {
    return NextResponse.json(
      { error: 'sessionId, fileIndex, byteStart(0 이상), byteEnd(0 이상)가 필요합니다.' },
      { status: 400 },
    );
  }

  if (byteEnd < byteStart) {
    return NextResponse.json({ error: 'byteEnd는 byteStart 이상이어야 합니다.' }, { status: 400 });
  }

  const span = byteEnd - byteStart + 1;
  if (span > MAX_BYTES_PER_CHUNK) {
    return NextResponse.json(
      { error: `한 번에 최대 ${MAX_BYTES_PER_CHUNK.toLocaleString('ko-KR')}바이트까지 요청할 수 있습니다.` },
      { status: 400 },
    );
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
      devLogger.error('[center-session-file] createSignedUrl', signErr);
      return NextResponse.json({ error: '스토리지 접근 URL을 만들지 못했습니다.' }, { status: 502 });
    }

    const rangeHdr = `bytes=${byteStart}-${byteEnd}`;
    const upstream = await fetch(signed.signedUrl, {
      redirect: 'follow',
      headers: { Range: rangeHdr },
    });

    const rawType = upstream.headers.get('content-type');
    const contentType =
      (rawType && rawType.split(';')[0]?.trim()) || 'application/octet-stream';

    if (upstream.status === 206) {
      const cr = upstream.headers.get('content-range');
      const stream = upstream.body;
      if (!stream) {
        return NextResponse.json({ error: '응답 본문이 없습니다.' }, { status: 502 });
      }
      return new NextResponse(stream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          ...(cr ? { 'Content-Range': cr } : {}),
          'Cache-Control': 'private, no-store',
        },
      });
    }

    if (upstream.status === 200) {
      const clHeader = upstream.headers.get('content-length');
      const totalLen = clHeader ? parseInt(clHeader, 10) : 0;
      const bodyStream = upstream.body;
      if (!bodyStream) {
        return NextResponse.json({ error: '응답 본문이 없습니다.' }, { status: 502 });
      }

      const remaining = totalLen > 0 ? Math.max(0, totalLen - byteStart) : span;
      const take = totalLen > 0 ? Math.min(span, remaining) : span;
      const bytes =
        take > 0 ? await readFirstNBytesFromStream(bodyStream, take) : new Uint8Array(0);

      if (totalLen > 0) {
        const endActual = byteStart + bytes.byteLength - 1;
        const cr = `bytes ${byteStart}-${endActual}/${totalLen}`;
        return new NextResponse(Buffer.from(bytes), {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Range': cr,
            'Cache-Control': 'private, no-store',
          },
        });
      }

      const cr = `bytes 0-${bytes.byteLength - 1}/${bytes.byteLength}`;
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Range': cr,
          'Cache-Control': 'private, no-store',
        },
      });
    }

    if (upstream.status === 416) {
      return NextResponse.json({ error: '요청한 범위가 파일 크기를 벗어났습니다.' }, { status: 416 });
    }

    devLogger.error('[center-session-file] upstream', upstream.status);
    return NextResponse.json({ error: '파일 구간을 불러오지 못했습니다.' }, { status: 502 });
  } catch (err) {
    devLogger.error('[center-session-file]', err);
    return NextResponse.json({ error: '다운로드 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
