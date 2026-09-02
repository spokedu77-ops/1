'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { MasterClassRecordDto } from '../types/legacyOperational';
import type { MasterSessionDto, MasterStudentDto } from '../types/operational';
import { resolvePreviousSessionMemory, selectCurrentRosterObservations } from '../lib/sessionMemory';
import { SPM_PRIMARY_BTN, SPM_SECONDARY_BTN } from '../lib/masterActionGrammar';
import { SPM_JOURNEY_FIELD, SPM_JOURNEY_META } from '../lib/masterUiClasses';
import { fetchSessionCaptures, saveSessionCapture } from '../lib/sessionCaptureClient';
import type { SessionCaptureSurfaceMode } from './masterSessionWorkspaceModel';
import { sessionSectionOrderClass } from './masterSessionWorkspaceModel';

export type SessionCaptureHandle = { save: () => Promise<boolean> };

export const SessionCapturePanel = forwardRef<SessionCaptureHandle, {
  session: MasterSessionDto;
  sessions: MasterSessionDto[];
  students: MasterStudentDto[];
  classStudentIds: string[];
  canUseRecords: boolean;
  captureMode: SessionCaptureSurfaceMode;
  showInlinePremiumUpsell: boolean;
  order?: number;
  memo: string;
  onMemoChange: (value: string) => void;
}>(function SessionCapturePanel({
  session,
  sessions,
  students,
  classStudentIds,
  canUseRecords,
  captureMode,
  showInlinePremiumUpsell,
  order = 5,
  memo,
  onMemoChange,
}, ref) {
  const searchParams = useSearchParams();
  const [captures, setCaptures] = useState<MasterClassRecordDto[]>([]);
  const [open, setOpen] = useState(() => searchParams.get('capture') === '1');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [nextNote, setNextNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const roster = useMemo(
    () => students.filter((student) => classStudentIds.includes(student.id)),
    [classStudentIds, students],
  );
  const capture = captures.find((item) => item.sessionId === session.id) ?? null;
  const previous = resolvePreviousSessionMemory({ currentSession: session, classSessions: sessions, captures });
  const currentRosterIds = useMemo(() => new Set(classStudentIds), [classStudentIds]);
  const previousObservations = selectCurrentRosterObservations(previous?.capture ?? null, currentRosterIds);
  const guidanceStudents = students.filter((student) => currentRosterIds.has(student.id) && Boolean(student.guidanceNote?.trim()));
  const previousActivities = previous?.session.programs ?? [];
  const hasPreviousMemory = Boolean(
    previous?.capture?.applicationIdea?.trim()
    || previousObservations.length
    || guidanceStudents.length
    || previousActivities.length
  );
  const recordedCount = capture?.students.filter((student) => student.memo).length ?? 0;
  const orderClass = sessionSectionOrderClass(order);
  const needsCaptureData = canUseRecords && captureMode !== 'hidden';

  useEffect(() => {
    if (!needsCaptureData) return;
    const limit = captureMode === 'memory' ? 8 : 40;
    void fetchSessionCaptures(`class=${encodeURIComponent(session.classId)}&limit=${limit}`).then((result) => {
      if (result.status === 'error') {
        setLoadError(true);
        return;
      }
      setLoadError(false);
      setCaptures(result.data);
      const current = result.data.find((item) => item.sessionId === session.id);
      setNextNote(current?.applicationIdea ?? '');
      setObservations(Object.fromEntries(current?.students.map((student) => [student.studentId, student.memo ?? '']).filter(([id]) => id) ?? []));
    });
  }, [needsCaptureData, captureMode, session.classId, session.id]);

  useEffect(() => {
    if (captureMode === 'emphasized') {
      setOpen(searchParams.get('capture') === '1');
    }
    if (captureMode === 'memory' || captureMode === 'collapsed') {
      if (searchParams.get('capture') !== '1') setOpen(false);
    }
  }, [captureMode, searchParams]);

  async function save() {
    if (!dirty) return true;
    setSaving(true);
    setSaveError(false);
    try {
      const saved = await saveSessionCapture({
        sessionId: session.id,
        nextSessionNote: nextNote,
        observations: Object.entries(observations).filter(([, memo]) => memo.trim()).map(([studentId, memo]) => ({ studentId, memo })),
      });
      setCaptures((items) => [...items.filter((item) => item.sessionId !== session.id), saved]);
      setDirty(false);
      setSaving(false);
      return true;
    } catch {
      setSaveError(true);
      setSaving(false);
      return false;
    }
  }

  useImperativeHandle(ref, () => ({ save }));

  function toggleEditor() {
    if (open && dirty && !window.confirm('저장하지 않은 수업 기록이 있습니다. 닫을까요?')) return;
    setOpen((value) => !value);
  }

  if (captureMode === 'hidden') return null;

  if (!canUseRecords) {
    if (!showInlinePremiumUpsell) return null;
    return (
      <section data-session-capture-gate className={`${orderClass} rounded-xl border border-slate-200 bg-slate-50 p-3`}>
        <p className="text-sm font-semibold text-slate-800">오늘 관찰을 남기면 다음 준비에 이어집니다</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">출석은 Lite에서도 저장됩니다. 학생별 관찰·다음 수업 메모는 Premium에서 이어집니다.</p>
        <Link
          href={`/spokedu-master/payment?plan=premium&intent=continue_record&next=${encodeURIComponent(`/spokedu-master/activity?session=${session.id}&capture=1`)}&journeyId=${encodeURIComponent(`capture_${session.id}`)}`}
          className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-blue-700"
        >
          Premium으로 기록 이어가기
        </Link>
      </section>
    );
  }

  if (captureMode === 'memory') {
    if (!hasPreviousMemory && !loadError) return null;
    const nextSessionNote = previous?.capture?.applicationIdea?.trim() ?? '';
    return (
      <section data-session-capture data-capture-mode="memory" className={`${orderClass} rounded-xl bg-slate-50 px-4 py-3`}>
        {loadError ? <p role="status" className="text-xs font-bold text-amber-700">지난 수업 기록을 불러오지 못했습니다. 수업 준비는 계속할 수 있습니다.</p> : null}
        {hasPreviousMemory ? (
          <>
            <h3 className="text-base font-semibold text-slate-900">지난 수업에서 이어갈 점</h3>
            {nextSessionNote ? <p className="mt-2 whitespace-pre-wrap text-base font-semibold leading-6 text-slate-900">{nextSessionNote}</p> : null}
            <p className={`mt-3 ${SPM_JOURNEY_META}`}>학생 기록 {previousObservations.length}명 · 지난 활동 {previousActivities.length}개{guidanceStudents.length ? ` · 지도 참고 ${guidanceStudents.length}명` : ''}</p>
            <details className="mt-2 border-t border-slate-100 pt-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center text-xs font-medium text-slate-600">지난 수업 자세히 보기</summary>
              <div className="space-y-4 pb-2 text-sm text-slate-700">
                {previousObservations.length ? <div><p className="text-xs font-bold text-slate-500">학생 기록</p><div className="mt-2 space-y-2">{previousObservations.map((observation) => <p key={observation.id}><strong>{observation.studentName}</strong> · {observation.memo}</p>)}</div></div> : null}
                {previousActivities.length ? <div><p className="text-xs font-bold text-slate-500">지난 활동</p><p className="mt-2 font-medium">{previousActivities.map((activity) => activity.programTitle ?? (activity.sourceType === 'spomove' ? 'SPOMOVE' : '이름 없는 활동')).join(', ')}</p></div> : null}
                {guidanceStudents.length ? <div><p className="text-xs font-bold text-slate-500">지도 참고</p><div className="mt-2 space-y-2">{guidanceStudents.map((student) => <p key={student.id}><strong>{student.name}</strong> · {student.guidanceNote}</p>)}</div></div> : null}
              </div>
            </details>
          </>
        ) : null}
      </section>
    );
  }

  if (captureMode === 'emphasized') {
    return (
      <section data-session-capture data-capture-mode="emphasized" className={`${orderClass} divide-y divide-slate-200`}>
        <div className="pb-4">
          <h3 className="text-lg font-semibold text-slate-900">수업 마무리</h3>
          <label className="mt-3 block text-sm font-semibold text-slate-800">
            오늘 기억해둘 점 <span className="font-medium text-slate-400">· 선택</span>
            <textarea value={memo} onChange={(event) => onMemoChange(event.target.value)} className={`mt-2 min-h-20 ${SPM_JOURNEY_FIELD}`} placeholder="오늘 수업에서 기억할 만한 일이 있었나요?" maxLength={2000} />
          </label>
        </div>
        {canUseRecords ? <div className="py-4">
          <label className="block text-sm font-semibold text-slate-800">
            다음 시간에 이어갈 점 <span className="font-medium text-slate-400">· 선택</span>
            <textarea value={nextNote} onChange={(event) => { setNextNote(event.target.value); setDirty(true); }} className={`mt-2 min-h-20 ${SPM_JOURNEY_FIELD}`} placeholder="다음 시간에는 공의 거리를 조금 늘려보기" maxLength={500} />
          </label>
        </div> : null}
        {canUseRecords ? <details className="py-2" open={open || undefined} onToggle={(event) => setOpen(event.currentTarget.open)}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-700"><span>학생별 기록</span><span className={SPM_JOURNEY_META}>{Object.values(observations).filter((value) => value.trim()).length}/{roster.length}명</span></summary>
          <div className="space-y-3 pb-3">
            {roster.map((student) => <label key={student.id} className="block text-sm font-medium text-slate-700">{student.name}<textarea value={observations[student.id] ?? ''} onChange={(event) => { setObservations((items) => ({ ...items, [student.id]: event.target.value })); setDirty(true); }} className={`mt-1 min-h-16 ${SPM_JOURNEY_FIELD}`} placeholder="짧은 관찰 기록" maxLength={1000} /></label>)}
            {!roster.length ? <p className="text-sm font-medium text-slate-400">현재 수업반 학생이 없습니다.</p> : null}
          </div>
        </details> : null}
        {loadError ? <p role="status" className="py-3 text-xs font-medium text-amber-700">기존 기록을 불러오지 못했습니다. 메모 없이 마무리할 수 있습니다.</p> : null}
        {saveError ? <p role="alert" className="py-3 text-xs font-bold text-rose-700">기록을 저장하지 못했습니다. 입력 내용은 유지됩니다.</p> : null}
        {saving ? <p className="py-3 text-center text-xs font-medium text-slate-400">기록 저장 중…</p> : null}
      </section>
    );
  }

  const tone = 'border-slate-200 bg-white';
  const title = captureMode === 'review' ? '오늘 남긴 기록' : '오늘 관찰';
  const openLabel = open ? '닫기' : captureMode === 'review' ? (capture ? '보기/수정' : '기록 없음') : capture ? '기록 보기/수정' : '관찰 남기기';

  return (
    <section data-session-capture data-capture-mode={captureMode} className={`${orderClass} rounded-xl border p-3 ${tone}`}>
      {loadError ? <p role="status" className="mb-2 text-xs font-bold text-amber-700">지난 수업 기록을 불러오지 못했습니다. 수업 진행은 계속할 수 있습니다.</p> : null}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {recordedCount}명 기록 · 다음 수업 메모 {capture?.applicationIdea ? '있음' : '없음'}
          </p>
        </div>
        <button type="button" onClick={toggleEditor} className={SPM_SECONDARY_BTN}>{openLabel}</button>
      </div>
      {open ? (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {roster.map((student) => (
            <div key={student.id} className="rounded-lg border border-slate-200 bg-white p-2">
              <button
                type="button"
                onClick={() => setActiveStudentId(activeStudentId === student.id ? null : student.id)}
                className="flex min-h-11 w-full items-center justify-between text-left text-sm font-semibold text-slate-700"
              >
                <span>
                  {student.name}
                  {student.guidanceNote ? <small className="ml-2 text-amber-700">지도 참고사항 있음</small> : null}
                </span>
                <span>{observations[student.id]?.trim() ? '기록됨' : '메모 추가'}</span>
              </button>
              {activeStudentId === student.id ? (
                <>
                  <textarea
                    value={observations[student.id] ?? ''}
                    onChange={(event) => {
                      setObservations((items) => ({ ...items, [student.id]: event.target.value }));
                      setDirty(true);
                    }}
                    className="min-h-20 w-full rounded-lg border border-slate-200 p-2 text-sm"
                    placeholder="오늘 관찰한 사실을 짧게 적어주세요."
                    maxLength={1000}
                  />
                  {student.guidanceNote ? <p className="mt-1 text-xs font-semibold text-amber-700">지도 참고사항: {student.guidanceNote}</p> : null}
                </>
              ) : null}
            </div>
          ))}
          <label className="block text-[13px] font-medium text-slate-600">
            다음 수업에 이어갈 점
            <textarea
              value={nextNote}
              onChange={(event) => {
                setNextNote(event.target.value);
                setDirty(true);
              }}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 p-2 text-sm"
              placeholder="예: 2단계 설명을 짧게 하고 시범을 먼저 보여주기"
              maxLength={500}
            />
            <span className="mt-1 block text-right text-[11px] font-semibold text-slate-400">{nextNote.length}/500</span>
          </label>
          {saveError ? <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">기록을 저장하지 못했습니다. 작성한 내용은 그대로 유지됩니다.</p> : null}
          <button type="button" disabled={!dirty || saving} onClick={() => void save()} className={SPM_PRIMARY_BTN}>
            {saving ? '저장 중' : '기록 저장'}
          </button>
        </div>
      ) : null}
    </section>
  );
});
