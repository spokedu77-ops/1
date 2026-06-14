import type { Program } from '../types';

export type WeeklyRecommendationSelection = {
  programs: Program[];
  explicitPrograms: Program[];
  fallbackPrograms: Program[];
  slotConflicts: Array<{ slot: number; keptId: string; ignoredId: string }>;
};

export function selectWeeklyRecommendationSlots(
  programs: Program[],
  options: {
    isFallbackEligible: (program: Program) => boolean;
    compareFallback: (a: Program, b: Program) => number;
    normalizeTitle: (title: string) => string;
  },
): WeeklyRecommendationSelection {
  const slots: Array<Program | null> = Array(4).fill(null);
  const slotConflicts: WeeklyRecommendationSelection['slotConflicts'] = [];

  for (const program of programs) {
    const order = program.homeSortOrder ?? 9999;
    if (program.isHot !== true || order < 1 || order > 4) continue;
    const slotIndex = order - 1;
    const existing = slots[slotIndex];
    if (existing && existing.id !== program.id) {
      slotConflicts.push({ slot: order, keptId: existing.id, ignoredId: program.id });
      continue;
    }
    slots[slotIndex] = program;
  }

  const explicitPrograms = slots.filter((program): program is Program => program != null);
  const usedIds = new Set(explicitPrograms.map((program) => program.id));
  const usedTitles = new Set(
    explicitPrograms.map((program) => options.normalizeTitle(program.title)).filter(Boolean),
  );
  const fallbackPrograms: Program[] = [];

  const fallbackPool = [...programs]
    .filter((program) => !usedIds.has(program.id) && options.isFallbackEligible(program))
    .sort(options.compareFallback);

  for (const program of fallbackPool) {
    const titleKey = options.normalizeTitle(program.title);
    if (!titleKey || usedIds.has(program.id) || usedTitles.has(titleKey)) continue;
    const emptySlot = slots.findIndex((slot) => slot == null);
    if (emptySlot < 0) break;
    slots[emptySlot] = program;
    fallbackPrograms.push(program);
    usedIds.add(program.id);
    usedTitles.add(titleKey);
  }

  return {
    programs: slots.filter((program): program is Program => program != null),
    explicitPrograms,
    fallbackPrograms,
    slotConflicts,
  };
}
