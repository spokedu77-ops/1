/**
 * Storage Client
 * Supabase Storage 업로드/URL 생성 중앙화
 * 업로드는 API 경유로 수행 → 쿠키 기반 admin 세션으로 Storage RLS 통과
 */

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
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
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string })?.error ?? res.statusText;
    throw new Error(message);
  }

  return path;
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
    console.error('Storage copy error:', error);
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
