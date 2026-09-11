'use client';

import { useEffect, useMemo, useState } from 'react';
import { getMasterRequestErrorMessage } from '../../lib/masterRequestError';
import { getFavoritesOwnerId } from '../../lib/favoriteLib';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { OFFICIAL_SPOMOVE_LIBRARY, findOfficialSpomovePreset } from '../../spomove/officialSpomovePresets';
import { isHubListedPreset, isHubRunnablePreset } from '../../spomove/movements/isHubVisiblePreset';
import { buildSpomovePresetSearchHaystack } from '../../spomove/spomovePresetDisplayModel';
import { resolveSpomovePublicDisplayTitle } from '../../spomove/spomovePublicNaming';
import { useMasterStore, useProfile } from '../../store';
import type { MasterSessionDto, MasterSessionProgramDto } from '../../types/operational';
import type { ActivityPickerItem } from '../SessionActivityPicker';

type OperationalData = ReturnType<typeof useOperationalData>;

export function useSessionActivities({
  session,
  activeSession,
  data,
  canUseSpomove,
  saving,
  dirty,
  canRemove,
  canToggleCompletion,
  setSaving,
  setDirty,
  setError,
}: {
  session: MasterSessionDto | null;
  activeSession: MasterSessionDto | null;
  data: OperationalData;
  canUseSpomove: boolean;
  saving: boolean;
  dirty: boolean;
  canRemove: boolean;
  canToggleCompletion: boolean;
  setSaving: (saving: boolean) => void;
  setDirty: (dirty: boolean) => void;
  setError: (error: string | null) => void;
}) {
  const profile = useProfile();
  const favoritesOwnerId = getFavoritesOwnerId(profile);
  const libraryPrograms = useMasterStore((state) => state.programs);
  const programsLoaded = useMasterStore((state) => state.programsLoaded);
  const reloadPrograms = useMasterStore((state) => state.reloadPrograms);
  const favoriteRefs = useMasterStore((state) => favoritesOwnerId ? state.favoriteContentRefsByOwner[favoritesOwnerId] : undefined) ?? [];
  const [programs, setPrograms] = useState<MasterSessionProgramDto[]>(session?.programs ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!programsLoaded) void reloadPrograms();
  }, [programsLoaded, reloadPrograms]);

  useEffect(() => {
    if (!session || saving || dirty) return;
    setPrograms(session.programs);
  }, [dirty, saving, session]);

  const catalogIds = useMemo(() => new Set(libraryPrograms.map((item) => Number(item.id))), [libraryPrograms]);
  const availablePrograms: ActivityPickerItem[] = libraryPrograms
    .filter((item) => !programs.some((program) => program.sourceType === 'program' && program.programId === Number(item.id)))
    .map((item) => ({ key: `program:${item.id}`, title: item.title, description: [item.category, item.grade, item.space].filter(Boolean).join(' · ') }));
  const availableSpomove: ActivityPickerItem[] = canUseSpomove ? OFFICIAL_SPOMOVE_LIBRARY.filter(isHubRunnablePreset)
    .filter((item) => !programs.some((program) => program.sourceType === 'spomove' && program.spomovePresetId === item.id))
    .map((item) => ({ key: `spomove:${item.id}`, title: resolveSpomovePublicDisplayTitle(item.id, item.title), description: item.description || item.recommendedUse, searchText: buildSpomovePresetSearchHaystack(item) })) : [];
  const assignedProgramIds = new Set(programs.filter((item) => item.sourceType === 'program').map((item) => String(item.programId)));
  const assignedSpomoveIds = new Set(programs.filter((item) => item.sourceType === 'spomove' && item.spomovePresetId).map((item) => item.spomovePresetId as string));
  const favoriteActivities = favoriteRefs.flatMap<ActivityPickerItem>((ref) => {
    if (ref.type === 'program') {
      if (assignedProgramIds.has(ref.id)) return [];
      const item = libraryPrograms.find((program) => program.id === ref.id);
      return item ? [{ key: `program:${item.id}` as const, title: item.title, description: [item.category, item.grade, item.space].filter(Boolean).join(' · ') }] : [];
    }
    if (!canUseSpomove || assignedSpomoveIds.has(ref.id)) return [];
    const item = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === ref.id);
    if (!item || !isHubListedPreset(item)) return [];
    return [{ key: `spomove:${item.id}` as const, title: resolveSpomovePublicDisplayTitle(item.id, item.title), description: item.description || item.recommendedUse, searchText: buildSpomovePresetSearchHaystack(item) }];
  });

  async function addActivities(keys: string[]) {
    if (!keys.length) return;
    if (!activeSession) {
      setPrograms((current) => [...current, ...keys.flatMap<MasterSessionProgramDto>((key, index) => {
        const [source, id] = key.split(':', 2);
        if (source === 'program') {
          const item = libraryPrograms.find((program) => program.id === id);
          return item ? [{ id: `draft:${key}`, sourceType: 'program' as const, programId: Number(id), spomovePresetId: null, programTitle: item.title, sortOrder: current.length + index, isCompleted: false }] : [];
        }
        const item = findOfficialSpomovePreset(id);
        return item ? [{ id: `draft:${key}`, sourceType: 'spomove' as const, programId: null, spomovePresetId: id, programTitle: resolveSpomovePublicDisplayTitle(id, item.title), sortOrder: current.length + index, isCompleted: false }] : [];
      })]);
      setDirty(true);
      setPickerOpen(false);
      return;
    }
    const optimistic = keys.flatMap<MasterSessionProgramDto>((key, index) => {
      const [source, id] = key.split(':', 2);
      const program = source === 'program' ? libraryPrograms.find((item) => item.id === id) : null;
      const preset = source === 'spomove' ? findOfficialSpomovePreset(id) : null;
      if (!program && !preset) return [];
      return [{ id: `pending:${key}`, sourceType: source as 'program' | 'spomove', programId: program ? Number(id) : null, spomovePresetId: preset ? id : null, programTitle: program?.title ?? resolveSpomovePublicDisplayTitle(id, preset?.title), sortOrder: programs.length + index, isCompleted: false }];
    });
    setPrograms((current) => [...current, ...optimistic]);
    setPickerOpen(false);
    setSaving(true); setError(null);
    try {
      for (const key of keys) {
        const [source, id] = key.split(':', 2);
        const added = source === 'spomove' ? await data.addSessionSpomove(activeSession.id, id) : await data.addSessionProgram(activeSession.id, Number(id));
        setPrograms((current) => current.map((item) => item.id === `pending:${key}` ? added : item));
      }
    } catch (caught) {
      setPrograms((current) => current.filter((item) => !optimistic.some((pending) => pending.id === item.id)));
      setError(getMasterRequestErrorMessage(caught) || '활동을 추가하지 못했습니다.');
    } finally { setSaving(false); }
  }

  async function toggleProgram(program: MasterSessionProgramDto) {
    if (!activeSession || !canToggleCompletion || saving) return;
    setSaving(true); setError(null);
    try { await data.updateSessionProgram(activeSession.id, program.id, !program.isCompleted); setPrograms((current) => current.map((item) => item.id === program.id ? { ...item, isCompleted: !item.isCompleted } : item)); }
    catch (caught) { setError(getMasterRequestErrorMessage(caught) || '활동 상태를 저장하지 못했습니다.'); }
    finally { setSaving(false); }
  }

  async function moveProgram(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= programs.length || saving) return;
    const next = [...programs]; [next[index], next[target]] = [next[target]!, next[index]!];
    const ordered = next.map((item, sortOrder) => ({ ...item, sortOrder }));
    if (!activeSession) { setPrograms(ordered); setDirty(true); return; }
    const previous = programs;
    setPrograms(ordered); setSaving(true);
    try { setPrograms(await data.reorderSessionPrograms(activeSession.id, ordered.map((item) => item.id))); }
    catch (caught) { setPrograms(previous); setError(getMasterRequestErrorMessage(caught) || '활동 순서를 저장하지 못했습니다.'); }
    finally { setSaving(false); }
  }

  async function removeProgram(program: MasterSessionProgramDto) {
    if (!canRemove || saving) return;
    if (!activeSession) { setPrograms((current) => current.filter((item) => item.id !== program.id).map((item, sortOrder) => ({ ...item, sortOrder }))); setDirty(true); return; }
    const previous = programs;
    setPrograms((current) => current.filter((item) => item.id !== program.id).map((item, sortOrder) => ({ ...item, sortOrder })));
    setSaving(true); setError(null);
    try { await data.removeSessionProgram(activeSession.id, program.id); }
    catch (caught) { setPrograms(previous); setError(getMasterRequestErrorMessage(caught) || '활동을 삭제하지 못했습니다.'); }
    finally { setSaving(false); }
  }

  return { programs, setPrograms, libraryPrograms, programsLoaded, catalogIds, availablePrograms, availableSpomove, favoriteActivities, pickerOpen, setPickerOpen, addActivities, toggleProgram, moveProgram, removeProgram };
}
