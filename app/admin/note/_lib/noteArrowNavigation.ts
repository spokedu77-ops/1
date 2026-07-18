export type NoteArrowBlockNavigationDirection = 'previous' | 'next';

type NoteArrowBlockNavigationInput = {
  key: string;
  selectionEmpty: boolean;
  selectionFrom: number;
  selectionTo: number;
  docContentSize: number;
  caretTop?: number;
  boundaryTop?: number;
  tolerancePx?: number;
};

function isSameVisualLine(a: number | undefined, b: number | undefined, tolerancePx: number): boolean {
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) < tolerancePx;
}

export function resolveArrowBlockNavigation(
  input: NoteArrowBlockNavigationInput,
): NoteArrowBlockNavigationDirection | null {
  if (!input.selectionEmpty) return null;

  const tolerancePx = input.tolerancePx ?? 4;
  const docEnd = Math.max(1, input.docContentSize - 1);

  if (input.key === 'ArrowUp') {
    if (input.selectionFrom <= 1) return 'previous';
    if (isSameVisualLine(input.caretTop, input.boundaryTop, tolerancePx)) return 'previous';
    return null;
  }

  if (input.key === 'ArrowDown') {
    if (input.selectionTo >= docEnd) return 'next';
    if (isSameVisualLine(input.caretTop, input.boundaryTop, tolerancePx)) return 'next';
    return null;
  }

  return null;
}
