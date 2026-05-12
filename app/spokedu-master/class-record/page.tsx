'use client';

import Link from 'next/link';
import { AlertTriangle, Check, ChevronRight, ExternalLink, MessageCircle, Play, Send, Star, UserCheck, UserX } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BottomSheet } from '../components/ui/BottomSheet';
import { PROGRAMS } from '../lib/data';
import { sendKakaoClassSummary, type KakaoSummaryResult } from '../lib/serviceContracts';
import { canCreateClassRecord, canUseMonthlyLimit, createParentPreviewToken } from '../lib/subscription';
import { useMasterStore } from '../store';
import type { AttendanceStatus, StudentProfile } from '../types';

const SKILLS = ['방향 전환', '균형 유지', '신호 반응', '차분히 대기'];

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: tone }}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
    </div>
  );
}

function StudentRow({
  student,
  attendance,
  focused,
  onAttendance,
  onFocus,
  onOpen,
  disabled,
}: {
  student: StudentProfile;
  attendance: AttendanceStatus;
  focused: boolean;
  onAttendance: (status: AttendanceStatus) => void;
  onFocus: () => void;
  onOpen: () => void;
  disabled: boolean;
}) {
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
            {student.risk ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--spm-red)' }} /> : null}
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

function ClassRecordContent() {
  const searchParams = useSearchParams();
  const profile = useMasterStore((state) => state.profile);
  const lessons = useMasterStore((state) => state.lessons);
  const students = useMasterStore((state) => state.students);
  const classRecords = useMasterStore((state) => state.classRecords);
  const saveClassRecord = useMasterStore((state) => state.saveClassRecord);
  const enqueueRetry = useMasterStore((state) => state.enqueueRetry);
  const retryQueue = useMasterStore((state) => state.operational.retryQueue);
  const todayLesson = lessons[0];
  const requestedProgramId = searchParams.get('program');
  const program = PROGRAMS.find((item) => item.id === requestedProgramId) ?? PROGRAMS.find((item) => todayLesson?.title.includes(item.title.split(':')[0])) ?? PROGRAMS[0]!;
  const activeClassId = todayLesson?.classId ?? '초등 A반';
  const activePeriod = todayLesson?.period ?? 3;
  const activeLessonTitle = requestedProgramId ? program.title : todayLesson?.title ?? program.title;
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => Object.fromEntries(students.map((student) => [student.id, 'pending'])));
  const [focused, setFocused] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedSkills, setCheckedSkills] = useState<Record<string, string[]>>({});
  const [studentMemos, setStudentMemos] = useState<Record<string, string>>({});
  const [kakaoStep, setKakaoStep] = useState<'summary' | 'preview' | 'sending' | 'done'>('summary');
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [kakaoResult, setKakaoResult] = useState<KakaoSummaryResult | null>(null);

  const selectedStudent = students.find((student) => student.id === selectedId);
  const firstPresentStudent = students.find((student) => attendance[student.id] === 'present');
  const present = Object.values(attendance).filter((value) => value === 'present').length;
  const absent = Object.values(attendance).filter((value) => value === 'absent').length;
  const focusCount = Object.values(focused).filter(Boolean).length;
  const recordedSkills = Object.values(checkedSkills).reduce((sum, items) => sum + items.length, 0);
  const progress = useMemo(() => Math.round(((present + absent) / Math.max(students.length, 1)) * 100), [absent, present, students.length]);
  const recordStatus = canCreateClassRecord(profile);
  const kakaoUsed = classRecords.filter((record) => record.kakaoSent).length;
  const kakaoStatus = canUseMonthlyLimit(profile?.plan ?? 'free', kakaoUsed, 'kakao');
  const hasStudents = students.length > 0;
  const hasAttendance = present + absent > 0;
  const canSaveRecord = recordStatus.allowed && hasStudents && hasAttendance;
  const canPreviewKakao = canSaveRecord && present > 0;
  const parentToken = firstPresentStudent ? createParentPreviewToken(firstPresentStudent.id) : '';

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

  const buildRecord = (kakaoSent: boolean) => ({
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
    if (!canSaveRecord) return null;
    const record = buildRecord(kakaoSent);
    saveClassRecord(record);
    setSavedRecordId(record.id);
    setSavedOnly(!kakaoSent);
    return record;
  };

  const sendKakao = async () => {
    if (!kakaoStatus.allowed || !canPreviewKakao) return;
    const record = persistRecord(true);
    if (!record) return;
    setKakaoStep('sending');
    const result = await sendKakaoClassSummary({
      centerId: profile?.centerId ?? null,
      senderId: profile?.id ?? 'local',
      classRecord: record,
      students,
    });
    if (result.ok) {
      setKakaoResult(result.data);
      setKakaoStep('done');
      return;
    }
    enqueueRetry({ id: `kakao-${record.id}`, type: 'kakao-summary', title: `${record.classId} 카카오 요약 발송`, createdAt: new Date().toISOString(), retryable: result.retryable });
    setKakaoStep('preview');
  };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>class record</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 기록</h1>
      </header>

      {!recordStatus.allowed ? (
        <section className="mx-[22px] mb-5 rounded-[16px] p-4 sm:mx-8 lg:mx-10" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} color="var(--spm-red)" />
            <div>
              <p className="text-[14px] font-black" style={{ color: 'var(--spm-red)' }}>{recordStatus.label}</p>
              <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--spm-t2)' }}>{recordStatus.reason}</p>
              <Link href="/spokedu-master/profile" className="mt-3 inline-flex text-[12px] font-black" style={{ color: 'var(--spm-red)' }}>구독 관리로 이동</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-[22px] mb-5 overflow-hidden rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.34)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#a5b4fc' }}>{activeClassId} · {activePeriod}교시</p>
            <h2 className="mt-2 text-[24px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>{activeLessonTitle}</h2>
            <p className="mt-2 text-[12px] font-medium" style={{ color: 'var(--spm-t2)' }}>출석은 빠르게, 동작 기록은 학생 이름을 눌러 저장합니다.</p>
          </div>
          <Link href="/spokedu-master/spomove/session?mode=class" className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: 'var(--spm-acc)' }} aria-label="SPOMOVE 실행">
            <Play size={18} color="#fff" fill="#fff" />
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
        {students.length > 0 ? (
          students.map((student) => (
            <StudentRow key={student.id} student={student} attendance={attendance[student.id] ?? 'pending'} focused={!!focused[student.id]} disabled={!recordStatus.allowed} onAttendance={(status) => setAttendance((prev) => ({ ...prev, [student.id]: status }))} onFocus={() => setFocused((prev) => ({ ...prev, [student.id]: !prev[student.id] }))} onOpen={() => setSelectedId(student.id)} />
          ))
        ) : (
          <div className="rounded-[18px] p-5 md:col-span-2 xl:col-span-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>등록된 학생이 없습니다.</p>
            <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>학생 명단이 있어야 출석, 동작 기록, 보호자 공유까지 이어지는 수업 기록을 만들 수 있습니다.</p>
          </div>
        )}
      </section>

      <section className="mx-[22px] mt-5 rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>class end</p>
            <h2 className="mt-2 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 종료 후 바로 공유</h2>
          </div>
          <span className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: kakaoStatus.allowed ? 'rgba(16,185,129,0.13)' : 'rgba(239,68,68,0.13)', color: kakaoStatus.allowed ? 'var(--spm-grn)' : 'var(--spm-red)' }}>카카오 {kakaoStatus.label}</span>
        </div>
        <p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>출석 {present}명, 동작 기록 {recordedSkills}개를 보호자용 카카오 요약으로 변환합니다.</p>
        {!hasStudents ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>등록된 학생이 없어 수업 기록을 만들 수 없습니다.</p> : null}
        {hasStudents && !hasAttendance ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>출석 또는 결석을 최소 1명 이상 체크해 주세요.</p> : null}
        {hasAttendance && present === 0 ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>출석 학생이 있어야 보호자 공유를 보낼 수 있습니다. 결석 기록은 저장만 가능합니다.</p> : null}
        {kakaoStep === 'preview' ? (
          <div className="mt-4 rounded-[16px] p-4" style={{ background: '#fef3c7', color: '#2d1b05' }}>
            <p className="text-[12px] font-black">카카오톡 미리보기</p>
            <p className="mt-2 text-[13px] font-semibold leading-6">오늘 {activeClassId}은 {program.title} 수업을 진행했습니다. 출석 {present}명, 집중 관찰 {focusCount}명 기록이 저장되었습니다.</p>
          </div>
        ) : null}
        {!kakaoStatus.allowed ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>{kakaoStatus.reason}</p> : null}
        {savedOnly && kakaoStep !== 'done' ? <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--spm-grn)' }}>수업 기록이 학생 이력에 저장되었습니다. 카카오는 나중에 발송할 수 있습니다.</p> : null}
        {kakaoStep === 'sending' ? <p className="mt-4 rounded-[12px] p-3 text-[13px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>보호자 메시지를 발송하는 중입니다...</p> : null}
        {kakaoStep === 'done' ? (
          <div className="mt-4 rounded-[12px] p-3" style={{ background: 'rgba(16,185,129,0.13)', color: 'var(--spm-grn)' }}>
            <p className="text-[13px] font-bold">카카오 요약 {kakaoResult?.sentCount ?? present}건 발송 완료. 학생 이력에 오늘 기록이 반영되었습니다.</p>
            {firstPresentStudent ? (
              <Link href={`/spokedu-master/parent/${firstPresentStudent.id}?token=${parentToken}`} className="mt-3 inline-flex items-center gap-1 text-[12px] font-black" style={{ color: 'var(--spm-grn)' }}>
                보호자 링크 미리보기
                <ExternalLink size={13} />
              </Link>
            ) : null}
          </div>
        ) : null}
        {retryQueue.length > 0 ? (
          <div className="mt-4 rounded-[12px] p-3" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>
            <p className="text-[12px] font-black">재시도 대기 {retryQueue.length}건</p>
            <p className="mt-1 text-[11px] font-semibold">네트워크 또는 카카오 제공사 오류가 있으면 운영 상태에서 다시 발송합니다.</p>
          </div>
        ) : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-[0.78fr_1fr]">
          <button type="button" onClick={() => persistRecord(false)} disabled={!canSaveRecord || kakaoStep === 'sending'} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black disabled:opacity-60" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
            <Check size={16} />
            기록만 저장
          </button>
          <button type="button" onClick={kakaoStep === 'summary' ? () => setKakaoStep('preview') : sendKakao} disabled={!canPreviewKakao || !kakaoStatus.allowed || kakaoStep === 'sending' || kakaoStep === 'done'} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-60" style={{ background: 'var(--spm-acc)' }}>
            {kakaoStep === 'summary' ? <MessageCircle size={16} /> : <Send size={16} />}
            {kakaoStep === 'summary' ? '카카오 요약 미리보기' : kakaoStep === 'preview' ? '보호자에게 발송' : kakaoStep === 'done' ? '발송 완료' : '발송 중'}
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
            {selectedStudent.risk ? <p className="mb-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>{selectedStudent.risk}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              {SKILLS.map((skill) => {
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

export default function ClassRecordPage() {
  return (
    <Suspense fallback={<div className="h-full" style={{ background: 'var(--spm-bg)' }} />}>
      <ClassRecordContent />
    </Suspense>
  );
}
