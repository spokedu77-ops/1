'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { NoteV2Document, NoteV2DocumentSummary } from '@/app/lib/note-v2/contract';
import NoteStage3Editor from './NoteStage3Editor';

type Phase = 'loading' | 'empty' | 'error' | 'ready';

export default function NoteStage3Workspace() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [document, setDocument] = useState<NoteV2Document | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch('/api/admin/note-v2/documents', { signal: controller.signal, credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) throw new Error(`문서 목록 조회 실패 (HTTP ${response.status}). 데이터베이스 준비 상태를 확인하세요.`);
        const payload = await response.json() as { documents?: NoteV2DocumentSummary[] };
        const selected = payload.documents?.[0];
        if (!selected) { if (!controller.signal.aborted) setPhase('empty'); return; }
        const docResponse = await fetch(`/api/admin/note-v2/documents/${selected.id}`, { signal: controller.signal, credentials: 'same-origin', cache: 'no-store' });
        if (!docResponse.ok) throw new Error(`문서 조회 실패 (HTTP ${docResponse.status})`);
        const docPayload = await docResponse.json() as { document?: NoteV2Document };
        if (!docPayload.document || !Array.isArray(docPayload.document.content)) throw new Error('서버 문서 구조가 올바르지 않습니다.');
        if (!controller.signal.aborted) { setDocument(docPayload.document); setPhase('ready'); }
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : '문서 로딩 실패');
          setPhase('error');
        }
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const createDocument = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const response = await fetch('/api/admin/note-v2/documents', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '새 노트' }),
      });
      if (!response.ok) throw new Error(`문서 생성 실패 (HTTP ${response.status})`);
      const payload = await response.json() as { document?: NoteV2Document };
      if (!payload.document) throw new Error('문서 생성 응답이 올바르지 않습니다.');
      setDocument(payload.document);
      setPhase('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '문서 생성 실패');
      setPhase('error');
    } finally {
      setCreating(false);
    }
  };

  if (phase === 'ready' && document) return <NoteStage3Editor key={document.id} initial={document} />;

  return (
    <main className="grid min-h-[75dvh] place-items-center bg-[#fafafa] px-5 py-12" data-testid="note-v2-stage3-bootstrap">
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">SPOKEDU 노트 V2</h1>
        {phase === 'loading' && <p role="status" className="mt-5 text-neutral-600">저장된 문서를 확인하는 중입니다…</p>}
        {phase === 'empty' && <>
          <p className="mt-5 text-sm leading-7 text-neutral-600">새로운 노트 저장소입니다. 기존 노트 데이터는 이전하지 않습니다.</p>
          <button type="button" disabled={creating} onClick={() => void createDocument()} className="mt-6 min-h-11 rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white disabled:opacity-50">
            {creating ? '생성 중…' : '첫 노트 만들기'}
          </button>
        </>}
        {phase === 'error' && <div role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <p className="mt-6 text-xs text-neutral-500"><Link href="/admin/note-v2-preview" className="underline">저장 없는 2단계 편집기 보기</Link></p>
      </div>
    </main>
  );
}
