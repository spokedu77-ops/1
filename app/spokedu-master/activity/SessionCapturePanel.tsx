'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { MasterClassRecordDto } from '../types/legacyOperational';
import type { MasterSessionDto, MasterStudentDto } from '../types/operational';
import { resolvePreviousSessionMemory } from '../lib/sessionMemory';
import { SPM_PRIMARY_BTN, SPM_SECONDARY_BTN } from '../lib/masterActionGrammar';

export function SessionCapturePanel({ session, sessions, students, classStudentIds, canUseRecords, presentationKind }: {
  session: MasterSessionDto;
  sessions: MasterSessionDto[];
  students: MasterStudentDto[];
  classStudentIds: string[];
  canUseRecords: boolean;
  presentationKind: string;
}) {
  const searchParams = useSearchParams();
  const [captures, setCaptures] = useState<MasterClassRecordDto[]>([]);
  const [open, setOpen] = useState(() => searchParams.get('capture') === '1');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [nextNote, setNextNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const roster = useMemo(() => students.filter((student) => classStudentIds.includes(student.id) || session.attendance.some((entry) => entry.studentId === student.id)), [classStudentIds, session.attendance, students]);
  const capture = captures.find((item) => item.sessionId === session.id) ?? null;
  const previous = resolvePreviousSessionMemory({ currentSession: session, classSessions: sessions, captures });

  useEffect(() => {
    if (!canUseRecords) return;
    void fetch(`/api/spokedu-master/session-captures?class=${encodeURIComponent(session.classId)}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('capture load failed')))
      .then((json: { data: MasterClassRecordDto[] }) => {
        setCaptures(json.data);
        const current = json.data.find((item) => item.sessionId === session.id);
        setNextNote(current?.applicationIdea ?? '');
        setObservations(Object.fromEntries(current?.students.map((student) => [student.studentId, student.memo ?? '']).filter(([id]) => id) ?? []));
      }).catch(() => undefined);
  }, [canUseRecords, session.classId, session.id]);

  async function save() {
    setSaving(true);
    const response = await fetch('/api/spokedu-master/session-captures', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      sessionId: session.id, nextSessionNote: nextNote,
      observations: Object.entries(observations).filter(([, memo]) => memo.trim()).map(([studentId, memo]) => ({ studentId, memo })),
    }) });
    if (response.ok) {
      const json = await response.json() as { data: MasterClassRecordDto };
      setCaptures((items) => [...items.filter((item) => item.sessionId !== session.id), json.data]);
      setDirty(false); setOpen(false);
    }
    setSaving(false);
  }

  function toggleEditor() {
    if (open && dirty && !window.confirm('저장하지 않은 수업 기록이 있습니다. 닫을까요?')) return;
    setOpen((value) => !value);
  }

  if (!canUseRecords) return <section className="order-5 rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-black text-slate-800">개별 관찰과 다음 수업 메모</p><Link href={`/spokedu-master/payment?plan=premium&intent=session_capture&next=${encodeURIComponent(`/spokedu-master/activity?session=${session.id}&capture=1`)}&journeyId=${encodeURIComponent(`capture_${session.id}`)}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-black text-blue-700">수업 기록 사용하기</Link></section>;

  return <section data-session-capture className="order-5 rounded-xl border border-slate-200 bg-white p-3">
    {presentationKind === 'PREP' && previous?.capture.applicationIdea ? <div className="mb-3 rounded-lg bg-emerald-50 p-3"><p className="text-[11px] font-black text-emerald-700">지난 수업에서 이어갈 점</p><p className="mt-1 text-sm font-semibold text-emerald-900">{previous.capture.applicationIdea}</p></div> : null}
    <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-800">개별 관찰</h3><p className="mt-1 text-xs font-semibold text-slate-500">{capture?.students.filter((student) => student.memo).length ?? 0}명 기록 · 다음 수업 메모 {capture?.applicationIdea ? '있음' : '없음'}</p></div><button type="button" onClick={toggleEditor} className={SPM_SECONDARY_BTN}>{open ? '닫기' : capture ? '기록 보기/수정' : '관찰 메모'}</button></div>
    {open ? <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      {roster.map((student) => <div key={student.id} className="rounded-lg border border-slate-200 p-2"><button type="button" onClick={() => setActiveStudentId(activeStudentId === student.id ? null : student.id)} className="flex min-h-11 w-full items-center justify-between text-left text-sm font-black text-slate-700"><span>{student.name}{student.guidanceNote ? <small className="ml-2 text-amber-700">지도 참고사항 있음</small> : null}</span><span>{observations[student.id]?.trim() ? '기록됨' : '메모 추가'}</span></button>{activeStudentId === student.id ? <><textarea value={observations[student.id] ?? ''} onChange={(event) => { setObservations((items) => ({ ...items, [student.id]: event.target.value })); setDirty(true); }} className="min-h-20 w-full rounded-lg border border-slate-200 p-2 text-sm" placeholder="오늘 관찰한 사실을 짧게 적어주세요." />{student.guidanceNote ? <p className="mt-1 text-xs font-semibold text-amber-700">지도 참고사항: {student.guidanceNote}</p> : null}</> : null}</div>)}
      <label className="block text-xs font-black text-slate-600">다음 수업에 이어갈 점<textarea value={nextNote} onChange={(event) => { setNextNote(event.target.value); setDirty(true); }} className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 p-2 text-sm" /></label>
      <button type="button" disabled={!dirty || saving} onClick={() => void save()} className={SPM_PRIMARY_BTN}>{saving ? '저장 중' : '기록 저장'}</button>
    </div> : null}
  </section>;
}
