export function shouldDeleteSelectedNoteBlocks(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}) {
  if (event.isComposing) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return event.key === 'Delete' || event.key === 'Backspace';
}

/**
 * 블록 마퀴 선택이 있으면 그 ids.
 * 없으면 멀티 블록 cross-select(≥2) ids — C6 복사와 같은 단위로 Del.
 * 단일 블록 부분 텍스트 선택은 TipTap 기본 삭제에 맡긴다.
 */
export function resolveBlockIdsForSelectionDelete(options: {
  selectedBlockIds: Iterable<string>;
  crossBlockIds: Iterable<string>;
}): string[] {
  const selected = [...new Set([...options.selectedBlockIds].filter(Boolean))];
  if (selected.length > 0) return selected;
  const cross = [...new Set([...options.crossBlockIds].filter(Boolean))];
  return cross.length > 1 ? cross : [];
}
