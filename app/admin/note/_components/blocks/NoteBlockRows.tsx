'use client';

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import {
  Check,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import { resolveToggleBodyForDisplay } from '@/app/lib/note/toggleBody';
import {
  buildVideoBlockContentFromUrl,
  resolveVideoEmbedContent,
  videoProviderLabel,
} from '@/app/lib/note/videoEmbed';
import { NoteEditableField } from '../NoteEditableField';
import { NoteTableBlock } from './NoteTableBlock';
import type { NoteEditorEnterContext } from '../NoteEditor';
import { useNoteImageLightbox } from '../NoteImageLightbox';
import { SlashMenuFixed, BlockPickerMenu, BlockHandleMenu } from '../SlashMenu';
import { bulletMarkerForLevel, stripListItemMarkerPrefix } from '../noteBulletInput';
import { useNoteBlockStore } from '../../_store/noteBlockStore';
import { STORE_ONLY_CONTENT_KEYS } from '../../_lib/noteContentPatch';
import { VideoEmbedFrame } from '../VideoEmbedFrame';
import {
  BlockInsideDropSurface,
  ToggleDisclosureButton,
} from '../sidebar/NoteDocChrome';
import {
  useBlockDragActive,
  useBlockDropTarget,
  useOnBlockSelect,
  useSelectedBlockIds,
  useSuppressGripMenuRef,
} from '../noteContexts';
import {
  BLOCK_TYPES,
  blockGutterTopPx,
  blockHandleLeftPx,
  toggleMenuAnchorOffset,
  toggleNestPaddingPx,
} from '../../_lib/constants';
import { focusWithoutScroll } from '../../_lib/noteEditorScrollGuard';
import {
  blockExternalizesChildren,
  blockRowBgClass,
  DROP_INSIDE_BLOCK_ROW,
  DROP_TARGET_ROW,
  EMPTY_BLOCK_PLACEHOLDER,
  focusNoteBlockRowFromChrome,
  NOTE_BLOCK_HOVER_BRIDGE,
  noteBlockRowMouseEnter,
  noteBlockRowMouseLeave,
  readBlockColor,
} from '../../_lib/noteBlockRowUi';
import { DocIconGlyph } from '../../_lib/noteDocumentUi';
import type { NoteBlock } from '../../_lib/types';

function BlockContent({
  block,
  onUpdate,
  onContentSync,
  onChangeType,
  onEnter,
  onAddBelow,
  onOpenDocument,
  resolvePageIcon,
  onShowFormatToolbar,
  onHideFormatToolbar,
  onMultilinePaste,
  autoFocusSignal,
  onEmptyBackspace,
  onMergeWithPrevious,
  canMergeWithPrevious,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  isDragging,
  focusedToggleId,
  uploadImage,
  childBlocks = [],
  renderChildBlock,
  onAddChildBelow,
  onTrackActiveBlock,
  isInsideToggle = false,
  isDropTarget = false,
  isFocused = false,
  mergeFocusCaretOffset,
  onRequestCaretOffset,
  toggleNestDepth = 1,
  onFocusBlock,
  autoFocusTitleSignal = 0,
  numberedListIndex,
  bulletListNestLevel = 0,
  omitExternalizedChildren = false,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onContentSync?: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onOpenDocument?: (documentId: string) => void;
  resolvePageIcon?: (documentId: string) => string | null;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
  ) => void;
  onHideFormatToolbar?: () => void;
  onMultilinePaste?: (lines: string[]) => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onMergeWithPrevious?: () => void;
  canMergeWithPrevious?: () => boolean;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  isDragging?: boolean;
  focusedToggleId?: string | null;
  uploadImage?: (file: File) => Promise<string>;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  isInsideToggle?: boolean;
  toggleNestDepth?: number;
  isDropTarget?: boolean;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  onRequestCaretOffset?: (offset: number) => void;
  onFocusBlock?: () => void;
  autoFocusTitleSignal?: number;
  numberedListIndex?: number;
  bulletListNestLevel?: number;
  omitExternalizedChildren?: boolean;
}) {
  const isBlockDragActive = useBlockDragActive();
  const imageLightbox = useNoteImageLightbox();
  const [showSlash, setShowSlash] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const slashHostRef = useRef<HTMLDivElement>(null);
  const [slashAnchor, setSlashAnchor] = useState<{ top: number; left: number } | null>(null);
  const toggleTitleInputRef = useRef<HTMLInputElement>(null);
  const [toggleTitleSlashAnchor, setToggleTitleSlashAnchor] = useState<{ top: number; left: number } | null>(null);
  const [imgDragOver, setImgDragOver] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const imgFileInputRef = useRef<HTMLInputElement>(null);
  const pageBtnRef = useRef<HTMLButtonElement>(null);
  const activeEditor = useNoteBlockStore((state) => state.activeEditor);

  const syncContentPatch = useCallback((partial: Record<string, unknown>) => {
    const base = (useNoteBlockStore.getState().getBlock(block.id)?.content
      ?? block.content
      ?? {}) as Record<string, unknown>;
    const nextContent = { ...base, ...partial };
    const needsReactUpdate = Object.keys(partial).some(
      (key) => !STORE_ONLY_CONTENT_KEYS.has(key),
    );
    if (needsReactUpdate) {
      onUpdate(nextContent);
      return;
    }
    if (onContentSync) onContentSync(nextContent);
    else onUpdate(nextContent);
  }, [block.id, block.content, onContentSync, onUpdate]);

  useEffect(() => {
    if (block.type !== 'page' || !isFocused) return;
    pageBtnRef.current?.focus();
  }, [block.type, isFocused, autoFocusSignal]);

  useEffect(() => {
    if (block.type !== 'toggle' || autoFocusTitleSignal <= 0) return;
    requestAnimationFrame(() => {
      focusWithoutScroll(toggleTitleInputRef.current);
      onTrackActiveBlock?.('title');
    });
  }, [block.type, autoFocusTitleSignal, onTrackActiveBlock]);

  const updateSlashAnchor = useCallback(() => {
    if (!slashHostRef.current) return;
    const rect = slashHostRef.current.getBoundingClientRect();
    setSlashAnchor({ top: rect.bottom + 4, left: rect.left });
  }, []);

  useEffect(() => {
    if (!showSlash) {
      setSlashAnchor(null);
      return;
    }
    updateSlashAnchor();
    window.addEventListener('scroll', updateSlashAnchor, true);
    window.addEventListener('resize', updateSlashAnchor);
    return () => {
      window.removeEventListener('scroll', updateSlashAnchor, true);
      window.removeEventListener('resize', updateSlashAnchor);
    };
  }, [showSlash, slashQuery, updateSlashAnchor]);

  const toggleTitleText = block.type === 'toggle'
    ? (typeof block.content?.title === 'string'
      ? block.content.title
      : (typeof block.content?.text === 'string' ? block.content.text : ''))
    : '';
  const toggleTitleSlashActive = block.type === 'toggle' && toggleTitleText.startsWith('/');
  const toggleTitleSlashQuery = toggleTitleSlashActive ? toggleTitleText.slice(1) : '';

  useEffect(() => {
    if (!toggleTitleSlashActive || !toggleTitleInputRef.current) {
      setToggleTitleSlashAnchor(null);
      return;
    }
    const rect = toggleTitleInputRef.current.getBoundingClientRect();
    setToggleTitleSlashAnchor({ top: rect.bottom + 4, left: rect.left });
  }, [toggleTitleSlashActive, toggleTitleSlashQuery]);

  const renderSlashMenuPortal = () => (
    <SlashMenuFixed
      show={showSlash}
      anchor={slashAnchor}
      commands={BLOCK_TYPES}
      query={slashQuery}
      onSelect={(type) => { onChangeType(type); }}
      onClose={() => { setShowSlash(false); setSlashQuery(''); }}
    />
  );

  const blockDepth = Math.max(0, Math.min(6, Number(block.content?.depth ?? 0)));
  const contentMarginLeft = isInsideToggle ? 0 : blockDepth * 20;
  const isBorderlessInlineBlock =
    block.type === 'text'
    || block.type === 'todo'
    || block.type === 'page'
    || block.type === 'bulletList'
    || block.type === 'numberedList';
  const rootBlockShell =
    isInsideToggle || isBorderlessInlineBlock
      ? ''
      : 'rounded-lg border border-slate-200 bg-white px-2 py-2';
  const inlineRowPadding = isInsideToggle ? 'py-0.5' : (isBorderlessInlineBlock ? 'py-0.5' : '');
  const enterCreatesBlockBelow =
    !isInsideToggle
    || block.type === 'text'
    || block.type === 'todo'
    || block.type === 'bulletList'
    || block.type === 'numberedList';

  const renderFormatToolbar = () => null;

  const renderFormattedTextarea = ({
    text,
    placeholder,
    textClassName,
    field = 'text',
    tabBehavior = 'block-indent',
    enterCreatesBlock = false,
    enterSplitOnMidBlock = false,
    onEditorEnter = onEnter,
    onEditorBackspace,
    onEditorBackspaceAtBlockStart,
    onEditorMergeWithPrevious,
    onEditorCanMergeWithPrevious,
    editorMergeFocusCaretOffset,
  }: {
    text: string;
    placeholder: string;
    textClassName: string;
    field?: 'text' | 'body';
    tabBehavior?: 'block-indent' | 'insert-text-indent';
    enterCreatesBlock?: boolean;
    enterSplitOnMidBlock?: boolean;
    onEditorEnter?: (ctx?: NoteEditorEnterContext) => void;
    onEditorBackspace?: (() => void) | false;
    onEditorBackspaceAtBlockStart?: () => boolean;
    onEditorMergeWithPrevious?: () => void;
    onEditorCanMergeWithPrevious?: () => boolean;
    editorMergeFocusCaretOffset?: number;
  }) => (
    <NoteEditableField
      blockId={block.id}
      blockType={block.type}
      field={field}
      fallbackContent={block.content}
      text={text}
      placeholder={placeholder}
      textClassName={textClassName}
      autoFocusSignal={autoFocusSignal ?? 0}
      enterCreatesBlock={enterCreatesBlock}
      enterSplitOnMidBlock={enterSplitOnMidBlock}
      tabBehavior={tabBehavior}
      onEditorEnter={onEditorEnter}
      onEditorBackspace={onEditorBackspace === false ? false : (onEditorBackspace ?? onEmptyBackspace)}
      onEditorBackspaceAtBlockStart={onEditorBackspaceAtBlockStart ?? handleListItemBackspaceAtStart}
      onEditorMergeWithPrevious={onEditorMergeWithPrevious ?? onMergeWithPrevious}
      onEditorCanMergeWithPrevious={onEditorCanMergeWithPrevious ?? canMergeWithPrevious}
      editorMergeFocusCaretOffset={editorMergeFocusCaretOffset}
      mergeFocusCaretOffset={mergeFocusCaretOffset}
      onIndentChange={onIndentChange}
      onNavigatePrevious={onNavigatePrevious}
      onNavigateNext={onNavigateNext}
      onTrackActiveBlock={onTrackActiveBlock}
      onFocusBlock={onFocusBlock}
      onContentSync={onContentSync}
      onUpdate={onUpdate}
      onChangeType={onChangeType}
      onShowFormatToolbar={onShowFormatToolbar}
      onHideFormatToolbar={onHideFormatToolbar}
      onSlashChange={(nextShow, nextQuery) => {
        setShowSlash(nextShow);
        setSlashQuery(nextQuery);
      }}
      uploadImage={uploadImage}
      onOpenDocumentById={onOpenDocument}
      onMultilinePaste={onMultilinePaste}
      slashHostRef={slashHostRef}
    />
  );

  const listNestLevel = bulletListNestLevel;

  const handleListItemBackspaceAtStart = (): boolean => {
    if (block.type !== 'bulletList' && block.type !== 'numberedList') return false;
    const itemText = stripListItemMarkerPrefix(
      typeof block.content?.text === 'string' ? block.content.text : '',
    );
    if (itemText.length === 0) {
      if (block.parent_block_id) {
        onIndentChange?.('out');
      } else {
        onChangeType('text');
      }
      return true;
    }
    if (block.parent_block_id) {
      onIndentChange?.('out');
      return true;
    }
    onRequestCaretOffset?.(0);
    onChangeType('text');
    return true;
  };

  const handleListItemEmptyBackspace = () => {
    if (block.parent_block_id) {
      onIndentChange?.('out');
      return;
    }
    onChangeType('text');
  };

  const handleListItemEnter = (listType: 'bulletList' | 'numberedList', ctx?: NoteEditorEnterContext) => {
    if (ctx?.split) {
      onAddBelow(listType, {
        text: ctx.split.afterText,
        html: ctx.split.afterHtml,
        depth: 0,
      });
      return;
    }
    const isEmpty = ctx?.isEmpty ?? text.trim().length === 0;
    if (!isEmpty) {
      onAddBelow(listType);
      return;
    }
    if (block.parent_block_id) {
      onIndentChange?.('out');
      return;
    }
    onChangeType('text');
  };

  const renderListChildBlocks = () => {
    if (omitExternalizedChildren) return null;
    if (!childBlocks?.length || !renderChildBlock) return null;
    return (
      <div className="note-block-children space-y-0 overflow-visible">
        {childBlocks.map((child) => (
          <Fragment key={child.id}>
            {renderChildBlock(child, toggleNestDepth + 1)}
          </Fragment>
        ))}
      </div>
    );
  };

  if (block.type === 'table') {
    return (
      <NoteTableBlock
        block={block}
        contentMarginLeft={contentMarginLeft}
        rootBlockShell={rootBlockShell}
        autoFocusSignal={autoFocusSignal}
        mergeFocusCaretOffset={mergeFocusCaretOffset}
        onUpdate={onUpdate}
        onContentSync={onContentSync}
        onTrackActiveBlock={onTrackActiveBlock}
        onFocusBlock={onFocusBlock}
        onShowFormatToolbar={onShowFormatToolbar}
        onHideFormatToolbar={onHideFormatToolbar}
        uploadImage={uploadImage}
        onOpenDocument={onOpenDocument}
      />
    );
  }

  if (block.type === 'divider') {
    return (
      <div
        className={`flex items-center ${isInsideToggle ? 'py-2' : `${rootBlockShell} py-3`}`}
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
        <div className="flex-1 border-t border-slate-200" />
      </div>
    );
  }

  if (block.type === 'todo') {
    const checked = !!block.content?.checked;
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div
        className={`flex items-start gap-2 ${inlineRowPadding || rootBlockShell}`}
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
        <button type="button"
          className={`mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
            checked ? 'border-blue-500 bg-blue-500 text-white' : 'border-neutral-300 bg-white hover:border-blue-400'
          }`}
          onClick={() => onUpdate({ ...block.content, checked: !checked })}
        >
          {checked && <Check className="h-3 w-3" />}
        </button>
        <div className="relative min-w-0 flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: EMPTY_BLOCK_PLACEHOLDER,
            textClassName: `text-[16px] leading-7 ${checked ? 'text-slate-400 line-through' : 'text-slate-800'}`,
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('todo') : onEnter,
          })}
        </div>
        {renderSlashMenuPortal()}
      </div>
    );
  }

  if (block.type === 'heading') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className={`flex items-start ${isInsideToggle ? 'py-2' : rootBlockShell}`} style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="relative min-w-0 flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: '제목 1',
            textClassName: 'text-[30px] font-bold leading-tight text-slate-900',
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('text') : onEnter,
          })}
          {renderSlashMenuPortal()}
        </div>
      </div>
    );
  }

  if (block.type === 'heading2') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className={`flex items-start ${isInsideToggle ? 'py-1' : rootBlockShell}`} style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="relative min-w-0 flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: '제목 2',
            textClassName: 'text-[24px] font-bold leading-tight text-slate-900',
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('text') : onEnter,
          })}
          {renderSlashMenuPortal()}
        </div>
      </div>
    );
  }

  if (block.type === 'heading3') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className={`flex items-start ${isInsideToggle ? 'py-1' : rootBlockShell}`} style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="relative min-w-0 flex-1">
          {renderFormatToolbar()}
          {renderFormattedTextarea({
            text,
            placeholder: '제목 3',
            textClassName: 'text-[20px] font-semibold leading-tight text-slate-900',
            enterCreatesBlock: enterCreatesBlockBelow,
            onEditorEnter: enterCreatesBlockBelow ? () => onAddBelow('text') : onEnter,
          })}
          {renderSlashMenuPortal()}
        </div>
      </div>
    );
  }

  if (block.type === 'bulletList') {
    const rawText = typeof block.content?.text === 'string' ? block.content.text : '';
    const text = stripListItemMarkerPrefix(rawText);
    const bulletGlyph = bulletMarkerForLevel(listNestLevel).trim();
    return (
      <div style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className={`flex items-start gap-2 ${inlineRowPadding || rootBlockShell}`}>
          <span
            className={`mt-[2px] min-w-[1.25rem] shrink-0 text-center text-[16px] leading-7 select-none ${
              listNestLevel === 0 ? 'text-neutral-900' : 'text-slate-600'
            }`}
            aria-hidden
          >
            {bulletGlyph}
          </span>
          <div className="relative min-w-0 flex-1" data-note-list-text>
            {renderFormatToolbar()}
            {renderFormattedTextarea({
              text,
              placeholder: '글머리 목록',
              textClassName: 'text-[16px] leading-7 text-slate-800',
              enterCreatesBlock: enterCreatesBlockBelow,
              enterSplitOnMidBlock: enterCreatesBlockBelow,
              onEditorBackspace: handleListItemEmptyBackspace,
              onEditorEnter: enterCreatesBlockBelow
                ? (ctx) => handleListItemEnter('bulletList', ctx)
                : onEnter,
            })}
          </div>
        </div>
        {renderListChildBlocks()}
        {renderSlashMenuPortal()}
      </div>
    );
  }

  if (block.type === 'numberedList') {
    const rawText = typeof block.content?.text === 'string' ? block.content.text : '';
    const text = stripListItemMarkerPrefix(rawText);
    const displayNum = numberedListIndex
      ?? (typeof block.content?.number === 'number' ? block.content.number : 1);
    return (
      <div style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className={`flex items-start gap-2 ${inlineRowPadding || rootBlockShell}`}>
          <span className="mt-[2px] min-w-[1.25rem] shrink-0 text-right text-[16px] leading-7 text-slate-500 select-none" aria-hidden>
            {displayNum}.
          </span>
          <div className="relative min-w-0 flex-1" data-note-list-text>
            {renderFormatToolbar()}
            {renderFormattedTextarea({
              text,
              placeholder: '번호 목록',
              textClassName: 'text-[16px] leading-7 text-slate-800',
              enterCreatesBlock: enterCreatesBlockBelow,
              enterSplitOnMidBlock: enterCreatesBlockBelow,
              onEditorBackspace: handleListItemEmptyBackspace,
              onEditorEnter: enterCreatesBlockBelow
                ? (ctx) => handleListItemEnter('numberedList', ctx)
                : onEnter,
            })}
          </div>
        </div>
        {renderListChildBlocks()}
        {renderSlashMenuPortal()}
      </div>
    );
  }

  if (block.type === 'image') {
    const url = typeof block.content?.url === 'string' ? block.content.url : '';
    const caption = typeof block.content?.caption === 'string' ? block.content.caption : '';
    const fileInputRef = imgFileInputRef;

    const handleImageFile = async (file: File) => {
      if (!uploadImage) return;
      if (!file.type.startsWith('image/')) return;
      setImgUploading(true);
      try {
        const uploaded = await uploadImage(file);
        onUpdate({ ...block.content, url: uploaded });
      } finally {
        setImgUploading(false);
      }
    };

    if (!url) {
      return (
        <div
          className={`group relative overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
            imgDragOver ? 'border-blue-400 bg-blue-50' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
          }`}
          style={{ marginLeft: `${contentMarginLeft}px` }}
          onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
          onDragLeave={() => setImgDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setImgDragOver(false);
            const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
            if (file) await handleImageFile(file);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleImageFile(file);
              e.target.value = '';
            }}
          />

          {imgUploading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-[13px]">업로드 중…</span>
            </div>
          ) : showUrlInput ? (
            <div className="p-4">
              <p className="mb-2 text-[12px] font-medium text-neutral-500">이미지 URL</p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-[14px] outline-none focus:border-neutral-400"
                  placeholder="https://..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) syncContentPatch({ url: val });
                      setShowUrlInput(false);
                    }
                    if (e.key === 'Escape') setShowUrlInput(false);
                  }}
                />
                <button type="button" onClick={() => setShowUrlInput(false)} className="rounded-md px-3 py-2 text-[13px] text-neutral-400 hover:bg-neutral-100">취소</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
                <ImageIcon className="h-5 w-5 text-neutral-500" />
              </div>
              <p className="text-[14px] font-medium text-neutral-600">이미지 추가</p>
              <p className="text-[12px] text-neutral-400">드래그하거나 클릭해서 업로드</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800"
                >
                  파일 선택
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  URL 입력
                </button>
              </div>
            </div>
          )}

        </div>
      );
    }

    return (
      <div
        className="group relative"
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
        <div
          className="relative overflow-hidden rounded-lg bg-neutral-100"
          onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
          onDragLeave={() => setImgDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setImgDragOver(false);
            const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
            if (file) await handleImageFile(file);
          }}
        >
          <img
            src={url}
            alt={caption || ''}
            className="w-full cursor-zoom-in object-contain"
            onClick={(e) => {
              e.stopPropagation();
              imageLightbox?.open(url, caption || undefined);
            }}
          />
          {imgDragOver && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-blue-500/20 text-[14px] font-medium text-blue-700">
              이미지 교체
            </div>
          )}
          {imgUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
          )}
          {/* hover 오버레이 */}
          <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleImageFile(f); e.target.value = ''; }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-md bg-white/90 px-2.5 py-1.5 text-[12px] font-medium text-neutral-600 shadow-sm hover:bg-white">
              교체
            </button>
          </div>
        </div>
        {/* 캡션 */}
        <input
          value={caption}
          onChange={(e) => syncContentPatch({ caption: e.target.value })}
          placeholder="캡션 추가"
          className="mt-1.5 w-full bg-transparent text-center text-[13px] text-neutral-400 outline-none placeholder:text-neutral-300 focus:text-neutral-600"
        />
      </div>
    );
  }

  if (block.type === 'video') {
    const url = typeof block.content?.url === 'string' ? block.content.url : '';
    const embed = resolveVideoEmbedContent(block.content);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-2 flex items-center gap-2">
          <Video className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white"
            placeholder="YouTube 또는 Vimeo URL을 붙여넣으세요"
            value={url}
            onChange={(e) => {
              const base = (useNoteBlockStore.getState().getBlock(block.id)?.content
                ?? block.content
                ?? {}) as Record<string, unknown>;
              const next = { ...base, ...buildVideoBlockContentFromUrl(e.target.value) };
              onUpdate(next);
            }}
          />
        </div>
        {embed ? (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-slate-400">
              {videoProviderLabel(embed.provider)} 임베드
            </p>
            <VideoEmbedFrame embedUrl={embed.embedUrl} title={`${videoProviderLabel(embed.provider)} 영상`} />
          </div>
        ) : url.trim() ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            YouTube 또는 Vimeo 링크만 지원합니다.
          </p>
        ) : null}
      </div>
    );
  }

  if (block.type === 'page') {
    const pageId = typeof block.content?.page_document_id === 'string' ? block.content.page_document_id : '';
    const title =
      (typeof block.content?.title === 'string' && block.content.title.trim())
        ? block.content.title
        : '제목 없음';
    const pageIcon = pageId && resolvePageIcon ? resolvePageIcon(pageId) : null;
    const openPage = () => { if (pageId) onOpenDocument?.(pageId); };
    return (
      <BlockInsideDropSurface
        blockId={block.id}
        insideInset="page"
        disabled={!isBlockDragActive || !!isDragging || !pageId}
        style={{ marginLeft: `${contentMarginLeft}px` }}
      >
        <button
          ref={pageBtnRef}
          type="button"
          tabIndex={0}
          title="클릭하여 페이지 열기"
          className={`flex w-full min-w-0 items-center gap-2 rounded-sm py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 ${
            isInsideToggle
              ? 'text-[16px] text-neutral-800 hover:bg-neutral-50/90'
              : 'text-[16px] text-neutral-800 hover:bg-neutral-50'
          }`}
          onClick={(e) => {
            e.preventDefault();
            openPage();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              openPage();
              return;
            }
            if (e.key === ' ' && isFocused) {
              e.preventDefault();
              openPage();
            }
          }}
        >
          <DocIconGlyph
            icon={pageIcon}
            fallbackClassName="h-[18px] w-[18px] shrink-0 text-neutral-400"
            emojiClassName="shrink-0 text-[17px] leading-none"
          />
          <span className="min-w-0 truncate underline-offset-2 hover:underline">{title}</span>
        </button>
      </BlockInsideDropSurface>
    );
  }

  if (block.type === 'callout') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    const icon = typeof block.content?.icon === 'string' && block.content.icon.trim() ? block.content.icon : '💡';
    return (
      <div className="relative rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2" style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="mb-1 flex items-center gap-2">
          <input
            value={icon}
            onChange={(e) => syncContentPatch({ icon: e.target.value.slice(0, 2) })}
            className="w-10 rounded border border-amber-200 bg-white px-1 text-center text-sm"
          />
          <span className="flex-1 text-xs font-semibold text-amber-700">콜아웃</span>
        </div>
        {renderFormatToolbar()}
        {renderFormattedTextarea({
          text,
          placeholder: '강조 메시지를 입력하세요 (/ 로 블록 변환)',
          textClassName: 'text-[15px] leading-7 text-slate-800',
        })}
        {renderSlashMenuPortal()}
      </div>
    );
  }

  if (block.type === 'code') {
    const text = typeof block.content?.text === 'string' ? block.content.text : '';
    return (
      <div className="relative rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 shadow-sm" style={{ marginLeft: `${contentMarginLeft}px` }}>
        <div className="mb-2 flex items-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Code</span>
        </div>
        {renderFormattedTextarea({
          text,
          placeholder: '코드를 입력하세요 (/ 로 블록 변환)',
          textClassName: 'font-mono text-[13px] leading-6 text-slate-100',
          tabBehavior: 'block-indent',
        })}
        {renderSlashMenuPortal()}
      </div>
    );
  }

  if (block.type === 'toggle') {
    const title = typeof block.content?.title === 'string'
      ? block.content.title
      : (typeof block.content?.text === 'string' ? block.content.text : '');
    const { text: body } = resolveToggleBodyForDisplay(block.content);
    const collapsed = !!block.content?.collapsed;
    const showToggleContent = !collapsed && !isDragging;
    const rawIm = block.content?.images;
    const toggleImages = Array.isArray(rawIm)
      ? rawIm.map((u) => (typeof u === 'string' ? u : ''))
      : [];
    const isThisToggleFocused = focusedToggleId === block.id;
    const patchToggle = syncContentPatch;
    const showToggleBody = childBlocks.length === 0
      && (
        body.trim().length > 0
        || (activeEditor?.blockId === block.id && activeEditor.field === 'body')
      );
    const toggleChildIndentPx = toggleNestPaddingPx(toggleNestDepth + 1);
    const hasInlineToggleChildren = !omitExternalizedChildren && childBlocks.length > 0;
    const showToggleEmptySlot = !showToggleBody && !!onAddChildBelow && childBlocks.length === 0;
    const showToggleExtrasWrapper = showToggleContent
      && (showToggleBody || hasInlineToggleChildren || showToggleEmptySlot);

    return (
      <div
        className={`relative overflow-visible py-0.5 ${
          isDropTarget
            ? DROP_TARGET_ROW
            : !isInsideToggle && isThisToggleFocused
              ? 'rounded-sm bg-neutral-50/60'
              : ''
        }`}
        style={isInsideToggle ? undefined : { marginLeft: `${contentMarginLeft}px` }}
      >
        <BlockInsideDropSurface
          blockId={block.id}
          disabled={!isBlockDragActive || !!isDragging}
          className="flex min-h-[30px] w-full cursor-text items-center gap-1"
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button')) return;
            if (target === e.currentTarget) {
              e.preventDefault();
              toggleTitleInputRef.current?.focus();
              onTrackActiveBlock?.('title');
            }
          }}
        >
          <ToggleDisclosureButton
            collapsed={collapsed}
            onClick={(e) => {
              e.stopPropagation();
              patchToggle({ collapsed: !collapsed });
            }}
          />
          <input
            ref={toggleTitleInputRef}
            data-toggle-title
            value={title}
            onChange={(e) => patchToggle({ title: e.target.value })}
            onFocus={() => onTrackActiveBlock?.('title')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (collapsed) {
                  onAddBelow('toggle');
                } else {
                  onAddChildBelow?.('text');
                }
                return;
              }
              if (e.key === 'Tab' && onIndentChange) {
                e.preventDefault();
                onIndentChange(e.shiftKey ? 'out' : 'in');
              }
              if (e.key === 'Escape' && toggleTitleSlashActive) {
                e.preventDefault();
                patchToggle({ title: '' });
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[16px] font-normal leading-7 text-neutral-800 outline-none placeholder:text-neutral-400"
            placeholder="토글 (/ 로 변환)"
          />
        </BlockInsideDropSurface>
        {showToggleExtrasWrapper && (
          <div
            className="overflow-visible"
            style={toggleChildIndentPx > 0 ? { paddingLeft: toggleChildIndentPx } : undefined}
          >
            {showToggleBody && (
              <>
                {renderFormatToolbar()}
                {renderFormattedTextarea({
                  text: body,
                  placeholder: '',
                  textClassName: 'text-[16px] leading-[1.7] text-slate-800',
                  field: 'body',
                  tabBehavior: 'insert-text-indent',
                  enterCreatesBlock: false,
                  onEditorBackspace: false,
                })}
              </>
            )}
            {hasInlineToggleChildren ? (
              <div className="note-block-children space-y-0 overflow-visible">
                {childBlocks.map((child) => (
                  <Fragment key={child.id}>
                    {renderChildBlock?.(child, toggleNestDepth + 1)}
                  </Fragment>
                ))}
              </div>
            ) : showToggleEmptySlot ? (
              <div
                className="min-h-[30px] cursor-text py-0.5"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddChildBelow('text');
                }}
              >
                <span className="text-[16px] leading-[1.7] text-neutral-400">
                  {EMPTY_BLOCK_PLACEHOLDER}
                </span>
              </div>
            ) : null}
            {renderSlashMenuPortal()}
            {toggleImages.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">토글 안 이미지</p>
                {toggleImages.map((url, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                    <div className="mb-1 flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <input
                        className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-[13px] text-slate-700 outline-none focus:border-blue-400"
                        placeholder="이미지 URL"
                        value={url}
                        onChange={(e) => {
                          const next = [...toggleImages];
                          next[idx] = e.target.value;
                          patchToggle({ images: next });
                        }}
                      />
                      <button
                        type="button"
                        className="shrink-0 rounded p-1 text-slate-400 hover:text-rose-500"
                        title="이미지 제거"
                        onClick={() => patchToggle({ images: toggleImages.filter((_, j) => j !== idx) })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {url.trim() ? (
                      <div className="overflow-hidden rounded-md bg-white">
                        { }
                        <img
                          src={url.trim()}
                          alt=""
                          className="max-h-56 w-full cursor-zoom-in object-contain"
                          onClick={() => imageLightbox?.open(url.trim())}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <SlashMenuFixed
          show={toggleTitleSlashActive}
          anchor={toggleTitleSlashAnchor}
          commands={BLOCK_TYPES}
          query={toggleTitleSlashQuery}
          title="토글 제목"
          onSelect={(type) => { onChangeType(type); }}
          onClose={() => { patchToggle({ title: '' }); }}
        />
      </div>
    );
  }

  // text (default)
  const text = typeof block.content?.text === 'string' ? block.content.text : '';
  return (
    <div
      className={`flex min-h-[30px] items-start ${inlineRowPadding || rootBlockShell}`}
      style={{ marginLeft: `${contentMarginLeft}px` }}
    >
      {renderFormattedTextarea({
        text,
        placeholder: EMPTY_BLOCK_PLACEHOLDER,
        textClassName: 'text-[16px] leading-[1.7] text-slate-800',
        enterCreatesBlock: enterCreatesBlockBelow,
        onEditorEnter: enterCreatesBlockBelow ? onEnter : undefined,
      })}
      {renderSlashMenuPortal()}
    </div>
  );
}

/* ─── BlockRowGutter (+ · 드래그 — 줄 호버 시에만) ───────────────────────── */
function BlockRowGutter({
  blockId,
  blockType,
  nestDepth = 1,
  onAddBelow,
  onGripClick,
  gripBtnRef,
  dragAttributes,
  dragListeners,
  onPickerOpenChange,
}: {
  blockId: string;
  blockType: NoteBlock['type'];
  nestDepth?: number;
  onAddBelow: (type: NoteBlock['type']) => void;
  onGripClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  gripBtnRef: React.RefObject<HTMLButtonElement | null>;
  dragAttributes: DraggableAttributes;
  dragListeners: DraggableSyntheticListeners;
  onPickerOpenChange?: (open: boolean) => void;
}) {
  const gutterTop = blockGutterTopPx(blockType);
  const gutterCentered = gutterTop === 'center';
  const [addPickerAnchor, setAddPickerAnchor] = useState<{ top: number; left: number } | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const setPickerOpen = (open: boolean, anchor: { top: number; left: number } | null = null) => {
    setAddPickerAnchor(anchor);
    onPickerOpenChange?.(open);
  };

  return (
    <>
      <div
        className={`note-block-gutter absolute z-10 flex h-6 items-center gap-0.5 transition-none ${
          gutterCentered ? 'top-1/2 -translate-y-1/2' : ''
        }`}
        style={{
          left: blockHandleLeftPx(nestDepth),
          ...(gutterCentered ? {} : { top: gutterTop }),
        }}
      >
        <button
          ref={addBtnRef}
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="아래에 블록 추가"
          title="아래에 블록 추가"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (addPickerAnchor) {
              setPickerOpen(false);
              return;
            }
            const rect = addBtnRef.current!.getBoundingClientRect();
            setPickerOpen(true, { top: rect.bottom + 4, left: rect.left });
          }}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          ref={gripBtnRef}
          type="button"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 active:cursor-grabbing"
          aria-label="메뉴 · 드래그"
          title="클릭: 복제·변환·삭제 · 드래그: 이동"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onGripClick}
          {...dragAttributes}
          {...dragListeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      {addPickerAnchor && (
        <div className="fixed z-[10000]" style={{ top: addPickerAnchor.top, left: addPickerAnchor.left }}>
          <BlockPickerMenu
            commands={BLOCK_TYPES}
            onSelect={(type) => {
              onAddBelow(type);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      )}
    </>
  );
}


/** 블록 위/아래에 노션처럼 삽입선을 보여주는 컴포넌트 */
function DropInsertLine({ position }: { position: 'top' | 'bottom' }) {
  const top = position === 'top';
  return (
    <div
      className={`pointer-events-none absolute left-[-2px] right-0 z-30 flex items-center ${
        top ? 'top-0' : 'bottom-0'
      }`}
    >
      <div className="h-[6px] w-[6px] shrink-0 rounded-full border-2 border-blue-500 bg-white" />
      <div className="h-[2px] flex-1 bg-blue-500" />
    </div>
  );
}

/** 토글 안으로 드롭 시 파란 배경 표시 */
/* ─── SortableBlockRow ───────────────────────────────────────────────────── */
function SortableBlockRow({
  block,
  onUpdate,
  onContentSync,
  onDelete,
  onChangeType,
  onEnter,
  onAddBelow,
  onOpenDocument,
  resolvePageIcon,
  onShowFormatToolbar,
  onHideFormatToolbar,
  onMultilinePaste,
  autoFocusSignal,
  onEmptyBackspace,
  onMergeWithPrevious,
  canMergeWithPrevious,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  focusedToggleId,
  onFocusToggle,
  uploadImage,
  isDropTarget,
  childBlocks,
  renderChildBlock,
  onAddChildBelow,
  onTrackActiveBlock,
  onDuplicate,
  onCopyBlockLink,
  onRecordBlockUndo,
  isFocused = false,
  mergeFocusCaretOffset,
  onRequestCaretOffset,
  onFocusBlock,
  autoFocusTitleSignal = 0,
  numberedListIndex,
  bulletListNestLevel = 0,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onContentSync?: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onOpenDocument?: (documentId: string) => void;
  resolvePageIcon?: (documentId: string) => string | null;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
  ) => void;
  onHideFormatToolbar?: () => void;
  onMultilinePaste?: (lines: string[]) => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onMergeWithPrevious?: () => void;
  canMergeWithPrevious?: () => boolean;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  focusedToggleId?: string | null;
  onFocusToggle?: (blockId: string | null) => void;
  uploadImage?: (file: File) => Promise<string>;
  isDropTarget?: boolean;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onDuplicate?: () => void;
  onCopyBlockLink?: () => void;
  onRecordBlockUndo?: () => void;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  onRequestCaretOffset?: (offset: number) => void;
  onFocusBlock?: () => void;
  autoFocusTitleSignal?: number;
  numberedListIndex?: number;
  bulletListNestLevel?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({
    id: block.id,
    data: { type: 'block' },
    animateLayoutChanges: () => false,
  });
  const isListSibling = block.type === 'bulletList' || block.type === 'numberedList';
  const blockTypeLabel = BLOCK_TYPES.find((t) => t.type === block.type)?.label ?? block.type;
  const [handleMenuAnchor, setHandleMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const gripBtnRef = useRef<HTMLButtonElement>(null);
  const gutterPinned = !!handleMenuAnchor || addPickerOpen;
  const dropTarget = useBlockDropTarget();
  const dropPos = dropTarget?.blockId === block.id ? dropTarget.position : null;
  const isDragActive = useBlockDragActive();
  const selectedBlockIds = useSelectedBlockIds();
  const onBlockSelect = useOnBlockSelect();
  const suppressGripMenuRef = useSuppressGripMenuRef();
  const isSelected = selectedBlockIds.has(block.id);

  const sharedBlockContentProps = {
    block,
    onUpdate,
    onContentSync,
    onDelete,
    onChangeType,
    onEnter,
    onAddBelow,
    onOpenDocument,
    resolvePageIcon,
    onShowFormatToolbar,
    onHideFormatToolbar,
    onMultilinePaste,
    autoFocusSignal,
    onEmptyBackspace,
    onMergeWithPrevious,
    canMergeWithPrevious,
    onIndentChange,
    onNavigatePrevious,
    onNavigateNext,
    isDragging,
    focusedToggleId,
    uploadImage,
    childBlocks,
    renderChildBlock,
    onAddChildBelow,
    onTrackActiveBlock,
    isInsideToggle: false as const,
    isDropTarget,
    isFocused,
    mergeFocusCaretOffset,
    onRequestCaretOffset,
    toggleNestDepth: 1,
    onFocusBlock,
    autoFocusTitleSignal,
    numberedListIndex,
    bulletListNestLevel,
    omitExternalizedChildren: blockExternalizesChildren(block.type),
  };

  const blockContentNode = <BlockContent {...sharedBlockContentProps} />;

  const toggleCollapsed = block.type === 'toggle' && !!block.content?.collapsed;
  const toggleExpanded = block.type === 'toggle' && !toggleCollapsed && !isDragging;
  const showExternalChildren =
    !isDragging
    && childBlocks
    && childBlocks.length > 0
    && renderChildBlock
    && (toggleExpanded || block.type === 'bulletList' || block.type === 'numberedList');

  const style: React.CSSProperties | undefined = isDragging
    ? { opacity: 0, zIndex: 10 }
    : isSelected && isDragActive && selectedBlockIds.size > 1
      ? { opacity: 0.4 }
      : undefined;

  return (
    <>
    <div
      ref={setNodeRef}
      data-note-block-row
      data-block-id={block.id}
      data-parent-block-id={block.parent_block_id ?? ''}
      data-list-sibling={isListSibling ? 'true' : undefined}
      data-nest-depth="1"
      style={style}
      data-gutter-pinned={gutterPinned ? '' : undefined}
      onMouseEnter={noteBlockRowMouseEnter}
      onMouseLeave={noteBlockRowMouseLeave}
      onPointerDown={(e) => focusNoteBlockRowFromChrome(e, block.id, onFocusBlock)}
      className={`relative overflow-visible py-0.5 transition-colors ${blockRowBgClass(block.content)} ${
        isSelected ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-200'
          : dropPos === 'inside' && (block.type === 'toggle' || block.type === 'page') ? DROP_INSIDE_BLOCK_ROW
          : !block.content?.blockColor ? 'hover:bg-neutral-50/60' : ''
      }`}
    >
      <div
        className={NOTE_BLOCK_HOVER_BRIDGE}
        aria-hidden
      />
      {dropPos === 'before' && <DropInsertLine position="top" />}
      {dropPos === 'after' && <DropInsertLine position="bottom" />}
      <BlockRowGutter
        blockId={block.id}
        blockType={block.type}
        nestDepth={1}
        onAddBelow={(type) => onAddBelow(type)}
        gripBtnRef={gripBtnRef}
        dragAttributes={attributes}
        dragListeners={listeners}
        onPickerOpenChange={setAddPickerOpen}
        onGripClick={(e) => {
          e.stopPropagation();
          if (isDragActive) return;
          if (suppressGripMenuRef.current) {
            suppressGripMenuRef.current = false;
            return;
          }
          if ((e.ctrlKey || e.metaKey || e.shiftKey) && onBlockSelect) {
            onBlockSelect(block.id, e);
            return;
          }
          if (handleMenuAnchor) { setHandleMenuAnchor(null); return; }
          const rect = gripBtnRef.current!.getBoundingClientRect();
          setHandleMenuAnchor({ top: rect.bottom + 4, left: rect.left });
        }}
      />

      <div className="note-block-row-cv min-w-0">
        {blockContentNode}
      </div>

      {handleMenuAnchor && (
        <div
          className="fixed z-[9999]"
          style={{ top: handleMenuAnchor.top, left: handleMenuAnchor.left }}
        >
          <BlockHandleMenu
            blockTypeLabel={blockTypeLabel}
            blockType={block.type}
            commands={BLOCK_TYPES}
            currentBlockColor={readBlockColor(block.content)}
            onDuplicate={() => onDuplicate?.()}
            onDelete={onDelete}
            onTurnInto={(type) => onChangeType(type)}
            onCopyBlockLink={onCopyBlockLink}
            onColorChange={(colorId) => {
              onRecordBlockUndo?.();
              const next = { ...(block.content ?? {}) } as Record<string, unknown>;
              if (colorId === 'default') delete next.blockColor;
              else next.blockColor = colorId;
              onUpdate(next);
            }}
            onClose={() => setHandleMenuAnchor(null)}
          />
        </div>
      )}
    </div>
    {showExternalChildren && (
      childBlocks.map((child) => (
        <Fragment key={child.id}>
          {renderChildBlock(child, 2)}
        </Fragment>
      ))
    )}
    </>
  );
}

/* ─── ToggleInlineRow (토글 안 — 블록 UI 없이 인라인) ─────────────────────── */
function ToggleInlineRow({
  block,
  onUpdate,
  onContentSync,
  onDelete,
  onChangeType,
  onEnter,
  onAddBelow,
  onOpenDocument,
  resolvePageIcon,
  onShowFormatToolbar,
  onHideFormatToolbar,
  onMultilinePaste,
  autoFocusSignal,
  onEmptyBackspace,
  onMergeWithPrevious,
  canMergeWithPrevious,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  focusedToggleId,
  onFocusToggle,
  uploadImage,
  isDropTarget,
  childBlocks,
  renderChildBlock,
  onTrackActiveBlock,
  onDuplicate,
  onCopyBlockLink,
  onRecordBlockUndo,
  isFocused = false,
  mergeFocusCaretOffset,
  onRequestCaretOffset,
  nestDepth = 1,
  onFocusBlock,
  onAddChildBelow,
  autoFocusTitleSignal = 0,
  numberedListIndex,
  bulletListNestLevel = 0,
}: {
  block: NoteBlock;
  onUpdate: (content: any) => void;
  onContentSync?: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onOpenDocument?: (documentId: string) => void;
  resolvePageIcon?: (documentId: string) => string | null;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
  ) => void;
  onHideFormatToolbar?: () => void;
  onMultilinePaste?: (lines: string[]) => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onMergeWithPrevious?: () => void;
  canMergeWithPrevious?: () => boolean;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  focusedToggleId?: string | null;
  onFocusToggle?: (blockId: string | null) => void;
  uploadImage?: (file: File) => Promise<string>;
  isDropTarget?: boolean;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onDuplicate?: () => void;
  onCopyBlockLink?: () => void;
  onRecordBlockUndo?: () => void;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  onRequestCaretOffset?: (offset: number) => void;
  nestDepth?: number;
  onFocusBlock?: () => void;
  onAddChildBelow?: (type?: NoteBlock['type']) => void;
  autoFocusTitleSignal?: number;
  numberedListIndex?: number;
  bulletListNestLevel?: number;
}) {
  const isListSibling = block.type === 'bulletList' || block.type === 'numberedList';
  const blockTypeLabel = BLOCK_TYPES.find((t) => t.type === block.type)?.label ?? block.type;
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({
    id: block.id,
    data: { type: 'block' },
    animateLayoutChanges: () => false,
  });

  const isDragActive = useBlockDragActive();
  const selectedBlockIds = useSelectedBlockIds();
  const onBlockSelect = useOnBlockSelect();
  const suppressGripMenuRef = useSuppressGripMenuRef();
  const isSelected = selectedBlockIds.has(block.id);

  const menuShiftLeft = toggleMenuAnchorOffset(nestDepth);
  const menuZIndex = 10000 + nestDepth;
  const rowIndentPx = toggleNestPaddingPx(nestDepth);

  const [inlineHandleMenuAnchor, setInlineHandleMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const inlineGripBtnRef = useRef<HTMLButtonElement>(null);
  const gutterPinned = !!inlineHandleMenuAnchor || addPickerOpen;
  const dropTarget = useBlockDropTarget();
  const dropPos = dropTarget?.blockId === block.id ? dropTarget.position : null;

  const style: React.CSSProperties = {
    ...(isDragging
      ? { opacity: 0, zIndex: 10 + nestDepth }
      : isSelected && isDragActive && selectedBlockIds.size > 1
        ? { opacity: 0.4 }
        : {}),
    ...(rowIndentPx > 0 ? { paddingLeft: rowIndentPx } : {}),
  };

  const toggleCollapsed = block.type === 'toggle' && !!block.content?.collapsed;
  const toggleExpanded = block.type === 'toggle' && !toggleCollapsed && !isDragging;
  const showExternalChildren =
    !isDragging
    && childBlocks
    && childBlocks.length > 0
    && renderChildBlock
    && (toggleExpanded || block.type === 'bulletList' || block.type === 'numberedList');

  const inlineBlockContentProps = {
    block,
    onUpdate,
    onContentSync,
    onDelete,
    onChangeType,
    onEnter,
    onAddBelow,
    onOpenDocument,
    resolvePageIcon,
    onShowFormatToolbar,
    onHideFormatToolbar,
    onMultilinePaste,
    autoFocusSignal,
    onEmptyBackspace,
    onMergeWithPrevious,
    canMergeWithPrevious,
    onIndentChange,
    onNavigatePrevious,
    onNavigateNext,
    isDragging,
    focusedToggleId,
    uploadImage,
    childBlocks,
    renderChildBlock:
      block.type === 'toggle' || block.type === 'bulletList' || block.type === 'numberedList'
        ? renderChildBlock
        : undefined,
    onAddChildBelow,
    onTrackActiveBlock,
    isInsideToggle: true as const,
    isDropTarget,
    isFocused,
    mergeFocusCaretOffset,
    onRequestCaretOffset,
    toggleNestDepth: nestDepth,
    onFocusBlock,
    autoFocusTitleSignal,
    numberedListIndex,
    bulletListNestLevel,
    omitExternalizedChildren: blockExternalizesChildren(block.type),
  };

  return (
    <>
    <div
      ref={setNodeRef}
      data-note-block-row
      data-block-id={block.id}
      data-parent-block-id={block.parent_block_id ?? ''}
      data-list-sibling={isListSibling ? 'true' : undefined}
      data-nest-depth={String(nestDepth)}
      style={style}
      data-gutter-pinned={gutterPinned ? '' : undefined}
      onMouseEnter={noteBlockRowMouseEnter}
      onMouseLeave={noteBlockRowMouseLeave}
      onPointerDown={(e) => focusNoteBlockRowFromChrome(e, block.id, onFocusBlock)}
      className={`relative overflow-visible py-0.5 transition-colors ${blockRowBgClass(block.content)} ${
        isSelected ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-200'
          : dropPos === 'inside' && (block.type === 'toggle' || block.type === 'page') ? DROP_INSIDE_BLOCK_ROW
          : !block.content?.blockColor ? 'hover:bg-neutral-50/60' : ''
      }`}
    >
      <div
        className={NOTE_BLOCK_HOVER_BRIDGE}
        aria-hidden
      />
      {dropPos === 'before' && <DropInsertLine position="top" />}
      {dropPos === 'after' && <DropInsertLine position="bottom" />}
      <BlockRowGutter
        blockId={block.id}
        blockType={block.type}
        nestDepth={nestDepth}
        onAddBelow={(type) => onAddBelow(type)}
        gripBtnRef={inlineGripBtnRef}
        dragAttributes={attributes}
        dragListeners={listeners}
        onPickerOpenChange={setAddPickerOpen}
        onGripClick={(e) => {
          e.stopPropagation();
          if (isDragActive) return;
          if (suppressGripMenuRef.current) {
            suppressGripMenuRef.current = false;
            return;
          }
          if ((e.ctrlKey || e.metaKey || e.shiftKey) && onBlockSelect) {
            onBlockSelect(block.id, e);
            return;
          }
          if (inlineHandleMenuAnchor) { setInlineHandleMenuAnchor(null); return; }
          const rect = inlineGripBtnRef.current!.getBoundingClientRect();
          setInlineHandleMenuAnchor({
            top: rect.bottom + 8,
            left: rect.left - menuShiftLeft,
          });
        }}
      />
      {inlineHandleMenuAnchor && (
        <div className="fixed" style={{ top: inlineHandleMenuAnchor.top, left: inlineHandleMenuAnchor.left, zIndex: menuZIndex }}>
          <BlockHandleMenu
            blockTypeLabel={blockTypeLabel}
            blockType={block.type}
            commands={BLOCK_TYPES}
            currentBlockColor={readBlockColor(block.content)}
            onDuplicate={() => onDuplicate?.()}
            onDelete={onDelete}
            onTurnInto={(type) => onChangeType(type)}
            onCopyBlockLink={onCopyBlockLink}
            onColorChange={(colorId) => {
              onRecordBlockUndo?.();
              const next = { ...(block.content ?? {}) } as Record<string, unknown>;
              if (colorId === 'default') delete next.blockColor;
              else next.blockColor = colorId;
              onUpdate(next);
            }}
            onClose={() => setInlineHandleMenuAnchor(null)}
          />
        </div>
      )}
      <div className="note-block-row-cv min-w-0">
        <BlockContent {...inlineBlockContentProps} />
      </div>
    </div>
    {showExternalChildren && (
      childBlocks.map((child) => (
        <Fragment key={child.id}>
          {renderChildBlock(child, nestDepth + 1)}
        </Fragment>
      ))
    )}
    </>
  );
}

function areSortableBlockRowPropsEqual(
  prev: React.ComponentProps<typeof SortableBlockRow>,
  next: React.ComponentProps<typeof SortableBlockRow>,
): boolean {
  if (prev.block !== next.block) {
    if (prev.block.id !== next.block.id) return false;
    if (prev.block.type !== next.block.type) return false;
    if (prev.block.order_index !== next.block.order_index) return false;
    if (prev.block.parent_block_id !== next.block.parent_block_id) return false;
    if (prev.block.content !== next.block.content) return false;
  }
  if (prev.isFocused !== next.isFocused) return false;
  if (prev.autoFocusSignal !== next.autoFocusSignal) return false;
  if (prev.autoFocusTitleSignal !== next.autoFocusTitleSignal) return false;
  if (prev.mergeFocusCaretOffset !== next.mergeFocusCaretOffset) return false;
  if (prev.isDropTarget !== next.isDropTarget) return false;
  if (prev.numberedListIndex !== next.numberedListIndex) return false;
  if (prev.bulletListNestLevel !== next.bulletListNestLevel) return false;
  if (prev.childBlocks !== next.childBlocks) return false;
  if (prev.focusedToggleId !== next.focusedToggleId) return false;
  return true;
}

function areToggleInlineRowPropsEqual(
  prev: React.ComponentProps<typeof ToggleInlineRow>,
  next: React.ComponentProps<typeof ToggleInlineRow>,
): boolean {
  if (!areSortableBlockRowPropsEqual(prev, next)) return false;
  if (prev.nestDepth !== next.nestDepth) return false;
  return true;
}

export const MemoSortableBlockRow = memo(SortableBlockRow, areSortableBlockRowPropsEqual);
export const MemoToggleInlineRow = memo(ToggleInlineRow, areToggleInlineRowPropsEqual);

/* ─── DragPreview ────────────────────────────────────────────────────────── */
export function DragPreview({ block }: { block: NoteBlock }) {
  const text =
    block.type === 'divider' ? '── 구분선 ──'
    : block.type === 'image' ? '🖼 이미지'
    : block.type === 'video' ? '▶ 영상'
    : block.type === 'table' ? '📊 표'
    : block.type === 'toggle'
      ? ((block.content?.title as string) || '(토글)')
    : (block.content?.text as string) || '';

  return (
    <div className="flex max-w-[520px] items-center gap-2 rounded-md bg-white/95 px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06]">
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
      <span className="truncate text-[15px] text-neutral-700">{text || '(빈 블록)'}</span>
    </div>
  );
}