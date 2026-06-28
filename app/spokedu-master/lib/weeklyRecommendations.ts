import type { Program } from '../types';

export type WeeklyRecommendationSelection = {
  programs: Program[];
  explicitPrograms: Program[];
  fallbackPrograms: Program[];
  slotConflicts: Array<{ slot: number; keptId: string; ignoredId: string }>;
  slotDiagnostics: Array<{
    slot: number;
    programId: string;
    reason: 'slot_conflict' | 'not_ready' | 'duplicate_program' | 'duplicate_title';
    keptId?: string;
  }>;
};

export function selectWeeklyRecommendationSlots(
  programs: Program[],
  options: {
    isRecommendationEligible: (program: Program) => boolean;
    compareFallback: (a: Program, b: Program) => number;
    normalizeTitle: (title: string) => string;
  },
): WeeklyRecommendationSelection {
  const slots: Array<Program | null> = Array(4).fill(null);
  const slotConflicts: WeeklyRecommendationSelection['slotConflicts'] = [];
  const slotDiagnostics: WeeklyRecommendationSelection['slotDiagnostics'] = [];
  const rejectedExplicitIds = new Set<string>();

  for (const program of programs) {
    const order = program.homeSortOrder ?? 9999;
    if (program.isHot !== true || order < 1 || order > 4) continue;
    const slotIndex = order - 1;
    if (!options.isRecommendationEligible(program)) {
      slotDiagnostics.push({ slot: order, programId: program.id, reason: 'not_ready' });
      rejectedExplicitIds.add(program.id);
      continue;
    }
    const existing = slots[slotIndex];
    if (existing && existing.id !== program.id) {
      slotConflicts.push({ slot: order, keptId: existing.id, ignoredId: program.id });
      slotDiagnostics.push({ slot: order, programId: program.id, reason: 'slot_conflict', keptId: existing.id });
      rejectedExplicitIds.add(program.id);
      continue;
    }
    slots[slotIndex] = program;
  }

  const explicitUsedIds = new Set<string>();
  const explicitUsedTitles = new Map<string, string>();
  slots.forEach((program, index) => {
    if (!program) return;
    const titleKey = options.normalizeTitle(program.title);
    if (explicitUsedIds.has(program.id)) {
      slotDiagnostics.push({ slot: index + 1, programId: program.id, reason: 'duplicate_program', keptId: program.id });
      rejectedExplicitIds.add(program.id);
      slots[index] = null;
      return;
    }
    const keptTitleId = titleKey ? explicitUsedTitles.get(titleKey) : undefined;
    if (keptTitleId) {
      slotDiagnostics.push({ slot: index + 1, programId: program.id, reason: 'duplicate_title', keptId: keptTitleId });
      rejectedExplicitIds.add(program.id);
      slots[index] = null;
      return;
    }
    explicitUsedIds.add(program.id);
    if (titleKey) explicitUsedTitles.set(titleKey, program.id);
  });

  const explicitPrograms = slots.filter((program): program is Program => program != null);
  const usedIds = new Set(explicitPrograms.map((program) => program.id));
  const usedTitles = new Set(
    explicitPrograms.map((program) => options.normalizeTitle(program.title)).filter(Boolean),
  );
  const fallbackPrograms: Program[] = [];

  const fallbackPool = [...programs]
    .filter((program) => !usedIds.has(program.id) && options.isRecommendationEligible(program))
    .filter((program) => !rejectedExplicitIds.has(program.id))
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
    slotDiagnostics,
  };
}
