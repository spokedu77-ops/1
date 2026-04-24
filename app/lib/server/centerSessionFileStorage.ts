import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedbackFields } from '@/app/lib/feedbackValidation';

export const CENTER_SESSION_FILES_BUCKET = 'session-files';
const CENTER_TYPES = new Set(['regular_center', 'one_day_center']);

/** NEXT_PUBLIC_SUPABASE_URL이 커스텀 도메인이어도 DB의 file_url은 projectref.supabase.co일 수 있음 → 동일 프로젝트면 허용 */
function getSupabaseProjectRefFromEnv(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (base) {
    try {
      const h = new URL(base.trim()).hostname;
      const m = h.match(/^([^.]+)\.supabase\.co$/i);
      if (m?.[1]) return m[1];
    } catch {
      /* ignore */
    }
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key?.includes('.')) return null;
  try {
    const payload = key.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as { ref?: string };
    return typeof json.ref === 'string' && json.ref.length > 0 ? json.ref : null;
  } catch {
    return null;
  }
}

function isAllowedStorageUrlHost(urlHost: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  let expectedHost: string;
  try {
    expectedHost = new URL(base.trim()).host;
  } catch {
    return false;
  }
  if (urlHost === expectedHost) return true;
  const ref = getSupabaseProjectRefFromEnv();
  if (ref && urlHost.toLowerCase() === `${ref.toLowerCase()}.supabase.co`) return true;
  return false;
}

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

/** Supabase Storage 공개/서명/인증 URL에서 버킷·객체 경로만 추출 (동일 프로젝트 호스트만) */
export function parseSessionFilesStorageRef(url: string): { bucket: string; objectPath: string } | null {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
    const u = new URL(url.trim());
    if (!isAllowedStorageUrlHost(u.host)) return null;

    const p = u.pathname;
    const publicMatch = p.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (publicMatch?.[1] && publicMatch?.[2]) {
      return { bucket: publicMatch[1], objectPath: decodeObjectPath(publicMatch[2]) };
    }
    const signMatch = p.match(/^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/);
    if (signMatch?.[1] && signMatch?.[2]) {
      return { bucket: signMatch[1], objectPath: decodeObjectPath(signMatch[2]) };
    }
    const authMatch = p.match(/^\/storage\/v1\/object\/authenticated\/([^/]+)\/(.+)$/);
    if (authMatch?.[1] && authMatch?.[2]) {
      return { bucket: authMatch[1], objectPath: decodeObjectPath(authMatch[2]) };
    }
    return null;
  } catch {
    return null;
  }
}

export type CenterSessionFileResolved = {
  objectPath: string;
  fileUrl: string;
  fileIndex: number;
  feedbackFields: FeedbackFields;
};

export type ResolveCenterSessionFileError = { error: string; status: number };

/**
 * 피드백 검수 센터 첨부: 세션·URL·스토리지 ref 검증 후 객체 경로 반환.
 * `/api/admin/storage/center-session-file` 프록시에서 사용.
 */
export async function resolveCenterSessionFileForAdmin(
  svc: SupabaseClient,
  sessionId: string,
  fileIndex: number
): Promise<{ data: CenterSessionFileResolved } | ResolveCenterSessionFileError> {
  const { data: row, error: fetchErr } = await svc
    .from('sessions')
    .select('id, session_type, file_url, feedback_fields')
    .eq('id', sessionId)
    .maybeSingle();

  if (fetchErr) {
    return { error: '세션을 불러오지 못했습니다.', status: 500 };
  }
  if (!row) {
    return { error: '세션을 찾을 수 없습니다.', status: 404 };
  }

  const sessionType = String((row as { session_type?: string }).session_type || '');
  if (!CENTER_TYPES.has(sessionType)) {
    return { error: '센터 수업 첨부만 다운로드할 수 있습니다.', status: 400 };
  }

  const fileUrlsRaw = (row as { file_url?: unknown }).file_url;
  const fileUrls = Array.isArray(fileUrlsRaw)
    ? fileUrlsRaw.filter((u): u is string => typeof u === 'string')
    : [];

  if (fileIndex >= fileUrls.length) {
    return { error: '파일 인덱스가 유효하지 않습니다.', status: 400 };
  }

  const fileUrl = fileUrls[fileIndex]!.trim();
  const ref = parseSessionFilesStorageRef(fileUrl);
  if (!ref || ref.bucket !== CENTER_SESSION_FILES_BUCKET) {
    return { error: '허용되지 않은 저장소 URL입니다.', status: 400 };
  }

  const ffRaw = (row as { feedback_fields?: unknown }).feedback_fields;
  const feedbackFields =
    ffRaw && typeof ffRaw === 'object' && !Array.isArray(ffRaw) ? (ffRaw as FeedbackFields) : {};

  return {
    data: {
      objectPath: ref.objectPath,
      fileUrl,
      fileIndex,
      feedbackFields,
    },
  };
}
