/**
 * 스포키듀 구독 API 요청/응답 스키마.
 * key별 value는 JSONB이므로 MVP에서는 record로 검증.
 */
import { z } from 'zod';

/** 공용 content 허용 key (카탈로그·테마 등). 원생/로드맵/즐겨찾기 금지 */
export const PUBLIC_CONTENT_KEYS = [
  'hero',
  'theme',
  'roadmap',
  'catalog_programs',
  'catalog_tags',
  'catalog_themes',
  'report_tags_catalog',
  'free_sample_program_ids', // D5: free일 때 뱅크에 노출할 프로그램 ID 목록(운영 선택)
  'program_details', // 프로그램별 영상 링크·상세설명 등 (id -> { videoUrl, description, ... })
] as const;

export const CATALOG_SCOPE_KEYS = ['catalog_programs', 'catalog_tags', 'catalog_themes', 'report_tags_catalog', 'free_sample_program_ids', 'program_details'] as const;
export const PUBLIC_SCOPE_KEYS = ['hero', 'theme', 'roadmap'] as const;

/** 테넌트 content 허용 key. v4: dashboard_v4 = 대시보드 큐레이션(2줄 4+4) */
export const TENANT_KEYS = ['tenant_roadmap', 'tenant_favorites', 'tenant_students', 'tenant_report_config', 'dashboard_v4'] as const;

export const contentKeySchema = z.enum(PUBLIC_CONTENT_KEYS);
export const tenantKeySchema = z.enum(TENANT_KEYS);

/** value는 JSONB. MVP에서는 객체/배열 등 자유 형식 허용 */
export const contentValueSchema = z.record(z.unknown()).or(z.array(z.unknown()));

export const getContentQuerySchema = z.object({
  scope: z.enum(['public', 'catalog']).optional().default('public'),
  keys: z.string().transform((s) => s.split(',').map((k) => k.trim()).filter(Boolean)),
});
export type GetContentQuery = z.infer<typeof getContentQuerySchema>;

export const patchContentBodySchema = z.object({
  key: contentKeySchema,
  value: contentValueSchema.optional(),
  expectedVersion: z.number().int().min(0).optional(),
});
export type PatchContentBody = z.infer<typeof patchContentBodySchema>;

export const getTenantQuerySchema = z.object({
  keys: z.string().transform((s) => s.split(',').map((k) => k.trim()).filter(Boolean)),
});
export const patchTenantBodySchema = z.object({
  key: tenantKeySchema,
  value: contentValueSchema.optional(),
  expectedVersion: z.number().int().min(0).optional(),
});
export type PatchTenantBody = z.infer<typeof patchTenantBodySchema>;
