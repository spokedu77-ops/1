'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, RefreshCcw } from 'lucide-react';
import { type PartialBlock } from '@blocknote/core';
import { ko } from '@blocknote/core/locales';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import { noteStage2Schema } from '../note-v2-preview/noteStage2Schema';
import '../note-v2-preview/noteStage2.css';
import { NoteV2Autosave, type AutosaveStatus, type SaveOutcome } from '@/app/lib/note-v2/autosave-core';
import type { NoteV2Document } from '@/app/lib/note-v2/contract';

const STATUS_LABEL: Record<AutosaveStatus, string> = {
  saved: '저장됨',
  dirty: '저장 대기',
  saving: '저장 중',
  error: '저장 실패',
  conflict: '다른 탭·PC의 변경과 충돌',
};

export default function NoteStage3Editor({ initial }: { initial: NoteV2Document }) {
  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const [error, setError] = useState<string | undefined>(undefined);
  const [savingAttempt, setSavingAttempt] = useState(false);

  // ONLY hydration from a complete GET response. The editor owns all subsequent keystrokes.
  const initialContent = initial.content as PartialBlock<
    typeof noteStage2Schema.blockSchema,
    typeof noteStage2Schema.inlineContentSchema,
    typeof noteStage2Schema.styleSchema
  >[];
  const editor = useCreateBlockNote({
    schema: noteStage2Schema,
    dictionary: ko,
    initialContent,
  });

  const save = useCallback(async (content: unknown[], baseVersion: number): Promise<SaveOutcome> => {
    const response = await fetch(`/api/admin/note-v2/documents/${initial.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify({ content, baseVersion }),
    });
    const result = await response.json().catch(() => ({})) as { version?: number; error?: string };
    if (response.status === 409) return { ok: false, kind: 'conflict', message: '다른 곳에서 먼저 저장했습니다. 내보내기로 현재 글을 보관하고 새로고침하세요.' };
    if (!response.ok || !Number.isSafeInteger(result.version)) {
      return { ok: false, kind: 'error', message: result.error || `HTTP ${response.status}: 저장 실패` };
    }
    return { ok: true, version: result.version! };
  }, [initial.id]);

  const machine = useMemo(() => new NoteV2Autosave<unknown[]>({
    initialContent: initial.content,
    initialVersion: initial.content_version,
    send: save,
    onStatus: (nextStatus, message) => {
      setStatus(nextStatus);
      setError(message);
    },
    debounceMs: 800,
  }), [initial.content, initial.content_version, save]);

  useEffect(() => {
    machine.resume();
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!machine.hasPending) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('beforeunload', onLeave);
      machine.dispose();
    };
  }, [machine]);

  const onContentChange = useCallback(() => {
    machine.edit(editor.document);
  }, [machine, editor]);

  const exportDraft = () => {
    const blob = new Blob([JSON.stringify({
      format: 'spokedu.note.v2.emergency-export',
      id: initial.id,
      baseVersion: machine.baseVersion,
      blocks: editor.document,
    }, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'spokedu-note-v2-draft.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const retrySave = async () => {
    setSavingAttempt(true);
    try { await machine.retry(); }
    finally { setSavingAttempt(false); }
  };

  return (
    <div className="note-v2-preview min-h-[100dvh] bg-[#fafafa] text-[#262626]" data-testid="note-v2-stage3-page">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/admin" className="text-neutral-500 hover:text-neutral-900">관리자 홈</Link>
          <span className="text-neutral-300">/</span>
          <span className="font-semibold">노트 V2 · 저장 실험실</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <output data-testid="note-v2-save-status" role="status" className={`text-sm font-semibold ${status === 'error' || status === 'conflict' ? 'text-red-700' : 'text-neutral-600'}`}>
            {STATUS_LABEL[status]}
          </output>
          {status === 'error' && (
            <button type="button" onClick={() => void retrySave()} disabled={savingAttempt} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50">
              <RefreshCcw size={15} aria-hidden="true" /> 다시 저장
            </button>
          )}
          <button type="button" onClick={exportDraft} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm hover:bg-neutral-50">
            <Download size={15} aria-hidden="true" /> 현재 글 내보내기
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[980px] px-4 pb-16 pt-12 sm:px-10">
        <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500">SPOKEDU NOTE V2 / STAGE 3</p>
        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">{initial.title}</h1>
        <p className="mb-8 text-sm leading-7 text-neutral-500">이 단계에서는 본문 저장만 연결합니다. 하위 페이지와 사이드바는 다음 단계입니다.</p>

        {(status === 'error' || status === 'conflict') && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" data-testid="note-v2-save-error">
            <strong>{STATUS_LABEL[status]}</strong> — {error || '저장이 중단되었습니다.'} 편집한 내용은 화면에 남아 있습니다.
            {status === 'conflict' && <p className="mt-2">자동 덮어쓰기는 중지했습니다. 먼저 ‘현재 글 내보내기’로 보관한 후 새로고침하세요.</p>}
          </div>
        )}

        <section className="rounded-xl border border-neutral-200 bg-white px-3 py-8 shadow-sm sm:px-8" aria-label="자동 저장 노트 편집 영역">
          <div data-testid="note-v2-blocknote-root" lang="ko">
            <BlockNoteView editor={editor} theme="light" onChange={onContentChange} />
          </div>
        </section>
        <p className="mt-4 text-xs text-neutral-500">저장 완료는 서버에서 버전 확인이 끝난 경우에만 표시합니다. 연결 오류나 충돌 시 자동 저장이 중단됩니다.</p>
      </main>
    </div>
  );
}
