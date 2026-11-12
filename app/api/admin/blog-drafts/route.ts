import { z } from 'zod';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { adminJson, blogDraftError, draftRow, recordDraftRevision, rejectForeignOrigin } from '@/app/lib/server/blogDraftsAdmin';
import { BLOG_DRAFT_CATEGORIES, blogDraftWriteSchema } from '@/app/lib/blog-drafts/contract';

const PAGE_SIZE = 8;
const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.enum(BLOG_DRAFT_CATEGORIES).optional(),
  sort: z.enum(['updated', 'created', 'title']).default('updated'),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

async function authorNames(ids: string[]) {
  const unique = [...new Set(ids)];
  const db = getServiceSupabase();
  const entries = await Promise.all(unique.map(async id => {
    const { data } = await db.auth.admin.getUserById(id);
    const email = data.user?.email ?? '';
    const name = email.split('@')[0] || '관리자';
    return [id, name] as const;
  }));
  return Object.fromEntries(entries);
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const parsed = listQuery.safeParse({
    q: url.searchParams.get('q') || undefined,
    category: url.searchParams.get('category') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    page: url.searchParams.get('page') || undefined,
  });
  if (!parsed.success) return adminJson({ error: '목록 조건을 확인해 주세요.' }, 400);
  const { q, category, sort, page } = parsed.data;
  let query = getServiceSupabase().from('blog_drafts').select('id,title,category,tags,status,excerpt,author_id,published_at,created_at,updated_at', { count: 'exact' });
  if (category) query = query.eq('category', category);
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,plain_text.ilike.%${safe}%`);
  }
  const column = sort === 'created' ? 'created_at' : sort === 'title' ? 'title' : 'updated_at';
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.order(column, { ascending: sort === 'title' }).range(from, from + PAGE_SIZE - 1);
  if (error) return adminJson({ error: '블로그 원고 테이블을 확인해 주세요. 마이그레이션 적용이 필요합니다.' }, 503);
  const authors = await authorNames((data ?? []).map(row => row.author_id));
  return adminJson({
    drafts: (data ?? []).map(row => ({ ...row, author_name: authors[row.author_id] ?? '관리자' })),
    page,
    pageSize: PAGE_SIZE,
    total: count ?? 0,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const originError = rejectForeignOrigin(request);
  if (originError) return originError;
  try {
    const input = blogDraftWriteSchema.parse(await request.json());
    if (input.featuredImage || JSON.stringify(input.content).includes('/api/admin/blog-drafts/media/')) {
      return adminJson({ error: '원고를 먼저 저장한 뒤 이미지를 넣어 주세요.' }, 400);
    }
    if (input.status === 'published' && (!input.publishedUrl || !input.publishedAt)) {
      return adminJson({ error: '발행 완료로 표시하려면 게시 URL과 발행일이 필요합니다.' }, 400);
    }
    const row = draftRow(input, auth.userId);
    const db = getServiceSupabase();
    const { data, error } = await db.from('blog_drafts').insert(row).select('id,revision,updated_at,status').single();
    if (error || !data) return adminJson({ error: '원고를 저장하지 못했습니다.' }, 503);
    const revisionSaved = await recordDraftRevision(data.id, input.content, 1, auth.userId);
    return adminJson({ draft: data, revisionSaved }, 201);
  } catch (error) {
    return blogDraftError(error);
  }
}
