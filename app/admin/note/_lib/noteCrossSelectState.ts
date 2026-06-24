import type { CrossSelectRange } from './noteCrossSelectCore';
import {
  clearCrossClipboardSnapshot,
  syncCrossClipboardSnapshot,
  syncCrossTextActiveBodyClass,
} from '../_components/noteListCrossHighlight';

const BODY_LIST_CROSS_CLASS = 'note-list-cross-active';

let activeRanges: CrossSelectRange[] = [];
let listCrossDragActive = false;

export function getUnifiedCrossSelectRanges(): CrossSelectRange[] {
  return activeRanges;
}

export function isListCrossDragActive(): boolean {
  return listCrossDragActive;
}

export function hasActiveMultiCrossSelect(): boolean {
  return activeRanges.length > 1;
}

export function shouldSuppressCrossFormatToolbar(): boolean {
  return listCrossDragActive || activeRanges.length > 1;
}

export function commitCrossSelectRanges(ranges: CrossSelectRange[], options?: { listDrag?: boolean }) {
  activeRanges = ranges;
  if (ranges.length > 1) syncCrossClipboardSnapshot(ranges);
  if (options?.listDrag !== undefined) {
    listCrossDragActive = options.listDrag;
    if (typeof document !== 'undefined') {
      document.body.classList.toggle(BODY_LIST_CROSS_CLASS, listCrossDragActive);
    }
  }
  syncCrossTextActiveBodyClass();
}

export function clearUnifiedCrossSelectState(options?: { clearListClass?: boolean }) {
  activeRanges = [];
  if (options?.clearListClass !== false) {
    listCrossDragActive = false;
    if (typeof document !== 'undefined') {
      document.body.classList.remove(BODY_LIST_CROSS_CLASS);
    }
  }
  clearCrossClipboardSnapshot();
  syncCrossTextActiveBodyClass();
}
