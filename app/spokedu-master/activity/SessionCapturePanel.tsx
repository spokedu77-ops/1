'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { MasterClassRecordDto } from '../types/legacyOperational';
import type { MasterSessionDto, MasterStudentDto } from '../types/operational';
import { resolvePreviousSessionMemory } from '../lib/sessionMemory';
import { SPM_PRIMARY_BTN, SPM_SECONDARY_BTN } from '../lib/masterActionGrammar';
import { fetchSessionCaptures, saveSessionCapture } from '../lib/sessionCaptureClient';
import type { SessionCaptureSurfaceMode } from './masterSessionWorkspaceModel';
import { sessionSectionOrderClass } from './masterSessionWorkspaceModel';

export function SessionCapturePanel({
  session,
  sessions,
  students,
  classStudentIds,
  canUseRecords,
  captureMode,
  showInlinePremiumUpsell,
  order = 5,
}: {
  session: MasterSessionDto;
  sessions: MasterSessionDto[];
  students: MasterStudentDto[];
  classStudentIds: string[];
  canUseRecords: boolean;
  captureMode: SessionCaptureSurfaceMode;
  showInlinePremiumUpsell: boolean;
  order?: number;
}) {
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
    () => students.filter((student) => classStudentIds.includes(student.id) || session.attendance.some((entry) => entry.studentId === student.id)),
    [classStudentIds, session.attendance, students],
  );
  const capture = captures.find((item) => item.sessionId === session.id) ?? null;
  const previous = resolvePreviousSessionMemory({ currentSession: session, classSessions: sessions, captures });
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
    if (captureMode === 'emphasized' && searchParams.get('capture') !== '0') {
      setOpen(true);
    }
    if (captureMode === 'memory' || captureMode === 'collapsed') {
      if (searchParams.get('capture') !== '1') setOpen(false);
    }
  }, [captureMode, searchParams]);

  async function save() {
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
      setOpen(false);
    } catch {
      setSaveError(true);
    }
    setSaving(false);
  }

  function toggleEditor() {
    if (open && dirty && !window.confirm('저장하지 않은 수업 기록이 있습니다. 닫을까요?')) return;
    setOpen((value) => !value);
  }

  if (captureMode === 'hidden') return null;

  if (!canUseRecords) {
    if (!showInlinePremiumUpsell) return null;
    return (
      <section data-session-capture-gate className={`${orderClass} rounded-xl border border-slate-200 bg-slate-50 p-3`}>
        <p className="text-sm font-black text-slate-800">오늘 관찰을 남기면 다음 준비에 이어집니다</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">출석은 Lite에서도 저장됩니다. 학생별 관찰·다음 수업 메모는 Premium에서 이어집니다.</p>
        <Link
          href={`/spokedu-master/payment?plan=premium&intent=continue_record&next=${encodeURIComponent(`/spokedu-master/activity?session=${session.id}&capture=1`)}&journeyId=${encodeURIComponent(`capture_${session.id}`)}`}
          className="mt-2 inline-flex min-h-11 items-center text-xs font-black text-blue-700"
        >
          Premium으로 기록 이어가기
        </Link>
      </section>
    );
  }

  if (captureMode === 'memory') {
    if (!previous?.capture.applicationIdea && !loadError) return null;
    return (
      <section data-session-capture data-capture-mode="memory" className={`${orderClass} rounded-xl border border-emerald-200 bg-emerald-50 p-3`}>
        {loadError ? <p role="status" className="text-xs font-bold text-amber-700">지난 수업 기록을 불러오지 못했습니다. 수업 준비는 계속할 수 있습니다.</p> : null}
        {previous?.capture.applicationIdea ? (
          <>
            <p className="text-[11px] font-black text-emerald-700">지난 수업에서 이어갈 점</p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">{previous.capture.applicationIdea}</p>
          </>
        ) : null}
      </section>
    );
  }

  const tone = captureMode === 'emphasized'
    ? 'border-emerald-200 bg-emerald-50/40'
    : 'border-slate-200 bg-white';
  const title = captureMode === 'review' ? '오늘 남긴 기록' : '오늘 관찰';
  const openLabel = open ? '닫기' : captureMode === 'review' ? (capture ? '보기/수정' : '기록 없음') : capture ? '기록 보기/수정' : '관찰 남기기';

  return (
    <section data-session-capture data-capture-mode={captureMode} className={`${orderClass} rounded-xl border p-3 ${tone}`}>
      {loadError ? <p role="status" className="mb-2 text-xs font-bold text-amber-700">지난 수업 기록을 불러오지 못했습니다. 수업 진행은 계속할 수 있습니다.</p> : null}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-800">{title}</h3>
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
                className="flex min-h-11 w-full items-center justify-between text-left text-sm font-black text-slate-700"
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
                  />
                  {student.guidanceNote ? <p className="mt-1 text-xs font-semibold text-amber-700">지도 참고사항: {student.guidanceNote}</p> : null}
                </>
              ) : null}
            </div>
          ))}
          <label className="block text-xs font-black text-slate-600">
            다음 수업에 이어갈 점
            <textarea
              value={nextNote}
              onChange={(event) => {
                setNextNote(event.target.value);
                setDirty(true);
              }}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 p-2 text-sm"
            />
          </label>
          {saveError ? <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">기록을 저장하지 못했습니다. 작성한 내용은 그대로 유지됩니다.</p> : null}
          <button type="button" disabled={!dirty || saving} onClick={() => void save()} className={SPM_PRIMARY_BTN}>
            {saving ? '저장 중' : '기록 저장'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
