import { z } from 'zod';

export const FIELD_RECORD_CATEGORIES = [
  { id: 'institution', label: '학교·기관 체육교육' },
  { id: 'private', label: '개인·소그룹 체육교육' },
  { id: 'special', label: '특수체육' },
  { id: 'spomove', label: 'SPOMOVE' },
] as const;
export const FIELD_RECORD_SECTIONS = [
  { id: 'introduction', label: '대표 소개' },
  { id: 'background', label: '교육 배경과 목표' },
  { id: 'activities', label: '실제 수업 구성' },
  { id: 'teaching', label: 'SPOKEDU의 지도 방식' },
  { id: 'observations', label: '현장 관찰과 기록' },
  { id: 'gallery', label: '현장 사진 및 교육 안내' },
] as const;
export const MIGRATED_RECORD_SLUGS = ['maedong-sports-stepup', 'dongjak-spomove', 'donghaeng-special-pe'] as const;
export const LOCAL_RECORD_IMAGES = {
  maedong: '/images/spokedu/home/field-editorial/home-case-general.webp',
  dongjak: '/images/spokedu/home/field-editorial/dongjak-spomove-class-20261021.webp',
  donghaeng: '/images/spokedu/home/field-editorial/home-case-adapted-p05.webp',
} as const;

export function safeRecordHref(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//') && !/[\\\s\u0000-\u001f]/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
const href = z.string().max(1500).refine(safeRecordHref, '사이트 내부 경로 또는 HTTPS 주소를 입력해 주세요.');
const inlineText = z.object({ type: z.literal('text'), text: z.string().max(30000), styles: z.object({ bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(), strike: z.boolean().optional(), code: z.boolean().optional(), textColor: z.string().optional(), backgroundColor: z.string().optional() }).default({}) });
const inlineSchema = z.union([inlineText, z.object({ type: z.literal('link'), href, content: z.array(inlineText).max(100) })]);
export type RecordInline = z.infer<typeof inlineSchema>;
export type RecordBlock = { id?: string; type: 'paragraph' | 'heading' | 'bulletListItem' | 'numberedListItem'; props?: { level?: number; textAlignment?: string; textColor?: string; backgroundColor?: string }; content: string | RecordInline[]; children?: RecordBlock[] };
export const recordBlockSchema: z.ZodType<RecordBlock, z.ZodTypeDef, unknown> = z.lazy(() => z.object({
  id: z.string().max(100).optional(),
  type: z.enum(['paragraph', 'heading', 'bulletListItem', 'numberedListItem']),
  props: z.object({ level: z.number().int().min(1).max(3).optional(), textAlignment: z.string().optional(), textColor: z.string().optional(), backgroundColor: z.string().optional() }).optional(),
  content: z.union([z.string().max(30000), z.array(inlineSchema).max(500)]),
  children: z.array(recordBlockSchema).max(100).optional(),
}));
const mediaSchema = z.object({
  id: z.string().uuid().optional(), localKey: z.enum(['maedong', 'dongjak', 'donghaeng']).optional(),
  alt: z.string().max(500), caption: z.string().max(1500).default(''), publicConfirmed: z.boolean().default(false),
}).refine(value => Boolean(value.id) !== Boolean(value.localKey), '업로드 사진 또는 기존 사진 중 하나를 선택해 주세요.');
export type RecordMedia = z.infer<typeof mediaSchema>;
export const recordContentSchema = z.object({
  title: z.string().max(250), venue: z.string().max(200), subtitle: z.string().max(400),
  operationType: z.string().max(100), programLabel: z.string().max(100), summary: z.string().max(1200),
  audience: z.string().max(400), operator: z.string().max(400), period: z.string().max(200).default(''),
  categories: z.array(z.enum(['institution', 'private', 'special', 'spomove'])).max(4),
  keywords: z.array(z.string().max(100)).max(20),
  sections: z.array(z.object({ id: z.enum(['introduction', 'background', 'activities', 'teaching', 'observations', 'gallery']), title: z.string().max(250), visible: z.boolean(), blocks: z.array(recordBlockSchema).max(500) })).length(6)
    .refine(items => new Set(items.map(item => item.id)).size === 6, '본문 영역이 중복되었습니다.'),
  hero: mediaSchema.nullable(), gallery: z.array(mediaSchema).max(40),
  imagePublicConfirmed: z.boolean().default(false), relatedProgram: href,
  ctaTitle: z.string().max(500), programCtaLabel: z.string().max(100), contactCtaLabel: z.string().max(100), contactHref: href,
  seoTitle: z.string().max(250), seoDescription: z.string().max(500),
  publicationDate: z.string().datetime({ offset: true }).nullable().default(null),
  requestedFeaturedSlot: z.number().int().min(1).max(3).nullable().default(null),
  editorialNotes: z.string().max(10000).default(''),
});
export type RecordContent = z.infer<typeof recordContentSchema>;
export type RecordRow = { id: string; slug: string; status: 'draft' | 'review' | 'published'; draft_content: RecordContent; published_content: RecordContent | null; featured_slot: number | null; published_at: string | null; revision: number; updated_at: string };
export type PublicFieldRecord = { id: string; slug: string; content: RecordContent; featuredSlot: number | null; publishedAt: string; updatedAt: string };
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);

export function validatePublication(content: RecordContent): string[] {
  const errors: string[] = [];
  for (const key of ['title', 'venue', 'subtitle', 'operationType', 'programLabel', 'summary', 'audience', 'operator', 'seoTitle', 'seoDescription', 'ctaTitle', 'programCtaLabel', 'contactCtaLabel'] as const) if (!content[key].trim()) errors.push(`${key}: 필수 항목입니다.`);
  if (!content.categories.length) errors.push('교육 유형을 선택해 주세요.');
  if (!content.hero) errors.push('대표 사진을 등록해 주세요.');
  if (!content.imagePublicConfirmed) errors.push('사진의 외부 게시 동의를 확인해 주세요.');
  for (const media of [content.hero, ...content.gallery].filter((item): item is RecordMedia => Boolean(item))) {
    if (!media.publicConfirmed || !media.alt.trim()) errors.push('모든 공개 사진의 동의 확인과 대체 텍스트가 필요합니다.');
  }
  for (const id of ['introduction', 'background', 'activities', 'teaching'] as const) {
    const section = content.sections.find(item => item.id === id);
    const hasText = (blocks: RecordBlock[]): boolean => blocks.some(block => (typeof block.content === 'string' ? block.content.trim() : block.content.some(item => item.type === 'text' ? item.text.trim() : item.content.some(text => text.text.trim()))) || hasText(block.children ?? []));
    if (!section?.visible || !hasText(section.blocks)) errors.push(`${id}: 공개 본문이 필요합니다.`);
  }
  return errors;
}

export function publicRecordContent(content: RecordContent): RecordContent {
  return { ...content, editorialNotes: '', sections: content.sections.filter(section => section.visible), gallery: content.sections.some(section => section.id === 'gallery' && section.visible) ? content.gallery : [] };
}

export function recordMediaSrc(media: RecordMedia, preview = false): string {
  if (media.localKey) return LOCAL_RECORD_IMAGES[media.localKey];
  return `${preview ? '/api/admin/field-records/media' : '/api/field-records/media'}/${media.id}`;
}
