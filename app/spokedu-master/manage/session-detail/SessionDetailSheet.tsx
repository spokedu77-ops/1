'use client';

import { useRef } from 'react';
import { useMasterCanUseRecords, useMasterCanUseSpomove } from '../../access/MasterAccessProvider';
import { SessionCapturePanel, type SessionCaptureHandle } from '../../activity/SessionCapturePanel';
import { getSessionActionPolicy } from '../../activity/sessionActionPolicy';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { getMasterRequestErrorMessage } from '../../lib/masterRequestError';
import { completionAttendanceMessage, validateCompletionAttendance } from '../../lib/sessionIntegrity';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import type { MasterSessionDto } from '../../types/operational';
import { SessionActivityPicker } from '../SessionActivityPicker';
import { SessionActions } from './SessionActions';
import { SessionActivities } from './SessionActivities';
import { SessionAttendance } from './SessionAttendance';
import { SessionInformation } from './SessionInformation';
import { SessionMemo } from './SessionMemo';
import { useSessionActivities } from './useSessionActivities';
import { useSessionAttendance } from './useSessionAttendance';
import { useSessionDraft } from './useSessionDraft';
import { useSessionSchedule } from './useSessionSchedule';

export function SessionDetailSheet({ session, initialDay, initialClassId, legacyCapture, onClose }: { session: MasterSessionDto | null; initialDay: string; initialClassId?: string | null; legacyCapture: boolean; onClose: () => void }) {
  const data = useOperationalData();
  const canUseRecords = useMasterCanUseRecords();
  const canUseSpomove = useMasterCanUseSpomove();
  const captureRef = useRef<SessionCaptureHandle | null>(null);
  const draft = useSessionDraft({ session, initialDay, initialClassId, classes: data.classes, canUseRecords, onClose });
  const actions = getSessionActionPolicy(draft.status);
  const selectedClass = data.classes.find((item) => item.id === draft.classId) ?? null;
  const attendance = useSessionAttendance({ session, activeSession: draft.activeSession, selectedClass, students: data.students, status: draft.status, saving: draft.saving, dirty: draft.dirty, setDirty: draft.setDirty });
  const activities = useSessionActivities({ session, activeSession: draft.activeSession, data, canUseSpomove, saving: draft.saving, dirty: draft.dirty, canRemove: actions.removeActivities, canToggleCompletion: actions.toggleActivityCompletion, setSaving: draft.setSaving, setDirty: draft.setDirty, setError: draft.setError });
  const schedule = useSessionSchedule({ initialSession: session, classId: draft.classId, startAt: draft.startAt, endAt: draft.endAt, programs: activities.programs, data, input: draft.input, setSaving: draft.setSaving, setDirty: draft.setDirty, setError: draft.setError });
  const isCreate = !draft.activeSession;
  const title = draft.activeSession ? '수업 상세' : '수업 추가';

  async function persist(nextStatus = draft.status) {
    if (!draft.classId || draft.saving) return;
    if (nextStatus === 'completed') {
      const validation = validateCompletionAttendance(attendance.roster.map((student) => student.id), attendance.attendanceInput());
      if (!validation.ok) {
        attendance.setAttendanceOpen(true);
        draft.setError(validation.code === 'mismatch' && validation.missingCount > 0 ? completionAttendanceMessage(validation.missingCount) : '출석 명단을 다시 확인해 주세요.');
        return;
      }
    }
    draft.setSaving(true); draft.setError(null);
    try {
      if (nextStatus === 'completed' && legacyCapture) {
        const captureSaved = await captureRef.current?.save() ?? true;
        if (!captureSaved) throw new Error('수업 기록을 저장하지 못했습니다.');
      }
      if (!draft.activeSession && schedule.repeatMode !== 'none') {
        await schedule.createRecurringSession();
        onClose();
        return;
      }
      const saved = nextStatus === 'completed' && draft.activeSession
        ? await data.completeSession(draft.activeSession.id, draft.input(activities.programs, 'completed'), attendance.attendanceInput())
        : await data.saveSession(draft.input(activities.programs, nextStatus), draft.activeSession?.id);
      if (draft.activeSession && nextStatus === 'scheduled') await data.saveSessionAttendance(saved.id, attendance.attendanceInput());
      draft.setActiveSession(saved); draft.setStatus(saved.status);
      draft.setDirty(false);
      if (nextStatus === 'completed' || !draft.activeSession) onClose();
    } catch (caught) { draft.setError(getMasterRequestErrorMessage(caught) || '수업을 저장하지 못했습니다.'); }
    finally { draft.setSaving(false); }
  }

  function deleteCancelledSession() {
    if (!draft.activeSession) return;
    draft.setSaving(true);
    void data.deleteCancelledSession(draft.activeSession.id).then(onClose).catch((caught) => draft.setError(getMasterRequestErrorMessage(caught) || '수업을 삭제하지 못했습니다.')).finally(() => draft.setSaving(false));
  }

  const footer = draft.status === 'cancelled' ? undefined : <SessionActions status={draft.status} isCreate={isCreate} activeSession={draft.activeSession} dirty={draft.dirty} saving={draft.saving} classId={draft.classId} persist={persist} />;

  return <>
    <BottomSheet open title={title} headerTitle={<h2 className="flex items-center gap-3 text-[18px] font-bold text-slate-950"><span className="h-2.5 w-2.5 rotate-45 border border-slate-700" aria-hidden />{title}</h2>} size="session" onClose={draft.requestClose} footer={footer}>
      <div data-session-detail className={`flex flex-col pb-1 ${isCreate ? '' : 'gap-4'}`}>
        <SessionInformation isCreate={isCreate} activeSession={draft.activeSession} selectedClass={selectedClass} classes={data.classes} classId={draft.classId} startAt={draft.startAt} endAt={draft.endAt} status={draft.status} actions={actions} scheduleOpen={schedule.scheduleOpen} repeatMode={schedule.repeatMode} activeRules={schedule.activeRules} saving={draft.saving} setClassId={draft.setClassId} setStartAt={draft.setStartAt} setEndAt={draft.setEndAt} setScheduleOpen={schedule.setScheduleOpen} setRepeatMode={schedule.setRepeatMode} resetAttendance={() => attendance.setAttendance({})} setDirty={draft.setDirty} persist={persist} deleteCancelledSession={deleteCancelledSession} endRule={schedule.endRule} />
        <SessionActivities isCreate={isCreate} activeSession={draft.activeSession} programs={activities.programs} libraryPrograms={activities.libraryPrograms} catalogIds={activities.catalogIds} programsLoaded={activities.programsLoaded} actions={actions} saving={draft.saving} openPicker={() => activities.setPickerOpen(true)} toggleProgram={activities.toggleProgram} moveProgram={activities.moveProgram} removeProgram={activities.removeProgram} />
        {draft.activeSession && actions.editAttendance ? <SessionAttendance attendance={attendance.attendance} attendanceOpen={attendance.attendanceOpen} roster={attendance.roster} allStudentsPresent={attendance.allStudentsPresent} setAttendanceOpen={attendance.setAttendanceOpen} toggleAllAttendance={attendance.toggleAllAttendance} updateAttendance={attendance.updateAttendance} /> : null}
        {canUseRecords && draft.status !== 'cancelled' ? <SessionMemo isCreate={isCreate} memo={draft.memo} onChange={(memo) => { draft.setMemo(memo); draft.setDirty(true); }} /> : null}
        {legacyCapture && draft.activeSession ? <SessionCapturePanel ref={captureRef} session={draft.activeSession} sessions={data.sessions} students={data.students} classStudentIds={selectedClass?.studentIds ?? []} canUseRecords={canUseRecords} captureMode="emphasized" showInlinePremiumUpsell={false} order={6} memo={draft.memo} onMemoChange={draft.setMemo} /> : null}
        {draft.error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{draft.error}</p> : null}
      </div>
    </BottomSheet>
    <SessionActivityPicker open={activities.pickerOpen} programs={activities.availablePrograms} spomove={activities.availableSpomove} favorites={activities.favoriteActivities} saving={draft.saving} onAdd={activities.addActivities} onClose={() => activities.setPickerOpen(false)} />
  </>;
}
