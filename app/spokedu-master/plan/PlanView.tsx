'use client';

import Link from 'next/link';
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, ListChecks, MonitorPlay, Play, Plus, Trash2 } from 'lucide-react';
import { addDays, addWeeks, format, isSameDay, startOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { useMasterStore } from '../store';
import type { Program } from '../types';

type ViewMode = 'calendar' | 'list';

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-8 shrink-0 rounded-full px-3 text-[12px] font-bold" style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s2)', color: active ? '#fff' : 'var(--spm-t2)', border: active ? '1px solid transparent' : '1px solid var(--spm-br2)' }}>{label}</button>;
}

function ProgressCard({ done, total }: { done: number; total: number }) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const now = new Date();
  const weekLabel = format(now, 'M월', { locale: ko }) + ` ${Math.ceil(now.getDate() / 7)}주차`;
  return (
    <section className="mx-[22px] mb-7 rounded-[16px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-center justify-between">
      <div><p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>weekly operation</p><h2 className="mt-1 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{weekLabel}</h2></div>
        <span className="text-[24px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-grn)' }}>{percent}%</span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: 'var(--spm-s4)' }}><div className="h-full rounded-full" style={{ width: `${percent}%`, background: 'linear-gradient(90deg,#6366f1,#10b981)' }} /></div>
      <p className="mt-3 text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>이번 주 계획 완료 {done}개 / 전체 {total}개</p>
    </section>
  );
}

function getProgramForLesson(title: string, programs: Program[]) {
  return programs.find((p) => title.includes(p.title.split(':')[0] ?? '') || p.title.includes(title.split(':')[0] ?? '')) ?? programs[0];
}

function LessonItem({ lesson, programs, onToggle, onDelete }: { lesson: ReturnType<typeof useMasterStore.getState>['lessons'][number]; programs: Program[]; onToggle: () => void; onDelete: () => void }) {
  const program = getProgramForLesson(lesson.title, programs);
  const spomoveId = program?.lessonDetail?.relatedSpomoveIds?.[0];
  return (
    <div className="rounded-[14px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
      <div className="flex items-center gap-3">
        <span className="h-10 w-1.5 rounded-full" style={{ background: lesson.color }} />
        <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-bold" style={{ color: lesson.done ? 'var(--spm-t3)' : 'var(--spm-t)' }}>{lesson.title}</p><p className="mt-1 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}>{lesson.classId} / {lesson.period}교시 / {lesson.duration}분</p></div>
        <button type="button" onClick={onToggle} className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: lesson.done ? 'rgba(16,185,129,0.14)' : 'var(--spm-s3)' }} aria-label="완료 체크"><Check size={17} color={lesson.done ? 'var(--spm-grn)' : 'var(--spm-t3)'} /></button>
        <button type="button" onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }} aria-label="삭제"><Trash2 size={16} color="var(--spm-red)" /></button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Link href={`/spokedu-master/library/${program?.id ?? ''}`} className="flex h-9 items-center justify-center gap-1 rounded-[10px] text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}><BookOpen size={12} />수업안</Link>
        <Link href={`/spokedu-master/class-mode/${program?.id ?? ''}`} className="flex h-9 items-center justify-center gap-1 rounded-[10px] text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}><Play size={11} fill="#fff" />시작</Link>
        <Link href={spomoveId ? `/spokedu-master/spomove/session?drill=${spomoveId}&mode=projector&program=${program?.id ?? ''}` : '/spokedu-master/spomove'} className="flex h-9 items-center justify-center gap-1 rounded-[10px] text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}><MonitorPlay size={13} />화면</Link>
        <Link href={`/spokedu-master/report?program=${program?.id ?? ''}`} className="flex h-9 items-center justify-center gap-1 rounded-[10px] text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}><ClipboardList size={13} />설명</Link>
      </div>
    </div>
  );
}

function EmptyPlanState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-[16px] p-6 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>선택한 날짜에 수업이 없습니다.</p>
      <p className="mx-auto mt-2 max-w-[360px] text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
        수업을 추가하거나 라이브러리에서 바로 쓸 패키지를 골라 이번 주 계획에 연결하세요.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onAdd} className="h-11 rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
          수업 추가
        </button>
        <Link href="/spokedu-master/library" className="flex h-11 items-center justify-center rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
          라이브러리 보기
        </Link>
      </div>
    </div>
  );
}

function AddLessonSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addLesson = useMasterStore((state) => state.addLesson);
  const programs = useMasterStore((state) => state.programs);
  const [programId, setProgramId] = useState('');
  const [classId, setClassId] = useState('');
  const [period, setPeriod] = useState(3);
  const [duration, setDuration] = useState(15);
  const [dateStr, setDateStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const resolvedId = programId || programs[0]?.id || '';
  const program = programs.find((item) => item.id === resolvedId) ?? programs[0];
  const save = () => { if (!classId.trim() || !program) return; addLesson({ id: Date.now(), title: program.title, classId: classId.trim(), date: new Date(dateStr).toISOString(), period, duration, done: false, color: program.colors[1], memo: program.category }); onClose(); };

  return (
    <BottomSheet open={open} title="수업 추가" onClose={onClose}>
      <div className="space-y-5">
        <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>프로그램</span><select value={resolvedId} onChange={(event) => setProgramId(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)', colorScheme: 'dark' }}>{programs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>날짜</span><input type="date" value={dateStr} onChange={(event) => setDateStr(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)', colorScheme: 'dark' }} /></label>
        <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>반 / 그룹</span><input type="text" value={classId} onChange={(event) => setClassId(event.target.value)} placeholder="예: 3학년 A반, 오전반, 성인반" className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label>
        <div><p className="mb-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>교시</p><div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((item) => <Chip key={item} label={`${item}교시`} active={period === item} onClick={() => setPeriod(item)} />)}</div></div>
        <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>시간</span><input type="number" min={5} max={60} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label>
        <button type="button" onClick={save} disabled={!classId.trim() || !program} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white disabled:opacity-50" style={{ background: 'var(--spm-acc)' }}>저장</button>
      </div>
    </BottomSheet>
  );
}

export default function PlanView() {
  const lessons = useMasterStore((state) => state.lessons);
  const programs = useMasterStore((state) => state.programs);
  const toggleLessonDone = useMasterStore((state) => state.toggleLessonDone);
  const deleteLessonById = useMasterStore((state) => state.deleteLessonById);
  const [classFilter, setClassFilter] = useState('전체');
  const [mode, setMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const classes = ['전체', ...Array.from(new Set(lessons.map((lesson) => lesson.classId)))];
  const filteredLessons = lessons.filter((lesson) => classFilter === '전체' || lesson.classId === classFilter);
  const selectedLessons = filteredLessons.filter((lesson) => isSameDay(new Date(lesson.date), selectedDate));
  const doneCount = filteredLessons.filter((lesson) => lesson.done).length;
  const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const handleWeekNav = (delta: number) => {
    const newOffset = weekOffset + delta;
    const newWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), newOffset);
    setWeekOffset(newOffset);
    setSelectedDate(newWeekStart);
  };
  const listGroups = filteredLessons.reduce<Record<string, typeof filteredLessons>>((acc, lesson) => { const key = format(new Date(lesson.date), 'M월 d일 EEEE', { locale: ko }); acc[key] = [...(acc[key] ?? []), lesson]; return acc; }, {});

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10"><p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>lesson plan</p><div className="mt-1 flex items-end justify-between gap-3"><div><h1 className="text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 계획</h1><p className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--spm-t3)' }}>수업안, 큰 화면, 설명 문구까지 한 번에 이어갑니다.</p></div><button type="button" onClick={() => setSheetOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'var(--spm-acc)' }} aria-label="수업 추가"><Plus size={19} color="#fff" /></button></div></header>
      <section className="mb-5 flex gap-2 overflow-x-auto px-[22px] sm:px-8 lg:px-10">{classes.map((item) => <Chip key={item} label={item} active={classFilter === item} onClick={() => setClassFilter(item)} />)}</section>
      <ProgressCard done={doneCount} total={filteredLessons.length} />
      <section className="mx-[22px] mb-5 grid grid-cols-2 gap-2 rounded-[14px] p-1 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><button type="button" onClick={() => setMode('calendar')} className="flex h-10 items-center justify-center gap-2 rounded-[11px] text-[12px] font-black" style={{ background: mode === 'calendar' ? 'var(--spm-acc)' : 'transparent', color: mode === 'calendar' ? '#fff' : 'var(--spm-t3)' }}><CalendarDays size={15} />캘린더</button><button type="button" onClick={() => setMode('list')} className="flex h-10 items-center justify-center gap-2 rounded-[11px] text-[12px] font-black" style={{ background: mode === 'list' ? 'var(--spm-acc)' : 'transparent', color: mode === 'list' ? '#fff' : 'var(--spm-t3)' }}><ListChecks size={15} />목록</button></section>
      {mode === 'calendar' ? <section className="px-[22px] sm:px-8 lg:px-10"><div className="mb-4 flex items-center gap-2"><button type="button" onClick={() => handleWeekNav(-1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="이전 주"><ChevronLeft size={15} color="var(--spm-t2)" /></button><div className="flex-1 text-center"><p className="text-[12px] font-black" style={{ color: 'var(--spm-t)' }}>{format(weekStart, 'M월 d일', { locale: ko })} ~ {format(weekDays[6], 'd일', { locale: ko })}</p>{weekOffset !== 0 ? <button type="button" onClick={() => { setWeekOffset(0); setSelectedDate(new Date()); }} className="mt-0.5 text-[10px] font-bold" style={{ color: 'var(--spm-acc)' }}>이번 주로</button> : null}</div><button type="button" onClick={() => handleWeekNav(1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="다음 주"><ChevronRight size={15} color="var(--spm-t2)" /></button></div><div className="grid grid-cols-7 gap-1 rounded-[16px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>{weekDays.map((day) => { const dayLessons = filteredLessons.filter((lesson) => isSameDay(new Date(lesson.date), day)); const selected = isSameDay(day, selectedDate); const today = isSameDay(day, new Date()); return <button key={day.toISOString()} type="button" onClick={() => setSelectedDate(day)} className="relative flex h-[58px] flex-col items-center justify-center rounded-[12px] text-[11px] font-bold" style={{ background: selected || today ? 'var(--spm-acc)' : 'transparent', color: selected || today ? '#fff' : 'var(--spm-t3)' }}><span>{format(day, 'E', { locale: ko })}</span><strong className="mt-1 text-[16px]" style={{ fontFamily: 'var(--spm-font-display)' }}>{format(day, 'd')}</strong>{dayLessons.length > 0 ? <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full" style={{ background: selected || today ? '#fff' : 'var(--spm-acc)' }} /> : null}</button>; })}</div><div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{selectedLessons.length > 0 ? selectedLessons.map((lesson) => <LessonItem key={lesson.id} lesson={lesson} programs={programs} onToggle={() => toggleLessonDone(lesson.id)} onDelete={() => deleteLessonById(lesson.id)} />) : <EmptyPlanState onAdd={() => setSheetOpen(true)} />}</div></section> : <section className="space-y-5 px-[22px] sm:px-8 lg:px-10">{Object.entries(listGroups).length > 0 ? Object.entries(listGroups).map(([date, items]) => <div key={date}><h2 className="mb-3 text-[14px] font-black" style={{ color: 'var(--spm-t2)' }}>{date}</h2><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{items.map((lesson) => <LessonItem key={lesson.id} lesson={lesson} programs={programs} onToggle={() => toggleLessonDone(lesson.id)} onDelete={() => deleteLessonById(lesson.id)} />)}</div></div>) : <EmptyPlanState onAdd={() => setSheetOpen(true)} />}</section>}
      <AddLessonSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
