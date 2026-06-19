'use client';

import Link from 'next/link';
import { isSameDay } from 'date-fns';
import { AlertTriangle, BookOpen, Check, ChevronRight, ClipboardList, FileText, History, MessageCircle, ShieldAlert, Star, UserCheck, UserPlus, UserX } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { BottomSheet } from '../components/ui/BottomSheet';
import { classRecordToCreateInput, toClassRecord, toStudentProfile } from '../lib/operationalDataAdapter';
import { canCreateClassRecord, getUpgradeHref, getUpgradeLabel } from '../lib/subscription';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore } from '../store';
import type { AttendanceStatus, ClassRecord, StudentProfile } from '../types';

type TypeFilter = 'all' | 'quick' | 'detailed';

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
      <h2 className="mt-4 text-[18px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>아직 저장된 수업 기록이 없습니다.</h2>
      <p className="mx-auto mt-2 max-w-[440px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>라이브러리에서 수업을 열고 "오늘 수업으로 기록"을 누르면 간단한 사용 기록이 남습니다. 학생별 출석·관찰 기록이 필요할 때는 학생 기록을 추가로 작성할 수 있습니다.</p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href="/spokedu-master/library" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-5 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
          <BookOpen size={15} /> 수업 라이브러리로 이동
        </Link>
        <Link href="/spokedu-master/students" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-5 text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
          <UserPlus size={15} /> 학생 명단 관리
        </Link>
      </div>
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
          {record.memo ? <p className="text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{record.memo}</p> : null}
          {record.parentNoteSnapshot ? (
            <p className="rounded-[10px] p-2.5 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>{record.parentNoteSnapshot}</p>
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
        <Link href={`/spokedu-master/library/${record.programId}`} className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
          <BookOpen size={13} /> 원본 수업 보기
        </Link>
        <Link href={`/spokedu-master/report?record=${record.id}&program=${record.programId}`} className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
          <FileText size={13} /> 안내문 만들기
        </Link>
        {!isQuick ? (
          <Link href={`/spokedu-master/class-record?program=${record.programId}`} className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
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
            { label: '수업 라이브러리', href: '/spokedu-master/library', icon: BookOpen },
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
            <strong className="text-[14px]" style={{ color: 'var(--spm-t)' }}>{student.name}</strong>
          </span>
          <span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>{student.meta}</span>
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
  const students = operationalData.students.map(toStudentProfile);
  const programs = useMasterStore((state) => state.programs);
  const todayLesson = lessons.find((l) => isSameDay(new Date(l.date), new Date()) && !l.done) ?? lessons.find((l) => isSameDay(new Date(l.date), new Date()));
  const requestedProgramId = searchParams.get('program');
  const program = programs.find((item) => item.id === requestedProgramId) ?? programs[0];
  const activeClassId = todayLesson?.classId ?? students[0]?.group ?? '수업';
  const activePeriod = todayLesson?.period ?? 3;
  const activeLessonTitle = requestedProgramId ? program?.title : todayLesson?.title ?? program?.title ?? '수업 기록';
  const skills = useMemo(() => {
    const fromTags = (program?.tags ?? []).filter((t) => t !== 'SPOMOVE').slice(0, 6);
    return fromTags.length >= 2 ? fromTags : DEFAULT_SKILLS;
  }, [program]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => Object.fromEntries(students.map((student) => [student.id, 'pending'])));
  const [focused, setFocused] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedSkills, setCheckedSkills] = useState<Record<string, string[]>>({});
  const [studentMemos, setStudentMemos] = useState<Record<string, string>>({});
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [recordSaving, setRecordSaving] = useState(false);

  const selectedStudent = students.find((student) => student.id === selectedId);
  const packageFocus = program?.lessonDetail?.developmentFocus ?? program?.tags.slice(0, 3).join(', ') ?? '';
  const packageMeta = [program?.category, program?.grade, program?.space]
    .filter((item) => item && !/확인 필요|활동 공간 확인|미정|undefined|null/i.test(String(item)))
    .join(' · ');
  const present = Object.values(attendance).filter((value) => value === 'present').length;
  const absent = Object.values(attendance).filter((value) => value === 'absent').length;
  const focusCount = Object.values(focused).filter(Boolean).length;
  const recordedSkills = Object.values(checkedSkills).reduce((sum, items) => sum + items.length, 0);
  const progress = useMemo(() => Math.round(((present + absent) / Math.max(students.length, 1)) * 100), [absent, present, students.length]);
  const recordStatus = canCreateClassRecord(profile);
  const upgradeHref = getUpgradeHref(profile);
  const upgradeLabel = getUpgradeLabel(profile);
  const hasStudents = students.length > 0;
  const hasAttendance = present + absent > 0;
  const canSaveRecord = recordStatus.allowed && hasStudents && hasAttendance;
  const reportHref = savedRecordId
    ? `/spokedu-master/report?record=${savedRecordId}&program=${program.id}`
    : `/spokedu-master/report?program=${program.id}`;

  useEffect(() => {
    setAttendance((prev) => Object.fromEntries(students.map((student) => [student.id, prev[student.id] ?? 'pending'])) as Record<string, AttendanceStatus>);
  }, [students]);

  if (!program) {
    return (
      <div className="h-full overflow-y-auto p-[22px] pb-28 lg:pb-[22px]" style={{ background: 'var(--spm-bg)' }}>
        <div className="rounded-[18px] p-6 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h1 className="text-[20px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>기록할 수업안이 없습니다</h1>
          <p className="mt-2 text-[13px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>라이브러리에서 수업을 선택해 주세요.</p>
          <Link href="/spokedu-master/library" className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-5 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            <BookOpen size={15} /> 수업 라이브러리로 이동
          </Link>
        </div>
      </div>
    );
  }

  const toggleSkill = (studentId: string, skill: string) => {
    setCheckedSkills((prev) => {
      const current = prev[studentId] ?? [];
      return { ...prev, [studentId]: current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill] };
    });
  };

  const saveNext = () => {
    if (!selectedId) return;
    const next = students[students.findIndex((student) => student.id === selectedId) + 1];
    setSelectedId(next?.id ?? null);
  };

  const buildRecord = (kakaoSent: boolean): ClassRecord => ({
    id: savedRecordId ?? Date.now().toString(),
    lessonTitle: activeLessonTitle,
    classId: activeClassId,
    programId: program.id,
    programTitle: program.title,
    date: new Date().toISOString(),
    present,
    absent,
    focusCount,
    skillCount: recordedSkills,
    kakaoSent,
    students: students.map((student) => ({
      studentId: student.id,
      studentName: student.name,
      attendance: attendance[student.id] ?? 'pending',
      focused: !!focused[student.id],
      skills: checkedSkills[student.id] ?? [],
      memo: studentMemos[student.id]?.trim() || undefined,
    })),
  });

  const persistRecord = (kakaoSent: boolean) => {
    if (!canSaveRecord || recordSaving) return null;
    const record = buildRecord(kakaoSent);
    setRecordSaving(true);
    void operationalData.saveClassRecord(classRecordToCreateInput(record, operationalData.students)).then((saved) => {
      setSavedRecordId(saved.id);
      setSavedOnly(!kakaoSent);
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
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#a5b4fc' }}>{activeClassId} / {activePeriod}교시</p>
            <h2 className="mt-2 text-[24px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>{activeLessonTitle}</h2>
            <p className="mt-2 text-[12px] font-medium" style={{ color: 'var(--spm-t2)' }}>{[packageMeta, packageFocus].filter(Boolean).join(' · ')}</p>
          </div>
          <Link href={`/spokedu-master/library/${program.id}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: 'var(--spm-acc)' }} aria-label="수업 자료 보기">
            <BookOpen size={18} color="#fff" />
          </Link>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#10b981)' }} />
        </div>
      </section>

      <section className="mb-5 grid grid-cols-3 gap-2 px-[22px] sm:px-8 lg:px-10">
        <SummaryPill label="출석" value={String(present)} tone="var(--spm-grn)" />
        <SummaryPill label="결석" value={String(absent)} tone="var(--spm-red)" />
        <SummaryPill label="관찰" value={String(focusCount)} tone="var(--spm-amb)" />
      </section>

      <section className="grid gap-2 px-[22px] sm:px-8 md:grid-cols-2 lg:px-10 xl:grid-cols-3">
        {hasStudents ? students.map((student) => <StudentRow key={student.id} student={student} attendance={attendance[student.id] ?? 'pending'} focused={!!focused[student.id]} disabled={!recordStatus.allowed} onAttendance={(status) => setAttendance((prev) => ({ ...prev, [student.id]: status }))} onFocus={() => setFocused((prev) => ({ ...prev, [student.id]: !prev[student.id] }))} onOpen={() => setSelectedId(student.id)} />) : (
          <div className="rounded-[18px] p-5 md:col-span-2 xl:col-span-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>등록된 학생이 없습니다.</p>
            <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>학생 명단이 있어야 출석, 관찰, 기능 태그를 원본 기록으로 남길 수 있습니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/spokedu-master/students" className="inline-flex h-10 items-center gap-2 rounded-[11px] px-4 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>학생 추가하기</Link>
            </div>
          </div>
        )}
      </section>

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
        {hasStudents && !hasAttendance ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>출석 또는 결석을 최소 1명 이상 체크해 주세요.</p> : null}
        {savedOnly ? (
          <div className="mt-4 rounded-[12px] p-3" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--spm-grn)' }}>
            <p className="text-[12px] font-bold">출석과 관찰 원본 기록이 저장되었습니다.</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/spokedu-master/class-record" className="text-[11px] font-black" style={{ color: 'var(--spm-grn)' }}>기록 목록 보기</Link>
              <Link href={reportHref} className="text-[11px] font-black" style={{ color: 'var(--spm-grn)' }}>안내문 만들기</Link>
            </div>
          </div>
        ) : null}
        <div className="mt-4 flex items-start gap-2 rounded-[12px] p-3" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--spm-t2)' }}>
          <ShieldAlert size={16} className="mt-0.5 shrink-0" color="var(--spm-acc)" />
          <div>
            <p className="text-[12px] font-black" style={{ color: 'var(--spm-t)' }}>학부모 공유 기능 준비 중</p>
            <p className="mt-1 text-[11px] font-semibold leading-5">학생 정보 보호를 위해 안전한 공유 방식으로 개편하고 있습니다.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-[0.7fr_1fr_1fr]">
          <button type="button" onClick={() => persistRecord(false)} disabled={!canSaveRecord || recordSaving} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black disabled:opacity-60" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}><Check size={16} />{recordSaving ? '저장 중...' : '학생 기록 저장'}</button>
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
  return searchParams.get('program') ? <RecordEntryView /> : <RecordListView />;
}

export default function ClassRecordPage() {
  return (
    <Suspense fallback={<div className="h-full" style={{ background: 'var(--spm-bg)' }} />}>
      <ClassRecordContent />
    </Suspense>
  );
}
