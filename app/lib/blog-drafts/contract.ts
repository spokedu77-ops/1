import { z } from 'zod';

export const BLOG_DRAFT_CATEGORIES = ['아동체육', '특수체육', 'SPOMOVE', '교육정보', '기타'] as const;
export const BLOG_DRAFT_STATUSES = ['draft', 'review', 'complete', 'published'] as const;

export const blogDraftStatusLabel: Record<(typeof BLOG_DRAFT_STATUSES)[number], string> = {
  draft: '초안',
  review: '검토 중',
  complete: '작성 완료',
  published: '발행 완료',
};

export const blogDraftWriteSchema = z.object({
  title: z.string().trim().max(200),
  content: z.custom<Record<string, unknown>>(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return (value as { type?: string }).type === 'doc' && JSON.stringify(value).length <= 1_000_000;
  }, '본문 형식을 확인해 주세요.'),
  category: z.enum(BLOG_DRAFT_CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(30)).max(12),
  status: z.enum(BLOG_DRAFT_STATUSES),
  featuredImage: z.string().uuid().nullable(),
  publishedUrl: z.string().trim().url().max(500).refine(value => value.startsWith('https://'), 'https URL만 등록할 수 있습니다.').nullable(),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  revision: z.number().int().positive().optional(),
});

export type BlogDraftWrite = z.infer<typeof blogDraftWriteSchema>;

export function plainTextFromDoc(node: unknown): string {
  const parts: string[] = [];
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const current = value as { text?: unknown; content?: unknown };
    if (typeof current.text === 'string') parts.push(current.text);
    if (Array.isArray(current.content)) current.content.forEach(walk);
  };
  walk(node);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function excerptFromText(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length <= 180 ? compact : `${compact.slice(0, 180).trim()}…`;
}
