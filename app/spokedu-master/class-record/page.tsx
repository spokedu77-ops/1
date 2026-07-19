'use client';

import Link from 'next/link';
import { isSameDay } from 'date-fns';
import { AlertTriangle, BookOpen, Check, ChevronRight, ClipboardList, FileText, History, MessageCircle, Star, UserCheck, UserX } from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { RecordProgramPicker } from '../components/record/RecordProgramPicker';
import { BottomSheet } from '../components/ui/BottomSheet';
import { SaveErrorBanner } from '../components/ui/SaveErrorBanner';
import { classRecordToCreateInput, toClassRecord, toStudentProfile } from '../lib/operationalDataAdapter';
import {
  canAttemptOnlineSave,
  getOfflineSaveFeedback,
  resolveSaveActionFeedback,
  type SaveActionFeedback,
} from '../lib/saveActionFeedback';
import {
  CLASS_RECORD_DRAFT_KEY,
  clearSaveDraft,
  hasMeaningfulClassRecordDraft,
  readSaveDraft,
  writeSaveDraft,
} from '../lib/saveDraftStorage';
import { resolveSpomoveDraftFromQuery } from '../spomove/session/spomoveRecordDraft';
import { useMasterAccessSnapshot } from '../access/MasterAccessProvider';
import {
  canCreateClassRecordFromSnapshot,
  getUpgradeHrefFromSnapshot,
  getUpgradeLabelFromSnapshot,
} from '../lib/masterAccessModel';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore } from '../store';
import type { AttendanceStatus, ClassRecord, StudentProfile } from '../types';

function getClassRecordQuery(searchParams: URLSearchParams | ReturnType<typeof useSearchParams>) {
  return {
    programId: searchParams.get('program') ?? searchParams.get('programId'),
    recordId: searchParams.get('record'),
    sourceRecordId: searchParams.get('from'),
    studentId: searchParams.get('student') ?? searchParams.get('studentId'),
    spomoveDraft: resolveSpomoveDraftFromQuery(searchParams),
  };
}

const DEFAULT_SKILLS = ['방향 전환', '균형 유지', '신호 반응', '차분한 대기'];

type ClassRecordDraft = {
  selectedProgramId: string;
  recordDate: string;
  classId: string;
  classMemo: string;
  attendance: Record<string, AttendanceStatus>;
  focused: Record<string, boolean>;
  checkedSkills: Record<string, string[]>;
  studentMemos: Record<string, string>;
  selectedStudentIds: Record<string, boolean>;
  bulkStudentMemo: string;
};

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[12px] p-2.5 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: tone }}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
    </div>
  );
}

function OutcomeCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[14px] p-3" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-acc-a14)' }}>{icon}</span>
        <p className="text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
      </div>
      <p className="text-[13px] font-bold leading-5" style={{ color: 'var(--spm-t)' }}>{value}</p>
    </div>
  );
}

function EmptyRecordState() {
  return (
    <div className="rounded-[18px] p-6 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-[14px]" style={{ background: 'var(--spm-acc-a14)' }}>
        <ClipboardList size={22} color="var(--spm-acc)" />
      </span>
      <h2 className="mt-4 text-[18px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>아직 남긴 수업 기록이 없습니다.</h2>
      <p className="mx-auto mt-2 max-w-[440px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>날짜와 관찰 한 줄만 남겨도 학생 이력과 안내문 초안으로 이어집니다. 필요할 때 같은 기록에 출석·관찰을 보강하세요.</p>
      <div className="mt-5 flex justify-center">
        <RecordProgramPicker label="첫 수업 기록 남기기" />
      </div>
    </div>
  );
}

function RecordLoadingState() {
  return (
    <div className="rounded-[18px] p-5 text-[13px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>
      수업 기록을 불러오는 중입니다.
    </div>
  );
}

function RecordErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-[18px] p-5 text-[13px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: 'var(--spm-red)' }}>
      <p>수업 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={onRetry} className="mt-3 h-11 rounded-[10px] px-4 text-[12px] font-black text-white" style={{ background: 'var(--spm-red)' }}>
        다시 시도
      </button>
    </div>
  );
}

function RecordCard({ record }: { record: ClassRecord }) {
  const hasMemo = Boolean(record.memo?.trim() || record.parentNoteSnapshot?.trim());
  const hasObservation = record.focusCount > 0 || record.skillCount > 0 || record.students.some((student) => Boolean(student.memo?.trim()));
  const isQuick = record.recordType === 'quick';

  return (
    <article className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>
            {new Date(record.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} · {record.classId}
            {isQuick ? ' · 빠른 기록' : ''}
          </p>
          <h2 className="mt-1 text-[18px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0, wordBreak: 'keep-all' }}>{record.programTitle}</h2>
        </div>
      </div>
      <p className="mt-2 break-words text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
        {isQuick
          ? (hasMemo ? '관찰 메모 있음' : '관찰 메모 없음') + (record.focusCount > 0 ? ' · 집중 관찰 있음' : '')
          : `출석 ${record.present}명${hasMemo ? ' · 메모 있음' : hasObservation ? ' · 관찰 기록 있음' : ''}`}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link href={`/spokedu-master/class-record?record=${record.id}&program=${record.programId}`} className="inline-flex h-11 max-w-full items-center justify-center gap-1.5 rounded-[10px] px-3 text-center text-[13px] font-black leading-tight text-white" style={{ background: 'var(--spm-acc)' }}>
          <ClipboardList size={13} /> {isQuick ? '이 기록 보강' : '기록 보기'}
        </Link>
        <Link href={`/spokedu-master/report?record=${record.id}&program=${record.programId}`} className="inline-flex h-11 max-w-full items-center justify-center gap-1.5 rounded-[10px] px-3 text-center text-[13px] font-black leading-tight" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
          <FileText size={13} /> 안내문 만들기
        </Link>
      </div>
    </article>
  );
}

function RecordListView() {
  const operationalData = useOperationalData();
  const records = operationalData.classRecords.map(toClassRecord);
  const operationalLoading = operationalData.status === 'idle' || operationalData.status === 'loading';
  const operationalError = operationalData.status === 'error';
  const operationalReady = operationalData.status === 'ready';
  const [classFilter, setClassFilter] = useState('전체');
  const [periodFilter, setPeriodFilter] = useState<'week' | 'month' | 'all'>('week');
  const classes = useMemo(
    () => ['전체', ...Array.from(new Set(records.map((r) => r.classId)))],
    [records],
  );
  const filteredRecords = records.filter((record) => {
    const classMatched = classFilter === '전체' || record.classId === classFilter;
    const now = Date.now();
    const recordDate = new Date(record.date);
    const periodMatched = periodFilter === 'all' || (periodFilter === 'week'
      ? now - recordDate.getTime() <= 7 * 24 * 3600 * 1000
      : now - recordDate.getTime() <= 31 * 24 * 3600 * 1000);
    return classMatched && periodMatched;
  });

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>수업 기록</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 기록</h1>
        <p className="mt-2 max-w-[680px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>짧게 남긴 빠른 기록과 보강된 상세 기록이 학생 이력·안내문 근거로 쌓입니다.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <RecordProgramPicker label="오늘 수업 기록 남기기" />
          <Link href="/spokedu-master/students" className="inline-flex min-h-11 items-center justify-center rounded-[12px] px-3 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>
            학생 명단 관리
          </Link>
        </div>
      </header>

      {operationalLoading ? (
        <section className="px-[22px] sm:px-8 lg:px-10">
          <RecordLoadingState />
        </section>
      ) : null}

      {operationalError ? (
        <section className="px-[22px] sm:px-8 lg:px-10">
          <RecordErrorState onRetry={() => void operationalData.reload()} />
        </section>
      ) : null}

      {operationalReady ? (
        <>
          <section className="mb-5 px-[22px] sm:px-8 lg:px-10">
            {classes.length > 1 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {classes.map((cls) => (
                  <button key={cls} type="button" onClick={() => setClassFilter(cls)} className="min-h-11 max-w-[40vw] truncate rounded-full px-4 text-[12px] font-black" style={{ background: classFilter === cls ? 'var(--spm-acc)' : 'var(--spm-s2)', color: classFilter === cls ? '#fff' : 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }} title={cls}>{cls}</button>
                ))}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {([['week', '이번 주'], ['month', '이번 달'], ['all', '전체 기간']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setPeriodFilter(value)} className="min-h-11 rounded-full px-4 text-[12px] font-black" style={{ background: periodFilter === value ? 'var(--spm-grn-a15)' : 'var(--spm-s2)', color: periodFilter === value ? 'var(--spm-grn)' : 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>{label}</button>
              ))}
            </div>
          </section>

          <section className="grid gap-3 px-[22px] sm:px-8 md:grid-cols-2 lg:px-10 xl:grid-cols-3">
            {filteredRecords.length
              ? filteredRecords.map((record) => <RecordCard key={record.id} record={record} />)
              : <div className="md:col-span-2 xl:col-span-3"><EmptyRecordState /></div>}
          </section>
        </>
      ) : null}
    </div>
  );
}

function StudentRow({ student, attendance, focused, onAttendance, onFocus, onOpen, disabled }: { student: StudentProfile; attendance: AttendanceStatus; focused: boolean; onAttendance: (status: AttendanceStatus) => void; onFocus: () => void; onOpen: () => void; disabled: boolean }) {
  const dot = attendance === 'present' ? 'var(--spm-grn)' : attendance === 'absent' ? 'var(--spm-red)' : 'var(--spm-t3)';
  return (
    <div className="rounded-[15px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
      <button type="button" onClick={onOpen} disabled={disabled} className="flex w-full items-center gap-3 text-left disabled:opacity-60">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-[15px] font-black text-white" style={{ background: 'var(--spm-acc)', fontFamily: 'var(--spm-font-display)' }}>
          {student.name.slice(0, 1)}
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full" style={{ background: dot, border: '2px solid var(--spm-s2)' }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <strong className="truncate text-[14px]" style={{ color: 'var(--spm-t)' }}>{student.name}</strong>
          </span>
          <span className="mt-1 block truncate text-[11px]" style={{ color: 'var(--spm-t3)' }}>{student.meta}</span>
        </span>
        <ChevronRight size={16} color="var(--spm-t3)" />
      </button>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" disabled={disabled} onClick={() => onAttendance('present')} className="flex min-h-11 items-center justify-center rounded-[11px] disabled:opacity-40" style={{ background: attendance === 'present' ? 'var(--spm-grn-a16)' : 'var(--spm-s3)' }} aria-label={`${student.name} 출석`}>
          <UserCheck size={17} color={attendance === 'present' ? 'var(--spm-grn)' : 'var(--spm-t3)'} />
        </button>
        <button type="button" disabled={disabled} onClick={() => onAttendance('absent')} className="flex min-h-11 items-center justify-center rounded-[11px] disabled:opacity-40" style={{ background: attendance === 'absent' ? 'rgba(239,68,68,0.15)' : 'var(--spm-s3)' }} aria-label={`${student.name} 결석`}>
          <UserX size={17} color={attendance === 'absent' ? 'var(--spm-red)' : 'var(--spm-t3)'} />
        </button>
        <button type="button" disabled={disabled} onClick={onFocus} className="flex min-h-11 items-center justify-center rounded-[11px] disabled:opacity-40" style={{ background: focused ? 'var(--spm-amb-a16)' : 'var(--spm-s3)' }} aria-label={`${student.name} 집중 관찰`}>
          <Star size={17} color={focused ? 'var(--spm-amb)' : 'var(--spm-t3)'} fill={focused ? 'var(--spm-amb)' : 'none'} />
        </button>
      </div>
    </div>
  );
}

function RecordEntryView() {
  const searchParams = useSearchParams();
  const lessons = useMasterStore((state) => state.lessons);
  const operationalData = useOperationalData();
  const students = useMemo(() => operationalData.students.map(toStudentProfile), [operationalData.students]);
  const records = useMemo(() => operationalData.classRecords.map(toClassRecord), [operationalData.classRecords]);
  const programs = useMasterStore((state) => state.programs);
  const isOnline = useMasterStore((state) => state.operational.online);
  const todayLesson = lessons.find((l) => isSameDay(new Date(l.date), new Date()) && !l.done) ?? lessons.find((l) => isSameDay(new Date(l.date), new Date()));
  const { programId: requestedProgramId, recordId: requestedRecordId, sourceRecordId, studentId: requestedStudentId, spomoveDraft } = getClassRecordQuery(searchParams);
  const editingRecord = requestedRecordId ? records.find((record) => record.id === requestedRecordId) ?? null : null;
  const sourceRecord = !requestedRecordId && sourceRecordId
    ? records.find((record) => record.id === sourceRecordId) ?? null
    : null;
  const initialProgramId = editingRecord?.programId ?? sourceRecord?.programId ?? requestedProgramId ?? '';
  const defaultClassId = todayLesson?.classId ?? students[0]?.group ?? '수업';
  const activePeriod = todayLesson?.period ?? 3;
  const [selectedProgramId, setSelectedProgramId] = useState(initialProgramId);
  const program = programs.find((item) => item.id === selectedProgramId) ?? null;
  const activeLessonTitle = editingRecord?.lessonTitle || (selectedProgramId ? program?.title ?? '수업 기록' : todayLesson?.title ?? '수업 기록');
  const skills = useMemo(() => {
    const fromTags = (program?.tags ?? []).filter((t) => t !== 'SPOMOVE').slice(0, 6);
    return fromTags.length >= 2 ? fromTags : DEFAULT_SKILLS;
  }, [program]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => Object.fromEntries(students.map((student) => [student.id, 'pending'])));
  const [focused, setFocused] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedSkills, setCheckedSkills] = useState<Record<string, string[]>>({});
  const [studentMemos, setStudentMemos] = useState<Record<string, string>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>(() => Object.fromEntries(students.map((student) => [student.id, true])));
  const [bulkStudentMemo, setBulkStudentMemo] = useState('');
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [classId, setClassId] = useState(defaultClassId);
  const [classMemo, setClassMemo] = useState('');
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [recordSaving, setRecordSaving] = useState(false);
  const [recordSaveFeedback, setRecordSaveFeedback] = useState<SaveActionFeedback | null>(null);
  const restoredRecordIdRef = useRef<string | null>(null);
  const draftHydratedRef = useRef(false);
  const canUseLocalDraft = !editingRecord && !sourceRecord && !requestedRecordId;

  const selectedStudents = students.filter((student) => selectedStudentIds[student.id]);
  const selectedStudentCount = selectedStudents.length;
  const selectedStudent = students.find((student) => student.id === selectedId);
  const packageFocus = program?.lessonDetail?.developmentFocus ?? program?.tags.slice(0, 3).join(', ') ?? '';
  const packageMeta = [program?.category, program?.grade, program?.space]
    .filter((item) => item && !/확인 필요|활동 공간 확인|미정|undefined|null/i.test(String(item)))
    .join(' · ');
  const present = selectedStudents.filter((student) => attendance[student.id] === 'present').length;
  const absent = selectedStudents.filter((student) => attendance[student.id] === 'absent').length;
  const focusCount = selectedStudents.filter((student) => focused[student.id]).length;
  const recordedSkills = selectedStudents.reduce((sum, student) => sum + (checkedSkills[student.id]?.length ?? 0), 0);
  const progress = useMemo(() => Math.round(((present + absent) / Math.max(selectedStudentCount, 1)) * 100), [absent, present, selectedStudentCount]);
  const accessSnapshot = useMasterAccessSnapshot();
  const recordStatus = canCreateClassRecordFromSnapshot(accessSnapshot);
  const upgradeHref = getUpgradeHrefFromSnapshot(accessSnapshot);
  const upgradeLabel = getUpgradeLabelFromSnapshot(accessSnapshot);
  const hasStudents = students.length > 0;
  const hasAttendance = present + absent > 0;
  const canSaveRecord = recordStatus.allowed && hasStudents && selectedStudentCount > 0 && hasAttendance && Boolean(recordDate.trim()) && Boolean(program);
  const editingRecordMissing = Boolean(requestedRecordId && operationalData.status === 'ready' && !editingRecord);
  const sourceRecordMissing = Boolean(sourceRecordId && operationalData.status === 'ready' && !sourceRecord && !editingRecord);
  const isEditingRecord = Boolean(editingRecord);
  const isEnrichingQuickRecord = Boolean(
    editingRecord && (editingRecord.recordType === 'quick' || editingRecord.students.length === 0),
  );
  const reportHref = program
    ? savedRecordId
      ? `/spokedu-master/report?record=${savedRecordId}&program=${program.id}`
      : `/spokedu-master/report?program=${program.id}`
    : '/spokedu-master/report';

  useEffect(() => {
    setAttendance((prev) => Object.fromEntries(students.map((student) => [student.id, prev[student.id] ?? 'pending'])) as Record<string, AttendanceStatus>);
    setSelectedStudentIds((prev) => Object.fromEntries(students.map((student) => [student.id, prev[student.id] ?? true])));
  }, [students]);

  useEffect(() => {
    if (!canUseLocalDraft || draftHydratedRef.current) return;
    const draft = readSaveDraft<ClassRecordDraft>(CLASS_RECORD_DRAFT_KEY);
    draftHydratedRef.current = true;
    if (!hasMeaningfulClassRecordDraft(draft) || !draft) return;
    // URL로 다른 프로그램 기록에 들어왔으면 이전 프로그램 초안(출석·메모)을 섞지 않는다.
    if (requestedProgramId && draft.selectedProgramId && draft.selectedProgramId !== requestedProgramId) return;
    if (draft.selectedProgramId) setSelectedProgramId(draft.selectedProgramId);
    if (draft.recordDate) setRecordDate(draft.recordDate);
    if (draft.classId) setClassId(draft.classId);
    if (draft.classMemo) setClassMemo(draft.classMemo);
    if (draft.attendance) setAttendance((prev) => ({ ...prev, ...draft.attendance }));
    if (draft.focused) setFocused(draft.focused);
    if (draft.checkedSkills) setCheckedSkills(draft.checkedSkills);
    if (draft.studentMemos) setStudentMemos(draft.studentMemos);
    if (draft.selectedStudentIds) {
      setSelectedStudentIds((prev) => ({ ...prev, ...draft.selectedStudentIds }));
    }
    if (draft.bulkStudentMemo) setBulkStudentMemo(draft.bulkStudentMemo);
  }, [canUseLocalDraft, requestedProgramId]);

  useEffect(() => {
    if (!canUseLocalDraft || !draftHydratedRef.current || savedOnly || savedRecordId) return;
    writeSaveDraft(CLASS_RECORD_DRAFT_KEY, {
      selectedProgramId,
      recordDate,
      classId,
      classMemo,
      attendance,
      focused,
      checkedSkills,
      studentMemos,
      selectedStudentIds,
      bulkStudentMemo,
    } satisfies ClassRecordDraft);
  }, [
    attendance,
    bulkStudentMemo,
    canUseLocalDraft,
    checkedSkills,
    classId,
    classMemo,
    focused,
    recordDate,
    savedOnly,
    savedRecordId,
    selectedProgramId,
    selectedStudentIds,
    studentMemos,
  ]);

  useEffect(() => {
    if (!requestedStudentId || editingRecord || sourceRecord) return;
    const exists = students.some((student) => student.id === requestedStudentId);
    if (!exists) return;
    setSelectedStudentIds(Object.fromEntries(students.map((student) => [student.id, student.id === requestedStudentId])));
    setSelectedId(requestedStudentId);
  }, [editingRecord, requestedStudentId, sourceRecord, students]);

  useEffect(() => {
    if (!spomoveDraft || editingRecord || sourceRecord) return;
    setClassMemo((current) => current.trim() ? current : spomoveDraft);
  }, [editingRecord, sourceRecord, spomoveDraft]);

  useEffect(() => {
    // URL/편집/복제 프로그램만 강제. 없으면 session draft·현재 선택을 유지한다.
    if (!initialProgramId) return;
    const nextProgramId = programs.some((item) => item.id === initialProgramId) ? initialProgramId : '';
    setSelectedProgramId(nextProgramId);
  }, [initialProgramId, programs]);

  useEffect(() => {
    if (!editingRecord || restoredRecordIdRef.current === editingRecord.id) return;
    restoredRecordIdRef.current = editingRecord.id;
    const enrichingEmptyRoster = editingRecord.students.length === 0;
    setRecordDate(new Date(editingRecord.date).toISOString().slice(0, 10));
    setClassId(editingRecord.classId || defaultClassId);
    setClassMemo(editingRecord.memo ?? '');
    setSavedRecordId(editingRecord.id);
    setSavedOnly(false);
    setSelectedStudentIds(Object.fromEntries(students.map((student) => [
      student.id,
      enrichingEmptyRoster
        ? true
        : editingRecord.students.some((item) => item.studentId === student.id),
    ])));
    setAttendance(Object.fromEntries(students.map((student) => {
      const recordStudent = editingRecord.students.find((item) => item.studentId === student.id);
      return [student.id, recordStudent?.attendance ?? 'pending'];
    })) as Record<string, AttendanceStatus>);
    setFocused(Object.fromEntries(students.map((student) => {
      const recordStudent = editingRecord.students.find((item) => item.studentId === student.id);
      return [student.id, recordStudent?.focused ?? false];
    })));
    setCheckedSkills(Object.fromEntries(students.map((student) => {
      const recordStudent = editingRecord.students.find((item) => item.studentId === student.id);
      return [student.id, recordStudent?.skills ?? []];
    })));
    setStudentMemos(Object.fromEntries(students.map((student) => {
      const recordStudent = editingRecord.students.find((item) => item.studentId === student.id);
      return [student.id, recordStudent?.memo ?? ''];
    })));
  }, [defaultClassId, editingRecord, students]);

  useEffect(() => {
    if (operationalData.status !== 'ready' || !sourceRecord || restoredRecordIdRef.current === `from:${sourceRecord.id}`) return;
    restoredRecordIdRef.current = `from:${sourceRecord.id}`;
    setRecordDate(new Date().toISOString().slice(0, 10));
    setClassId(sourceRecord.classId || defaultClassId);
    setClassMemo('');
    setSavedRecordId(null);
    setSavedOnly(false);
    setSelectedStudentIds(Object.fromEntries(students.map((student) => [student.id, true])));
    setAttendance(Object.fromEntries(students.map((student) => [student.id, 'pending'])) as Record<string, AttendanceStatus>);
    setFocused({});
    setCheckedSkills({});
    setStudentMemos({});
  }, [defaultClassId, operationalData.status, sourceRecord, students]);

  const toggleSkill = (studentId: string, skill: string) => {
    setCheckedSkills((prev) => {
      const current = prev[studentId] ?? [];
      return { ...prev, [studentId]: current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill] };
    });
  };

  const saveNext = () => {
    if (!selectedId) return;
    const next = selectedStudents[selectedStudents.findIndex((student) => student.id === selectedId) + 1];
    setSelectedId(next?.id ?? null);
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(Object.fromEntries(students.map((student) => [student.id, true])));
  };

  const clearAllStudents = () => {
    setSelectedStudentIds(Object.fromEntries(students.map((student) => [student.id, false])));
    setSelectedId(null);
  };

  const applyAttendanceToSelected = (status: AttendanceStatus) => {
    setAttendance((prev) => {
      const next = { ...prev };
      for (const student of selectedStudents) {
        next[student.id] = status;
      }
      return next;
    });
  };

  const applyMemoToEmptyStudents = () => {
    const memo = bulkStudentMemo.trim();
    if (!memo) return;
    setStudentMemos((prev) => {
      const next = { ...prev };
      for (const student of selectedStudents) {
        if (!next[student.id]?.trim()) next[student.id] = memo;
      }
      return next;
    });
  };

  const buildRecord = (): ClassRecord => ({
    id: editingRecord?.id ?? savedRecordId ?? Date.now().toString(),
    lessonTitle: activeLessonTitle,
    classId: classId.trim() || defaultClassId,
    programId: program?.id ?? '',
    programTitle: program?.title ?? '',
    date: new Date(recordDate).toISOString(),
    present,
    absent,
    focusCount,
    skillCount: recordedSkills,
    kakaoSent: false,
    students: selectedStudents.map((student) => ({
      studentId: student.id,
      studentName: student.name,
      attendance: attendance[student.id] ?? 'pending',
      focused: !!focused[student.id],
      skills: checkedSkills[student.id] ?? [],
      memo: studentMemos[student.id]?.trim() || undefined,
    })),
    memo: classMemo.trim() || undefined,
    parentNoteSnapshot: editingRecord?.parentNoteSnapshot,
    // 출석·관찰 보강 저장 시 quick → detailed로 승격한다.
    recordType: 'detailed',
  });

  const persistRecord = () => {
    if (!canSaveRecord || recordSaving) return null;
    if (!canAttemptOnlineSave(isOnline)) {
      setRecordSaveFeedback(getOfflineSaveFeedback());
      return null;
    }
    const record = buildRecord();
    setRecordSaving(true);
    setRecordSaveFeedback(null);
    setSavedOnly(false);
    if (!editingRecord) setSavedRecordId(null);
    const input = classRecordToCreateInput(record, operationalData.students);
    const request = editingRecord
      ? operationalData.updateClassRecord(editingRecord.id, input)
      : operationalData.saveClassRecord(input);
    void request.then((saved) => {
      setSavedRecordId(saved.id);
      setSavedOnly(true);
      clearSaveDraft(CLASS_RECORD_DRAFT_KEY);
    }).catch((caught) => {
      setRecordSaveFeedback(resolveSaveActionFeedback(caught, accessSnapshot));
      setSavedOnly(false);
      if (!editingRecord) setSavedRecordId(null);
    }).finally(() => {
      setRecordSaving(false);
    });
    return record;
  };

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>수업 기록</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
          {isEnrichingQuickRecord ? '기록 보강' : '수업 기록'}
        </h1>
        <p className="mt-2 max-w-[680px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          {isEnrichingQuickRecord
            ? '빠른 기록에 출석·관찰을 더합니다. 새 기록이 아니라 같은 기록이 업데이트됩니다.'
            : '학생별 출석, 관찰, 동작 체크를 남기는 수업 기록 작성 화면입니다.'}
        </p>
      </header>

      {isEnrichingQuickRecord && editingRecord ? (
        <section className="mx-[22px] mb-5 rounded-[16px] p-4 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-grn-a10)', border: '1px solid var(--spm-grn-a24)' }}>
          <p className="text-[12px] font-black" style={{ color: 'var(--spm-grn)' }}>같은 기록 보강 중</p>
          <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
            {editingRecord.memo?.trim()
              ? `남긴 관찰: ${editingRecord.memo.trim()}`
              : '관찰 메모는 비어 있습니다. 아래에서 출석과 집중 관찰을 이어서 남겨 주세요.'}
          </p>
          {editingRecord.parentNoteSnapshot?.trim() ? (
            <p className="mt-2 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
              안내문 초안은 유지됩니다. 원본 수업 자료는 변경되지 않습니다.
            </p>
          ) : null}
        </section>
      ) : null}

      {!recordStatus.allowed ? (
        <section className="mx-[22px] mb-5 rounded-[16px] p-4 sm:mx-8 lg:mx-10" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} color="var(--spm-red)" />
            <div>
              <p className="text-[14px] font-black" style={{ color: 'var(--spm-red)' }}>{recordStatus.label}</p>
              <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--spm-t2)' }}>{recordStatus.reason}</p>
              <Link href={upgradeHref} className="mt-3 inline-flex text-[12px] font-black" style={{ color: 'var(--spm-red)' }}>{upgradeLabel}</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-[22px] mb-5 overflow-hidden rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'linear-gradient(135deg, var(--spm-acc-a25), var(--spm-s2))', border: '1px solid var(--spm-acc-a34)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc-muted)' }}>{classId || defaultClassId} / {activePeriod}교시</p>
            <h2 className="mt-2 text-[24px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>
              {isEnrichingQuickRecord ? '빠른 기록 보강' : isEditingRecord ? '수업 기록 수정' : activeLessonTitle}
            </h2>
            <p className="mt-2 text-[12px] font-medium" style={{ color: 'var(--spm-t2)' }}>{[packageMeta, packageFocus].filter(Boolean).join(' · ')}</p>
          </div>
          {program ? (
            <Link href={`/spokedu-master/library/${program.id}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: 'var(--spm-acc)' }} aria-label="전체 수업 자료 보기">
              <BookOpen size={18} color="#fff" />
            </Link>
          ) : null}
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,var(--spm-acc),var(--spm-grn))' }} />
        </div>
      </section>

      {editingRecordMissing || sourceRecordMissing ? (
        <section className="mx-[22px] mb-5 rounded-[16px] p-4 sm:mx-8 lg:mx-10" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)' }}>
          <p className="text-[14px] font-black" style={{ color: 'var(--spm-red)' }}>{editingRecordMissing ? '수정할 수업 기록을 찾지 못했습니다.' : '다시 사용할 수업 기록을 찾지 못했습니다.'}</p>
          <Link href="/spokedu-master/class-record" className="mt-3 inline-flex h-11 items-center rounded-[11px] px-4 text-[12px] font-black text-white" style={{ background: 'var(--spm-red)' }}>
            수업 기록 보기
          </Link>
        </section>
      ) : null}

      <div className="mx-[22px] mb-2 sm:mx-8 lg:mx-10">
        <h2 className="text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>1. 수업 정보</h2>
      </div>
      <section className="mx-[22px] mb-5 grid gap-3 rounded-[18px] p-4 sm:mx-8 md:grid-cols-2 xl:grid-cols-3 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>기록할 수업</span>
          <select
            value={selectedProgramId}
            onChange={(event) => {
              const nextProgramId = event.target.value;
              if (nextProgramId === selectedProgramId) return;
              setSelectedProgramId(nextProgramId);
              // 수업이 바뀌면 이전 수업의 출석·관찰·메모를 새 기록에 섞지 않는다.
              setAttendance(Object.fromEntries(students.map((student) => [student.id, 'pending'])) as Record<string, AttendanceStatus>);
              setFocused({});
              setCheckedSkills({});
              setStudentMemos({});
              setSelectedStudentIds(Object.fromEntries(students.map((student) => [student.id, true])));
              setClassMemo('');
              setBulkStudentMemo('');
              setSelectedId(null);
            }}
            className="h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none"
            style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            <option value="">수업을 선택하세요</option>
            {programs.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>수업일</span>
          <input type="date" value={recordDate} onChange={(event) => setRecordDate(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>반·기관명</span>
          <input type="text" data-testid="class-id-input" value={classId} onChange={(event) => setClassId(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
        </label>
      </section>

      <div className="mx-[22px] mb-2 sm:mx-8 lg:mx-10">
        <h2 className="text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>2. 참여 학생</h2>
        <p className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>선택 {selectedStudentCount}명 / 전체 {students.length}명</p>
      </div>

      <section className="mb-3 grid grid-cols-3 gap-2 px-[22px] sm:px-8 lg:px-10">
        <SummaryPill label="출석" value={String(present)} tone="var(--spm-grn)" />
        <SummaryPill label="결석" value={String(absent)} tone="var(--spm-red)" />
        <SummaryPill label="관찰" value={String(focusCount)} tone="var(--spm-amb)" />
      </section>

      {hasStudents ? (
        <div className="mb-3 flex flex-wrap gap-2 px-[22px] sm:px-8 lg:px-10">
          <button type="button" onClick={selectAllStudents} className="min-h-11 rounded-[11px] px-4 text-[12px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)', border: '1px solid var(--spm-br2)' }}>전체 선택</button>
          <button type="button" onClick={clearAllStudents} className="min-h-11 rounded-[11px] px-4 text-[12px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)', border: '1px solid var(--spm-br2)' }}>전체 해제</button>
          <button type="button" onClick={() => applyAttendanceToSelected('present')} disabled={selectedStudentCount === 0} className="min-h-11 rounded-[11px] px-4 text-[12px] font-black disabled:opacity-50" style={{ background: 'var(--spm-grn-a16)', color: 'var(--spm-grn)', border: '1px solid var(--spm-grn-a24)' }}>선택 출석</button>
          <button type="button" onClick={() => applyAttendanceToSelected('absent')} disabled={selectedStudentCount === 0} className="min-h-11 rounded-[11px] px-4 text-[12px] font-black disabled:opacity-50" style={{ background: 'rgba(239,68,68,0.14)', color: 'var(--spm-red)', border: '1px solid rgba(239,68,68,0.22)' }}>선택 결석</button>
          <button type="button" onClick={() => applyAttendanceToSelected('pending')} disabled={selectedStudentCount === 0} className="min-h-11 rounded-[11px] px-4 text-[12px] font-black disabled:opacity-50" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>출석 초기화</button>
        </div>
      ) : null}

      <section className="grid gap-2 px-[22px] sm:px-8 md:grid-cols-2 lg:px-10 xl:grid-cols-3">
        {hasStudents ? students.map((student) => (
          <div key={student.id} className="rounded-[18px]" style={{ outline: selectedStudentIds[student.id] ? '2px solid var(--spm-acc-a50)' : '1px solid var(--spm-br2)' }}>
            <label className="flex min-h-11 items-center gap-2 rounded-t-[18px] px-4 py-2 text-[12px] font-black" style={{ background: selectedStudentIds[student.id] ? 'var(--spm-acc-a12)' : 'var(--spm-s2)', color: 'var(--spm-t)' }}>
              <input type="checkbox" checked={!!selectedStudentIds[student.id]} onChange={(event) => setSelectedStudentIds((prev) => ({ ...prev, [student.id]: event.target.checked }))} />
              참여 학생
            </label>
            <StudentRow student={student} attendance={attendance[student.id] ?? 'pending'} focused={!!focused[student.id]} disabled={!recordStatus.allowed || !selectedStudentIds[student.id]} onAttendance={(status) => setAttendance((prev) => ({ ...prev, [student.id]: status }))} onFocus={() => setFocused((prev) => ({ ...prev, [student.id]: !prev[student.id] }))} onOpen={() => selectedStudentIds[student.id] ? setSelectedId(student.id) : undefined} />
          </div>
        )) : (
          <div className="rounded-[18px] p-5 md:col-span-2 xl:col-span-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>아직 등록된 학생이 없습니다.</p>
            <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>학생을 추가하면 수업 기록을 학생별로 관리할 수 있습니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/spokedu-master/students?add=1" className="inline-flex h-11 items-center gap-2 rounded-[11px] px-4 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>학생 추가</Link>
            </div>
          </div>
        )}
      </section>

      <div className="mx-[22px] mb-2 mt-5 sm:mx-8 lg:mx-10">
        <h2 className="text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>3. 기록 내용</h2>
      </div>

      <section className="mx-[22px] rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>공통 수업 메모</span>
          <textarea value={classMemo} onChange={(event) => setClassMemo(event.target.value)} placeholder="수업 전체 흐름, 준비물, 다음 수업 참고 사항을 한 번만 적어 두세요." className="min-h-[88px] w-full rounded-[12px] border p-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
        </label>
        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>학생별 메모 빠른 입력</span>
            <input type="text" value={bulkStudentMemo} onChange={(event) => setBulkStudentMemo(event.target.value)} placeholder="비어 있는 선택 학생 메모에만 적용됩니다." className="h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
          </label>
          <button type="button" onClick={applyMemoToEmptyStudents} disabled={!bulkStudentMemo.trim() || selectedStudentCount === 0} className="min-h-11 self-end rounded-[12px] px-4 text-[13px] font-black disabled:opacity-50" style={{ background: 'var(--spm-acc)', color: '#fff' }}>전체 학생에게 적용</button>
        </div>
      </section>

      <div className="mx-[22px] mb-2 mt-5 sm:mx-8 lg:mx-10">
        <h2 className="text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>4. 저장</h2>
      </div>

      <section className="mx-[22px] mt-5 rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>수업 마무리</p>
            <h2 className="mt-2 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 후 1분 정리</h2>
          </div>
          <span className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: 'var(--spm-acc-a13)', color: 'var(--spm-acc)' }}>다음: 안내문 복사</span>
        </div>
        <p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>기록 저장 후 안내문 문구를 만들어 복사해 전달할 수 있습니다.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <OutcomeCard icon={<History size={15} color="var(--spm-acc)" />} label="학생 이력" value={`출석 ${present}명 · 관찰 ${focusCount}명`} />
          <OutcomeCard icon={<FileText size={15} color="var(--spm-acc)" />} label="기록 근거" value={packageFocus || '활동 목표와 관찰 포인트'} />
          <OutcomeCard icon={<MessageCircle size={15} color="var(--spm-acc)" />} label="안내문" value="복사해서 전달" />
        </div>
        {!hasStudents ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>등록된 학생이 없어 학생 기록을 만들 수 없습니다.</p> : null}
        {!program ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-amb-a12)', color: 'var(--spm-amb)' }}>기록할 수업을 선택해 주세요.</p> : null}
        {hasStudents && selectedStudentCount === 0 ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-amb-a12)', color: 'var(--spm-amb)' }}>참여 학생을 1명 이상 선택해 주세요.</p> : null}
        {hasStudents && !hasAttendance ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-amb-a12)', color: 'var(--spm-amb)' }}>출석 또는 결석을 최소 1명 이상 체크해 주세요.</p> : null}
        {savedOnly ? (
          <div className="mt-4 rounded-[12px] p-3" style={{ background: 'var(--spm-grn-a10)', color: 'var(--spm-grn)' }}>
            <p className="text-[12px] font-bold">출석과 관찰 원본 기록이 저장되었습니다.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={reportHref} className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'var(--spm-grn-a08)', color: 'var(--spm-grn)' }}>안내문 만들고 복사</Link>
              <Link href={savedRecordId && program ? `/spokedu-master/class-record?record=${savedRecordId}&program=${program.id}` : '/spokedu-master/class-record'} className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'var(--spm-grn-a08)', color: 'var(--spm-grn)' }}>저장한 기록 보기</Link>
              <Link href="/spokedu-master/activity" className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'var(--spm-grn-a08)', color: 'var(--spm-grn)' }}>수업 기록으로</Link>
            </div>
          </div>
        ) : null}
        {recordSaveFeedback ? (
          <div className="mt-4">
            <SaveErrorBanner
              message={recordSaveFeedback.message}
              onRetry={recordSaveFeedback.retryable ? () => persistRecord() : undefined}
              upgradeHref={recordSaveFeedback.upgradeHref}
              upgradeLabel={recordSaveFeedback.upgradeLabel}
            />
          </div>
        ) : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-[0.7fr_1fr]">
          <button type="button" onClick={() => persistRecord()} disabled={!canSaveRecord || recordSaving || editingRecordMissing || sourceRecordMissing} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black disabled:opacity-60" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}><Check size={16} />{recordSaving ? '저장 중...' : isEnrichingQuickRecord ? '보강 저장' : isEditingRecord ? '수업 기록 수정' : '수업 기록 저장'}</button>
          <Link href={reportHref} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}><FileText size={16} />안내문 만들고 복사</Link>
        </div>
      </section>

      <BottomSheet open={!!selectedStudent} title="학생 동작 기록" onClose={() => setSelectedId(null)}>
        {selectedStudent ? (
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full text-[16px] font-black text-white" style={{ background: 'var(--spm-acc)', fontFamily: 'var(--spm-font-display)' }}>{selectedStudent.name.slice(0, 1)}</span>
              <div>
                <p className="text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>{selectedStudent.name}</p>
                <p className="text-[12px]" style={{ color: 'var(--spm-t3)' }}>{selectedStudent.meta}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {skills.map((skill) => {
                const checked = checkedSkills[selectedStudent.id]?.includes(skill) ?? false;
                return (
                  <button key={skill} type="button" onClick={() => toggleSkill(selectedStudent.id, skill)} className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: checked ? 'var(--spm-grn-a15)' : 'var(--spm-s2)', color: checked ? 'var(--spm-grn)' : 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>
                    {checked ? <Check size={15} /> : null}
                    {skill}
                  </button>
                );
              })}
            </div>
            <textarea value={studentMemos[selectedStudent.id] ?? ''} onChange={(event) => setStudentMemos((prev) => ({ ...prev, [selectedStudent.id]: event.target.value }))} placeholder="수업 중 관찰 메모" className="mt-4 min-h-[86px] w-full rounded-[12px] border bg-transparent p-3 text-[13px] font-semibold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
            <button type="button" onClick={saveNext} className="mt-4 h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>저장하고 다음 학생</button>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}

function ClassRecordContent() {
  const searchParams = useSearchParams();
  const { programId, recordId, sourceRecordId, studentId } = getClassRecordQuery(searchParams);
  return programId || recordId || sourceRecordId || studentId ? <RecordEntryView /> : <RecordListView />;
}

export default function ClassRecordPage() {
  return (
    <Suspense fallback={<div className="h-full" style={{ background: 'var(--spm-bg)' }} />}>
      <ClassRecordContent />
    </Suspense>
  );
}
