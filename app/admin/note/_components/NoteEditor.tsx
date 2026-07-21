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
import { parseInlineMarkupToHtml, type InlineMark } from '@/app/lib/note/inlineMarkup';
import {
  adjustBulletIndent,
  consumeMarkdownBlockTrigger,
  continueBulletOnEnter,
  indentPlainTextBlock,
  isSlashMenuActiveText,
  tryConvertMarkdownBulletTrigger,
  type MarkdownBlockTrigger,
} from './noteBulletInput';
import { NoteRichEditorStyles } from './NoteRichEditorStyles';
import { useNoteImageLightbox } from './NoteImageLightbox';
import {
  consumePendingSelectAllBlock,
  pendingEditorClickRef,
  registerNoteEditor,
  scheduleFocusNoteEditorAtClick,
  selectAllNoteEditorText,
  isNoteEditorFullBlockSelected,
  selectAllDocumentBlocksRef,
  unregisterNoteEditor,
} from './noteEditorRegistry';
import {
  plainMultilineToInsertHtml,
  shouldHandlePlainMultilinePaste,
  splitClipboardLines,
  tryParsePastedNotePageLink,
  parseAdminNoteDocumentIdFromHref,
  notePageLinkInsertHtml,
} from '../_lib/notePaste';
import { parseClipboardHtmlToBlocks, shouldSplitHtmlPaste } from '../_lib/notePasteHtml';
import { parseMarkdownPlainToBlocks, shouldSplitMarkdownPaste } from '../_lib/notePasteMarkdown';
import { pastedBlocksFromPlainLines, type PastedBlockSpec, isStructuralHtmlPasteSpec } from '../_lib/notePasteBlocks';
import type { TableCellNavigateDirection } from '../_lib/noteTableBlock';
import { clearTipTapHistory } from '../_lib/noteEditorHistory';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { NoteListCrossHighlightExtension } from './noteListCrossHighlight';
import { NoteHighlight, NoteTextColor } from './noteEditorMarks';
import {
  shouldSuppressCrossFormatToolbar,
} from './noteCrossSelect';
import { noteSuppressEditorScrollRef } from '../_lib/noteEditorScrollGuard';
import { resolveEditorShiftEnterAction, resolveTableCellEnterAction } from '../_lib/noteNotionBlockBehavior';
import { NoteTextDragSelectExtension } from './noteTextDragSelect';
import { NOTE_EDITOR_STABILITY } from '../_lib/noteEditorStability';
import { commitActiveNoteEditorToStore } from '../_lib/noteBlockStateMerge';
import { beginNoteLinkEdit } from '../_lib/noteEditorLink';
import {
  invokeToggleChildBackspaceAtStart,
  invokeToggleChildEmptyBackspace,
} from '../_lib/noteToggleBackspaceRuntime';
import { resolveArrowBlockNavigation } from '../_lib/noteArrowNavigation';
import type { NoteBlock } from '../_lib/types';

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

function selectionAtBlockStart(view: EditorView): boolean {
  const { selection } = view.state;
  if (!selection.empty) return false;
  if (selection.from <= 1) return true;
  return selection.$from.parentOffset === 0;
}

function editorIsEffectivelyEmpty(editor: Editor | null | undefined): boolean {
  if (!editor || (editor as { isDestroyed?: boolean }).isDestroyed) return false;
  if (editor.isEmpty) return true;
  return editor.getText().trim().length === 0;
}

type RichField = 'text';

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
  text,
}: {
  content: Record<string, unknown> | null | undefined;
  text: string;
}) {
  const html = content?.html;
  if (typeof html === 'string' && html.trim().length > 0) return html;
  return legacyTextToEditorHtml(text);
}

function applyEditorHighlight(editor: Editor, color: string | null) {
  const chain = editor.chain().focus();
  if (!color) chain.unsetMark('highlight').run();
  else chain.setMark('highlight', { color }).run();
}

function applyEditorTextColor(editor: Editor, color: string | null) {
  const chain = editor.chain().focus();
  if (!color) chain.unsetMark('textColor').run();
  else chain.setMark('textColor', { color }).run();
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

function readCoordsTop(view: EditorView, pos: number): number | undefined {
  try {
    return view.coordsAtPos(pos).top;
  } catch {
    return undefined;
  }
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

function handleMarkdownShortcut(
  view: EditorView,
  event: KeyboardEvent,
  onMarkdownBlockTrigger: ((trigger: MarkdownBlockTrigger) => void) | undefined,
  flushPendingChange: () => void,
) {
  if (event.key !== ' ') return false;
  if (onMarkdownBlockTrigger) {
    const blockTrigger = consumeMarkdownBlockTrigger(view);
    if (blockTrigger) {
      event.preventDefault();
      flushPendingChange();
      onMarkdownBlockTrigger(blockTrigger);
      return true;
    }
  }
  if (tryConvertMarkdownBulletTrigger(view)) {
    event.preventDefault();
    return true;
  }
  return false;
}

export function NoteEditor({
  content,
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
  onCellNavigate,
  onEditorFocus,
  onEditorSurfaceReady,
  onOpenDocumentById,
  onMultilinePaste,
  canSplitMultilinePaste = false,
  blockType = 'text',
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
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: ToolbarPosition,
    insertTable?: () => void,
    editLink?: () => void,
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
  onCellNavigate?: (direction: TableCellNavigateDirection) => void;
  onEditorFocus?: () => void;
  onEditorSurfaceReady?: () => void;
  onOpenDocumentById?: (documentId: string) => void;
  onMultilinePaste?: (specs: PastedBlockSpec[]) => void;
  canSplitMultilinePaste?: boolean;
  blockType?: NoteBlock['type'];
  tabBehavior?: 'block-indent' | 'insert-text-indent' | 'table-cell-nav';
  resetKey?: string;
  editorBlockId?: string;
  focusCaretOffset?: number;
}) {
  const pendingChangeRef = useRef<NoteEditorChange | null>(null);
  const changeTimerRef = useRef<number | null>(null);
  const structuralPasteUndoArmedRef = useRef(false);
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
    onCellNavigate,
    onEditorFocus,
    onEditorSurfaceReady,
    onOpenDocumentById,
    onMultilinePaste,
    canSplitMultilinePaste,
    blockType,
    enterCreatesBlock,
    enterSplitOnMidBlock,
    tabBehavior,
    editorBlockId,
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
    onCellNavigate,
    onEditorFocus,
    onEditorSurfaceReady,
    onOpenDocumentById,
    onMultilinePaste,
    canSplitMultilinePaste,
    blockType,
    enterCreatesBlock,
    enterSplitOnMidBlock,
    tabBehavior,
    editorBlockId,
    flushPendingChange: callbacksRef.current.flushPendingChange,
  };

  const sourceHtml = useMemo(
    () => richTextSourceHtml({ content, text }),
    [content, text],
  );

  const flushPendingChange = useCallback(() => {
    if (changeTimerRef.current !== null) {
      window.cancelAnimationFrame(changeTimerRef.current);
      changeTimerRef.current = null;
    }
    const currentEditor = editorRef.current;
    if (currentEditor && !(currentEditor as { isDestroyed?: boolean }).isDestroyed) {
      pendingChangeRef.current = null;
      callbacksRef.current.onChange({
        text: currentEditor.getText(),
        html: currentEditor.getHTML(),
      });
      return;
    }
    const pending = pendingChangeRef.current;
    if (!pending) return;
    pendingChangeRef.current = null;
    callbacksRef.current.onChange({ text: pending.text, html: pending.html });
  }, []);

  callbacksRef.current.flushPendingChange = flushPendingChange;

  const deferPendingChangeFlush = useCallback(() => {
    window.setTimeout(() => {
      callbacksRef.current.flushPendingChange();
    }, 0);
  }, []);

  const scheduleChange = useCallback((change: NoteEditorChange) => {
    pendingChangeRef.current = change;
    if (changeTimerRef.current !== null) return;
    changeTimerRef.current = window.requestAnimationFrame(() => {
      changeTimerRef.current = null;
      flushPendingChange();
    });
  }, [flushPendingChange]);

  const toolbarNotifyRafRef = useRef<number | null>(null);
  const notifyFormatToolbar = useCallback((currentEditor: Editor) => {
    if (toolbarNotifyRafRef.current !== null) return;
    toolbarNotifyRafRef.current = window.requestAnimationFrame(() => {
      toolbarNotifyRafRef.current = null;
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
        (mark) => {
          applyEditorMark(currentEditor, mark);
          flushPendingChange();
        },
        (style) => {
          applyEditorTextStyle(currentEditor, style);
          flushPendingChange();
        },
        (color) => {
          applyEditorTextColor(currentEditor, color);
          flushPendingChange();
        },
        (color) => {
          applyEditorHighlight(currentEditor, color);
          flushPendingChange();
        },
        position,
        undefined,
        () => beginNoteLinkEdit({ editor: currentEditor, flush: flushPendingChange }),
      );
    });
  }, [flushPendingChange]);

  const tryPendingSelectAll = useCallback((currentEditor: Editor) => {
    if (!editorBlockId || !consumePendingSelectAllBlock(editorBlockId)) return;
    requestAnimationFrame(() => {
      const ed = editorRef.current;
      if (!ed || ed !== currentEditor || (ed as { isDestroyed?: boolean }).isDestroyed) return;
      selectAllNoteEditorText(ed);
      notifyFormatToolbar(ed);
    });
  }, [editorBlockId, notifyFormatToolbar]);

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
      NoteTextColor,
      NoteHighlight,
      ...(NOTE_EDITOR_STABILITY.crossBlockEditorExtensions
        ? [NoteListCrossHighlightExtension, NoteTextDragSelectExtension]
        : []),
    ],
    [placeholder],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: sourceHtml,
    editorProps: {
      handleScrollToSelection: () => noteSuppressEditorScrollRef.current,
      attributes: {
        class: `note-rich-editor min-h-[1.75rem] w-full select-text outline-none ${className}`,
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor) {
          const href = anchor.getAttribute('href');
          if (href) {
            const docId = parseAdminNoteDocumentIdFromHref(href);
            if (docId && callbacksRef.current.onOpenDocumentById) {
              event.preventDefault();
              callbacksRef.current.onOpenDocumentById(docId);
              return true;
            }
          }
        }
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
        compositionend: () => {
          callbacksRef.current.flushPendingChange();
          return false;
        },
        dblclick: (view, event) => {
          event.preventDefault();
          const ed = editorRef.current;
          if (ed && !(ed as { isDestroyed?: boolean }).isDestroyed) {
            selectAllNoteEditorText(ed);
            requestAnimationFrame(() => {
              const current = editorRef.current;
              if (!current || (current as { isDestroyed?: boolean }).isDestroyed) return;
              notifyFormatToolbar(current);
            });
          }
          return true;
        },
        keydown: (view, event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey && structuralPasteUndoArmedRef.current) {
            event.preventDefault();
            structuralPasteUndoArmedRef.current = false;
            window.dispatchEvent(new CustomEvent('admin-note:undo-request'));
            return true;
          }
          if (handleMarkdownShortcut(
            view,
            event,
            callbacksRef.current.onMarkdownBlockTrigger,
            callbacksRef.current.flushPendingChange,
          )) return true;
          // PM keymap보다 먼저: 빈 블록 Backspace (singleton remount 후에도 동작)
          if (event.key === 'Backspace') {
            const { selection } = view.state;
            const ed = editorRef.current;
            const viewDocEmpty = view.state.doc.textContent.trim().length === 0;
            if (selection.empty && (viewDocEmpty || editorIsEffectivelyEmpty(ed))) {
              event.preventDefault();
              const {
                flushPendingChange: flush,
                onEmptyBackspace: currentOnEmptyBackspace,
                editorBlockId: currentEditorBlockId,
              } = callbacksRef.current;
              flush();
              if (currentEditorBlockId) {
                invokeToggleChildEmptyBackspace(currentEditorBlockId);
              } else if (currentOnEmptyBackspace) {
                currentOnEmptyBackspace();
              }
              return true;
            }
          }
          if (event.key !== 'Tab') return false;
          const {
            tabBehavior: currentTabBehavior,
            onIndent: currentOnIndent,
            flushPendingChange: flush,
            onNavigatePrevious: currentOnNavigatePrevious,
            onNavigateNext: currentOnNavigateNext,
          } = callbacksRef.current;
          if (currentTabBehavior === 'insert-text-indent') {
            event.preventDefault();
            flush();
            return handleTextIndent(view, event.shiftKey ? 'out' : 'in');
          }
          if (currentTabBehavior === 'table-cell-nav') {
            event.preventDefault();
            flush();
            if (event.shiftKey) currentOnNavigatePrevious?.();
            else currentOnNavigateNext?.();
            return true;
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
          onCellNavigate: currentOnCellNavigate,
          onEnter: currentOnEnter,
          enterCreatesBlock: currentEnterCreatesBlock,
        } = callbacksRef.current;

        if (handleMarkdownShortcut(view, event, currentOnMarkdownBlockTrigger, flush)) return true;
        if (event.key === 'Tab') {
          if (currentTabBehavior === 'insert-text-indent') {
            event.preventDefault();
            flush();
            return handleTextIndent(view, event.shiftKey ? 'out' : 'in');
          }
          if (currentTabBehavior === 'table-cell-nav') {
            event.preventDefault();
            flush();
            if (event.shiftKey) currentOnNavigatePrevious?.();
            else currentOnNavigateNext?.();
            return true;
          }
          if (currentOnIndent) {
            event.preventDefault();
            flush();
            currentOnIndent(event.shiftKey ? 'out' : 'in');
            return true;
          }
        }
        if (event.key === 'Escape') {
          const ed = editorRef.current;
          if (ed && isSlashMenuActiveText(ed.getText())) {
            event.preventDefault();
            ed.commands.setContent('');
            currentOnSlashChange?.(false, '');
            return true;
          }
          currentOnSlashChange?.(false, '');
          return false;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
          if (!event.shiftKey && structuralPasteUndoArmedRef.current) {
            event.preventDefault();
            structuralPasteUndoArmedRef.current = false;
            window.dispatchEvent(new CustomEvent('admin-note:undo-request'));
            return true;
          }
          const ed = editorRef.current;
          if (ed && !(ed as { isDestroyed?: boolean }).isDestroyed) {
            if (event.shiftKey && ed.can().redo()) {
              event.preventDefault();
              ed.chain().focus().redo().run();
              return true;
            }
            if (!event.shiftKey && ed.can().undo()) {
              event.preventDefault();
              ed.chain().focus().undo().run();
              return true;
            }
          }
          return false;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
          const ed = editorRef.current;
          if (ed && !(ed as { isDestroyed?: boolean }).isDestroyed && isNoteEditorFullBlockSelected(ed)) {
            event.preventDefault();
            flush();
            selectAllDocumentBlocksRef.current?.();
            return true;
          }
          return false;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          const ed = editorRef.current;
          if (!ed || (ed as { isDestroyed?: boolean }).isDestroyed) return false;
          event.preventDefault();
          flush();
          beginNoteLinkEdit({ editor: ed, flush });
          return true;
        }
        if (event.key === 'Backspace') {
          const atStart = selectionAtBlockStart(view);
          const editor = editorRef.current;
          const { selection } = view.state;
          // remount 직후 editorRef가 destroyed여도 view 기준으로 빈 블록 판정
          const viewDocEmpty = view.state.doc.textContent.trim().length === 0;
          if (
            selection.empty
            && (viewDocEmpty || editorIsEffectivelyEmpty(editor))
          ) {
            event.preventDefault();
            flush();
            // 부모·하위 공통: store 최신 type 기준 SSOT (stale React prop의 convert 반복 금지)
            if (editorBlockId) {
              invokeToggleChildEmptyBackspace(editorBlockId);
            } else if (currentOnEmptyBackspace) {
              currentOnEmptyBackspace();
            }
            return true;
          }
          if (atStart) {
            if (currentOnBackspaceAtBlockStart?.()) {
              event.preventDefault();
              flush();
              return true;
            }
            if (editorBlockId && invokeToggleChildBackspaceAtStart(editorBlockId)) {
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
        if (currentTabBehavior === 'table-cell-nav' && currentOnCellNavigate) {
          const { selection, doc } = view.state;
          const atStart = selection.empty && selection.from <= 1;
          const atEnd = selection.empty && selection.to >= doc.content.size - 1;
          if (event.key === 'ArrowLeft' && atStart) {
            event.preventDefault();
            flush();
            currentOnCellNavigate('left');
            return true;
          }
          if (event.key === 'ArrowUp' && atStart) {
            event.preventDefault();
            flush();
            currentOnCellNavigate('up');
            return true;
          }
          if (event.key === 'ArrowRight' && atEnd) {
            event.preventDefault();
            flush();
            currentOnCellNavigate('right');
            return true;
          }
          if (event.key === 'ArrowDown' && atEnd) {
            event.preventDefault();
            flush();
            currentOnCellNavigate('down');
            return true;
          }
        }
        if (
          currentTabBehavior !== 'table-cell-nav'
          && (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
          && currentOnNavigatePrevious
        ) {
          const { doc, selection } = view.state;
          if (!selection.empty) return false;
          // ArrowUp: 첫 시각 줄이면 블록 맨앞이 아니어도 이전 블록 (체크리스트 끝→같은 칸 앞으로 가는 문제)
          if (event.key === 'ArrowUp') {
            const direction = resolveArrowBlockNavigation({
              key: event.key,
              selectionEmpty: selection.empty,
              selectionFrom: selection.from,
              selectionTo: selection.to,
              docContentSize: doc.content.size,
              caretTop: readCoordsTop(view, selection.from),
              boundaryTop: readCoordsTop(view, 1),
            });
            if (direction === 'previous') {
              event.preventDefault();
              flush();
              currentOnNavigatePrevious();
              return true;
            }
            return false;
          }
          if (selection.from <= 1) {
            event.preventDefault();
            flush();
            currentOnNavigatePrevious();
            return true;
          }
        }
        if (
          currentTabBehavior !== 'table-cell-nav'
          && (event.key === 'ArrowRight' || event.key === 'ArrowDown')
          && currentOnNavigateNext
        ) {
          const { doc, selection } = view.state;
          if (!selection.empty) return false;
          if (event.key === 'ArrowDown') {
            const lastPos = Math.max(1, doc.content.size - 1);
            const direction = resolveArrowBlockNavigation({
              key: event.key,
              selectionEmpty: selection.empty,
              selectionFrom: selection.from,
              selectionTo: selection.to,
              docContentSize: doc.content.size,
              caretTop: readCoordsTop(view, selection.to),
              boundaryTop: readCoordsTop(view, lastPos),
            });
            if (direction === 'next') {
              event.preventDefault();
              flush();
              currentOnNavigateNext();
              return true;
            }
            return false;
          }
          if (selection.to >= doc.content.size - 1) {
            event.preventDefault();
            flush();
            currentOnNavigateNext();
            return true;
          }
        }
        if (currentTabBehavior === 'table-cell-nav' && event.key === 'Enter') {
          const tableEnter = resolveTableCellEnterAction(event.shiftKey);
          if (tableEnter.kind === 'hard-break') {
            event.preventDefault();
            flush();
            editorRef.current?.chain().focus().setHardBreak().run();
            return true;
          }
          return false;
        }
        // 글머리·번호 블록 — NoteBlockEnterExtension이 Keymap Enter보다 먼저 처리
        if (event.key === 'Enter' && isSlashMenuActiveText(view.state.doc.textContent)) {
          event.preventDefault();
          return true;
        }
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
          const ed = editorRef.current;
          if (ed && isSlashMenuActiveText(ed.getText())) {
            return false;
          }
          event.preventDefault();
          currentOnSlashChange?.(false, '');
          flush();
          currentOnEnter({ isEmpty: editorRef.current?.isEmpty ?? false });
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const file = firstImageFile(event.clipboardData?.files);
        const currentUploadImage = callbacksRef.current.uploadImage;
        if (file && currentUploadImage) {
          event.preventDefault();
          void currentUploadImage(file).then((url) => {
            editorRef.current?.chain().focus().setImage({ src: url }).run();
          });
          return true;
        }
        const plain = event.clipboardData?.getData('text/plain') ?? '';
        const html = event.clipboardData?.getData('text/html') ?? '';
        const pageLink = plain ? tryParsePastedNotePageLink(plain) : null;
        if (pageLink) {
          event.preventDefault();
          editorRef.current?.chain().focus().insertContent(notePageLinkInsertHtml(pageLink)).run();
          return true;
        }
        const mdSpecs = !html && plain ? parseMarkdownPlainToBlocks(plain) : null;
        if (mdSpecs && shouldSplitMarkdownPaste(mdSpecs)) {
          const { onMultilinePaste, canSplitMultilinePaste: splitEnabled } = callbacksRef.current;
          if (splitEnabled && onMultilinePaste) {
            event.preventDefault();
            callbacksRef.current.flushPendingChange();
            const first = mdSpecs[0];
            if (!isStructuralHtmlPasteSpec(first)) {
              const firstHtml = first.html?.trim()
                ? first.html
                : legacyTextToEditorHtml(first.text);
              editorRef.current?.chain().focus().setContent(firstHtml, { emitUpdate: false }).run();
            }
            onMultilinePaste(mdSpecs);
            structuralPasteUndoArmedRef.current = true;
            if (editorRef.current) clearTipTapHistory(editorRef.current);
            return true;
          }
        }
        const htmlSpecs = html ? parseClipboardHtmlToBlocks(html) : null;
        if (htmlSpecs && shouldSplitHtmlPaste(htmlSpecs)) {
          const { onMultilinePaste, canSplitMultilinePaste: splitEnabled } = callbacksRef.current;
          if (splitEnabled && onMultilinePaste) {
            event.preventDefault();
            callbacksRef.current.flushPendingChange();
            const first = htmlSpecs[0];
            if (!isStructuralHtmlPasteSpec(first)) {
              const firstHtml = first.html?.trim()
                ? first.html
                : legacyTextToEditorHtml(first.text);
              editorRef.current?.chain().focus().setContent(firstHtml, { emitUpdate: false }).run();
            }
            onMultilinePaste(htmlSpecs);
            structuralPasteUndoArmedRef.current = true;
            if (editorRef.current) clearTipTapHistory(editorRef.current);
            return true;
          }
        }
        if (plain && shouldHandlePlainMultilinePaste(plain)) {
          const lines = splitClipboardLines(plain);
          const { onMultilinePaste, canSplitMultilinePaste: splitEnabled } = callbacksRef.current;
          if (splitEnabled && onMultilinePaste && lines.length > 1) {
            event.preventDefault();
            callbacksRef.current.flushPendingChange();
            const currentBlockType = callbacksRef.current.blockType
              ?? (editorBlockId
                ? useNoteBlockStore.getState().getBlock(editorBlockId)?.type
                : null)
              ?? 'text';
            const specs = pastedBlocksFromPlainLines(currentBlockType, lines);
            onMultilinePaste(specs);
            structuralPasteUndoArmedRef.current = true;
            if (editorRef.current) clearTipTapHistory(editorRef.current);
            return true;
          }
          event.preventDefault();
          const html = plainMultilineToInsertHtml(lines);
          editorRef.current?.chain().focus().insertContent(html).run();
          return true;
        }
        return false;
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
      structuralPasteUndoArmedRef.current = false;
      const nextText = currentEditor.getText();
      const slashMatch = nextText.match(/^\/([^\n]*)$/);
      callbacksRef.current.onSlashChange?.(!!slashMatch, slashMatch?.[1] ?? '');
      scheduleChange({ text: nextText, html: '' });
    },
    onCreate: ({ editor: currentEditor }) => {
      tryPendingSelectAll(currentEditor);
      if (editorBlockId && pendingEditorClickRef.current?.blockId === editorBlockId) {
        scheduleFocusNoteEditorAtClick(editorBlockId, currentEditor);
        return;
      }
      requestAnimationFrame(() => {
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
      const ed = editorRef.current;
      if (ed && isSlashMenuActiveText(ed.getText())) {
        callbacksRef.current.onHideFormatToolbar?.();
        callbacksRef.current.onSlashChange?.(false, '');
        return;
      }
      callbacksRef.current.flushPendingChange();
      commitActiveNoteEditorToStore();
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
      const cbs = callbacksRef.current;
      if (!shiftKey && isSlashMenuActiveText(currentEditor.getText())) {
        return true;
      }
      if (resolveEditorShiftEnterAction(shiftKey, { tabBehavior: cbs.tabBehavior })) {
        return currentEditor.commands.setHardBreak();
      }
      cbs.onSlashChange?.(false, '');
      let split: NoteEditorEnterSplit | undefined;
      if (cbs.enterSplitOnMidBlock) {
        const splitResult = resolveListEnterSplit(currentEditor);
        if (splitResult) {
          split = splitResult;
          if (changeTimerRef.current !== null) {
            window.cancelAnimationFrame(changeTimerRef.current);
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
        deferPendingChangeFlush();
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
  }, [deferPendingChangeFlush, editor, enterCreatesBlock, flushPendingChange]);

  useEffect(() => () => {
    flushPendingChange();
  }, [flushPendingChange]);

  useEffect(() => {
    const commitOnTabLeave = () => {
      if (document.visibilityState !== 'hidden') return;
      callbacksRef.current.flushPendingChange();
      commitActiveNoteEditorToStore();
    };
    document.addEventListener('visibilitychange', commitOnTabLeave);
    window.addEventListener('pagehide', commitOnTabLeave);
    return () => {
      document.removeEventListener('visibilitychange', commitOnTabLeave);
      window.removeEventListener('pagehide', commitOnTabLeave);
    };
  }, []);

  useEffect(() => {
    if (!editor) return;
    if ((editor as { isDestroyed?: boolean }).isDestroyed) return;
    const resetKeyChanged = lastResetKeyRef.current !== resetKey;
    if (!resetKeyChanged) return;
    lastResetKeyRef.current = resetKey;
    if (changeTimerRef.current !== null) {
      window.cancelAnimationFrame(changeTimerRef.current);
      changeTimerRef.current = null;
    }
    pendingChangeRef.current = null;
    const { from, to, empty } = editor.state.selection;
    editor
      .chain()
      .command(({ tr }) => { tr.setMeta('addToHistory', false); return true; })
      .setContent(sourceHtml, { emitUpdate: false })
      .run();
    // remap ghost undo가 Ctrl+Z를 가로채지 않게 history 플러그인 초기화
    clearTipTapHistory(editor);
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
  }, [editor, resetKey, sourceHtml]);

  useEffect(() => {
    lastAutoFocusSignalRef.current = 0;
  }, [resetKey]);

  useEffect(() => {
    if (!editor || typeof focusCaretOffset !== 'number' || focusCaretOffset < 0) return;
    requestAnimationFrame(() => {
      const ed = editorRef.current;
      if (!ed || ed !== editor || (ed as { isDestroyed?: boolean }).isDestroyed) return;
      const pos = Math.min(focusCaretOffset + 1, ed.state.doc.content.size);
      ed.chain().focus().setTextSelection({ from: pos, to: pos }).run();
    });
  }, [focusCaretOffset, editor]);

  useEffect(() => {
    if (!editor || autoFocusSignal <= 0) return;
    if (autoFocusSignal === lastAutoFocusSignalRef.current) return;
    lastAutoFocusSignalRef.current = autoFocusSignal;

    if (editorBlockId && pendingEditorClickRef.current?.blockId === editorBlockId) {
      scheduleFocusNoteEditorAtClick(editorBlockId, editor);
      return;
    }

    requestAnimationFrame(() => {
      const ed = editorRef.current;
      if (!ed || ed !== editor || (ed as { isDestroyed?: boolean }).isDestroyed) return;
      if (typeof focusCaretOffset === 'number' && focusCaretOffset >= 0) {
        const pos = Math.min(focusCaretOffset + 1, ed.state.doc.content.size);
        ed.chain().focus().setTextSelection({ from: pos, to: pos }).run();
        return;
      }
      if (!isEditingRef.current) {
        ed.commands.focus('start');
      }
    });
  }, [autoFocusSignal, editor, editorBlockId, focusCaretOffset]);

  useEffect(() => {
    if (!editor || !editorBlockId) return;
    registerNoteEditor(editorBlockId, editor);
    tryPendingSelectAll(editor);
    if (editor.view?.dom?.isConnected) {
      callbacksRef.current.onEditorSurfaceReady?.();
    }
    return () => {
      unregisterNoteEditor(editorBlockId);
    };
  }, [editor, editorBlockId, tryPendingSelectAll]);

  return (
    <>
      <EditorContent editor={editor} />
      <NoteRichEditorStyles />
    </>
  );
}
