'use client';

import { useParams } from 'next/navigation';
import { BlogDraftEditor } from '../BlogDraftEditor';

export default function BlogDraftEditorPage() {
  const params = useParams<{ id: string }>();
  return <BlogDraftEditor draftId={params.id} />;
}
