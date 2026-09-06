import { COLORS } from '../constants';

export const STROOP_WORD_MOVE_TASK_CUE = {
  meaning: '단어 뜻',
  ink: '글자 색',
  meaningReverse: '단어 뜻 · 반대로',
  inkReverse: '글자 색 · 반대로',
} as const;

export type StroopWordMoveTask = 'meaning' | 'ink';

function colorIdFromFillHex(hex: string | undefined): string | null {
  if (!hex) return null;
  const normalized = hex.trim().toLowerCase();
  return COLORS.find((c) => c.bg.toLowerCase() === normalized)?.id ?? null;
}

function colorIdFromWordName(word: string | undefined): string | null {
  if (!word || typeof word !== 'string') return null;
  return COLORS.find((c) => c.name === word)?.id ?? null;
}

function normalizeTask(task: string | undefined): StroopWordMoveTask | null {
  if (task === 'meaning') return 'meaning';
  if (task === 'ink') return 'ink';
  return null;
}

/**
 * Stroop Word 움직임 정답 패드 색.
 * reverse는 반대색이 아니라 선택 차원(meaning ↔ ink)을 뒤집는다.
 */
export function resolveStroopWordMoveTarget(input: {
  word?: string;
  wordColorId?: string;
  textHex?: string;
  textColorId?: string;
  task?: string;
  reverse?: boolean;
}): string | null {
  const task = normalizeTask(input.task);
  if (!task) return null;
  const wordColorId = input.wordColorId ?? colorIdFromWordName(input.word);
  const textColorId = input.textColorId ?? colorIdFromFillHex(input.textHex);
  if (!wordColorId || !textColorId) return null;
  const selected = task === 'meaning' ? wordColorId : textColorId;
  const opposite = task === 'meaning' ? textColorId : wordColorId;
  return input.reverse ? opposite : selected;
}

export function resolveStroopWordMovementCue(content: {
  stroopWordResponse?: unknown;
  stroopWordTask?: unknown;
  stroopWordReverse?: unknown;
} | null | undefined): string | null {
  if (content?.stroopWordResponse !== 'movement') return null;
  const task = normalizeTask(typeof content.stroopWordTask === 'string' ? content.stroopWordTask : undefined);
  if (!task) return null;
  const reverse = content.stroopWordReverse === true;
  if (task === 'meaning') return reverse ? STROOP_WORD_MOVE_TASK_CUE.meaningReverse : STROOP_WORD_MOVE_TASK_CUE.meaning;
  return reverse ? STROOP_WORD_MOVE_TASK_CUE.inkReverse : STROOP_WORD_MOVE_TASK_CUE.ink;
}
