'use client';

import { Loader2, Plus } from 'lucide-react';
import { NOTE_PAGE_SHELL } from '../../_lib/constants';
import { DocIconGlyph, relativeTime, resolveDocIcon } from '../../_lib/noteDocumentUi';
import { useNotePage } from '../../_page/NotePageContext';

export function NoteWorkspaceHome() {
  const {
    loadingDocuments,
    rootDocuments,
    handleSelectDocument,
    handleCreateDocument,
  } = useNotePage();

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-white">
      <div className={`${NOTE_PAGE_SHELL} py-10`}>
        <h1 className="text-[40px] font-bold tracking-tight text-neutral-900">관리자 노트</h1>
        <p className="mt-1 text-[14px] text-neutral-400">최상위 페이지</p>
        <div className="mt-8">
          {loadingDocuments ? (
            <div className="flex items-center gap-2 py-8 text-[13px] text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              불러오는 중…
            </div>
          ) : rootDocuments.length === 0 ? (
            <button
              type="button"
              onClick={() => handleCreateDocument(null)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[14px] text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
            >
              <Plus className="h-4 w-4" />
              새 페이지
            </button>
          ) : (
            <div className="-mx-2">
              {rootDocuments.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => handleSelectDocument(doc)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-neutral-50"
                >
                  <DocIconGlyph
                    icon={resolveDocIcon(doc.properties)}
                    fallbackClassName="h-4 w-4 shrink-0 text-neutral-400"
                    emojiClassName="shrink-0 text-[16px] leading-none"
                  />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-neutral-800">{doc.title}</span>
                  <span className="shrink-0 text-[12px] text-neutral-400">{relativeTime(doc.updated_at)}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleCreateDocument(null)}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[14px] text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
              >
                <Plus className="h-4 w-4" />
                새 페이지
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
