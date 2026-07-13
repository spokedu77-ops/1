'use client';

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import {
  GripVertical,
  Plus,
  Video,
} from 'lucide-react';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import type { PastedBlockSpec } from '../../_lib/notePasteBlocks';
import { NoteTableBlock } from './NoteTableBlock';
import { NoteTodoBlock } from './NoteTodoBlock';
import { NoteToggleBlock } from './NoteToggleBlock';
import { NoteHeadingBlock, isHeadingBlockType } from './NoteHeadingBlock';
import { NoteListBlock } from './NoteListBlock';
import { NoteCalloutBlock } from './NoteCalloutBlock';
import { NoteQuoteBlock } from './NoteQuoteBlock';
import { NoteCodeBlock } from './NoteCodeBlock';
import { NoteColumnListBlock } from './NoteColumnListBlock';
import { NoteImageBlock } from './NoteImageBlock';
import { NoteChromeBlockShell } from './NoteChromeBlockShell';
import { NoteBlockFormattedField } from './NoteBlockFormattedField';
import { useBlockContentPatch } from './useBlockContentPatch';
import { useBlockLiveContent } from './useBlockLiveContent';
import { getMergedBlockContentBase } from '../../_lib/noteBlockContentResolve';
import type { NoteEditorEnterContext } from '../NoteEditor';
import { createInlineBlockEnterHandler } from '../../_lib/noteInlineBlockEnter';
import { handleNotionPageBlockKeyDown } from '../../_lib/noteNotionBlockBehavior';
import { useNoteImageLightbox } from '../NoteImageLightbox';
import { SlashMenuFixed, BlockPickerMenu, BlockHandleMenu } from '../SlashMenu';
import { VideoEmbedFrame } from '../VideoEmbedFrame';
import {
  BlockInsideDropSurface,
} from '../sidebar/NoteDocChrome';
import {
  buildVideoBlockContentFromUrl,
  resolveVideoEmbedContent,
  videoEmbedPlaceholder,
  videoEmbedUnsupportedMessage,
  videoProviderLabel,
} from '@/app/lib/note/videoEmbed';
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
import { filterTurnIntoCommands } from '../../_lib/noteBlockTypeChange';
import {
  blockExternalizesChildren,
  blockRowBgClass,
  DROP_INSIDE_BLOCK_ROW,
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
  onContentPatch,
  onDelete,
  onChangeType,
  onEnter,
  onAddBelow,
  onSplitWithChildren,
  onOpenDocument,
  resolvePageIcon,
  onShowFormatToolbar,
  onHideFormatToolbar,
  onMultilinePaste,
  autoFocusSignal,
  onEmptyBackspace,
  onBackspaceAtBlockStart,
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
  onFocusBlockById,
  autoFocusTitleSignal = 0,
  numberedListIndex,
  bulletListNestLevel = 0,
  omitExternalizedChildren = false,
  lookupChildBlocks,
  onAddChildInColumn,
}: {
  block: NoteBlock;
  onContentPatch: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onSplitWithChildren?: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onOpenDocument?: (documentId: string) => void;
  resolvePageIcon?: (documentId: string) => string | null;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
    editLink?: () => void,
  ) => void;
  onHideFormatToolbar?: () => void;
  onMultilinePaste?: (specs: PastedBlockSpec[]) => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onBackspaceAtBlockStart?: () => boolean;
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
  onAddChildBelow?: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  isInsideToggle?: boolean;
  toggleNestDepth?: number;
  isDropTarget?: boolean;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  onRequestCaretOffset?: (offset: number) => void;
  onFocusBlock?: () => void;
  onFocusBlockById?: (blockId: string, part?: 'title' | 'editor', caretOffset?: number) => void;
  autoFocusTitleSignal?: number;
  numberedListIndex?: number;
  bulletListNestLevel?: number;
  omitExternalizedChildren?: boolean;
  lookupChildBlocks?: (parentId: string) => NoteBlock[];
  onAddChildInColumn?: (columnId: string, type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
}) {
  const isBlockDragActive = useBlockDragActive();
  const liveContent = useBlockLiveContent(block);
  const imageLightbox = useNoteImageLightbox();
  const [showSlash, setShowSlash] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const slashHostRef = useRef<HTMLDivElement>(null);
  const [slashAnchor, setSlashAnchor] = useState<{ top: number; left: number } | null>(null);
  const [imgDragOver, setImgDragOver] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const imgFileInputRef = useRef<HTMLInputElement>(null);
  const pageBtnRef = useRef<HTMLButtonElement>(null);

  const patchContent = useBlockContentPatch(block, onContentPatch);

  useEffect(() => {
    if (block.type !== 'page' || !isFocused) return;
    pageBtnRef.current?.focus();
  }, [block.type, isFocused, autoFocusSignal]);

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

  const slashCommands = useMemo(
    () => filterTurnIntoCommands(block.type, BLOCK_TYPES, liveContent),
    [block.type, liveContent],
  );

  const renderSlashMenuPortal = () => (
    <SlashMenuFixed
      show={showSlash}
      anchor={slashAnchor}
      commands={slashCommands}
      query={slashQuery}
      onSelect={(type) => {
        onChangeType(type);
        setShowSlash(false);
        setSlashQuery('');
      }}
      onClose={() => { setShowSlash(false); setSlashQuery(''); }}
    />
  );

  const contentMarginLeft = 0;
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
    || block.type === 'numberedList'
    || block.type === 'callout'
    || block.type === 'quote'
    || block.type === 'code'
    || isHeadingBlockType(block.type);

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
    field?: 'text';
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
    <NoteBlockFormattedField
      block={block}
      text={text}
      placeholder={placeholder}
      textClassName={textClassName}
      field={field}
      tabBehavior={tabBehavior}
      enterCreatesBlock={enterCreatesBlock}
      enterSplitOnMidBlock={enterSplitOnMidBlock}
      autoFocusSignal={autoFocusSignal ?? 0}
      mergeFocusCaretOffset={mergeFocusCaretOffset}
      onEditorEnter={onEditorEnter}
      onEditorBackspace={onEditorBackspace}
      onEditorBackspaceAtBlockStart={onEditorBackspaceAtBlockStart}
      onEditorMergeWithPrevious={onEditorMergeWithPrevious}
      onEditorCanMergeWithPrevious={onEditorCanMergeWithPrevious}
      editorMergeFocusCaretOffset={editorMergeFocusCaretOffset}
      onContentPatch={onContentPatch}
      onChangeType={onChangeType}
      onShowFormatToolbar={onShowFormatToolbar}
      onHideFormatToolbar={onHideFormatToolbar}
      onSlashChange={(nextShow, nextQuery) => {
        setShowSlash(nextShow);
        setSlashQuery(nextQuery);
      }}
      onIndentChange={onIndentChange}
      onNavigatePrevious={onNavigatePrevious}
      onNavigateNext={onNavigateNext}
      onTrackActiveBlock={onTrackActiveBlock}
      onFocusBlock={onFocusBlock}
      onEmptyBackspace={onEmptyBackspace}
      onMergeWithPrevious={onMergeWithPrevious}
      canMergeWithPrevious={canMergeWithPrevious}
      uploadImage={uploadImage}
      onOpenDocument={onOpenDocument}
      onMultilinePaste={onMultilinePaste}
      slashHostRef={slashHostRef}
    />
  );

  if (block.type === 'table') {
    return (
      <NoteTableBlock
        block={block}
        contentMarginLeft={contentMarginLeft}
        rootBlockShell={rootBlockShell}
        autoFocusSignal={autoFocusSignal}
        mergeFocusCaretOffset={mergeFocusCaretOffset}
        onContentPatch={onContentPatch}
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
      <NoteChromeBlockShell
        isFocused={isFocused}
        autoFocusSignal={autoFocusSignal}
        className={`flex items-center ${isInsideToggle ? 'py-2' : `${rootBlockShell} py-3`}`}
        style={{ marginLeft: `${contentMarginLeft}px` }}
        onAddBelow={onAddBelow}
        onDelete={onDelete}
      >
        <div className="flex-1 border-t border-slate-200" />
      </NoteChromeBlockShell>
    );
  }

  if (block.type === 'todo') {
    return (
      <>
        <NoteTodoBlock
          block={block}
          liveContent={liveContent}
          contentMarginLeft={contentMarginLeft}
          inlineRowPadding={inlineRowPadding}
          rootBlockShell={rootBlockShell}
          enterCreatesBlockBelow={enterCreatesBlockBelow}
          onContentPatch={onContentPatch}
          onEnter={onEnter}
          onAddBelow={onAddBelow}
          autoFocusSignal={autoFocusSignal}
          mergeFocusCaretOffset={mergeFocusCaretOffset}
          onChangeType={onChangeType}
          onShowFormatToolbar={onShowFormatToolbar}
          onHideFormatToolbar={onHideFormatToolbar}
          onIndentChange={onIndentChange}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          onTrackActiveBlock={onTrackActiveBlock}
          onFocusBlock={onFocusBlock}
          onEmptyBackspace={onEmptyBackspace}
          onMergeWithPrevious={onMergeWithPrevious}
          canMergeWithPrevious={canMergeWithPrevious}
          uploadImage={uploadImage}
          onOpenDocument={onOpenDocument}
          onMultilinePaste={onMultilinePaste}
          onSlashChange={(nextShow, nextQuery) => {
            setShowSlash(nextShow);
            setSlashQuery(nextQuery);
          }}
          slashHostRef={slashHostRef}
        />
        {renderSlashMenuPortal()}
      </>
    );
  }

  if (isHeadingBlockType(block.type)) {
    return (
      <>
        <NoteHeadingBlock
          block={block}
          liveContent={liveContent}
          variant={block.type}
          contentMarginLeft={contentMarginLeft}
          inlineRowPadding={inlineRowPadding}
          rootBlockShell={rootBlockShell}
          isInsideToggle={isInsideToggle}
          enterCreatesBlockBelow={enterCreatesBlockBelow}
          onContentPatch={onContentPatch}
          onEnter={onEnter}
          onAddBelow={onAddBelow}
          autoFocusSignal={autoFocusSignal}
          mergeFocusCaretOffset={mergeFocusCaretOffset}
          onChangeType={onChangeType}
          onShowFormatToolbar={onShowFormatToolbar}
          onHideFormatToolbar={onHideFormatToolbar}
          onIndentChange={onIndentChange}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          onTrackActiveBlock={onTrackActiveBlock}
          onFocusBlock={onFocusBlock}
          onEmptyBackspace={onEmptyBackspace}
          onMergeWithPrevious={onMergeWithPrevious}
          canMergeWithPrevious={canMergeWithPrevious}
          uploadImage={uploadImage}
          onOpenDocument={onOpenDocument}
          onMultilinePaste={onMultilinePaste}
          onSlashChange={(nextShow, nextQuery) => {
            setShowSlash(nextShow);
            setSlashQuery(nextQuery);
          }}
          slashHostRef={slashHostRef}
        />
        {renderSlashMenuPortal()}
      </>
    );
  }

  if (block.type === 'bulletList' || block.type === 'numberedList') {
    return (
      <>
        <NoteListBlock
          block={block}
          liveContent={liveContent}
          listType={block.type}
          listNestLevel={bulletListNestLevel}
          numberedListIndex={numberedListIndex}
          contentMarginLeft={contentMarginLeft}
          inlineRowPadding={inlineRowPadding}
          rootBlockShell={rootBlockShell}
          isInsideToggle={isInsideToggle}
          enterCreatesBlockBelow={enterCreatesBlockBelow}
          childBlocks={childBlocks}
          renderChildBlock={renderChildBlock}
          toggleNestDepth={toggleNestDepth}
          omitExternalizedChildren={omitExternalizedChildren}
          onContentPatch={onContentPatch}
          onEnter={onEnter}
          onAddBelow={onAddBelow}
          onSplitWithChildren={onSplitWithChildren}
          onChangeType={onChangeType}
          onRequestCaretOffset={onRequestCaretOffset}
          autoFocusSignal={autoFocusSignal}
          mergeFocusCaretOffset={mergeFocusCaretOffset}
          onShowFormatToolbar={onShowFormatToolbar}
          onHideFormatToolbar={onHideFormatToolbar}
          onIndentChange={onIndentChange}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          onTrackActiveBlock={onTrackActiveBlock}
          onFocusBlock={onFocusBlock}
          onEmptyBackspace={onEmptyBackspace}
          onMergeWithPrevious={onMergeWithPrevious}
          canMergeWithPrevious={canMergeWithPrevious}
          uploadImage={uploadImage}
          onOpenDocument={onOpenDocument}
          onMultilinePaste={onMultilinePaste}
          onSlashChange={(nextShow, nextQuery) => {
            setShowSlash(nextShow);
            setSlashQuery(nextQuery);
          }}
          slashHostRef={slashHostRef}
        />
        {renderSlashMenuPortal()}
      </>
    );
  }

  if (block.type === 'image') {
    const url = typeof liveContent.url === 'string' ? liveContent.url : '';
    const caption = typeof liveContent.caption === 'string' ? liveContent.caption : '';
    return (
      <NoteImageBlock
        url={url}
        caption={caption}
        liveContent={liveContent}
        contentMarginLeft={contentMarginLeft}
        fileInputRef={imgFileInputRef}
        imgDragOver={imgDragOver}
        imgUploading={imgUploading}
        showUrlInput={showUrlInput}
        isFocused={isFocused}
        autoFocusSignal={autoFocusSignal}
        setImgDragOver={setImgDragOver}
        setImgUploading={setImgUploading}
        setShowUrlInput={setShowUrlInput}
        patchContent={patchContent}
        uploadImage={uploadImage}
        onAddBelow={onAddBelow}
        onDelete={onDelete}
        onOpenLightbox={(imageUrl, imageCaption) => imageLightbox?.open(imageUrl, imageCaption)}
      />
    );
  }

  if (block.type === 'video') {
    const url = typeof block.content?.url === 'string' ? block.content.url : '';
    const embed = resolveVideoEmbedContent(block.content);
    const videoBody = (
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-2 flex items-center gap-2">
          <Video className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white"
            placeholder={videoEmbedPlaceholder()}
            value={url}
            onChange={(e) => {
              patchContent(buildVideoBlockContentFromUrl(e.target.value));
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
            {videoEmbedUnsupportedMessage()}
          </p>
        ) : null}
      </div>
    );

    if (embed) {
      return (
        <NoteChromeBlockShell
          isFocused={isFocused}
          autoFocusSignal={autoFocusSignal}
          onAddBelow={onAddBelow}
          onDelete={onDelete}
        >
          {videoBody}
        </NoteChromeBlockShell>
      );
    }

    return videoBody;
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
            if (handleNotionPageBlockKeyDown(e, { isFocused, openPage })) {
              e.preventDefault();
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
    return (
      <NoteCalloutBlock
        block={block}
        liveContent={liveContent}
        contentMarginLeft={contentMarginLeft}
        inlineRowPadding={inlineRowPadding}
        rootBlockShell={rootBlockShell}
        isInsideToggle={isInsideToggle}
        enterCreatesBlockBelow={enterCreatesBlockBelow}
        onContentPatch={onContentPatch}
        onEnter={onEnter}
        onAddBelow={onAddBelow}
        onChangeType={onChangeType}
        onIndentChange={onIndentChange}
        onSlashChange={(nextShow, nextQuery) => {
          setShowSlash(nextShow);
          setSlashQuery(nextQuery);
        }}
        slashHostRef={slashHostRef}
        renderFormatToolbar={renderFormatToolbar}
        renderSlashMenuPortal={renderSlashMenuPortal}
        autoFocusSignal={autoFocusSignal}
        mergeFocusCaretOffset={mergeFocusCaretOffset}
        onShowFormatToolbar={onShowFormatToolbar}
        onHideFormatToolbar={onHideFormatToolbar}
        onNavigatePrevious={onNavigatePrevious}
        onNavigateNext={onNavigateNext}
        onTrackActiveBlock={onTrackActiveBlock}
        onFocusBlock={onFocusBlock}
        onEmptyBackspace={onEmptyBackspace}
        onMergeWithPrevious={onMergeWithPrevious}
        canMergeWithPrevious={canMergeWithPrevious}
        uploadImage={uploadImage}
        onOpenDocument={onOpenDocument}
        onMultilinePaste={onMultilinePaste}
      />
    );
  }

  if (block.type === 'quote') {
    return (
      <NoteQuoteBlock
        block={block}
        liveContent={liveContent}
        contentMarginLeft={contentMarginLeft}
        inlineRowPadding={inlineRowPadding}
        rootBlockShell={rootBlockShell}
        isInsideToggle={isInsideToggle}
        enterCreatesBlockBelow={enterCreatesBlockBelow}
        onContentPatch={onContentPatch}
        onEnter={onEnter}
        onAddBelow={onAddBelow}
        onChangeType={onChangeType}
        onIndentChange={onIndentChange}
        onSlashChange={(nextShow, nextQuery) => {
          setShowSlash(nextShow);
          setSlashQuery(nextQuery);
        }}
        slashHostRef={slashHostRef}
        renderFormatToolbar={renderFormatToolbar}
        renderSlashMenuPortal={renderSlashMenuPortal}
        autoFocusSignal={autoFocusSignal}
        mergeFocusCaretOffset={mergeFocusCaretOffset}
        onShowFormatToolbar={onShowFormatToolbar}
        onHideFormatToolbar={onHideFormatToolbar}
        onNavigatePrevious={onNavigatePrevious}
        onNavigateNext={onNavigateNext}
        onTrackActiveBlock={onTrackActiveBlock}
        onFocusBlock={onFocusBlock}
        onEmptyBackspace={onEmptyBackspace}
        onMergeWithPrevious={onMergeWithPrevious}
        canMergeWithPrevious={canMergeWithPrevious}
        uploadImage={uploadImage}
        onOpenDocument={onOpenDocument}
        onMultilinePaste={onMultilinePaste}
      />
    );
  }

  if (block.type === 'code') {
    return (
      <NoteCodeBlock
        block={block}
        liveContent={liveContent}
        contentMarginLeft={contentMarginLeft}
        inlineRowPadding={inlineRowPadding}
        rootBlockShell={rootBlockShell}
        isInsideToggle={isInsideToggle}
        enterCreatesBlockBelow={enterCreatesBlockBelow}
        onContentPatch={onContentPatch}
        onEnter={onEnter}
        onAddBelow={onAddBelow}
        onChangeType={onChangeType}
        onIndentChange={onIndentChange}
        onSlashChange={(nextShow, nextQuery) => {
          setShowSlash(nextShow);
          setSlashQuery(nextQuery);
        }}
        slashHostRef={slashHostRef}
        renderSlashMenuPortal={renderSlashMenuPortal}
        autoFocusSignal={autoFocusSignal}
        mergeFocusCaretOffset={mergeFocusCaretOffset}
        onShowFormatToolbar={onShowFormatToolbar}
        onHideFormatToolbar={onHideFormatToolbar}
        onNavigatePrevious={onNavigatePrevious}
        onNavigateNext={onNavigateNext}
        onTrackActiveBlock={onTrackActiveBlock}
        onFocusBlock={onFocusBlock}
        onEmptyBackspace={onEmptyBackspace}
        onMergeWithPrevious={onMergeWithPrevious}
        canMergeWithPrevious={canMergeWithPrevious}
        uploadImage={uploadImage}
        onOpenDocument={onOpenDocument}
        onMultilinePaste={onMultilinePaste}
      />
    );
  }

  if (block.type === 'columnList') {
    const columnBlocks = childBlocks.filter((child) => child.type === 'column');
    return (
      <NoteColumnListBlock
        columnBlocks={columnBlocks}
        lookupChildBlocks={lookupChildBlocks ?? (() => [])}
        renderChildBlock={renderChildBlock}
        onAddChildInColumn={(columnId, type, content) => {
          onAddChildInColumn?.(columnId, type, content);
        }}
        contentMarginLeft={contentMarginLeft}
        rootBlockShell={rootBlockShell}
      />
    );
  }

  if (block.type === 'toggle') {
    return (
      <NoteToggleBlock
        block={block}
        liveContent={liveContent}
        contentMarginLeft={contentMarginLeft}
        isInsideToggle={isInsideToggle}
        isDropTarget={isDropTarget}
        isDragging={isDragging}
        focusedToggleId={focusedToggleId}
        childBlocks={childBlocks}
        renderChildBlock={renderChildBlock}
        toggleNestDepth={toggleNestDepth}
        autoFocusTitleSignal={autoFocusTitleSignal}
        onContentPatch={onContentPatch}
        onChangeType={onChangeType}
        onAddBelow={onAddBelow}
        onAddChildBelow={onAddChildBelow}
        onIndentChange={onIndentChange}
        onTrackActiveBlock={onTrackActiveBlock}
        onFocusBlockById={onFocusBlockById}
        onNavigatePrevious={onNavigatePrevious}
      />
    );
  }

  // text (default)
  const text = typeof liveContent.text === 'string' ? liveContent.text : '';
  const handleTextEnter = createInlineBlockEnterHandler({
    block,
    followType: 'text',
    text,
    parentBlockType: isInsideToggle ? 'toggle' : null,
    onAddBelow,
    onChangeType,
    onIndentChange,
  });
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
        enterSplitOnMidBlock: enterCreatesBlockBelow,
        onEditorEnter: enterCreatesBlockBelow ? handleTextEnter : undefined,
        onEditorBackspaceAtBlockStart: onBackspaceAtBlockStart,
      })}
      {renderSlashMenuPortal()}
    </div>
  );
}

/* ─── BlockRowGutter (+ · 드래그 — 줄 호버 시에만) ───────────────────────── */
function BlockRowGutter({
  blockType,
  nestDepth = 1,
  onAddBelow,
  onGripClick,
  gripBtnRef,
  dragAttributes,
  dragListeners,
  onPickerOpenChange,
}: {
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
      className={`pointer-events-none absolute left-0 right-0 z-40 flex items-center ${
        top ? '-top-[1px]' : '-bottom-[1px]'
      }`}
    >
      <div className="h-[8px] w-[8px] shrink-0 rounded-full border-[2.5px] border-blue-500 bg-white shadow-sm" />
      <div className="h-[3px] flex-1 rounded-full bg-blue-500" />
    </div>
  );
}

/** 토글 안으로 드롭 시 파란 배경 표시 */
/* ─── SortableBlockRow ───────────────────────────────────────────────────── */
function SortableBlockRow({
  block,
  onContentPatch,
  onDelete,
  onChangeType,
  onEnter,
  onAddBelow,
  onSplitWithChildren,
  onOpenDocument,
  resolvePageIcon,
  onShowFormatToolbar,
  onHideFormatToolbar,
  onMultilinePaste,
  autoFocusSignal,
  onEmptyBackspace,
  onBackspaceAtBlockStart,
  onMergeWithPrevious,
  canMergeWithPrevious,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  focusedToggleId,
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
  onFocusBlockById,
  autoFocusTitleSignal = 0,
  numberedListIndex,
  bulletListNestLevel = 0,
  lookupChildBlocks,
  onAddChildInColumn,
}: {
  block: NoteBlock;
  onContentPatch: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onSplitWithChildren?: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onOpenDocument?: (documentId: string) => void;
  resolvePageIcon?: (documentId: string) => string | null;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
    editLink?: () => void,
  ) => void;
  onHideFormatToolbar?: () => void;
  onMultilinePaste?: (specs: PastedBlockSpec[]) => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onBackspaceAtBlockStart?: () => boolean;
  onMergeWithPrevious?: () => void;
  canMergeWithPrevious?: () => boolean;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  focusedToggleId?: string | null;
  uploadImage?: (file: File) => Promise<string>;
  isDropTarget?: boolean;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  onAddChildBelow?: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onDuplicate?: () => void;
  onCopyBlockLink?: () => void;
  onRecordBlockUndo?: () => void;
  isFocused?: boolean;
  mergeFocusCaretOffset?: number;
  onRequestCaretOffset?: (offset: number) => void;
  onFocusBlock?: () => void;
  onFocusBlockById?: (blockId: string, part?: 'title' | 'editor', caretOffset?: number) => void;
  autoFocusTitleSignal?: number;
  numberedListIndex?: number;
  bulletListNestLevel?: number;
  lookupChildBlocks?: (parentId: string) => NoteBlock[];
  onAddChildInColumn?: (columnId: string, type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
}) {
  const applyBlockColor = useCallback((colorId: string) => {
    onRecordBlockUndo?.();
    const next = { ...getMergedBlockContentBase(block) };
    if (colorId === 'default') delete next.blockColor;
    else next.blockColor = colorId;
    onContentPatch(next);
  }, [block, onContentPatch, onRecordBlockUndo]);

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
    onContentPatch,
    onDelete,
    onChangeType,
    onEnter,
    onAddBelow,
    onSplitWithChildren,
    onOpenDocument,
    resolvePageIcon,
    onShowFormatToolbar,
    onHideFormatToolbar,
    onMultilinePaste,
    autoFocusSignal,
    onEmptyBackspace,
    onBackspaceAtBlockStart,
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
    onFocusBlockById,
    autoFocusTitleSignal,
    numberedListIndex,
    bulletListNestLevel,
    omitExternalizedChildren: blockExternalizesChildren(block.type),
    lookupChildBlocks,
    onAddChildInColumn,
  };

  const blockContentNode = <BlockContent {...sharedBlockContentProps} />;

  const showExternalChildren =
    childBlocks
    && childBlocks.length > 0
    && renderChildBlock
    && blockExternalizesChildren(block.type);

  const style: React.CSSProperties | undefined = isDragging
    ? { opacity: 0.28, zIndex: 10 }
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
          : dropPos === 'inside' ? DROP_INSIDE_BLOCK_ROW
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
            blockContent={block.content}
            currentBlockColor={readBlockColor(block.content)}
            onDuplicate={() => onDuplicate?.()}
            onDelete={onDelete}
            onTurnInto={(type) => onChangeType(type)}
            onCopyBlockLink={onCopyBlockLink}
            onColorChange={applyBlockColor}
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
  onContentPatch,
  onDelete,
  onChangeType,
  onEnter,
  onAddBelow,
  onSplitWithChildren,
  onOpenDocument,
  resolvePageIcon,
  onShowFormatToolbar,
  onHideFormatToolbar,
  onMultilinePaste,
  autoFocusSignal,
  onEmptyBackspace,
  onBackspaceAtBlockStart,
  onMergeWithPrevious,
  canMergeWithPrevious,
  onIndentChange,
  onNavigatePrevious,
  onNavigateNext,
  focusedToggleId,
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
  onFocusBlockById,
  onAddChildBelow,
  autoFocusTitleSignal = 0,
  numberedListIndex,
  bulletListNestLevel = 0,
  lookupChildBlocks,
  onAddChildInColumn,
}: {
  block: NoteBlock;
  onContentPatch: (content: any) => void;
  onDelete: () => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onSplitWithChildren?: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onOpenDocument?: (documentId: string) => void;
  resolvePageIcon?: (documentId: string) => string | null;
  onShowFormatToolbar?: (
    applyMark: (mark: InlineMark) => void,
    applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void,
    applyTextColor: (color: string | null) => void,
    applyHighlight: (color: string | null) => void,
    position: { top: number; left: number },
    insertTable?: () => void,
    editLink?: () => void,
  ) => void;
  onHideFormatToolbar?: () => void;
  onMultilinePaste?: (specs: PastedBlockSpec[]) => void;
  autoFocusSignal?: number;
  onEmptyBackspace?: () => void;
  onBackspaceAtBlockStart?: () => boolean;
  onMergeWithPrevious?: () => void;
  canMergeWithPrevious?: () => boolean;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  focusedToggleId?: string | null;
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
  onFocusBlockById?: (blockId: string, part?: 'title' | 'editor', caretOffset?: number) => void;
  onAddChildBelow?: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  autoFocusTitleSignal?: number;
  numberedListIndex?: number;
  bulletListNestLevel?: number;
  lookupChildBlocks?: (parentId: string) => NoteBlock[];
  onAddChildInColumn?: (columnId: string, type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
}) {
  const applyBlockColor = useCallback((colorId: string) => {
    onRecordBlockUndo?.();
    const next = { ...getMergedBlockContentBase(block) };
    if (colorId === 'default') delete next.blockColor;
    else next.blockColor = colorId;
    onContentPatch(next);
  }, [block, onContentPatch, onRecordBlockUndo]);

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
      ? { opacity: 0.28, zIndex: 10 + nestDepth }
      : isSelected && isDragActive && selectedBlockIds.size > 1
        ? { opacity: 0.4 }
        : {}),
    ...(rowIndentPx > 0 ? { paddingLeft: rowIndentPx } : {}),
  };

  const showExternalChildren =
    childBlocks
    && childBlocks.length > 0
    && renderChildBlock
    && blockExternalizesChildren(block.type);

  const inlineBlockContentProps = {
    block,
    onContentPatch,
    onDelete,
    onChangeType,
    onEnter,
    onAddBelow,
    onSplitWithChildren,
    onOpenDocument,
    resolvePageIcon,
    onShowFormatToolbar,
    onHideFormatToolbar,
    onMultilinePaste,
    autoFocusSignal,
    onEmptyBackspace,
    onBackspaceAtBlockStart,
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
    isInsideToggle: true as const,
    isDropTarget,
    isFocused,
    mergeFocusCaretOffset,
    onRequestCaretOffset,
    toggleNestDepth: nestDepth,
    onFocusBlock,
    onFocusBlockById,
    autoFocusTitleSignal,
    numberedListIndex,
    bulletListNestLevel,
    omitExternalizedChildren: blockExternalizesChildren(block.type),
    lookupChildBlocks,
    onAddChildInColumn,
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
          : dropPos === 'inside' ? DROP_INSIDE_BLOCK_ROW
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
            blockContent={block.content}
            currentBlockColor={readBlockColor(block.content)}
            onDuplicate={() => onDuplicate?.()}
            onDelete={onDelete}
            onTurnInto={(type) => onChangeType(type)}
            onCopyBlockLink={onCopyBlockLink}
            onColorChange={applyBlockColor}
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
  if (prev.onEmptyBackspace !== next.onEmptyBackspace) return false;
  if (prev.onBackspaceAtBlockStart !== next.onBackspaceAtBlockStart) return false;
  if (prev.onMergeWithPrevious !== next.onMergeWithPrevious) return false;
  if (prev.canMergeWithPrevious !== next.canMergeWithPrevious) return false;
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
