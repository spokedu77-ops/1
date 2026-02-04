/**
 * Storage Client
 * Supabase Storage 업로드/URL 생성 중앙화
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';
import { BUCKET_NAME } from '../constants/storage';

const supabase = getSupabaseClient();

/**
 * Storage에 파일 업로드
 * @param path Storage 경로 (e.g., 'themes/kitchen_v1/actions/POINT/off.webp')
 * @param fileOrBlob 업로드할 파일 또는 Blob
 * @param contentType MIME 타입 (기본값: 'image/webp')
 * @returns Storage path
 */
export async function uploadToStorage(
  path: string,
  fileOrBlob: File | Blob,
  contentType?: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, fileOrBlob, {
      contentType: contentType || 'image/webp',
      upsert: true, // 기존 파일 덮어쓰기
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Storage 업로드 실패: ${error.message}`);
  }

  return path;
}

/**
 * Storage 경로에서 Public URL 생성
 * @param path Storage 경로
 * @returns Public URL
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error(`Public URL 생성 실패: ${path}`);
  }

  return data.publicUrl;
}

/**
 * Storage에서 파일 삭제
 * @param path Storage 경로
 */
export async function deleteFromStorage(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Storage delete error:', error);
    throw new Error(`Storage 삭제 실패: ${error.message}`);
  }
}

/**
 * Storage에서 여러 파일 일괄 삭제 (배치)
 * @param paths Storage 경로 배열
 */
export async function deleteFromStorageBatch(paths: string[]): Promise<void> {
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(unique);

  if (error) {
    console.error('Storage batch delete error:', error);
    throw new Error(`Storage 일괄 삭제 실패: ${error.message}`);
  }
}

/**
 * Storage 내 파일 복사 (테마 복제 시 사용)
 * @param sourcePath 원본 경로
 * @param destPath 대상 경로
 */
export async function copyInStorage(sourcePath: string, destPath: string): Promise<void> {
  const { error } = await supabase.storage
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
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(path.split('/').slice(0, -1).join('/'), {
      search: path.split('/').pop(),
    });

  if (error) {
    return false;
  }

  return data && data.length > 0;
}
