'use client';

import Link from 'next/link';
import { isSameDay } from 'date-fns';
import { AlertTriangle, BookOpen, Check, ChevronRight, ClipboardList, FileText, History, MessageCircle, ShieldAlert, Star, UserCheck, UserPlus, UserX } from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { BottomSheet } from '../components/ui/BottomSheet';
import { classRecordToCreateInput, toClassRecord, toStudentProfile } from '../lib/operationalDataAdapter';
import { canCreateClassRecord, getUpgradeHref, getUpgradeLabel } from '../lib/subscription';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore } from '../store';
import type { AttendanceStatus, ClassRecord, StudentProfile } from '../types';

type TypeFilter = 'all' | 'quick' | 'detailed';

function getClassRecordQuery(searchParams: URLSearchParams | ReturnType<typeof useSearchParams>) {
  return {
    programId: searchParams.get('program') ?? searchParams.get('programId'),
    recordId: searchParams.get('record'),
    sourceRecordId: searchParams.get('from'),
    studentId: searchParams.get('student') ?? searchParams.get('studentId'),
  };
}

const RECORD_SAVE_ERROR_MESSAGE = '기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';

const DEFAULT_SKILLS = ['방향 전환', '균형 유지', '신호 반응', '차분한 대기'];

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
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: 'rgba(99,102,241,0.14)' }}>{icon}</span>
        <p className="text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
      </div>
      <p className="text-[13px] font-bold leading-5" style={{ color: 'var(--spm-t)' }}>{value}</p>
    </div>
  );
}

function EmptyRecordState() {
  return (
    <div className="rounded-[18px] p-6 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-[14px]" style={{ background: 'rgba(99,102,241,0.14)' }}>
        <ClipboardList size={22} color="var(--spm-acc)" />
      </span>
      <h2 className="mt-4 text-[18px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>아직 작성한 수업 기록이 없습니다.</h2>
      <p className="mx-auto mt-2 max-w-[440px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>수업을 마친 뒤 기록을 남겨 보세요.</p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href="/spokedu-master/library" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-5 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
          <BookOpen size={15} /> 수업 기록 작성
        </Link>
        <Link href="/spokedu-master/students" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-5 text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
          <UserPlus size={15} /> 학생 명단 관리
        </Link>
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
  const isQuick = record.recordType === 'quick';

  let statusLabel: string;
  let statusBg: string;
  let statusColor: string;
  if (record.kakaoSent) {
    statusLabel = '안내문 준비';
    statusBg = 'rgba(16,185,129,0.13)';
    statusColor = 'var(--spm-grn)';
  } else if (isQuick) {
    statusLabel = '사용 기록';
    statusBg = 'rgba(99,102,241,0.08)';
    statusColor = 'var(--spm-acc)';
  } else {
    statusLabel = '학생 기록';
    statusBg = 'rgba(99,102,241,0.13)';
    statusColor = 'var(--spm-acc)';
  }

  return (
    <article className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>
            {new Date(record.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} · {record.classId}
          </p>
          <h2 className="mt-1 text-[18px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0, wordBreak: 'keep-all' }}>{record.programTitle}</h2>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: statusBg, color: statusColor }}>{statusLabel}</span>
      </div>

      {isQuick ? (
        <div className="mt-3 space-y-1.5">
          {record.memo ? <p className="break-words text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{record.memo}</p> : null}
          {record.parentNoteSnapshot ? (
            <p className="break-words rounded-[10px] p-2.5 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>{record.parentNoteSnapshot}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          <SummaryPill label="출석" value={String(record.present)} tone="var(--spm-grn)" />
          <SummaryPill label="결석" value={String(record.absent)} tone="var(--spm-red)" />
          <SummaryPill label="관찰" value={String(record.focusCount)} tone="var(--spm-amb)" />
          <SummaryPill label="동작" value={String(record.skillCount)} tone="var(--spm-acc)" />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/spokedu-master/library/${record.programId}`} className="inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-[11px] px-3 text-center text-[12px] font-black leading-tight" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
          <BookOpen size={13} /> 원본 수업 보기
        </Link>
        <Link href={`/spokedu-master/report?record=${record.id}&program=${record.programId}`} className="inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-[11px] px-3 text-center text-[12px] font-black leading-tight" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
          <FileText size={13} /> 안내문 만들기
        </Link>
        {!isQuick ? (
          <Link href={`/spokedu-master/class-record?record=${record.id}&program=${record.programId}`} className="inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-[11px] px-3 text-center text-[12px] font-black leading-tight" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
            <ClipboardList size={13} /> 기록 수정
          </Link>
        ) : null}
        <Link href={`/spokedu-master/class-record?from=${record.id}&program=${record.programId}`} className="inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-[11px] px-3 text-center text-[12px] font-black leading-tight" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
          <ClipboardList size={13} /> 같은 구성으로 기록 준비
        </Link>
        {!isQuick ? (
          <Link href={`/spokedu-master/class-record?program=${record.programId}`} className="inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-[11px] px-3 text-center text-[12px] font-black leading-tight" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
            <ClipboardList size={13} /> 학생 기록 작성
          </Link>
        ) : null}
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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
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
    const typeMatched = typeFilter === 'all' || (typeFilter === 'quick'
      ? record.recordType === 'quick'
      : record.recordType !== 'quick');
    return classMatched && periodMatched && typeMatched;
  });

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>수업 기록</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 기록</h1>
        <p className="mt-2 max-w-[680px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>진행한 수업 기록을 모아 확인합니다. 수업 사용 기록과 학생 기록을 구분해 관리할 수 있습니다.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:max-w-[760px]">
          {[
            { label: '라이브러리', href: '/spokedu-master/library', icon: BookOpen },
            { label: '학생 명단', href: '/spokedu-master/students', icon: UserPlus },
            { label: '학생 기록 작성', href: '/spokedu-master/library', icon: ClipboardList },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className="flex h-12 items-center justify-center gap-2 rounded-[14px] text-[12px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
              <Icon size={15} />
              {label}
            </Link>
          ))}
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
                  <button key={cls} type="button" onClick={() => setClassFilter(cls)} className="h-9 rounded-full px-4 text-[12px] font-black" style={{ background: classFilter === cls ? 'var(--spm-acc)' : 'var(--spm-s2)', color: classFilter === cls ? '#fff' : 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>{cls}</button>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {([['all', '전체 유형'], ['quick', '사용 기록'], ['detailed', '학생 기록']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setTypeFilter(value)} className="h-9 rounded-full px-4 text-[12px] font-black" style={{ background: typeFilter === value ? 'rgba(99,102,241,0.15)' : 'var(--spm-s2)', color: typeFilter === value ? 'var(--spm-acc)' : 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>{label}</button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {([['week', '이번 주'], ['month', '이번 달'], ['all', '전체 기간']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setPeriodFilter(value)} className="h-9 rounded-full px-4 text-[12px] font-black" style={{ background: periodFilter === value ? 'rgba(16,185,129,0.15)' : 'var(--spm-s2)', color: periodFilter === value ? 'var(--spm-grn)' : 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>{label}</button>
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
        <button type="button" disabled={disabled} onClick={() => onAttendance('present')} className="flex h-10 items-center justify-center rounded-[11px] disabled:opacity-40" style={{ background: attendance === 'present' ? 'rgba(16,185,129,0.16)' : 'var(--spm-s3)' }} aria-label={`${student.name} 출석`}>
          <UserCheck size={17} color={attendance === 'present' ? 'var(--spm-grn)' : 'var(--spm-t3)'} />
        </button>
        <button type="button" disabled={disabled} onClick={() => onAttendance('absent')} className="flex h-10 items-center justify-center rounded-[11px] disabled:opacity-40" style={{ background: attendance === 'absent' ? 'rgba(239,68,68,0.15)' : 'var(--spm-s3)' }} aria-label={`${student.name} 결석`}>
          <UserX size={17} color={attendance === 'absent' ? 'var(--spm-red)' : 'var(--spm-t3)'} />
        </button>
        <button type="button" disabled={disabled} onClick={onFocus} className="flex h-10 items-center justify-center rounded-[11px] disabled:opacity-40" style={{ background: focused ? 'rgba(245,158,11,0.16)' : 'var(--spm-s3)' }} aria-label={`${student.name} 집중 관찰`}>
          <Star size={17} color={focused ? 'var(--spm-amb)' : 'var(--spm-t3)'} fill={focused ? 'var(--spm-amb)' : 'none'} />
        </button>
      </div>
    </div>
  );
}

function RecordEntryView() {
  const searchParams = useSearchParams();
  const profile = useMasterStore((state) => state.profile);
  const lessons = useMasterStore((state) => state.lessons);
  const operationalData = useOperationalData();
  const students = useMemo(() => operationalData.students.map(toStudentProfile), [operationalData.students]);
  const records = useMemo(() => operationalData.classRecords.map(toClassRecord), [operationalData.classRecords]);
  const programs = useMasterStore((state) => state.programs);
  const todayLesson = lessons.find((l) => isSameDay(new Date(l.date), new Date()) && !l.done) ?? lessons.find((l) => isSameDay(new Date(l.date), new Date()));
  const { programId: requestedProgramId, recordId: requestedRecordId, sourceRecordId, studentId: requestedStudentId } = getClassRecordQuery(searchParams);
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
  const [recordSaveError, setRecordSaveError] = useState<string | null>(null);
  const restoredRecordIdRef = useRef<string | null>(null);

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
  const recordStatus = canCreateClassRecord(profile);
  const upgradeHref = getUpgradeHref(profile);
  const upgradeLabel = getUpgradeLabel(profile);
  const hasStudents = students.length > 0;
  const hasAttendance = present + absent > 0;
  const canSaveRecord = recordStatus.allowed && hasStudents && selectedStudentCount > 0 && hasAttendance && Boolean(recordDate.trim()) && Boolean(program);
  const editingRecordMissing = Boolean(requestedRecordId && operationalData.status === 'ready' && !editingRecord);
  const sourceRecordMissing = Boolean(sourceRecordId && operationalData.status === 'ready' && !sourceRecord && !editingRecord);
  const isEditingRecord = Boolean(editingRecord);
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
    if (!requestedStudentId || editingRecord || sourceRecord) return;
    const exists = students.some((student) => student.id === requestedStudentId);
    if (!exists) return;
    setSelectedStudentIds(Object.fromEntries(students.map((student) => [student.id, student.id === requestedStudentId])));
    setSelectedId(requestedStudentId);
  }, [editingRecord, requestedStudentId, sourceRecord, students]);

  useEffect(() => {
    const nextProgramId = initialProgramId && programs.some((item) => item.id === initialProgramId) ? initialProgramId : '';
    setSelectedProgramId(nextProgramId);
  }, [initialProgramId, programs]);

  useEffect(() => {
    if (!editingRecord || restoredRecordIdRef.current === editingRecord.id) return;
    restoredRecordIdRef.current = editingRecord.id;
    setRecordDate(new Date(editingRecord.date).toISOString().slice(0, 10));
    setClassId(editingRecord.classId || defaultClassId);
    setClassMemo(editingRecord.memo ?? '');
    setSavedRecordId(editingRecord.id);
    setSavedOnly(false);
    setRecordSaveError(null);
    setSelectedStudentIds(Object.fromEntries(students.map((student) => [
      student.id,
      editingRecord.students.some((item) => item.studentId === student.id),
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
    if (!sourceRecord || restoredRecordIdRef.current === `from:${sourceRecord.id}`) return;
    restoredRecordIdRef.current = `from:${sourceRecord.id}`;
    setRecordDate(new Date().toISOString().slice(0, 10));
    setClassId(sourceRecord.classId || defaultClassId);
    setClassMemo('');
    setSavedRecordId(null);
    setSavedOnly(false);
    setRecordSaveError(null);
    setSelectedStudentIds(Object.fromEntries(students.map((student) => [student.id, true])));
    setAttendance(Object.fromEntries(students.map((student) => [student.id, 'pending'])) as Record<string, AttendanceStatus>);
    setFocused({});
    setCheckedSkills({});
    setStudentMemos({});
  }, [defaultClassId, sourceRecord, students]);

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

  const buildRecord = (kakaoSent: boolean): ClassRecord => ({
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
    kakaoSent,
    students: selectedStudents.map((student) => ({
      studentId: student.id,
      studentName: student.name,
      attendance: attendance[student.id] ?? 'pending',
      focused: !!focused[student.id],
      skills: checkedSkills[student.id] ?? [],
      memo: studentMemos[student.id]?.trim() || undefined,
    })),
    memo: classMemo.trim() || undefined,
  });

  const persistRecord = (kakaoSent: boolean) => {
    if (!canSaveRecord || recordSaving) return null;
    const record = buildRecord(kakaoSent);
    setRecordSaving(true);
    setRecordSaveError(null);
    setSavedOnly(false);
    if (!editingRecord) setSavedRecordId(null);
    const input = classRecordToCreateInput(record, operationalData.students);
    const request = editingRecord
      ? operationalData.updateClassRecord(editingRecord.id, input)
      : operationalData.saveClassRecord(input);
    void request.then((saved) => {
      setSavedRecordId(saved.id);
      setSavedOnly(!kakaoSent);
    }).catch(() => {
      setRecordSaveError(RECORD_SAVE_ERROR_MESSAGE);
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
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>class record</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 기록</h1>
        <p className="mt-2 max-w-[680px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          학생별 출석, 관찰, 동작 체크를 남기는 학생 기록 작성 화면입니다.
        </p>
      </header>

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

      <section className="mx-[22px] mb-5 overflow-hidden rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.34)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#a5b4fc' }}>{classId || defaultClassId} / {activePeriod}교시</p>
            <h2 className="mt-2 text-[24px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>{isEditingRecord ? '수업 기록 수정' : activeLessonTitle}</h2>
            <p className="mt-2 text-[12px] font-medium" style={{ color: 'var(--spm-t2)' }}>{[packageMeta, packageFocus].filter(Boolean).join(' · ')}</p>
          </div>
          {program ? (
            <Link href={`/spokedu-master/library/${program.id}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: 'var(--spm-acc)' }} aria-label="전체 수업 자료 보기">
              <BookOpen size={18} color="#fff" />
            </Link>
          ) : null}
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#10b981)' }} />
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
          <select value={selectedProgramId} onChange={(event) => setSelectedProgramId(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}>
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
          <input type="text" value={classId} onChange={(event) => setClassId(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[13px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
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
        </div>
      ) : null}

      <section className="grid gap-2 px-[22px] sm:px-8 md:grid-cols-2 lg:px-10 xl:grid-cols-3">
        {hasStudents ? students.map((student) => (
          <div key={student.id} className="rounded-[18px]" style={{ outline: selectedStudentIds[student.id] ? '2px solid rgba(99,102,241,0.5)' : '1px solid var(--spm-br2)' }}>
            <label className="flex min-h-11 items-center gap-2 rounded-t-[18px] px-4 py-2 text-[12px] font-black" style={{ background: selectedStudentIds[student.id] ? 'rgba(99,102,241,0.12)' : 'var(--spm-s2)', color: 'var(--spm-t)' }}>
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
              <Link href="/spokedu-master/students" className="inline-flex h-11 items-center gap-2 rounded-[11px] px-4 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>학생 추가</Link>
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
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>class end</p>
            <h2 className="mt-2 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 후 1분 정리</h2>
          </div>
          <span className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: 'rgba(99,102,241,0.13)', color: 'var(--spm-acc)' }}>발송 전 복사 검토</span>
        </div>
        <p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>수업이 끝나면 기록은 학생 이력에 남고, 프로그램 맥락은 보호자·센터·학교용 안내문의 근거로 활용됩니다.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <OutcomeCard icon={<History size={15} color="var(--spm-acc)" />} label="학생 이력" value={`출석 ${present}명 · 관찰 ${focusCount}명`} />
          <OutcomeCard icon={<FileText size={15} color="var(--spm-acc)" />} label="기록 근거" value={packageFocus || '활동 목표와 관찰 포인트'} />
          <OutcomeCard icon={<MessageCircle size={15} color="var(--spm-acc)" />} label="안내문" value="발송 전 복사해서 검토" />
        </div>
        {!hasStudents ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>등록된 학생이 없어 학생 기록을 만들 수 없습니다.</p> : null}
        {!program ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>기록할 수업을 선택해 주세요.</p> : null}
        {hasStudents && selectedStudentCount === 0 ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>참여 학생을 1명 이상 선택해 주세요.</p> : null}
        {hasStudents && !hasAttendance ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>출석 또는 결석을 최소 1명 이상 체크해 주세요.</p> : null}
        {savedOnly ? (
          <div className="mt-4 rounded-[12px] p-3" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--spm-grn)' }}>
            <p className="text-[12px] font-bold">출석과 관찰 원본 기록이 저장되었습니다.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={reportHref} className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--spm-grn)' }}>안내문 작성</Link>
              <Link href={savedRecordId && program ? `/spokedu-master/class-record?record=${savedRecordId}&program=${program.id}` : '/spokedu-master/class-record'} className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--spm-grn)' }}>저장한 기록 보기</Link>
              <Link href="/spokedu-master/activity" className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--spm-grn)' }}>내 활동·기록으로</Link>
            </div>
          </div>
        ) : null}
        {recordSaveError ? (
          <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>{recordSaveError}</p>
        ) : null}
        <div className="mt-4 flex items-start gap-2 rounded-[12px] p-3" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--spm-t2)' }}>
          <ShieldAlert size={16} className="mt-0.5 shrink-0" color="var(--spm-acc)" />
          <div>
            <p className="text-[12px] font-black" style={{ color: 'var(--spm-t)' }}>학부모 공유 기능 준비 중</p>
            <p className="mt-1 text-[11px] font-semibold leading-5">학생 정보 보호를 위해 안전한 공유 방식으로 개편하고 있습니다.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-[0.7fr_1fr_1fr]">
          <button type="button" onClick={() => persistRecord(false)} disabled={!canSaveRecord || recordSaving || editingRecordMissing || sourceRecordMissing} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black disabled:opacity-60" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}><Check size={16} />{recordSaving ? '저장 중...' : isEditingRecord ? '수업 기록 수정' : '수업 기록 저장'}</button>
          <Link href={reportHref} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}><FileText size={16} />안내문 만들기</Link>
          <button type="button" disabled className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-black disabled:opacity-60" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
            <ShieldAlert size={16} />
            학부모 공유 준비 중
          </button>
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
                  <button key={skill} type="button" onClick={() => toggleSkill(selectedStudent.id, skill)} className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: checked ? 'rgba(16,185,129,0.15)' : 'var(--spm-s2)', color: checked ? 'var(--spm-grn)' : 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>
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
