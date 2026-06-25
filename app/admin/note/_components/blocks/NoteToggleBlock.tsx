'use client';

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { SlashMenuFixed } from '../SlashMenu';
import { useNoteImageLightbox } from '../NoteImageLightbox';
import { BLOCK_TYPES, toggleNestPaddingPx } from '../../_lib/constants';
import { filterTurnIntoCommands } from '../../_lib/noteBlockTypeChange';
import { resolveToggleTitleEnterAction } from '../../_lib/noteNotionBlockBehavior';
import { focusWithoutScroll } from '../../_lib/noteEditorScrollGuard';
import {
  DROP_TARGET_ROW,
  EMPTY_BLOCK_PLACEHOLDER,
} from '../../_lib/noteBlockRowUi';
import { BlockInsideDropSurface, ToggleDisclosureButton } from '../sidebar/NoteDocChrome';
import { useBlockDragActive } from '../noteContexts';
import { useBlockContentPatch } from './useBlockContentPatch';
import { useBlockLiveContent } from './useBlockLiveContent';
import type { NoteBlock } from '../../_lib/types';
import type { NoteBlockFormattedFieldProps } from './NoteBlockFormattedField';

type NoteToggleBlockProps = {
  block: NoteBlock;
  contentMarginLeft: number;
  isInsideToggle: boolean;
  isDropTarget: boolean;
  isDragging?: boolean;
  focusedToggleId?: string | null;
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  toggleNestDepth?: number;
  omitExternalizedChildren?: boolean;
  autoFocusTitleSignal?: number;
  onContentPatch: (content: Record<string, unknown>) => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onAddBelow: (type?: NoteBlock['type']) => void;
  onAddChildBelow?: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onFocusBlockById?: (blockId: string, part?: 'title' | 'editor', caretOffset?: number) => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  renderSlashMenuPortal: () => ReactNode;
  onSlashChange?: NoteBlockFormattedFieldProps['onSlashChange'];
  slashHostRef?: React.RefObject<HTMLDivElement | null>;
} & Pick<
  NoteBlockFormattedFieldProps,
  | 'autoFocusSignal'
  | 'mergeFocusCaretOffset'
  | 'onShowFormatToolbar'
  | 'onHideFormatToolbar'
  | 'onFocusBlock'
  | 'uploadImage'
  | 'onOpenDocument'
>;

export function NoteToggleBlock({
  block,
  contentMarginLeft,
  isInsideToggle,
  isDropTarget,
  isDragging,
  focusedToggleId,
  childBlocks = [],
  renderChildBlock,
  toggleNestDepth = 1,
  omitExternalizedChildren = false,
  autoFocusTitleSignal = 0,
  onContentPatch,
  onChangeType,
  onAddBelow,
  onAddChildBelow,
  onIndentChange,
  onTrackActiveBlock,
  onFocusBlockById,
  onNavigatePrevious,
  onNavigateNext,
  renderSlashMenuPortal,
  onSlashChange,
  slashHostRef,
  ...fieldProps
}: NoteToggleBlockProps) {
  const liveContent = useBlockLiveContent(block);
  const isBlockDragActive = useBlockDragActive();
  const imageLightbox = useNoteImageLightbox();
  const toggleTitleInputRef = useRef<HTMLInputElement>(null);
  const [toggleTitleSlashAnchor, setToggleTitleSlashAnchor] = useState<{ top: number; left: number } | null>(null);

  const patchToggle = useBlockContentPatch(block, onContentPatch);

  const title = typeof liveContent.title === 'string'
    ? liveContent.title
    : (typeof liveContent.text === 'string' ? liveContent.text : '');
  const collapsed = !!block.content?.collapsed;
  const showToggleContent = !collapsed && !isDragging;
  const rawIm = block.content?.images;
  const toggleImages = Array.isArray(rawIm)
    ? rawIm.map((u) => (typeof u === 'string' ? u : ''))
    : [];
  const isThisToggleFocused = focusedToggleId === block.id;
  const toggleTitleSlashActive = title.startsWith('/');
  const toggleTitleSlashQuery = toggleTitleSlashActive ? title.slice(1) : '';
  const toggleTitleSlashCommands = filterTurnIntoCommands('toggle', BLOCK_TYPES, block.content);

  useEffect(() => {
    if (autoFocusTitleSignal <= 0) return;
    requestAnimationFrame(() => {
      focusWithoutScroll(toggleTitleInputRef.current);
      onTrackActiveBlock?.('title');
    });
  }, [autoFocusTitleSignal, onTrackActiveBlock]);

  useEffect(() => {
    if (!toggleTitleSlashActive || !toggleTitleInputRef.current) {
      setToggleTitleSlashAnchor(null);
      return;
    }
    const rect = toggleTitleInputRef.current.getBoundingClientRect();
    setToggleTitleSlashAnchor({ top: rect.bottom + 4, left: rect.left });
  }, [toggleTitleSlashActive, toggleTitleSlashQuery]);

  const toggleChildIndentPx = toggleNestPaddingPx(toggleNestDepth + 1);
  const hasInlineToggleChildren = !omitExternalizedChildren && childBlocks.length > 0;
  const showToggleEmptySlot = showToggleContent && !!onAddChildBelow && childBlocks.length === 0;
  const showToggleExtrasWrapper = showToggleContent
    && (hasInlineToggleChildren || showToggleEmptySlot);

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
            if (e.key === 'ArrowDown' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
              const firstChild = childBlocks[0];
              if (!collapsed && firstChild && onFocusBlockById) {
                e.preventDefault();
                const part = firstChild.type === 'toggle' ? 'title' : 'editor';
                onFocusBlockById(firstChild.id, part, 0);
                return;
              }
            }
            if (e.key === 'ArrowUp' && !e.shiftKey && onNavigatePrevious) {
              const input = toggleTitleInputRef.current;
              if (input && input.selectionStart === 0 && input.selectionEnd === 0) {
                e.preventDefault();
                onNavigatePrevious();
                return;
              }
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const action = resolveToggleTitleEnterAction(collapsed);
              if (action.kind === 'add-sibling') {
                onAddBelow(action.blockType);
              } else {
                onAddChildBelow?.(action.blockType);
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
                onAddChildBelow?.('text');
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
        commands={toggleTitleSlashCommands}
        query={toggleTitleSlashQuery}
        title="토글 제목"
        onSelect={(type) => { onChangeType(type); }}
        onClose={() => { patchToggle({ title: '' }); }}
      />
    </div>
  );
}
