'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import { parseInlineMarkupToHtml, type InlineMark } from '@/app/lib/note/inlineMarkup';

type RichField = 'text' | 'body';

type NoteEditorChange = {
  text: string;
  html: string;
};

function legacyTextToEditorHtml(text: string): string {
  if (text.trim().length === 0) return '<p></p>';
  const html = text.trim().length > 0 ? parseInlineMarkupToHtml(text) : '';
  const lines = html.split('\n');
  return lines.map((line) => `<p>${line || '<br>'}</p>`).join('');
}

function richTextSourceHtml({
  content,
  field,
  text,
}: {
  content: Record<string, unknown> | null | undefined;
  field: RichField;
  text: string;
}) {
  const htmlKey = field === 'body' ? 'bodyHtml' : 'html';
  const html = content?.[htmlKey];
  if (typeof html === 'string' && html.trim().length > 0) return html;
  return legacyTextToEditorHtml(text);
}

function applyEditorMark(editor: Editor, mark: InlineMark) {
  const chain = editor.chain().focus();
  if (mark === 'bold') chain.toggleBold().run();
  if (mark === 'italic') chain.toggleItalic().run();
  if (mark === 'underline') chain.toggleUnderline().run();
  if (mark === 'strike') chain.toggleStrike().run();
  if (mark === 'code') chain.toggleCode().run();
}

function firstImageFile(files: FileList | null | undefined): File | null {
  if (!files) return null;
  return Array.from(files).find((file) => file.type.startsWith('image/')) ?? null;
}

export function NoteEditor({
  content,
  field = 'text',
  text,
  placeholder,
  className,
  onChange,
  onEnter,
  onSlashChange,
  onShowFormatToolbar,
  onHideFormatToolbar,
  uploadImage,
  enterCreatesBlock = false,
  autoFocusSignal = 0,
  onEmptyBackspace,
  onIndent,
  onNavigatePrevious,
  onNavigateNext,
  resetKey,
}: {
  content: Record<string, unknown> | null | undefined;
  field?: RichField;
  text: string;
  placeholder: string;
  className: string;
  onChange: (change: NoteEditorChange) => void;
  onEnter: () => void;
  onSlashChange?: (show: boolean, query: string) => void;
  onShowFormatToolbar?: (applyMark: (mark: InlineMark) => void) => void;
  onHideFormatToolbar?: () => void;
  uploadImage?: (file: File) => Promise<string>;
  enterCreatesBlock?: boolean;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onIndent?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  resetKey?: string;
}) {
  const pendingChangeRef = useRef<NoteEditorChange | null>(null);
  const changeTimerRef = useRef<number | null>(null);
  const lastResetKeyRef = useRef<string | undefined>(resetKey);
  const sourceHtml = useMemo(
    () => richTextSourceHtml({ content, field, text }),
    [content, field, text],
  );

  const flushPendingChange = useCallback(() => {
    if (changeTimerRef.current !== null) {
      window.clearTimeout(changeTimerRef.current);
      changeTimerRef.current = null;
    }
    const pending = pendingChangeRef.current;
    if (!pending) return;
    pendingChangeRef.current = null;
    onChange(pending);
  }, [onChange]);

  const scheduleChange = useCallback((change: NoteEditorChange) => {
    pendingChangeRef.current = change;
    if (changeTimerRef.current !== null) window.clearTimeout(changeTimerRef.current);
    changeTimerRef.current = window.setTimeout(() => {
      flushPendingChange();
    }, 220);
  }, [flushPendingChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Typography,
      Image.configure({ inline: false, allowBase64: false }),
      CharacterCount,
      Placeholder.configure({ placeholder }),
    ],
    content: sourceHtml,
    editorProps: {
      attributes: {
        class: `note-rich-editor min-h-[1.5rem] w-full outline-none ${className}`,
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Escape') {
          onSlashChange?.(false, '');
          return false;
        }
        if (event.key === 'Tab' && onIndent) {
          event.preventDefault();
          flushPendingChange();
          onIndent(event.shiftKey ? 'out' : 'in');
          return true;
        }
        if (event.key === 'Backspace' && editor?.isEmpty && onEmptyBackspace) {
          event.preventDefault();
          flushPendingChange();
          onEmptyBackspace();
          return true;
        }
        if (event.key === 'ArrowUp' && onNavigatePrevious) {
          const { selection } = view.state;
          if (selection.empty && selection.from <= 1) {
            event.preventDefault();
            flushPendingChange();
            onNavigatePrevious();
            return true;
          }
        }
        if (event.key === 'ArrowDown' && onNavigateNext) {
          const { doc, selection } = view.state;
          if (selection.empty && selection.to >= doc.content.size - 1) {
            event.preventDefault();
            flushPendingChange();
            onNavigateNext();
            return true;
          }
        }
        if (event.key === 'Enter' && event.shiftKey) {
          return false;
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onSlashChange?.(false, '');
          flushPendingChange();
          onEnter();
          return true;
        }
        if (event.key === 'Enter' && enterCreatesBlock) {
          event.preventDefault();
          onSlashChange?.(false, '');
          flushPendingChange();
          onEnter();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const file = firstImageFile(event.clipboardData?.files);
        if (!file || !uploadImage) return false;
        event.preventDefault();
        void uploadImage(file).then((url) => {
          editor?.chain().focus().setImage({ src: url }).run();
        });
        return true;
      },
      handleDrop: (_view, event) => {
        const file = firstImageFile(event.dataTransfer?.files);
        if (!file || !uploadImage) return false;
        event.preventDefault();
        void uploadImage(file).then((url) => {
          editor?.chain().focus().setImage({ src: url }).run();
        });
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const nextText = currentEditor.getText();
      const slashMatch = nextText.match(/^\/([^\n]*)$/);
      onSlashChange?.(!!slashMatch, slashMatch?.[1] ?? '');
      scheduleChange({ text: nextText, html: currentEditor.getHTML() });
    },
    onFocus: ({ editor: currentEditor }) => {
      onShowFormatToolbar?.((mark) => applyEditorMark(currentEditor, mark));
    },
    onBlur: () => {
      flushPendingChange();
      onHideFormatToolbar?.();
      onSlashChange?.(false, '');
    },
  });

  useEffect(() => () => {
    flushPendingChange();
  }, [flushPendingChange]);

  useEffect(() => {
    if (!editor) return;
    const resetKeyChanged = lastResetKeyRef.current !== resetKey;
    if (resetKeyChanged) lastResetKeyRef.current = resetKey;
    if (!resetKeyChanged && editor.isFocused) return;
    if (resetKeyChanged || editor.getHTML() !== sourceHtml) {
      if (changeTimerRef.current !== null) {
        window.clearTimeout(changeTimerRef.current);
        changeTimerRef.current = null;
      }
      pendingChangeRef.current = null;
      editor.commands.setContent(sourceHtml, { emitUpdate: false });
    }
  }, [editor, sourceHtml]);

  useEffect(() => {
    if (!editor || autoFocusSignal <= 0) return;
    requestAnimationFrame(() => {
      editor.commands.focus('end');
    });
  }, [autoFocusSignal, editor]);

  return (
    <>
      <EditorContent editor={editor} />
      <style jsx global>{`
        .note-rich-editor {
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
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
        }
      `}</style>
    </>
  );
}
