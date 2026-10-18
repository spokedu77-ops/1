'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { CriminalCheckFile } from '@/app/lib/centers/types';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import {
  centerCriminalCheckPathPrefix,
  CRIMINAL_CHECK_LEGACY_BUCKET,
  CRIMINAL_CHECK_PRIVATE_BUCKET,
  isCenterCriminalCheckPath,
  sanitizeCriminalCheckFileName,
} from '@/app/lib/centers/criminalCheckFiles';

const ADMIN_REQUIRED = '관리자 권한이 필요합니다.';
const CENTER_NOT_FOUND = '센터를 찾을 수 없습니다.';
const FILE_NOT_FOUND = '해당 센터의 첨부파일을 찾을 수 없습니다.';
const centerIdSchema = z.string().uuid();
const fileNameSchema = z.string().trim().min(1).max(180);
const contentTypeSchema = z.string().trim().max(120).optional();
const allowedExtensions = new Set(['hwp', 'doc', 'docx', 'pdf', 'jpg', 'jpeg', 'png', 'webp']);
const allowedContentTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-hwp',
  'application/haansofthwp',
  'application/octet-stream',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function normalizeFiles(value: unknown): CriminalCheckFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const file = entry as Partial<CriminalCheckFile>;
    if (typeof file.name !== 'string' || typeof file.path !== 'string') return [];
    return [{
      name: file.name,
      path: file.path,
      ...(typeof file.bucket === 'string' && file.bucket ? { bucket: file.bucket } : {}),
    }];
  });
}

function bucketFor(file: CriminalCheckFile): string {
  return file.bucket || CRIMINAL_CHECK_LEGACY_BUCKET;
}

async function getCenterFiles(centerId: string) {
  return getServiceSupabase()
    .from('centers')
    .select('criminal_check_files')
    .eq('id', centerId)
    .maybeSingle();
}

async function objectExists(bucket: string, path: string): Promise<{ exists?: boolean; error?: string }> {
  const slash = path.lastIndexOf('/');
  const folder = slash >= 0 ? path.slice(0, slash) : '';
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  const { data, error } = await getServiceSupabase().storage.from(bucket).list(folder, {
    limit: 2,
    search: name,
  });
  if (error) return { error: error.message };
  return { exists: (data ?? []).some((item) => item.name === name) };
}

export async function createCriminalCheckUpload(
  centerId: string,
  fileName: string,
  contentType?: string
): Promise<{ data?: { path: string; bucket: string; signedUrl: string }; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsedCenterId = centerIdSchema.safeParse(centerId);
  const parsedName = fileNameSchema.safeParse(fileName);
  const parsedType = contentTypeSchema.safeParse(contentType);
  if (!parsedCenterId.success || !parsedName.success || !parsedType.success) {
    return { error: '올바르지 않은 업로드 요청입니다.' };
  }
  const extension = parsedName.data.split('.').pop()?.toLowerCase() ?? '';
  const normalizedContentType = parsedType.data || 'application/octet-stream';
  if (!allowedExtensions.has(extension) || !allowedContentTypes.has(normalizedContentType)) {
    return { error: '허용되지 않는 첨부파일 형식입니다.' };
  }

  const { data: center, error: centerError } = await getServiceSupabase()
    .from('centers')
    .select('id')
    .eq('id', parsedCenterId.data)
    .maybeSingle();
  if (centerError) return { error: centerError.message };
  if (!center) return { error: CENTER_NOT_FOUND };

  const name = sanitizeCriminalCheckFileName(parsedName.data);
  const path = `${centerCriminalCheckPathPrefix(parsedCenterId.data)}${Date.now()}_${randomUUID()}_${name}`;
  const { data, error } = await getServiceSupabase().storage
    .from(CRIMINAL_CHECK_PRIVATE_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.signedUrl) {
    return { error: error?.message ?? '업로드 URL을 만들지 못했습니다.' };
  }
  return {
    data: { path: data.path ?? path, bucket: CRIMINAL_CHECK_PRIVATE_BUCKET, signedUrl: data.signedUrl },
  };
}

export async function finalizeCriminalCheckUpload(
  centerId: string,
  input: unknown
): Promise<{ data?: CriminalCheckFile[]; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsedCenterId = centerIdSchema.safeParse(centerId);
  const parsedFile = z.object({
    name: fileNameSchema,
    path: z.string().min(1).max(500),
    bucket: z.literal(CRIMINAL_CHECK_PRIVATE_BUCKET),
  }).safeParse(input);
  if (!parsedCenterId.success || !parsedFile.success || !isCenterCriminalCheckPath(parsedCenterId.data, parsedFile.data.path)) {
    return { error: '올바르지 않은 첨부파일 요청입니다.' };
  }

  const exists = await objectExists(parsedFile.data.bucket, parsedFile.data.path);
  if (exists.error) return { error: exists.error };
  if (!exists.exists) return { error: '업로드된 파일을 확인할 수 없습니다.' };

  const { data: center, error: centerError } = await getCenterFiles(parsedCenterId.data);
  if (centerError) return { error: centerError.message };
  if (!center) return { error: CENTER_NOT_FOUND };
  const currentFiles = normalizeFiles(center.criminal_check_files);
  if (currentFiles.some((file) => file.path === parsedFile.data.path && bucketFor(file) === parsedFile.data.bucket)) {
    return { data: currentFiles };
  }

  const nextFiles = [...currentFiles, parsedFile.data];
  const { data: updated, error: updateError } = await getServiceSupabase()
    .from('centers')
    .update({ criminal_check_files: nextFiles })
    .eq('id', parsedCenterId.data)
    .eq('criminal_check_files', JSON.stringify(currentFiles))
    .select('criminal_check_files')
    .maybeSingle();
  if (!updated || updateError) {
    await getServiceSupabase().storage.from(parsedFile.data.bucket).remove([parsedFile.data.path]);
    return { error: updateError?.message ?? '동시 변경이 감지되었습니다. 파일을 다시 추가해 주세요.' };
  }
  return { data: normalizeFiles(updated.criminal_check_files) };
}

export async function deleteCriminalCheckFile(
  centerId: string,
  input: unknown
): Promise<{ data?: CriminalCheckFile[]; error?: string; storageDeletedDatabasePending?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsedCenterId = centerIdSchema.safeParse(centerId);
  const parsedFile = z.object({
    path: z.string().min(1).max(500),
    bucket: z.string().min(1).max(100).optional(),
  }).safeParse(input);
  if (!parsedCenterId.success || !parsedFile.success || !isCenterCriminalCheckPath(parsedCenterId.data, parsedFile.data.path)) {
    return { error: '올바르지 않은 삭제 요청입니다.' };
  }

  const { data: center, error: centerError } = await getCenterFiles(parsedCenterId.data);
  if (centerError) return { error: centerError.message };
  if (!center) return { error: CENTER_NOT_FOUND };
  const currentFiles = normalizeFiles(center.criminal_check_files);
  const index = currentFiles.findIndex((file) =>
    file.path === parsedFile.data.path
    && bucketFor(file) === (parsedFile.data.bucket || CRIMINAL_CHECK_LEGACY_BUCKET)
  );
  if (index < 0) return { data: currentFiles };

  const target = currentFiles[index];
  const bucket = bucketFor(target);
  const before = await objectExists(bucket, target.path);
  if (before.error) return { error: before.error };
  if (before.exists) {
    const { error: removeError } = await getServiceSupabase().storage.from(bucket).remove([target.path]);
    if (removeError) return { error: `Storage 삭제 실패: ${removeError.message}` };
    const after = await objectExists(bucket, target.path);
    if (after.error) return { error: `삭제 확인 실패: ${after.error}` };
    if (after.exists) return { error: 'Storage 원본이 남아 있어 DB 참조를 보존했습니다.' };
  }

  const nextFiles = currentFiles.filter((_, fileIndex) => fileIndex !== index);
  const { data: updated, error: updateError } = await getServiceSupabase()
    .from('centers')
    .update({ criminal_check_files: nextFiles })
    .eq('id', parsedCenterId.data)
    .eq('criminal_check_files', JSON.stringify(currentFiles))
    .select('criminal_check_files')
    .maybeSingle();
  if (!updated || updateError) {
    return {
      error: updateError?.message ?? 'Storage는 삭제됐지만 DB 참조 정리가 보류됐습니다. 같은 삭제를 다시 시도해 주세요.',
      storageDeletedDatabasePending: true,
    };
  }
  return { data: normalizeFiles(updated.criminal_check_files) };
}

export async function createCriminalCheckDownloadUrl(
  centerId: string,
  input: unknown
): Promise<{ data?: string; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: ADMIN_REQUIRED };
  const parsedCenterId = centerIdSchema.safeParse(centerId);
  const parsedFile = z.object({
    path: z.string().min(1).max(500),
    bucket: z.string().min(1).max(100).optional(),
  }).safeParse(input);
  if (!parsedCenterId.success || !parsedFile.success || !isCenterCriminalCheckPath(parsedCenterId.data, parsedFile.data.path)) {
    return { error: '올바르지 않은 파일 조회 요청입니다.' };
  }

  const { data: center, error: centerError } = await getCenterFiles(parsedCenterId.data);
  if (centerError) return { error: centerError.message };
  if (!center) return { error: CENTER_NOT_FOUND };
  const files = normalizeFiles(center.criminal_check_files);
  const target = files.find((file) =>
    file.path === parsedFile.data.path
    && bucketFor(file) === (parsedFile.data.bucket || CRIMINAL_CHECK_LEGACY_BUCKET)
  );
  if (!target) return { error: FILE_NOT_FOUND };

  const { data, error } = await getServiceSupabase().storage
    .from(bucketFor(target))
    .createSignedUrl(target.path, 60);
  if (error || !data?.signedUrl) return { error: error?.message ?? '파일 URL을 만들지 못했습니다.' };
  return { data: data.signedUrl };
}
