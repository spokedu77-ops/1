'use client';

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SlashMenuFixed } from '../SlashMenu';
import { BLOCK_TYPES, toggleNestPaddingPx } from '../../_lib/constants';
import { filterTurnIntoCommands } from '../../_lib/noteBlockTypeChange';
import {
  resolveToggleTitleBackspaceAction,
  resolveToggleTitleEnterAction,
} from '../../_lib/noteNotionBlockBehavior';
import { focusWithoutScroll } from '../../_lib/noteEditorScrollGuard';
import {
  DROP_TARGET_ROW,
  EMPTY_BLOCK_PLACEHOLDER,
} from '../../_lib/noteBlockRowUi';
import { BlockInsideDropSurface, ToggleDisclosureButton } from '../sidebar/NoteDocChrome';
import { useBlockDragActive } from '../noteContexts';
import { useBlockContentPatch } from './useBlockContentPatch';
import type { NoteBlock } from '../../_lib/types';

type NoteToggleBlockProps = {
  block: NoteBlock;
  liveContent: Record<string, unknown>;
  contentMarginLeft: number;
  isInsideToggle: boolean;
  isDropTarget: boolean;
  isDragging?: boolean;
  focusedToggleId?: string | null;
  /** ArrowDown 네비·인라인 자식 렌더 */
  childBlocks?: NoteBlock[];
  renderChildBlock?: (child: NoteBlock, nestDepth?: number) => ReactNode;
  toggleNestDepth?: number;
  autoFocusTitleSignal?: number;
  onContentPatch: (content: Record<string, unknown>) => void;
  onChangeType: (type: NoteBlock['type']) => void;
  onAddBelow: (type?: NoteBlock['type']) => void;
  onAddChildBelow?: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onIndentChange?: (direction: 'in' | 'out') => void;
  onTrackActiveBlock?: (part?: 'title' | 'editor') => void;
  onFocusBlockById?: (blockId: string, part?: 'title' | 'editor', caretOffset?: number) => void;
  onNavigatePrevious?: () => void;
};

export function NoteToggleBlock({
  block,
  liveContent,
  contentMarginLeft,
  isInsideToggle,
  isDropTarget,
  isDragging,
  focusedToggleId,
  childBlocks = [],
  renderChildBlock,
  toggleNestDepth = 1,
  autoFocusTitleSignal = 0,
  onContentPatch,
  onChangeType,
  onAddBelow,
  onAddChildBelow,
  onIndentChange,
  onTrackActiveBlock,
  onFocusBlockById,
  onNavigatePrevious,
}: NoteToggleBlockProps) {
  const isBlockDragActive = useBlockDragActive();
  const toggleTitleInputRef = useRef<HTMLInputElement>(null);
  const [toggleTitleSlashAnchor, setToggleTitleSlashAnchor] = useState<{ top: number; left: number } | null>(null);

  const patchToggle = useBlockContentPatch(block, onContentPatch);

  const title = typeof liveContent.title === 'string'
    ? liveContent.title
    : (typeof liveContent.text === 'string' ? liveContent.text : '');
  const collapsed = !!liveContent.collapsed;
  const showToggleContent = !collapsed;
  const isThisToggleFocused = focusedToggleId === block.id;
  const toggleTitleSlashActive = title.startsWith('/');
  const toggleTitleSlashQuery = toggleTitleSlashActive ? title.slice(1) : '';
  const toggleTitleSlashCommands = filterTurnIntoCommands('toggle', BLOCK_TYPES, liveContent);

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
  const showToggleEmptySlot = showToggleContent
    && !!onAddChildBelow
    && childBlocks.length === 0;

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
              if (!collapsed && !firstChild && onAddChildBelow) {
                e.preventDefault();
                onAddChildBelow('text');
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
              if (toggleTitleSlashActive) return;
              e.preventDefault();
              const action = resolveToggleTitleEnterAction(collapsed);
              if (action.kind === 'add-sibling') {
                onAddBelow(action.blockType);
              } else {
                onAddChildBelow?.(action.blockType);
              }
              return;
            }
            if (e.key === 'Backspace') {
              const action = resolveToggleTitleBackspaceAction({
                title,
                selectionStart: e.currentTarget.selectionStart,
                selectionEnd: e.currentTarget.selectionEnd,
              });
              if (action.kind === 'convert-to-text') {
                e.preventDefault();
                onChangeType('text');
                return;
              }
              if (action.kind === 'navigate-previous') {
                e.preventDefault();
                onNavigatePrevious?.();
                return;
              }
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
      {showToggleEmptySlot && (
        <div
          className="overflow-visible"
          style={toggleChildIndentPx > 0 ? { paddingLeft: toggleChildIndentPx } : undefined}
        >
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
        </div>
      )}
      {showToggleContent && childBlocks.length > 0 && renderChildBlock && (
        <div
          className="note-block-children space-y-0 overflow-visible"
          style={toggleChildIndentPx > 0 ? { paddingLeft: toggleChildIndentPx } : undefined}
        >
          {childBlocks.map((child) => (
            <Fragment key={child.id}>
              {renderChildBlock(child, toggleNestDepth + 1)}
            </Fragment>
          ))}
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
