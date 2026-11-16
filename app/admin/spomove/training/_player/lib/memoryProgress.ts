import type { RoundAnswerRecord } from './roundAnswerRecord';

/** Actual presentation/reveal evidence, never configured volume or recall success. */
export type MemoryProgressRecord = {
  presentedItems: number;
  startedRounds: number;
  completedPresentations: number;
  revealedAnswers: number;
  roundAnswers: RoundAnswerRecord;
};

export function emptyMemoryProgress(): MemoryProgressRecord {
  return { presentedItems: 0, startedRounds: 0, completedPresentations: 0, revealedAnswers: 0, roundAnswers: [] };
}

export function validMemoryProgress(value: MemoryProgressRecord | undefined): value is MemoryProgressRecord {
  return !!value && [value.presentedItems, value.startedRounds, value.completedPresentations, value.revealedAnswers]
    .every(n => Number.isSafeInteger(n) && n >= 0)
    && value.completedPresentations <= value.startedRounds && value.startedRounds <= value.presentedItems
    && value.revealedAnswers <= value.presentedItems && Array.isArray(value.roundAnswers)
    && value.roundAnswers.length === value.revealedAnswers;
}

export function mergeMemoryProgress(a: MemoryProgressRecord, b: MemoryProgressRecord): MemoryProgressRecord {
  return {
    presentedItems: a.presentedItems + b.presentedItems,
    startedRounds: a.startedRounds + b.startedRounds,
    completedPresentations: a.completedPresentations + b.completedPresentations,
    revealedAnswers: a.revealedAnswers + b.revealedAnswers,
    roundAnswers: [...a.roundAnswers, ...b.roundAnswers].map((answer, index) => ({ ...answer, steps: answer.steps?.slice(), round: index + 1 })),
  };
}

export function createMemoryProgressCollector() {
  const items = new Set<string>();
  const rounds = new Set<number>();
  const completed = new Set<number>();
  const answers = new Map<string, RoundAnswerRecord[number]>();
  return {
    present(round: number, item: number) { rounds.add(round); items.add(`${round}:${item}`); },
    completePresentation(round: number) { completed.add(round); },
    reveal(key: string, answer: RoundAnswerRecord[number]) { answers.set(key, { ...answer, steps: answer.steps?.slice() }); },
    snapshot(): MemoryProgressRecord {
      return { presentedItems: items.size, startedRounds: rounds.size, completedPresentations: completed.size,
        revealedAnswers: answers.size, roundAnswers: [...answers.values()].map((a, index) => ({ ...a, steps: a.steps?.slice(), round: index + 1 })) };
    },
  };
}
