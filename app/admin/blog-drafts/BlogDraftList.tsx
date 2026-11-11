'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BLOG_DRAFT_CATEGORIES, blogDraftStatusLabel } from '@/app/lib/blog-drafts/contract';
import styles from './BlogDrafts.module.css';

type Draft = {
  id: string;
  title: string;
  category: string;
  status: keyof typeof blogDraftStatusLabel;
  excerpt: string;
  author_name: string;
  created_at: string;
  updated_at: string;
};

const dateText = (value: string) => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value));

export function BlogDraftList() {
  const router = useRouter();
  const params = useSearchParams();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [total, setTotal] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'updated';
  const page = Number(params.get('page') ?? '1') || 1;
  const pageSize = 8;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ sort, page: String(page) });
    if (q) query.set('q', q);
    if (category) query.set('category', category);
    setLoading(true);
    void fetch(`/api/admin/blog-drafts?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || '목록을 불러오지 못했습니다.');
        setDrafts(body.drafts);
        setTotal(body.total);
        setError('');
      })
      .catch(reason => {
        if (reason.name !== 'AbortError') setError(reason.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [q, category, sort, page]);

  // Reuse the existing exact totals; never infer category counts from one page.
  useEffect(() => {
    const controller = new AbortController();
    setCategoryCounts({});
    void Promise.all(['', ...BLOG_DRAFT_CATEGORIES].map(async item => {
      const query = new URLSearchParams({ page: '1' });
      if (q) query.set('q', q);
      if (item) query.set('category', item);
      const response = await fetch(`/api/admin/blog-drafts?${query}`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('count unavailable');
      const body = await response.json();
      return [item, body.total] as const;
    })).then(entries => setCategoryCounts(Object.fromEntries(entries))).catch(() => {});
    return () => controller.abort();
  }, [q]);

  const push = (next: Record<string, string>) => {
    const query = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) query.set(key, value);
      else query.delete(key);
    });
    if (!('page' in next)) query.delete('page');
    router.push(`/admin/blog-drafts?${query}`);
  };
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const visiblePages = Array.from(new Set([1, pages, ...Array.from({ length: 5 }, (_, index) => page - 2 + index).filter(value => value > 0 && value <= pages)])).sort((a, b) => a - b);

  return (
    <section className={styles.list}>
      <header className={styles.listHeader}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>SPOKEDU EDITORIAL</span>
          <h1>블로그 원고</h1>
          <p>발행 전 원고를 정리하고, 검토 상태와 수정 이력을 남깁니다.</p>
        </div>
        <div className={styles.headerControls}>
          <Link href="/admin/blog-drafts/new" className={styles.primary}>＋ 새 원고 작성</Link>
          <div className={styles.searchControls}>
            <form className={styles.search} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); push({ q: String(data.get('q') ?? '').trim() }); }}>
              <input name="q" defaultValue={q} aria-label="원고 검색" placeholder="제목, 본문, 태그 검색" />
              <button type="submit" aria-label="검색"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg></button>
            </form>
            <select aria-label="원고 정렬" value={sort} onChange={event => push({ sort: event.target.value })} className={styles.sort}>
              <option value="updated">최신 수정순</option><option value="created">작성일순</option><option value="title">제목순</option>
            </select>
          </div>
        </div>
      </header>
      <div className={styles.filterBar}>
        <nav className={styles.categories} aria-label="원고 카테고리">
          {['', ...BLOG_DRAFT_CATEGORIES].map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => push({ category: item })}>{item || '전체'} <span>{categoryCounts[item]?.toLocaleString('ko-KR') ?? '—'}</span></button>)}
        </nav>
        <span className={styles.resultCount}>총 <strong>{total.toLocaleString('ko-KR')}</strong>개의 원고</span>
      </div>
      {error && <p role="alert" className={styles.notice}>{error}</p>}
      {loading ? <p role="status" className={styles.empty}>원고를 불러오는 중…</p> : (
        <div className={styles.articles}>
          {drafts.map(draft => (
            <Link key={draft.id} href={`/admin/blog-drafts/${draft.id}`} className={styles.article}>
              <div className={styles.articleMeta}><span className={styles.categoryLabel}>{draft.category}</span><span>·</span><time dateTime={draft.created_at}>{dateText(draft.created_at)}</time></div>
              <div className={styles.articleTitle}><h2>{draft.title || '제목 없는 원고'}</h2><span aria-hidden="true">→</span></div>
              <p className={styles.excerpt}>{draft.excerpt || '본문 미리보기가 없습니다.'}</p>
              <div className={styles.articleFooter}><span className={styles.author}><span className={styles.avatar} aria-hidden="true">{draft.author_name.slice(0, 1)}</span>{draft.author_name}</span><span className={styles.status}>{blogDraftStatusLabel[draft.status]}</span><span className={styles.updated}>최종 수정 {dateText(draft.updated_at)}</span></div>
            </Link>
          ))}
          {drafts.length === 0 && <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">✎</span><h2>등록된 원고가 없습니다.</h2><p>새 원고를 작성해 생각과 기록을 담아보세요.</p><Link href="/admin/blog-drafts/new" className={styles.primary}>새 원고 작성</Link></div>}
        </div>
      )}
      {pages > 1 && <nav className={styles.pagination} aria-label="원고 페이지">
        <button type="button" aria-label="이전 페이지" disabled={page <= 1} onClick={() => push({ page: String(page - 1) })}>‹</button>
        {visiblePages.map((number, index) => <span key={number}>{index > 0 && number - visiblePages[index - 1] > 1 && <span className={styles.ellipsis}>…</span>}<button type="button" aria-current={page === number ? 'page' : undefined} onClick={() => push({ page: String(number) })}>{number}</button></span>)}
        <button type="button" aria-label="다음 페이지" disabled={page >= pages} onClick={() => push({ page: String(page + 1) })}>›</button>
      </nav>}
    </section>
  );
}
