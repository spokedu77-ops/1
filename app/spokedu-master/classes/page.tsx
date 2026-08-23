'use client';

import { CalendarDays, ChevronRight, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LessonManagementTabs } from '../components/lesson/LessonManagementTabs';
import { BottomSheet } from '../components/ui/BottomSheet';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { buildClassCards } from './classManagementModel';

export default function ClassesPage() {
  const data = useOperationalData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cards = useMemo(() => buildClassCards(data.classes, data.sessions, new Date()), [data.classes, data.sessions]);

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setCreateOpen(true);
    router.replace('/spokedu-master/classes', { scroll: false });
  }, [router, searchParams]);

  const createClass = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await data.createClass(name.trim());
      setCreateOpen(false);
      setName('');
      router.push(`/spokedu-master/classes/${created.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '수업반을 만들지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
      <header>
        <p className="text-xs font-black text-emerald-700">수업 관리</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-black text-slate-900">수업반</h1><p className="mt-2 text-sm font-semibold text-slate-500">학생 명단과 누적 수업 기록을 관리합니다.</p></div>
          <button type="button" onClick={() => { setError(null); setCreateOpen(true); }} className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white"><Plus size={16} />수업반 만들기</button>
        </div>
        <div className="mt-4"><LessonManagementTabs /></div>
      </header>

      {data.status === 'loading' || data.status === 'idle' ? <p className="mt-5 rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">수업반을 불러오는 중입니다.</p> : null}
      {data.status === 'error' ? <div className="mt-5 rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-700">수업반을 불러오지 못했습니다.<button type="button" onClick={() => void data.reload()} className="ml-2 underline">다시 시도</button></div> : null}
      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        {cards.map((card) => <article key={card.classItem.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="truncate text-lg font-black text-slate-900" title={card.classItem.name}>{card.classItem.name}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500"><Users size={15} />학생 {card.rosterCount}명 · 완료 수업 {card.completedSessionCount}회</p>
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">다음 수업</p>
            {card.nextSession ? <p className="mt-1 text-sm font-black text-slate-800"><CalendarDays size={14} className="mr-1 inline" />{formatSeoulSessionDay(getSeoulSessionDay(card.nextSession.startAt), { month: 'long', day: 'numeric' })} {formatSeoulSessionTime(card.nextSession.startAt)}</p> : <p className="mt-1 text-sm font-bold text-slate-400">다음 예정 수업 없음</p>}
          </div>
          <Link href={`/spokedu-master/classes/${card.classItem.id}`} className="mt-4 flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 text-sm font-black text-slate-700">수업반 보기<ChevronRight size={15} /></Link>
        </article>)}
      </section>
      {data.status === 'ready' && !cards.length ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Users className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">아직 만든 수업반이 없습니다.</p><button type="button" onClick={() => setCreateOpen(true)} className="mt-3 min-h-11 rounded-xl px-4 text-sm font-black text-emerald-700">+ 수업반 만들기</button></div> : null}
    </div>
    {createOpen ? <BottomSheet open title="수업반 만들기" onClose={() => setCreateOpen(false)}><div className="space-y-4 pb-3"><label className="block text-xs font-black text-slate-600">수업반 이름 *<input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createClass(); }} placeholder="예: 양화초 늘봄체육" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500" /></label>{error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}<button type="button" disabled={!name.trim() || saving} onClick={() => void createClass()} className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-40">{saving ? '만드는 중…' : '수업반 만들기'}</button></div></BottomSheet> : null}
  </main>;
}
