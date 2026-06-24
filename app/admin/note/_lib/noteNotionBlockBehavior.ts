import type { NoteEditorEnterContext } from '../_components/NoteEditor';
import type { NoteBlock } from './types';

/** Notion 스타일 인라인 블록(todo·bullet 등) Enter 결과 */
export type NotionInlineEnterAction =
  | { kind: 'add-below'; followType: NoteBlock['type']; content?: Record<string, unknown> }
  | { kind: 'outdent' }
  | { kind: 'convert-to-text' };

/** 토글 제목 Enter 결과 */
export type NotionToggleTitleEnterAction =
  | { kind: 'add-sibling'; blockType: 'toggle' }
  | { kind: 'add-child'; blockType: 'text' };

/** 페이지 블록 키보드 결과 */
export type NotionPageKeyAction =
  | { kind: 'open-page' };

/** Shift+Enter — 같은 블록 안 줄바꿈 */
export type NotionShiftEnterAction = { kind: 'hard-break' };

export function shouldEditorShiftEnterHardBreak(shiftKey: boolean): boolean {
  return shiftKey;
}

export function resolveEditorShiftEnterAction(shiftKey: boolean): NotionShiftEnterAction | null {
  return shouldEditorShiftEnterHardBreak(shiftKey) ? { kind: 'hard-break' } : null;
}

export function resolveInlineBlockEnterAction(options: {
  followType: NoteBlock['type'];
  text: string;
  parentBlockId: string | null;
  enterCtx?: NoteEditorEnterContext;
  isEmpty?: (rawText: string, enterCtx?: NoteEditorEnterContext) => boolean;
}): NotionInlineEnterAction {
  const resolveEmpty = options.isEmpty
    ?? ((rawText: string, enterCtx?: NoteEditorEnterContext) =>
      enterCtx?.isEmpty ?? rawText.trim().length === 0);

  if (options.enterCtx?.split) {
    return {
      kind: 'add-below',
      followType: options.followType,
      content: {
        text: options.enterCtx.split.afterText,
        html: options.enterCtx.split.afterHtml,
        depth: 0,
      },
    };
  }

  const isEmpty = resolveEmpty(options.text, options.enterCtx);
  if (!isEmpty) {
    return { kind: 'add-below', followType: options.followType };
  }

  if (options.parentBlockId) {
    return { kind: 'outdent' };
  }

  return { kind: 'convert-to-text' };
}

export function resolveToggleTitleEnterAction(collapsed: boolean): NotionToggleTitleEnterAction {
  if (collapsed) {
    return { kind: 'add-sibling', blockType: 'toggle' };
  }
  return { kind: 'add-child', blockType: 'text' };
}

/** 제목(heading) Enter — 항상 아래 text 블록, 빈 줄이면 text로 전환 */
export function resolveHeadingEnterAction(options: {
  text: string;
  parentBlockId: string | null;
  enterCtx?: NoteEditorEnterContext;
}): NotionInlineEnterAction {
  return resolveInlineBlockEnterAction({
    followType: 'text',
    text: options.text,
    parentBlockId: options.parentBlockId,
    enterCtx: options.enterCtx,
  });
}

export function resolveCalloutEnterAction(options: {
  text: string;
  parentBlockId: string | null;
  enterCtx?: NoteEditorEnterContext;
}): NotionInlineEnterAction {
  return resolveInlineBlockEnterAction({
    followType: 'callout',
    text: options.text,
    parentBlockId: options.parentBlockId,
    enterCtx: options.enterCtx,
  });
}

export function resolveCodeEnterAction(options: {
  text: string;
  parentBlockId: string | null;
  enterCtx?: NoteEditorEnterContext;
}): NotionInlineEnterAction {
  return resolveInlineBlockEnterAction({
    followType: 'code',
    text: options.text,
    parentBlockId: options.parentBlockId,
    enterCtx: options.enterCtx,
  });
}

/** 편집기 없는 블록(divider·image·video 등) 키보드 */
export type NotionChromeBlockKeyAction =
  | { kind: 'add-text-below' }
  | { kind: 'delete-block' };

export function resolveChromeBlockKeyAction(
  key: string,
  shiftKey: boolean,
): NotionChromeBlockKeyAction | null {
  if (key === 'Enter' && !shiftKey) return { kind: 'add-text-below' };
  if (key === 'Backspace' || key === 'Delete') return { kind: 'delete-block' };
  return null;
}

export function handleNotionChromeBlockKeyDown(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey'>,
  handlers: { onAddBelow: () => void; onDelete: () => void },
): boolean {
  const action = resolveChromeBlockKeyAction(event.key, event.shiftKey);
  if (!action) return false;
  if (action.kind === 'add-text-below') {
    handlers.onAddBelow();
    return true;
  }
  handlers.onDelete();
  return true;
}

export function resolvePageBlockEnterAction(): NotionPageKeyAction {
  return { kind: 'open-page' };
}

/** 빈 블록 Backspace — Notion은 이전 블록과 병합 또는 삭제 */
export type NotionEmptyBackspaceAction =
  | { kind: 'delete-block' }
  | { kind: 'merge-with-previous' };

export function resolveEmptyBackspaceAction(canMergeWithPrevious: boolean): NotionEmptyBackspaceAction {
  return canMergeWithPrevious
    ? { kind: 'merge-with-previous' }
    : { kind: 'delete-block' };
}

export function createNotionEmptyBackspaceHandler(options: {
  canMergeWithPrevious: () => boolean;
  onMergeWithPrevious: () => void;
  onDeleteEmptyBlock: () => void;
}): () => void {
  return () => {
    const action = resolveEmptyBackspaceAction(options.canMergeWithPrevious());
    if (action.kind === 'merge-with-previous') {
      options.onMergeWithPrevious();
      return;
    }
    options.onDeleteEmptyBlock();
  };
}

/** page 블록 Enter·Space — true면 이벤트를 처리했다 */
export function handleNotionPageBlockKeyDown(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey'>,
  options: { isFocused: boolean; openPage: () => void },
): boolean {
  if (event.key === 'Enter' && !event.shiftKey) {
    resolvePageBlockEnterAction();
    options.openPage();
    return true;
  }
  if (event.key === ' ' && options.isFocused) {
    options.openPage();
    return true;
  }
  return false;
}
