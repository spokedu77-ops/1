'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
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

export type Stage4EditorHandle = {
  flushPending: () => Promise<boolean>;
  exportDraft: () => void;
};
const LABELS: Record<AutosaveStatus, string> = {
  saved: '저장됨', dirty: '저장 대기', saving: '저장 중',
  error: '저장 실패', conflict: '다른 탭·PC에서 변경됨',
};

const NoteStage4Editor = forwardRef<Stage4EditorHandle, { initial: NoteV2Document; locked?: boolean }>(function NoteStage4Editor({ initial, locked = false }, ref) {
  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const [error, setError] = useState<string | undefined>();
  const initialContent = initial.content as PartialBlock<
    typeof noteStage2Schema.blockSchema,
    typeof noteStage2Schema.inlineContentSchema,
    typeof noteStage2Schema.styleSchema
  >[];
  const editor = useCreateBlockNote({ schema: noteStage2Schema, dictionary: ko, initialContent });

  const send = useCallback(async (content: unknown[], baseVersion: number): Promise<SaveOutcome> => {
    const response = await fetch(`/api/admin/note-v2/documents/${initial.id}`, {
      method: 'PUT', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, baseVersion }),
    });
    const result = await response.json().catch(() => ({})) as { version?: number; error?: string };
    if (response.status === 409) return { ok: false, kind: 'conflict', message: '다른 곳에서 먼저 저장했습니다. 현재 글을 내보낸 후 새로고침하세요.' };
    if (!response.ok || !Number.isSafeInteger(result.version)) {
      return { ok: false, kind: 'error', message: result.error || `HTTP ${response.status}: 저장 실패` };
    }
    return { ok: true, version: result.version! };
  }, [initial.id]);

  const autosave = useMemo(() => {
    let currentStatus: AutosaveStatus = 'saved';
    const machine = new NoteV2Autosave<unknown[]>({
      initialContent: initial.content,
      initialVersion: initial.content_version,
      send,
      onStatus: (nextStatus, message) => {
        currentStatus = nextStatus;
        setStatus(nextStatus);
        setError(message);
      },
      debounceMs: 800,
    });
    return { machine, getStatus: () => currentStatus };
  }, [initial.content, initial.content_version, send]);
  const { machine } = autosave;

  useEffect(() => {
    machine.resume();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!machine.hasPending) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { window.removeEventListener('beforeunload', beforeUnload); machine.dispose(); };
  }, [machine]);

  const exportDraft = useCallback(() => {
    const payload = { format: 'spokedu.note.v2.stage4.emergency-export',
      id: initial.id, baseVersion: machine.baseVersion, blocks: editor.document };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `spokedu-note-v2-${initial.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [editor, initial.id, machine]);

  useImperativeHandle(ref, () => ({
    flushPending: async () => {
      try { await machine.flush(); } catch { return false; }
      return !machine.hasPending && autosave.getStatus() === 'saved';
    },
    exportDraft,
  }), [autosave, machine, exportDraft]);

  return (
    <div className="note-v2-preview min-w-0 flex-1 bg-white text-neutral-800" data-testid="note-v2-stage4-editor">
      <div className="sticky top-0 z-10 flex min-h-14 items-center justify-end gap-2 border-b border-neutral-200 bg-white/95 px-4 sm:px-8">
        <output data-testid="note-v2-save-status" role="status" className={`text-xs font-medium ${status === 'error' || status === 'conflict' ? 'text-red-700' : 'text-neutral-500'}`}>{LABELS[status]}</output>
        {status === 'error' && <button type="button" onClick={() => void machine.retry()} className="rounded-md border px-2 py-1.5 text-xs text-red-700"><RefreshCcw size={13} className="mr-1 inline"/>다시 저장</button>}
        <button type="button" onClick={exportDraft} className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs hover:bg-neutral-50"><Download size={14} className="mr-1 inline"/>현재 글 내보내기</button>
      </div>
      <main className="mx-auto w-full max-w-[900px] px-5 pb-32 pt-12 sm:px-12">
        <h1 className="mb-9 break-words text-3xl font-bold leading-snug tracking-tight sm:text-4xl" data-testid="note-v2-stage4-title">{initial.title}</h1>
        {(status === 'conflict' || status === 'error') && (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            <strong>{LABELS[status]}</strong> — {error || '저장할 수 없습니다.'}
            <p className="mt-1">화면의 글은 유지됩니다. 문서를 바꾸기 전에 ‘현재 글 내보내기’로 보관하세요.</p>
          </div>
        )}
        <div data-testid="note-v2-blocknote-root" lang="ko">
          <BlockNoteView editor={editor} theme="light" editable={!locked} onChange={() => machine.edit(editor.document)} />
        </div>
      </main>
    </div>
  );
});
export default NoteStage4Editor;
