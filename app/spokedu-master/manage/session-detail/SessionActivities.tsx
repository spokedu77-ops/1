'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { getSessionActionPolicy } from '../../activity/sessionActionPolicy';
import { buildSessionProgramDetailHref, resolveSessionProgramAvailability } from '../../activity/sessionProgramAvailability';
import { splitLessonTitle } from '../../lib/lessonDisplay';
import { buildManageSessionHref } from '../../lib/masterNavigationContext';
import { findOfficialSpomovePreset, officialPresetSessionHref } from '../../spomove/officialSpomovePresets';
import { resolveSpomovePublicDisplayTitle } from '../../spomove/spomovePublicNaming';
import type { Program } from '../../types';
import type { MasterSessionDto, MasterSessionProgramDto } from '../../types/operational';

type SessionActions = ReturnType<typeof getSessionActionPolicy>;

function SortableActivityRow({
  program,
  activeSession,
  libraryPrograms,
  catalogIds,
  programsLoaded,
  actions,
  saving,
  toggleProgram,
  removeProgram,
}: {
  program: MasterSessionProgramDto;
  activeSession: MasterSessionDto | null;
  libraryPrograms: Program[];
  catalogIds: Set<number>;
  programsLoaded: boolean;
  actions: SessionActions;
  saving: boolean;
  toggleProgram: (program: MasterSessionProgramDto) => Promise<void>;
  removeProgram: (program: MasterSessionProgramDto) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: program.id,
    disabled: !actions.reorderActivities || saving,
  });
  const availability = resolveSessionProgramAvailability(program, catalogIds, programsLoaded);
  const programHref = activeSession && availability.kind === 'available'
    ? buildSessionProgramDetailHref({ programId: availability.programId, sessionId: activeSession.id, sessionProgramId: program.id, returnTo: buildManageSessionHref(activeSession.id) })
    : null;
  const preset = program.spomovePresetId ? findOfficialSpomovePreset(program.spomovePresetId) : null;
  const spomoveHref = activeSession && preset
    ? officialPresetSessionHref(preset, { entry: 'start', session: activeSession.id, sessionProgram: program.id, returnTo: buildManageSessionHref(activeSession.id) })
    : null;
  const detailHref = programHref ?? spomoveHref;
  const officialProgram = program.programId == null ? null : libraryPrograms.find((item) => Number(item.id) === program.programId);
  const displayTitle = program.sourceType === 'spomove'
    ? resolveSpomovePublicDisplayTitle(program.spomovePresetId, preset?.title ?? program.programTitle)
    : officialProgram
      ? splitLessonTitle(officialProgram.title).koreanTitle
      : program.programTitle ?? '이름 없는 활동';
  const content = <span className="min-w-0 flex-1"><span className="line-clamp-2 text-[15px] font-semibold leading-[18px] text-slate-950">{displayTitle}</span><span className="mt-0.5 block text-[12px] font-medium text-slate-500">{program.sourceType === 'spomove' ? 'SPOMOVE' : '놀이체육'}</span></span>;

  return (
    <div
      ref={setNodeRef}
      data-activity-row
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex min-h-[56px] items-center gap-1 py-2 ${isDragging ? 'z-10 rounded-lg bg-white opacity-80 shadow-lg ring-1 ring-blue-200' : ''}`}
    >
      {actions.reorderActivities ? (
        <button
          type="button"
          className="grid h-11 w-8 shrink-0 touch-none cursor-grab place-items-center text-slate-400 hover:text-slate-700 active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
          aria-label={`${displayTitle} 순서 변경`}
          disabled={saving}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
      ) : null}
      <button type="button" disabled={!activeSession || !actions.toggleActivityCompletion} onClick={() => void toggleProgram(program)} className="grid h-11 w-11 shrink-0 place-items-center" aria-label={`${displayTitle} ${program.isCompleted ? '실제 진행' : '미진행'}`}>
        <span className={`grid h-5 w-5 place-items-center rounded-[4px] border ${program.isCompleted ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}><Check size={14} /></span>
      </button>
      {detailHref ? <Link href={detailHref} target={spomoveHref ? '_blank' : undefined} rel={spomoveHref ? 'noreferrer' : undefined} className="flex min-w-0 flex-1">{content}</Link> : content}
      {actions.removeActivities ? (
        <button type="button" disabled={saving} onClick={() => void removeProgram(program)} className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40" aria-label={`${displayTitle} 활동 삭제`}>
          <Trash2 size={17} />
        </button>
      ) : null}
    </div>
  );
}

export function SessionActivities({ isCreate, activeSession, programs, libraryPrograms, catalogIds, programsLoaded, actions, saving, openPicker, toggleProgram, moveProgram, removeProgram }: {
  isCreate: boolean;
  activeSession: MasterSessionDto | null;
  programs: MasterSessionProgramDto[];
  libraryPrograms: Program[];
  catalogIds: Set<number>;
  programsLoaded: boolean;
  actions: SessionActions;
  saving: boolean;
  openPicker: () => void;
  toggleProgram: (program: MasterSessionProgramDto) => Promise<void>;
  moveProgram: (fromIndex: number, toIndex: number) => Promise<void>;
  removeProgram: (program: MasterSessionProgramDto) => Promise<void>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id || saving) return;
    const fromIndex = programs.findIndex((item) => item.id === event.active.id);
    const toIndex = programs.findIndex((item) => item.id === event.over!.id);
    if (fromIndex < 0 || toIndex < 0) return;
    void moveProgram(fromIndex, toIndex);
  }

  const heading = <div className="flex items-center justify-between gap-3"><h3 id="session-activities-heading" className="text-[18px] font-semibold text-slate-950">수업 활동</h3>{actions.addActivities ? <button type="button" onClick={openPicker} className="inline-flex min-h-11 items-center gap-1 rounded-[10px] px-2 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950"><Plus size={16} />활동 추가</button> : null}</div>;

  return (
    <section aria-labelledby="session-activities-heading" className={isCreate ? `mt-5 ${!programs.length ? 'min-h-0' : ''}` : 'mt-5 border-t border-slate-100 pt-4'}>
      {heading}
      {programs.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={programs.map((program) => program.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-1 divide-y divide-slate-100">
              {programs.map((program) => <SortableActivityRow key={program.id} program={program} activeSession={activeSession} libraryPrograms={libraryPrograms} catalogIds={catalogIds} programsLoaded={programsLoaded} actions={actions} saving={saving} toggleProgram={toggleProgram} removeProgram={removeProgram} />)}
            </div>
          </SortableContext>
        </DndContext>
      ) : <p className="mt-1.5 py-2 text-sm text-slate-500">아직 담은 활동이 없습니다.</p>}
    </section>
  );
}
