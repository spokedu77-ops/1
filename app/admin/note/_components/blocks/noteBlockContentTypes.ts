import type { NoteBlock } from '../../_lib/types';
import type { NoteBlockFormattedFieldProps } from './NoteBlockFormattedField';

/** TipTap 필드에 넘기는 공통 바인딩 — 블록 타입별 컴포넌트가 동일하게 확장 */
export type NoteBlockFieldBindings = Pick<
  NoteBlockFormattedFieldProps,
  | 'autoFocusSignal'
  | 'mergeFocusCaretOffset'
  | 'onContentSync'
  | 'onChangeType'
  | 'onShowFormatToolbar'
  | 'onHideFormatToolbar'
  | 'onIndentChange'
  | 'onNavigatePrevious'
  | 'onNavigateNext'
  | 'onTrackActiveBlock'
  | 'onFocusBlock'
  | 'onEmptyBackspace'
  | 'onMergeWithPrevious'
  | 'canMergeWithPrevious'
  | 'uploadImage'
  | 'onOpenDocument'
  | 'onMultilinePaste'
>;

export type NoteBlockContentLayout = {
  contentMarginLeft: number;
  inlineRowPadding: string;
  rootBlockShell: string;
  isInsideToggle: boolean;
  enterCreatesBlockBelow: boolean;
};

export type NoteBlockContentCallbacks = {
  onUpdate: (content: Record<string, unknown>) => void;
  onEnter: () => void;
  onAddBelow: (type?: NoteBlock['type'], content?: Record<string, unknown>) => void;
  onSlashChange?: NoteBlockFormattedFieldProps['onSlashChange'];
  slashHostRef?: React.RefObject<HTMLDivElement | null>;
};

export type NoteInlineTextBlockProps =
  & NoteBlockContentLayout
  & NoteBlockContentCallbacks
  & NoteBlockFieldBindings
  & {
    block: NoteBlock;
  };
