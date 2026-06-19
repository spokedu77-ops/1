/** TipTap·BlockTextPreview 공통 타이포 스타일 */
export function NoteRichEditorStyles() {
  return (
    <style jsx global>{`
      .note-rich-editor {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
        user-select: text !important;
        -webkit-user-select: text !important;
      }
      .note-rich-editor .ProseMirror {
        user-select: text !important;
        -webkit-user-select: text !important;
      }
      .note-rich-editor.ProseMirror ::selection,
      .note-rich-editor .ProseMirror ::selection {
        background: rgb(191 219 254) !important;
        color: inherit;
      }
      .note-rich-editor.ProseMirror::-moz-selection,
      .note-rich-editor .ProseMirror::-moz-selection {
        background: rgb(191 219 254) !important;
        color: inherit;
      }
      .note-list-cross-selected {
        background: rgb(147 197 253 / 0.65);
        border-radius: 0.125rem;
      }
      input[data-toggle-title].note-toggle-title-cross-active {
        background-color: rgb(191 219 254 / 0.65);
        border-radius: 0.125rem;
      }
      input[data-toggle-title].note-toggle-title-cross-active.note-toggle-title-cross-full {
        background-color: rgb(191 219 254 / 0.65);
        border-radius: 0.125rem;
      }
      .note-rich-editor p.is-editor-empty:first-child::before {
        color: rgb(148 163 184);
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
      }
      .note-rich-editor p {
        margin: 0;
      }
      .note-rich-editor h1,
      .note-rich-editor h2,
      .note-rich-editor h3 {
        margin: 0;
        font-weight: 700;
        color: rgb(15 23 42);
      }
      .note-rich-editor h1 {
        font-size: 1.625rem;
        line-height: 1.35;
      }
      .note-rich-editor h2 {
        font-size: 1.3rem;
        line-height: 1.4;
      }
      .note-rich-editor h3 {
        font-size: 1.05rem;
        line-height: 1.45;
      }
      .note-rich-editor p:empty::after {
        content: '';
      }
      .note-rich-editor a {
        color: rgb(37 99 235);
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .note-rich-editor u {
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .note-rich-editor code {
        border-radius: 0.375rem;
        background: rgb(241 245 249);
        padding: 0.1rem 0.25rem;
        color: rgb(15 23 42);
        font-size: 0.92em;
      }
      .note-rich-editor mark {
        border-radius: 0.125rem;
        padding: 0.05rem 0.1rem;
      }
      .note-rich-editor img {
        margin: 0.75rem 0;
        max-height: 20rem;
        width: 100%;
        border-radius: 0.75rem;
        object-fit: contain;
        cursor: zoom-in;
      }
      [data-note-block-row] > .note-block-gutter {
        opacity: 0;
        pointer-events: none;
      }
      [data-note-block-row][data-row-hovered] > .note-block-gutter,
      [data-note-block-row][data-gutter-pinned] > .note-block-gutter {
        opacity: 1;
        pointer-events: auto;
      }
      body.note-marquee-active .note-rich-editor,
      body.note-marquee-active .note-rich-editor .ProseMirror {
        user-select: none !important;
        -webkit-user-select: none !important;
        cursor: default;
      }
      [data-note-block-row].note-find-flash {
        animation: note-find-flash 1.2s ease-out;
      }
      [data-note-list-text] {
        min-width: 0;
        overflow: visible;
      }
      [data-note-list-text] .note-rich-editor,
      [data-note-list-text] .note-rich-editor-slot,
      [data-note-list-text] .ProseMirror {
        min-width: 0;
        width: 100%;
        max-width: 100%;
      }
      @keyframes note-find-flash {
        0%, 100% { background-color: transparent; }
        15% { background-color: rgba(250, 204, 21, 0.35); }
      }
    `}</style>
  );
}
