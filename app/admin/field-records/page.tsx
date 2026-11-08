'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { MIGRATED_RECORD_SLUGS, type RecordRow } from '@/app/lib/field-records/contract';
import { legacyRecordCards } from '@/app/lib/field-records/cards';

const statusLabel = { draft: '초안', review: '검토 중', published: '게시' };
const seedChoices = MIGRATED_RECORD_SLUGS.flatMap(slug => legacyRecordCards().filter(record => record.slug === slug));
export default function FieldRecordsAdminPage() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState('');
  const [publicEnabled, setPublicEnabled] = useState<boolean | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/field-records', { cache: 'no-store' }); const body = await response.json();
      if (!response.ok) throw new Error(body.error || '목록 조회에 실패했습니다.');
      setRecords(body.records);
      setPublicEnabled(body.publicEnabled === true);
    } catch (error) { setError(error instanceof Error ? error.message : '목록 조회에 실패했습니다.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function importDraft(slug: string) {
    if (!seedChoices.some(record => record.slug === slug)) return;
    setBusy(slug); setError('');
    try {
      const response = await fetch('/api/admin/field-records/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || '초안 등록에 실패했습니다.');
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : '초안 등록에 실패했습니다.'); }
    finally { setBusy(''); }
  }
  return <div className="mx-auto max-w-6xl p-4 sm:p-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">현장 기록 관리</h1><p className="mt-2 text-sm text-slate-500">초안을 검토하고 사진 공개 동의를 확인한 뒤 게시해 주세요.</p></div><Link href="/admin/field-records/new" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">새 기록 작성</Link></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" onClick={() => void load()} className="ml-4 underline">다시 불러오기</button></div>}
    {publicEnabled === false && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">현재 공개 사이트는 기존 콘텐츠를 사용 중입니다. 공개 전환이 완료되기 전에는 이곳에서 게시한 기록도 홈페이지에 표시되지 않습니다.</p>}
    {loading ? <p role="status">불러오는 중…</p> : <div className="grid gap-4">{records.map(record => <article key={record.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div><div className="mb-2 flex gap-2 text-xs"><span>{statusLabel[record.status]}</span>{record.published_content && <span className="text-blue-700">공개본 있음</span>}{record.featured_slot && <span className="text-blue-700">대표 {record.featured_slot}번</span>}</div><h2 className="font-bold">{record.draft_content.venue || '기관명 미입력'}</h2><p className="mt-1 text-sm text-slate-500">{record.draft_content.title || '제목 미입력'}</p></div><Link href={`/admin/field-records/${record.id}`} className="rounded-lg border px-4 py-2 text-sm font-semibold">편집</Link></article>)}{records.length === 0 && <p className="rounded-xl bg-white p-6 text-slate-500">등록된 기록이 없습니다. 새 글을 작성하거나 아래 승인 원고를 초안으로 등록하세요.</p>}</div>}
    <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5"><h2 className="font-bold">승인 원고 3건</h2><p className="mt-2 text-sm text-slate-500">원문을 재작성하지 않은 초안입니다. 등록 버튼은 게시를 실행하지 않습니다.</p><div className="mt-4 flex flex-wrap gap-3">{seedChoices.map(record => <button type="button" key={record.slug} disabled={loading || Boolean(busy) || records.some(item => item.slug === record.slug)} onClick={() => void importDraft(record.slug)} className="rounded-lg border bg-white px-4 py-3 text-sm disabled:opacity-50">{record.venue} {records.some(item => item.slug === record.slug) ? '등록됨' : busy === record.slug ? '등록 중…' : '초안 등록'}</button>)}</div></section>
  </div>;
}
