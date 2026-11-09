import type { ChangeEvent, ClipboardEvent } from 'react';

const pastingInputs = new WeakSet<HTMLTextAreaElement>();

export function markFeedbackPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
  const input = event.currentTarget;
  pastingInputs.add(input);
  setTimeout(() => pastingInputs.delete(input), 0);
}

/** Continue numbered items for both keyboard Enter and mobile line breaks. */
export function feedbackListInput(event: ChangeEvent<HTMLTextAreaElement>, previous: string, startNumbered = false): string {
  const input = event.target;
  const value = input.value;
  const nativeEvent = event.nativeEvent as InputEvent;
  if (pastingInputs.has(input) || nativeEvent.inputType === 'insertFromPaste') {
    pastingInputs.delete(input);
    return value;
  }
  if ((event.nativeEvent as InputEvent).isComposing) return value;
  const commit = (next: string, caret: number) => {
    requestAnimationFrame(() => {
      if (input.isConnected && document.activeElement === input) input.setSelectionRange(caret, caret);
    });
    return next;
  };
  if (!previous && startNumbered && value.trim() && !/^\d+(?:[.)]|$)/.test(value)) {
    return commit(`1. ${value}`, input.selectionStart + 3);
  }
  let prefix = 0;
  while (prefix < previous.length && prefix < value.length && previous[prefix] === value[prefix]) prefix++;
  let suffix = 0;
  while (suffix < previous.length - prefix && suffix < value.length - prefix && previous[previous.length - 1 - suffix] === value[value.length - 1 - suffix]) suffix++;
  const inserted = value.slice(prefix, value.length - suffix);
  if (inserted !== '\n') return value;
  const lineStart = previous.lastIndexOf('\n', prefix - 1) + 1;
  const line = previous.slice(lineStart, prefix);
  const match = line.match(/^(\s*)(\d+)\.\s*(.*)$/);
  if (!match) return value;
  if (!match[3]?.trim()) {
    return commit(value.slice(0, lineStart) + value.slice(prefix + 1), lineStart);
  }
  const marker = `${match[1]}${Number(match[2]) + 1}. `;
  return commit(value.slice(0, prefix + 1) + marker + value.slice(prefix + 1), prefix + 1 + marker.length);
}
