/** Answers actually revealed by the runtime, never inferred from settings. */
export type RoundAnswerRecord = { round: number; summary: string; steps?: string[]; color?: string }[];

export function memoryRoundAnswers(patterns?: unknown[][]): RoundAnswerRecord {
  return (patterns ?? []).flatMap((pattern, index) => {
    const steps = pattern.flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const value = item as { name?: string; color?: { name?: string }; num?: number };
      const name = value.color?.name ?? value.name;
      return name ? [value.num === undefined ? name : `${value.num} · ${name}`] : [];
    });
    return steps.length ? [{ round: index + 1, summary: steps.length > 4 ? `${steps.slice(0, 3).join(' → ')} … (${steps.length}개)` : steps.join(' → '), steps }] : [];
  });
}
