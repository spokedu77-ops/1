import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { recordContentSchema, recordMediaSrc } from '@/app/lib/field-records/contract';
import { cmsRecordCard } from '@/app/lib/field-records/cards';
import { CaseCard } from '@/app/spokedu/website/components/shared';
import { FieldRecordDetail } from '@/app/spokedu/website/components/FieldRecordDetail';
import '@/app/spokedu/website/styles/website.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '현장 기록 미리보기 | SPOKEDU 관리자', robots: { index: false, follow: false } };
export default async function FieldRecordPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if (!auth.ok) redirect('/login');
  const { id } = await params;
  const { data } = await getServiceSupabase().from('field_records').select('id,slug,draft_content,updated_at').eq('id', id).maybeSingle();
  if (!data) notFound();
  const content = recordContentSchema.parse(data.draft_content);
  const card = cmsRecordCard({ id: data.id, slug: data.slug, content, featuredSlot: null, publishedAt: '', updatedAt: data.updated_at });
  return <div><p className="bg-amber-50 p-4 text-center text-sm text-amber-900">관리자 전용 초안 미리보기 · 공개되지 않은 사진과 내용이 포함될 수 있습니다.</p><div className="website-content"><div className="mx-auto max-w-sm px-4 py-8"><p className="mb-4 text-sm font-semibold">홈·목록 카드 미리보기</p><CaseCard record={{ ...card, href: '#preview-detail', thumbnailSrc: content.hero ? recordMediaSrc(content.hero, true) : undefined }} /></div><div id="preview-detail"><FieldRecordDetail content={content} preview /></div></div></div>;
}
