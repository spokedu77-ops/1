/**
 * Storage Client
 * Supabase Storage 업로드/URL 생성 중앙화
 * 업로드는 API 경유로 수행 → 쿠키 기반 admin 세션으로 Storage RLS 통과
 */

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { BUCKET_NAME } from '../constants/storage';

/** 모듈 로드 시 서버에서 실행되지 않도록 함수 호출 시점에만 가져옴 (prerender 안전) */
function getSupabase() {
  return getSupabaseBrowserClient();
}

/**
 * Storage에 파일 업로드 (API 경유 → admin RLS 통과)
 * @param path Storage 경로 (e.g., 'play_assets/2026-01-W1/bgm/foo.mp3')
 * @param fileOrBlob 업로드할 파일 또는 Blob
 * @param contentType MIME 타입 (기본값: 'image/webp')
 * @returns Storage path
 */
export async function uploadToStorage(
  path: string,
  fileOrBlob: File | Blob,
  contentType?: string
): Promise<string> {
  const formData = new FormData();
  formData.set('path', path);
  formData.set('file', fileOrBlob);
  formData.set('contentType', contentType ?? 'image/webp');

  const res = await fetch('/api/admin/storage/upload', {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string })?.error ?? res.statusText;
    throw new Error(message);
  }

  return path;
}

/**
 * 관리자 브라우저 세션으로 Storage에 직접 업로드 (브라우저 → Supabase).
 * API 경유 업로드는 호스팅의 요청 본문 한도에 걸릴 수 있어, 주간베스트 사진 등 대용량은 이 경로를 씁니다.
 * (Storage RLS의 `is_admin()`이 통과하는 관리자만 성공)
 */
export async function uploadToStorageDirect(
  path: string,
  file: File,
  contentType?: string
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
    contentType: contentType ?? (file.type || 'image/jpeg'),
    upsert: true,
  });
  if (error) {
    throw new Error(error.message);
  }
  return path;
}

/**
 * 대용량 업로드 + Storage RLS 회피:
 * 1) admin API로 signed upload URL 발급 (Service Role)
 * 2) 브라우저에서 Storage로 직접 PUT 업로드
 *
 * 주간베스트 사진처럼 파일이 크거나,
 * 관리자 계정이더라도 Storage RLS 정책이 빡빡해서 direct upload가 막힐 때 사용합니다.
 */
export async function uploadToStorageSigned(
  path: string,
  file: File,
  contentType?: string
): Promise<string> {
  const res = await fetch('/api/admin/storage/signed-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, upsert: true }),
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? res.statusText);
  }
  const body = (await res.json().catch(() => null)) as { signedUrl?: string; path?: string } | null;
  const signedUrl = typeof body?.signedUrl === 'string' ? body.signedUrl : '';
  if (!signedUrl) throw new Error('signedUrl을 받지 못했습니다.');

  const put = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType ?? (file.type || 'application/octet-stream') },
    body: file,
  });
  if (!put.ok) {
    const txt = await put.text().catch(() => '');
    throw new Error(`Storage 업로드 실패: ${put.status} ${put.statusText}${txt ? ` - ${txt}` : ''}`);
  }

  return typeof body?.path === 'string' && body.path ? body.path : path;
}

/**
 * Storage 경로에서 Public URL 생성
 * @param path Storage 경로
 * @returns Public URL
 */
export function getPublicUrl(path: string): string {
  const { data } = getSupabase().storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error(`Public URL 생성 실패: ${path}`);
  }

  return data.publicUrl;
}

/**
 * Storage에서 파일 삭제 (API 경유 → admin 세션으로 RLS 통과)
 * @param path Storage 경로
 */
export async function deleteFromStorage(path: string): Promise<void> {
  const res = await fetch('/api/admin/storage/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string })?.error ?? res.statusText;
    throw new Error(message);
  }
}

/**
 * Storage에서 여러 파일 일괄 삭제 (API 경유, 배치)
 * @param paths Storage 경로 배열
 */
export async function deleteFromStorageBatch(paths: string[]): Promise<void> {
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return;

  const res = await fetch('/api/admin/storage/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: unique }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string })?.error ?? res.statusText;
    throw new Error(message);
  }
}

/**
 * Storage 내 파일 복사 (테마 복제 시 사용)
 * @param sourcePath 원본 경로
 * @param destPath 대상 경로
 */
export async function copyInStorage(sourcePath: string, destPath: string): Promise<void> {
  const { error } = await getSupabase().storage
    .from(BUCKET_NAME)
    .copy(sourcePath, destPath);

  if (error) {
    devLogger.error('Storage copy error:', error);
    throw new Error(`Storage 복사 실패: ${error.message}`);
  }
}

/**
 * Storage 파일 존재 여부 확인 (HEAD 요청)
 * @param path Storage 경로
 * @returns 파일 존재 여부
 */
export async function checkFileExists(path: string): Promise<boolean> {
  const { data, error } = await getSupabase().storage
    .from(BUCKET_NAME)
    .list(path.split('/').slice(0, -1).join('/'), {
      search: path.split('/').pop(),
    });

  if (error) {
    return false;
  }

  return data && data.length > 0;
}
