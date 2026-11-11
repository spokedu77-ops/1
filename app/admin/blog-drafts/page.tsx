import { Suspense } from 'react';
import { BlogDraftList } from './BlogDraftList';

export default function BlogDraftsPage() {
  return (
    <Suspense fallback={<p role="status">원고를 불러오는 중…</p>}>
      <BlogDraftList />
    </Suspense>
  );
}
