'use client';

/* eslint-disable react-hooks/refs */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import type { EditorView } from '@tiptap/pm/view';
import { parseInlineMarkupToHtml, type InlineMark } from '@/app/lib/note/inlineMarkup';
import {
  adjustBulletIndent,
  continueBulletOnEnter,
  indentPlainTextBlock,
  tryConvertMarkdownBulletTrigger,
} from './noteBulletInput';

const UnderlineWithShortcut = Underline.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-u': () => this.editor.commands.toggleUnderline(),
    };
  },
});

const HeadingWithShortcuts = Heading.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Alt-0': () => this.editor.commands.setParagraph(),
      'Mod-Alt-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-Alt-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-Alt-3': () => this.editor.commands.toggleHeading({ level: 3 }),
    };
  },
}).configure({ levels: [1, 2, 3] });

type RichField = 'text' | 'body';

type NoteEditorChange = {
  text: string;
  html: string;
};

type ToolbarPosition = {
  top: number;
  left: number;
};

type TextStyle = 'paragraph' | 'heading1' | 'heading2' | 'heading3';

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

function applyEditorTextStyle(editor: Editor, style: TextStyle) {
  const chain = editor.chain().focus() as unknown as {
    setParagraph?: () => { run: () => void };
    toggleHeading?: (attrs: { level: 1 | 2 | 3 }) => { run: () => void };
    setHeading?: (attrs: { level: 1 | 2 | 3 }) => { run: () => void };
    setNode?: (type: string, attrs?: Record<string, unknown>) => { run: () => void };
  };

  const setParagraph = () => {
    if (typeof chain.setParagraph === 'function') {
      chain.setParagraph().run();
      return;
    }
    if (typeof chain.setNode === 'function') {
      chain.setNode('paragraph').run();
    }
  };

  const setHeading = (level: 1 | 2 | 3) => {
    if (!editor.schema.nodes.heading) return;
    if (editor.isActive('heading', { level })) {
      setParagraph();
      return;
    }
    if (typeof chain.toggleHeading === 'function') {
      chain.toggleHeading({ level }).run();
      return;
    }
    if (typeof chain.setHeading === 'function') {
      chain.setHeading({ level }).run();
      return;
    }
    if (typeof chain.setNode === 'function') {
      chain.setNode('heading', { level }).run();
    }
  };

  if (style === 'paragraph') {
    setParagraph();
    return;
  }
  if (style === 'heading1') {
    setHeading(1);
    return;
  }
  if (style === 'heading2') {
    setHeading(2);
    return;
  }
  setHeading(3);
}

function firstImageFile(files: FileList | null | undefined): File | null {
  if (!files) return null;
  return Array.from(files).find((file) => file.type.startsWith('image/')) ?? null;
}

function resolveToolbarPosition(editor: Editor): ToolbarPosition | null {
  const { from, to, empty } = editor.state.selection;
  if (empty || from >= to) return null;
  const selectedText = editor.state.doc.textBetween(from, to);
  if (selectedText.length === 0) return null;
  const start = editor.view.coordsAtPos(from);
  const end = editor.view.coordsAtPos(to);
  return {
    left: (start.left + end.right) / 2,
    top: Math.min(start.top, end.top) - 10,
  };
}

function selectLineAtPos(editor: Editor, pos: number): boolean {
  const $pos = editor.state.doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if (!$pos.node(depth).isTextblock) continue;
    const from = $pos.start(depth);
    const to = $pos.end(depth);
    if (to <= from) return false;
    editor.chain().focus().setTextSelection({ from, to }).run();
    return true;
  }
  return false;
}

function handleTextIndent(view: EditorView, direction: 'in' | 'out') {
  if (adjustBulletIndent(view, direction)) return true;
  return indentPlainTextBlock(view, direction);
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
  tabBehavior = 'block-indent',
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
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: TextStyle) => void,
    position: ToolbarPosition,
  ) => void;
  onHideFormatToolbar?: () => void;
  uploadImage?: (file: File) => Promise<string>;
  enterCreatesBlock?: boolean;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onIndent?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  tabBehavior?: 'block-indent' | 'insert-text-indent';
  resetKey?: string;
}) {
  const pendingChangeRef = useRef<NoteEditorChange | null>(null);
  const changeTimerRef = useRef<number | null>(null);
  const lastResetKeyRef = useRef<string | undefined>(resetKey);
  const editorRef = useRef<Editor | null>(null);

  const callbacksRef = useRef({
    onChange,
    onEnter,
    onSlashChange,
    onShowFormatToolbar,
    onHideFormatToolbar,
    uploadImage,
    onEmptyBackspace,
    onIndent,
    onNavigatePrevious,
    onNavigateNext,
    enterCreatesBlock,
    tabBehavior,
    flushPendingChange: () => {},
  });

  callbacksRef.current = {
    onChange,
    onEnter,
    onSlashChange,
    onShowFormatToolbar,
    onHideFormatToolbar,
    uploadImage,
    onEmptyBackspace,
    onIndent,
    onNavigatePrevious,
    onNavigateNext,
    enterCreatesBlock,
    tabBehavior,
    flushPendingChange: callbacksRef.current.flushPendingChange,
  };

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
    callbacksRef.current.onChange(pending);
  }, []);

  callbacksRef.current.flushPendingChange = flushPendingChange;

  const scheduleChange = useCallback((change: NoteEditorChange) => {
    pendingChangeRef.current = change;
    if (changeTimerRef.current !== null) window.clearTimeout(changeTimerRef.current);
    changeTimerRef.current = window.setTimeout(() => {
      flushPendingChange();
    }, 220);
  }, [flushPendingChange]);

  const notifyFormatToolbar = useCallback((currentEditor: Editor) => {
    const position = resolveToolbarPosition(currentEditor);
    if (!position) {
      callbacksRef.current.onHideFormatToolbar?.();
      return;
    }
    callbacksRef.current.onShowFormatToolbar?.(
      (mark) => applyEditorMark(currentEditor, mark),
      (style) => applyEditorTextStyle(currentEditor, style),
      position,
    );
  }, []);

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
      HeadingWithShortcuts,
      UnderlineWithShortcut,
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
      handleDOMEvents: {
        keydown: (view, event) => {
          if (event.key === ' ' && tryConvertMarkdownBulletTrigger(view)) {
            event.preventDefault();
            return true;
          }
          if (event.key !== 'Tab') return false;
          const { tabBehavior: currentTabBehavior, onIndent: currentOnIndent, flushPendingChange: flush } = callbacksRef.current;
          if (currentTabBehavior === 'insert-text-indent') {
            event.preventDefault();
            return handleTextIndent(view, event.shiftKey ? 'out' : 'in');
          }
          if (!currentOnIndent) return false;
          event.preventDefault();
          flush();
          currentOnIndent(event.shiftKey ? 'out' : 'in');
          return true;
        },
      },
      handleKeyDown: (view, event) => {
        const {
          tabBehavior: currentTabBehavior,
          onIndent: currentOnIndent,
          flushPendingChange: flush,
          onSlashChange: currentOnSlashChange,
          onEmptyBackspace: currentOnEmptyBackspace,
          onNavigatePrevious: currentOnNavigatePrevious,
          onNavigateNext: currentOnNavigateNext,
          onEnter: currentOnEnter,
          enterCreatesBlock: currentEnterCreatesBlock,
        } = callbacksRef.current;

        if (event.key === ' ' && tryConvertMarkdownBulletTrigger(view)) {
          event.preventDefault();
          return true;
        }
        if (event.key === 'Tab') {
          if (currentTabBehavior === 'insert-text-indent') {
            event.preventDefault();
            return handleTextIndent(view, event.shiftKey ? 'out' : 'in');
          }
          if (currentOnIndent) {
            event.preventDefault();
            flush();
            currentOnIndent(event.shiftKey ? 'out' : 'in');
            return true;
          }
        }
        if (event.key === 'Escape') {
          currentOnSlashChange?.(false, '');
          return false;
        }
        if (event.key === 'Backspace' && editorRef.current?.isEmpty && currentOnEmptyBackspace) {
          event.preventDefault();
          flush();
          currentOnEmptyBackspace();
          return true;
        }
        if (event.key === 'ArrowUp' && currentOnNavigatePrevious) {
          const { selection } = view.state;
          if (selection.empty && selection.from <= 1) {
            event.preventDefault();
            flush();
            currentOnNavigatePrevious();
            return true;
          }
        }
        if (event.key === 'ArrowDown' && currentOnNavigateNext) {
          const { doc, selection } = view.state;
          if (selection.empty && selection.to >= doc.content.size - 1) {
            event.preventDefault();
            flush();
            currentOnNavigateNext();
            return true;
          }
        }
        if (event.key === 'Enter' && event.shiftKey) {
          return false;
        }
        if (event.key === 'Enter' && currentTabBehavior === 'insert-text-indent' && continueBulletOnEnter(view)) {
          event.preventDefault();
          return true;
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          currentOnSlashChange?.(false, '');
          flush();
          currentOnEnter();
          return true;
        }
        if (event.key === 'Enter' && currentEnterCreatesBlock) {
          event.preventDefault();
          currentOnSlashChange?.(false, '');
          flush();
          currentOnEnter();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const file = firstImageFile(event.clipboardData?.files);
        const currentUploadImage = callbacksRef.current.uploadImage;
        if (!file || !currentUploadImage) return false;
        event.preventDefault();
        void currentUploadImage(file).then((url) => {
          editorRef.current?.chain().focus().setImage({ src: url }).run();
        });
        return true;
      },
      handleDrop: (_view, event) => {
        const file = firstImageFile(event.dataTransfer?.files);
        const currentUploadImage = callbacksRef.current.uploadImage;
        if (!file || !currentUploadImage) return false;
        event.preventDefault();
        void currentUploadImage(file).then((url) => {
          editorRef.current?.chain().focus().setImage({ src: url }).run();
        });
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const nextText = currentEditor.getText();
      const slashMatch = nextText.match(/^\/([^\n]*)$/);
      callbacksRef.current.onSlashChange?.(!!slashMatch, slashMatch?.[1] ?? '');
      scheduleChange({ text: nextText, html: currentEditor.getHTML() });
    },
    onFocus: ({ editor: currentEditor }) => {
      notifyFormatToolbar(currentEditor);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      if (!currentEditor.isFocused) {
        callbacksRef.current.onHideFormatToolbar?.();
        return;
      }
      notifyFormatToolbar(currentEditor);
    },
    onBlur: () => {
      flushPendingChange();
      callbacksRef.current.onHideFormatToolbar?.();
      callbacksRef.current.onSlashChange?.(false, '');
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    const handleDoubleClick = (event: MouseEvent) => {
      const coords = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (!coords) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!selectLineAtPos(editor, coords.pos)) return;
      requestAnimationFrame(() => {
        notifyFormatToolbar(editor);
      });
    };
    editor.view.dom.addEventListener('dblclick', handleDoubleClick, true);
    return () => {
      editor.view.dom.removeEventListener('dblclick', handleDoubleClick, true);
    };
  }, [editor, notifyFormatToolbar]);

  useEffect(() => () => {
    flushPendingChange();
  }, [flushPendingChange]);

  useEffect(() => {
    if (!editor) return;
    if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
    const resetKeyChanged = lastResetKeyRef.current !== resetKey;
    if (resetKeyChanged) lastResetKeyRef.current = resetKey;
    if (!resetKeyChanged && editor.isFocused) return;
    let currentHtml = '';
    try {
      currentHtml = editor.getHTML();
    } catch {
      return;
    }
    if (resetKeyChanged || currentHtml !== sourceHtml) {
      if (changeTimerRef.current !== null) {
        window.clearTimeout(changeTimerRef.current);
        changeTimerRef.current = null;
      }
      pendingChangeRef.current = null;
      editor.commands.setContent(sourceHtml, { emitUpdate: false });
    }
  }, [editor, resetKey, sourceHtml]);

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
        }
      `}</style>
    </>
  );
}
