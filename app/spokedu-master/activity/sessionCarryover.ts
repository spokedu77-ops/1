import type { MasterSessionDto } from '../types/operational';
import { findOfficialSpomovePreset } from '../spomove/officialSpomovePresets';
type SessionProgram = MasterSessionDto['programs'][number];
export type SessionCarryoverMode = 'none' | 'all' | 'selective';
export function isCarryoverProgramAvailable(program: SessionProgram, availableProgramIds: Set<number>, canUseSpomove: boolean) {
  if (program.sourceType === 'program') return program.programId != null && availableProgramIds.has(program.programId);
  const preset = findOfficialSpomovePreset(program.spomovePresetId ?? '');
  return canUseSpomove && Boolean(preset?.isReady) && preset?.catalogStatus !== 'hold';
}
export function isCarryoverDuplicate(program: SessionProgram, targetPrograms: MasterSessionDto['programs']) { return targetPrograms.some((target) => program.sourceType === 'program' ? target.sourceType === 'program' && target.programId === program.programId : target.sourceType === 'spomove' && target.spomovePresetId === program.spomovePresetId); }
export function selectableCarryoverIds(sourcePrograms: MasterSessionDto['programs'], targetPrograms: MasterSessionDto['programs'], availableProgramIds: Set<number>, canUseSpomove: boolean) { return sourcePrograms.filter((program) => isCarryoverProgramAvailable(program, availableProgramIds, canUseSpomove) && !isCarryoverDuplicate(program, targetPrograms)).map((program) => program.id); }
export function buildNextSessionCarryoverInput(mode: SessionCarryoverMode, selectableIds: string[], selectedIds: string[]) {
  if (mode === 'none' || selectableIds.length === 0) return { copyPrograms: false } as const;
  const sourceSessionProgramIds = mode === 'all' ? selectableIds : selectedIds.filter((id) => selectableIds.includes(id));
  return sourceSessionProgramIds.length > 0 ? { sourceSessionProgramIds } as const : { copyPrograms: false } as const;
}
