'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, FileJson2, ShieldCheck } from 'lucide-react';
import { ko } from '@blocknote/core/locales';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import { noteStage2Schema } from './noteStage2Schema';
import './noteStage2.css';

export default function NoteStage2Editor() {
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const editor = useCreateBlockNote({
    schema: noteStage2Schema,
    dictionary: ko,
    // The editor owns its document state; React never rehydrates blocks on keystrokes.
    initialContent: [
      { type: 'paragraph', content: '이곳은 새 편집기 기능 검증 전용 공간입니다. 이 내용은 서버에 저장되지 않습니다.' },
      { type: 'heading', props: { level: 2 }, content: '오늘 할 일' },
      { type: 'checkListItem', props: { checked: false }, content: '체크리스트를 클릭해 보세요' },
      {
        type: 'toggleListItem',
        content: '눌러서 접고 펼치는 토글',
        children: [{ type: 'paragraph', content: '토글 아래에 들어가는 내용입니다.' }],
      },
      { type: 'paragraph', content: '빈 줄에 / 를 입력해 블록을 선택해 보세요.' },
    ],
  });

  const createSnapshot = () => JSON.stringify({
    format: 'spokedu.note.stage2.preview',
    formatVersion: 1,
    blocks: editor.document,
  }, null, 2);

  const exportJson = () => {
    try {
      const blob = new Blob([createSnapshot()], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'spokedu-note-stage2-preview.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportError(null);
    } catch {
      setExportError('JSON 파일을 내보내지 못했습니다. 브라우저 다운로드 설정을 확인해 주세요.');
    }
  };

  return (
    <div className="note-v2-preview h-[var(--viewport-height-px,100dvh)] min-h-0 w-full overflow-y-auto overscroll-contain bg-[#fafafa] text-[#262626]" data-testid="note-v2-stage2-page">
      <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin" className="text-sm text-neutral-500 hover:text-neutral-900">관리자 홈</Link>
          <span className="text-neutral-300">/</span>
          <span className="truncate text-sm font-semibold">새 노트 편집기 실험실</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <ShieldCheck size={14} aria-hidden="true" /> 2단계 · 서버 저장 없음
        </span>
      </header>

      <main className="mx-auto w-full max-w-[960px] px-4 pb-16 pt-10 sm:px-10 sm:pt-16">
        <div className="mb-9">
          <p className="mb-3 text-xs font-medium tracking-[.12em] text-neutral-500">SPOKEDU / NOTE LAB</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">새 노트</h1>
          <p className="mt-4 max-w-[720px] text-sm leading-7 text-neutral-600">
            블록 이동 · 한글 입력 · 목록 · 체크리스트 · 토글 · 글자 서식을 점검하는 격리된 편집기입니다.
            기존 노트 및 데이터베이스와 연결되지 않으며 새로고침 시 이 페이지의 입력 내용은 사라집니다.
          </p>
        </div>

        <section className="rounded-xl border border-neutral-200 bg-white px-2 py-7 shadow-sm sm:px-8" aria-label="BlockNote 편집 영역">
          <div data-testid="note-v2-blocknote-root" lang="ko">
            <BlockNoteView editor={editor} theme="light" />
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-neutral-200 bg-white px-5 py-5" aria-label="편집기 진단 도구">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">문서 구조 검사</h2>
              <p className="mt-1 text-xs text-neutral-500">DB 저장이 아닌 편집기 메모리의 블록 JSON을 확인합니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setJsonPreview(createSnapshot())} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold hover:bg-neutral-50">
                <FileJson2 size={15} aria-hidden="true" /> 현재 JSON 보기
              </button>
              <button type="button" onClick={exportJson} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white hover:bg-neutral-700">
                <Download size={15} aria-hidden="true" /> JSON 내보내기
              </button>
            </div>
          </div>
          {exportError && <p role="alert" className="mt-3 text-xs text-red-600">{exportError}</p>}
          {jsonPreview !== null && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-neutral-500">버튼을 누른 시점의 스냅샷 · 실시간 자동 갱신 아님</span>
                <button type="button" onClick={() => setJsonPreview(null)} className="text-xs text-neutral-500 underline">닫기</button>
              </div>
              <pre data-testid="note-v2-json-snapshot" className="max-h-[360px] overflow-auto rounded-lg bg-neutral-950 p-4 text-xs leading-5 text-neutral-100">{jsonPreview}</pre>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
