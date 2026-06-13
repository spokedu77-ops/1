'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Extension } from '@tiptap/core';
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
import { TextSelection } from '@tiptap/pm/state';
import { parseInlineMarkupToHtml, type InlineMark } from '@/app/lib/note/inlineMarkup';
import {
  adjustBulletIndent,
  continueBulletOnEnter,
  indentPlainTextBlock,
  tryConvertMarkdownBlockTrigger,
  tryConvertMarkdownBulletTrigger,
  type MarkdownBlockTrigger,
} from './noteBulletInput';
import { NoteRichEditorStyles } from './NoteRichEditorStyles';
import { useNoteImageLightbox } from './NoteImageLightbox';
import {
  focusNoteEditorAtClick,
  registerNoteEditor,
  unregisterNoteEditor,
} from './noteEditorRegistry';
import { NoteListCrossHighlightExtension } from './noteListCrossHighlight';
import {
  bindNoteCrossSelectCopy,
  shouldSuppressCrossFormatToolbar,
} from './noteCrossSelect';
import { bindListCrossHighlightEditorLookup } from './noteListCrossHighlight';
import { getNoteEditor } from './noteEditorRegistry';
import { NoteTextDragSelectExtension } from './noteTextDragSelect';

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

export type NoteEditorEnterSplit = {
  beforeText: string;
  beforeHtml: string;
  afterText: string;
  afterHtml: string;
};

export type NoteEditorEnterContext = {
  isEmpty: boolean;
  split?: NoteEditorEnterSplit;
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

type BlockListEnterHandler = (editor: Editor, shiftKey: boolean) => boolean;

declare module '@tiptap/core' {
  interface Storage {
    noteBlockEnter: {
      handler: BlockListEnterHandler | null;
    };
  }
}

/** 글머리·번호 항목 Enter — Keymap splitBlock보다 먼저 처리 */
const NoteBlockEnterExtension = Extension.create({
  name: 'noteBlockEnter',
  priority: 10000,
  addStorage() {
    return { handler: null as BlockListEnterHandler | null };
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const handler = this.storage.handler;
        return handler ? handler(this.editor, false) : false;
      },
      'Shift-Enter': () => {
        const handler = this.storage.handler;
        return handler ? handler(this.editor, true) : false;
      },
    };
  },
});

/** 글머리 항목 중간에서 Enter — 커서 뒤 내용을 새 항목으로 분리 */
function resolveListEnterSplit(editor: Editor): NoteEditorEnterSplit | null {
  const { state } = editor;
  const { selection } = state;
  if (!selection.empty) return null;

  const from = selection.from;
  const docEnd = state.doc.content.size;
  const afterText = state.doc.textBetween(from, docEnd, '\n', '\n').replace(/^\n+/, '');
  if (!afterText) return null;

  const beforeText = state.doc.textBetween(0, from, '\n', '\n');
  const deleted = editor.chain().focus().deleteRange({ from, to: docEnd }).run();
  if (!deleted) return null;

  return {
    beforeText,
    beforeHtml: editor.getHTML(),
    afterText,
    afterHtml: legacyTextToEditorHtml(afterText),
  };
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
  const legacyHtmlKey = field === 'body' ? 'legacyBodyHtml' : null;
  const html = content?.[htmlKey];
  if (typeof html === 'string' && html.trim().length > 0) return html;
  if (legacyHtmlKey) {
    const legacyHtml = content?.[legacyHtmlKey];
    if (typeof legacyHtml === 'string' && legacyHtml.trim().length > 0) return legacyHtml;
  }
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
  enterSplitOnMidBlock = false,
  autoFocusSignal = 0,
  onEmptyBackspace,
  onBackspaceAtBlockStart,
  onMergeWithPrevious,
  canMergeWithPrevious,
  onMarkdownBlockTrigger,
  onIndent,
  onNavigatePrevious,
  onNavigateNext,
  onEditorFocus,
  tabBehavior = 'block-indent',
  resetKey,
  editorBlockId,
  focusCaretOffset,
}: {
  content: Record<string, unknown> | null | undefined;
  field?: RichField;
  text: string;
  placeholder: string;
  className: string;
  onChange: (change: NoteEditorChange) => void;
  onEnter: (ctx?: NoteEditorEnterContext) => void;
  onSlashChange?: (show: boolean, query: string) => void;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: TextStyle) => void,
    position: ToolbarPosition,
  ) => void;
  onHideFormatToolbar?: () => void;
  uploadImage?: (file: File) => Promise<string>;
  enterCreatesBlock?: boolean;
  /** Enter 시 커서 뒤 텍스트를 다음 블록으로 분리 (글머리·번호 목록) */
  enterSplitOnMidBlock?: boolean;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  /** 블록 맨 앞 Backspace — 글머리 해제 등. true면 처리 완료 */
  onBackspaceAtBlockStart?: () => boolean;
  onMergeWithPrevious?: () => void;
  /** false면 이전 블록 병합 불가 — 기본 Backspace 허용 */
  canMergeWithPrevious?: () => boolean;
  onMarkdownBlockTrigger?: (trigger: MarkdownBlockTrigger) => void;
  onIndent?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onEditorFocus?: () => void;
  tabBehavior?: 'block-indent' | 'insert-text-indent';
  resetKey?: string;
  editorBlockId?: string;
  focusCaretOffset?: number;
}) {
  const pendingChangeRef = useRef<NoteEditorChange | null>(null);
  const changeTimerRef = useRef<number | null>(null);
  const lastResetKeyRef = useRef<string | undefined>(resetKey);
  const isEditingRef = useRef(false);
  const lastAutoFocusSignalRef = useRef(0);
  const editorRef = useRef<Editor | null>(null);
  const imageLightbox = useNoteImageLightbox();
  const imageLightboxRef = useRef(imageLightbox);
  imageLightboxRef.current = imageLightbox;

  const callbacksRef = useRef({
    onChange,
    onEnter,
    onSlashChange,
    onShowFormatToolbar,
    onHideFormatToolbar,
    uploadImage,
    onEmptyBackspace,
    onBackspaceAtBlockStart,
    onMergeWithPrevious,
    canMergeWithPrevious,
    onMarkdownBlockTrigger,
    onIndent,
    onNavigatePrevious,
    onNavigateNext,
    onEditorFocus,
    enterCreatesBlock,
    enterSplitOnMidBlock,
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
    onBackspaceAtBlockStart,
    onMergeWithPrevious,
    canMergeWithPrevious,
    onMarkdownBlockTrigger,
    onIndent,
    onNavigatePrevious,
    onNavigateNext,
    onEditorFocus,
    enterCreatesBlock,
    enterSplitOnMidBlock,
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
    if (shouldSuppressCrossFormatToolbar()) {
      callbacksRef.current.onHideFormatToolbar?.();
      return;
    }
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

  const extensions = useMemo(
    () => [
      NoteBlockEnterExtension,
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        undoRedo: { depth: 100, newGroupDelay: 300 },
      }),
      HeadingWithShortcuts,
      UnderlineWithShortcut,
      Link.configure({ openOnClick: false, autolink: true }),
      Typography,
      Image.configure({ inline: false, allowBase64: false }),
      CharacterCount,
      Placeholder.configure({ placeholder }),
      NoteListCrossHighlightExtension,
      NoteTextDragSelectExtension,
    ],
    [placeholder],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: sourceHtml,
    editorProps: {
      attributes: {
        class: `note-rich-editor min-h-[1.75rem] w-full select-text outline-none ${className}`,
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        if (target.tagName !== 'IMG') return false;
        const src =
          (target as HTMLImageElement).currentSrc || target.getAttribute('src');
        if (!src) return false;
        event.preventDefault();
        imageLightboxRef.current?.open(
          src,
          target.getAttribute('alt') ?? undefined,
        );
        return true;
      },
      handleDOMEvents: {
        dblclick: (view, event) => {
          event.preventDefault();
          const doc = view.state.doc;
          const from = 1;
          const to = Math.max(from, doc.content.size - 1);
          if (to > from) {
            view.dispatch(
              view.state.tr.setSelection(TextSelection.create(doc, from, to)),
            );
          }
          requestAnimationFrame(() => {
            const ed = editorRef.current;
            if (!ed || (ed as { isDestroyed?: boolean }).isDestroyed) return;
            notifyFormatToolbar(ed);
          });
          return true;
        },
        keydown: (view, event) => {
          if (event.key === ' ') {
            const blockTrigger = tryConvertMarkdownBlockTrigger(view);
            if (blockTrigger && callbacksRef.current.onMarkdownBlockTrigger) {
              event.preventDefault();
              callbacksRef.current.flushPendingChange();
              callbacksRef.current.onMarkdownBlockTrigger(blockTrigger);
              return true;
            }
            if (tryConvertMarkdownBulletTrigger(view)) {
              event.preventDefault();
              return true;
            }
          }
          if (event.key !== 'Tab') return false;
          const { tabBehavior: currentTabBehavior, onIndent: currentOnIndent, flushPendingChange: flush } = callbacksRef.current;
          if (currentTabBehavior === 'insert-text-indent') {
            event.preventDefault();
            flush();
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
          onBackspaceAtBlockStart: currentOnBackspaceAtBlockStart,
          onMergeWithPrevious: currentOnMergeWithPrevious,
          canMergeWithPrevious: currentCanMergeWithPrevious,
          onMarkdownBlockTrigger: currentOnMarkdownBlockTrigger,
          onNavigatePrevious: currentOnNavigatePrevious,
          onNavigateNext: currentOnNavigateNext,
          onEnter: currentOnEnter,
          enterCreatesBlock: currentEnterCreatesBlock,
        } = callbacksRef.current;

        if (event.key === ' ') {
          const blockTrigger = tryConvertMarkdownBlockTrigger(view);
          if (blockTrigger && currentOnMarkdownBlockTrigger) {
            event.preventDefault();
            flush();
            currentOnMarkdownBlockTrigger(blockTrigger);
            return true;
          }
          if (tryConvertMarkdownBulletTrigger(view)) {
            event.preventDefault();
            return true;
          }
        }
        if (event.key === 'Tab') {
          if (currentTabBehavior === 'insert-text-indent') {
            event.preventDefault();
            flush();
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
        if (event.key === 'Backspace') {
          const { selection } = view.state;
          if (selection.empty && selection.from <= 1) {
            if (editorRef.current?.isEmpty && currentOnEmptyBackspace) {
              event.preventDefault();
              flush();
              currentOnEmptyBackspace();
              return true;
            }
            if (currentOnBackspaceAtBlockStart?.()) {
              event.preventDefault();
              flush();
              return true;
            }
            const canMerge = currentCanMergeWithPrevious?.() ?? true;
            if (canMerge && currentOnMergeWithPrevious) {
              event.preventDefault();
              flush();
              currentOnMergeWithPrevious();
              return true;
            }
          }
        }
        if (
          (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
          && currentOnNavigatePrevious
        ) {
          const { selection } = view.state;
          if (selection.empty && selection.from <= 1) {
            event.preventDefault();
            flush();
            currentOnNavigatePrevious();
            return true;
          }
        }
        if (
          (event.key === 'ArrowRight' || event.key === 'ArrowDown')
          && currentOnNavigateNext
        ) {
          const { doc, selection } = view.state;
          if (selection.empty && selection.to >= doc.content.size - 1) {
            event.preventDefault();
            flush();
            currentOnNavigateNext();
            return true;
          }
        }
        // 글머리·번호 블록 — NoteBlockEnterExtension이 Keymap Enter보다 먼저 처리
        if (event.key === 'Enter' && currentEnterCreatesBlock) {
          return false;
        }
        if (event.key === 'Enter' && event.shiftKey) {
          return false;
        }
        // `* ` / `- ` + Space로 만든 글머리 — Enter는 같은 블록 안 다음 항목(줄)
        if (event.key === 'Enter' && continueBulletOnEnter(view)) {
          event.preventDefault();
          return true;
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          currentOnSlashChange?.(false, '');
          flush();
          currentOnEnter({ isEmpty: editorRef.current?.isEmpty ?? false });
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
    onCreate: ({ editor: currentEditor }) => {
      requestAnimationFrame(() => {
        if (editorBlockId && focusNoteEditorAtClick(editorBlockId, currentEditor)) return;
        if (typeof focusCaretOffset === 'number' && focusCaretOffset >= 0) {
          const pos = Math.min(focusCaretOffset + 1, currentEditor.state.doc.content.size);
          currentEditor.chain().focus().setTextSelection({ from: pos, to: pos }).run();
        }
      });
    },
    onFocus: ({ editor: currentEditor }) => {
      isEditingRef.current = true;
      callbacksRef.current.onEditorFocus?.();
      if (!currentEditor.state.selection.empty) {
        notifyFormatToolbar(currentEditor);
      }
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      if (!currentEditor.isFocused) {
        callbacksRef.current.onHideFormatToolbar?.();
        return;
      }
      notifyFormatToolbar(currentEditor);
    },
    onBlur: () => {
      isEditingRef.current = false;
      flushPendingChange();
      callbacksRef.current.onHideFormatToolbar?.();
      callbacksRef.current.onSlashChange?.(false, '');
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    const storage = editor.storage.noteBlockEnter;
    if (!enterCreatesBlock) {
      storage.handler = null;
      return;
    }
    storage.handler = (currentEditor, shiftKey) => {
      if (shiftKey) {
        return currentEditor.commands.setHardBreak();
      }
      const cbs = callbacksRef.current;
      cbs.onSlashChange?.(false, '');
      let split: NoteEditorEnterSplit | undefined;
      if (cbs.enterSplitOnMidBlock) {
        const splitResult = resolveListEnterSplit(currentEditor);
        if (splitResult) {
          split = splitResult;
          if (changeTimerRef.current !== null) {
            window.clearTimeout(changeTimerRef.current);
            changeTimerRef.current = null;
          }
          pendingChangeRef.current = null;
          cbs.onChange({
            text: splitResult.beforeText,
            html: splitResult.beforeHtml,
          });
        } else {
          flushPendingChange();
        }
      } else {
        flushPendingChange();
      }
      cbs.onEnter({
        isEmpty: currentEditor.isEmpty,
        split,
      });
      return true;
    };
    return () => {
      storage.handler = null;
    };
  }, [editor, enterCreatesBlock, flushPendingChange]);

  useEffect(() => () => {
    flushPendingChange();
  }, [flushPendingChange]);

  useEffect(() => {
    bindListCrossHighlightEditorLookup(getNoteEditor);
    return bindNoteCrossSelectCopy();
  }, []);

  useEffect(() => {
    if (!editor) return;
    if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
    const resetKeyChanged = lastResetKeyRef.current !== resetKey;
    if (resetKeyChanged) lastResetKeyRef.current = resetKey;
    if (!resetKeyChanged && (isEditingRef.current || pendingChangeRef.current)) return;
    let currentHtml = '';
    try {
      currentHtml = editor.getHTML();
    } catch {
      return;
    }
    if (resetKeyChanged && isEditingRef.current && editor.getText() === text) {
      return;
    }
    if (resetKeyChanged || currentHtml !== sourceHtml) {
      if (changeTimerRef.current !== null) {
        window.clearTimeout(changeTimerRef.current);
        changeTimerRef.current = null;
      }
      pendingChangeRef.current = null;
      const { from, to, empty } = editor.state.selection;
      editor
        .chain()
        .command(({ tr }) => { tr.setMeta('addToHistory', false); return true; })
        .setContent(sourceHtml, { emitUpdate: false })
        .run();
      if (isEditingRef.current) {
        if (!empty && from < to) {
          const docSize = editor.state.doc.content.size;
          const safeFrom = Math.min(from, docSize - 1);
          const safeTo = Math.min(to, docSize - 1);
          editor.commands.setTextSelection({ from: safeFrom, to: Math.max(safeFrom, safeTo) });
        } else {
          const pos = Math.min(from, editor.state.doc.content.size - 1);
          editor.commands.setTextSelection({ from: pos, to: pos });
        }
      }
    }
  }, [editor, resetKey, sourceHtml, text]);

  useEffect(() => {
    lastAutoFocusSignalRef.current = 0;
  }, [resetKey]);

  useEffect(() => {
    if (!editor || typeof focusCaretOffset !== 'number' || focusCaretOffset < 0) return;
    requestAnimationFrame(() => {
      const pos = Math.min(focusCaretOffset + 1, editor.state.doc.content.size);
      editor.chain().focus().setTextSelection({ from: pos, to: pos }).run();
    });
  }, [focusCaretOffset, editor]);

  useEffect(() => {
    if (!editor || autoFocusSignal <= 0) return;
    if (autoFocusSignal === lastAutoFocusSignalRef.current) return;
    lastAutoFocusSignalRef.current = autoFocusSignal;
    requestAnimationFrame(() => {
      if (editorBlockId && focusNoteEditorAtClick(editorBlockId, editor)) return;
      if (typeof focusCaretOffset === 'number' && focusCaretOffset >= 0) {
        const pos = Math.min(focusCaretOffset + 1, editor.state.doc.content.size);
        editor.chain().focus().setTextSelection({ from: pos, to: pos }).run();
        return;
      }
      if (!isEditingRef.current) {
        editor.commands.focus('start');
      }
    });
  }, [autoFocusSignal, editor, editorBlockId, focusCaretOffset]);

  useEffect(() => {
    if (!editor || !editorBlockId) return;
    registerNoteEditor(editorBlockId, editor);
    return () => {
      unregisterNoteEditor(editorBlockId);
    };
  }, [editor, editorBlockId]);

  return (
    <>
      <EditorContent editor={editor} />
      <NoteRichEditorStyles />
    </>
  );
}
