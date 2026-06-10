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
      .note-rich-editor code {
        border-radius: 0.375rem;
        background: rgb(241 245 249);
        padding: 0.1rem 0.25rem;
        color: rgb(15 23 42);
        font-size: 0.92em;
      }
      .note-rich-editor img {
        margin: 0.75rem 0;
        max-height: 20rem;
        width: 100%;
        border-radius: 0.75rem;
        object-fit: contain;
        cursor: zoom-in;
      }
    `}</style>
  );
}
