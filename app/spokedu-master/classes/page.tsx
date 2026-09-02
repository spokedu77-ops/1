'use client';

import { CalendarDays, ChevronRight, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { MasterStatePanel } from '../components/ui/MasterStatePanel';
import { MasterCollectionRow, MasterPageHeader, MasterPageShell, MasterSection } from '../components/ui/MasterPrimitives';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { SPM_PRIMARY_BTN, SPM_PRIMARY_BTN_FULL, SPM_SECONDARY_BTN, MASTER_ACTION_COPY } from '../lib/masterActionGrammar';
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
    <MasterPageShell variant="operational">
      <MasterPageHeader title="수업반" description="학생 명단과 누적 수업 기록을 관리합니다." action={<button type="button" onClick={() => { setError(null); setCreateOpen(true); }} className={SPM_PRIMARY_BTN}><Plus size={16} />{MASTER_ACTION_COPY.createClass}</button>} />
      <Link href="/spokedu-master/manage" className="mt-3 inline-flex min-h-11 items-center text-[13px] font-medium text-slate-500">← 수업 관리</Link>

      {data.status === 'loading' || data.status === 'idle' ? <MasterStatePanel kind="loading" title="수업반을 불러오는 중입니다." className="mt-5" /> : null}
      {data.status === 'error' ? <MasterStatePanel kind="error" title="수업반을 불러오지 못했습니다." description="현재 화면을 유지한 채 다시 불러올 수 있습니다." action={<button type="button" onClick={() => void data.reload()} className={SPM_SECONDARY_BTN}>다시 시도</button>} className="mt-5" /> : null}
      <MasterSection title="내 수업반" className="mt-7">
        <div className="border-y border-slate-200 bg-white">
          {cards.map((card) => <MasterCollectionRow key={card.classItem.id} href={`/spokedu-master/classes/${card.classItem.id}`}>
            <span className="min-w-0 flex-1"><strong className="block truncate text-[16px] font-semibold text-slate-950">{card.classItem.name}</strong><span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-slate-500"><span className="inline-flex items-center gap-1"><Users size={14} />학생 {card.rosterCount}명</span><span className="inline-flex items-center gap-1"><CalendarDays size={14} />{card.nextSession ? `${formatSeoulSessionDay(getSeoulSessionDay(card.nextSession.startAt), { month: 'long', day: 'numeric' })} ${formatSeoulSessionTime(card.nextSession.startAt)}` : '다음 일정 없음'}</span>{card.operationalDebtCount || card.incompleteAttendanceCount ? <span className="text-amber-700">확인할 기록 {Math.max(card.operationalDebtCount, card.incompleteAttendanceCount)}건</span> : null}</span></span><ChevronRight size={17} className="shrink-0 text-slate-400" />
          </MasterCollectionRow>)}
        </div>
      </MasterSection>
      {data.status === 'ready' && !cards.length ? <MasterStatePanel kind="empty" title="아직 만든 수업반이 없습니다." description="첫 수업반을 만들면 학생과 일정을 연결할 수 있습니다." icon={<Users size={24} />} className="mt-5" /> : null}
    </MasterPageShell>
    {createOpen ? <BottomSheet open title="수업반 만들기" onClose={() => setCreateOpen(false)}><div className="space-y-4 pb-3"><label className="block text-[13px] font-medium text-slate-600">수업반 이름 *<input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createClass(); }} placeholder="예: 양화초 늘봄체육" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none focus:border-slate-400" /></label>{error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</p> : null}<button type="button" disabled={!name.trim() || saving} onClick={() => void createClass()} className={SPM_PRIMARY_BTN_FULL}>{saving ? '만드는 중…' : MASTER_ACTION_COPY.createClass}</button></div></BottomSheet> : null}
  </main>;
}
