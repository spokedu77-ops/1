'use client';

import { useNotePage } from '../../_page/NotePageContext';

export function NoteSidebarIconPicker() {
  const {
    sidebarIconPicker,
    setSidebarIconPicker,
    sidebarIconDraft,
    setSidebarIconDraft,
    sidebarIconInputRef,
    handleSetDocumentIcon,
  } = useNotePage();

  if (!sidebarIconPicker) return null;

  return (
    <div
      className="fixed z-[200] flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg"
      style={{ top: sidebarIconPicker.top, left: sidebarIconPicker.left }}
    >
      <input
        ref={sidebarIconInputRef}
        type="text"
        value={sidebarIconDraft}
        onChange={(e) => setSidebarIconDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void handleSetDocumentIcon(sidebarIconPicker.docId, sidebarIconDraft);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setSidebarIconPicker(null);
          }
        }}
        onBlur={() => { void handleSetDocumentIcon(sidebarIconPicker.docId, sidebarIconDraft); }}
        placeholder="이모지"
        className="w-14 rounded-md border border-neutral-200 bg-white px-2 py-1 text-center text-[20px] outline-none focus:border-neutral-400"
        maxLength={4}
      />
      <button
        type="button"
        className="text-[12px] text-neutral-400 hover:text-neutral-600"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { void handleSetDocumentIcon(sidebarIconPicker.docId, ''); }}
      >
        제거
      </button>
    </div>
  );
}
