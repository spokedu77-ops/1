'use client';

import { ChevronRight, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { MasterStatePanel } from '../components/ui/MasterStatePanel';
import { MasterCollectionRow, MasterPageHeader, MasterPageShell } from '../components/ui/MasterPrimitives';
import { formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { SPM_SECONDARY_BTN, MASTER_ACTION_COPY } from '../lib/masterActionGrammar';
import { buildManageDateHref, buildManageSessionCreateHref, parseSessionClassCreateReturnDate } from '../lib/masterNavigationContext';
import { buildClassCards } from './classManagementModel';
import { ClassCreateSheet } from './ClassCreateSheet';

function nextSessionMeta(startAt: string) {
  const day = getSeoulSessionDay(startAt);
  const [, month, date] = day.split('-');
  return `다음 수업 ${Number(month)}/${Number(date)} ${formatSeoulSessionTime(startAt)}`;
}

export default function ClassesPage() {
  const data = useOperationalData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [sessionReturnDate, setSessionReturnDate] = useState<string | null>(null);
  const cards = useMemo(() => buildClassCards(data.classes, data.sessions, new Date()), [data.classes, data.sessions]);

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setSessionReturnDate(parseSessionClassCreateReturnDate(searchParams.get('from'), searchParams.get('date')));
    setCreateOpen(true);
    router.replace('/spokedu-master/classes', { scroll: false });
  }, [router, searchParams]);

  const closeCreate = () => {
    setCreateOpen(false);
    if (sessionReturnDate) router.push(buildManageDateHref(sessionReturnDate));
  };

  return <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
    <MasterPageShell variant="operational">
      <Link href="/spokedu-master/manage" className="mb-4 inline-flex min-h-11 items-center px-4 text-[13px] font-medium text-slate-500 lg:px-5">← 수업 관리</Link>
      <MasterPageHeader className="px-4 lg:px-5" title="수업반" description="학생 명단과 수업 일정을 관리합니다." action={<button type="button" onClick={() => { setSessionReturnDate(null); setCreateOpen(true); }} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-800"><Plus size={16} />{MASTER_ACTION_COPY.createClass}</button>} />

      {data.status === 'loading' || data.status === 'idle' ? <MasterStatePanel kind="loading" title="수업반을 불러오는 중입니다." className="mt-5" /> : null}
      {data.status === 'error' ? <MasterStatePanel kind="error" title="수업반을 불러오지 못했습니다." description="현재 화면을 유지한 채 다시 불러올 수 있습니다." action={<button type="button" onClick={() => void data.reload()} className={SPM_SECONDARY_BTN}>다시 시도</button>} className="mt-5" /> : null}
      {cards.length ? <div className="mt-6 border-y border-slate-200 bg-white">
        {cards.map((card) => {
          const rosterLabel = card.rosterCount ? `학생 ${card.rosterCount}명` : '학생 없음';
          const scheduleLabel = card.nextSession ? nextSessionMeta(card.nextSession.startAt) : '다음 일정 없음';
          return <MasterCollectionRow key={card.classItem.id} href={`/spokedu-master/classes/${card.classItem.id}`} className="min-h-[72px] px-4 py-3.5 lg:px-5">
            <span className="min-w-0 flex-1"><strong className="block truncate text-[16px] font-semibold text-slate-950">{card.classItem.name}</strong><span className="mt-1.5 block text-[13px] font-medium text-slate-500">{rosterLabel} · {scheduleLabel}</span></span>
            <ChevronRight size={17} className="shrink-0 text-slate-400" />
          </MasterCollectionRow>;
        })}
      </div> : null}
      {data.status === 'ready' && !cards.length ? <MasterStatePanel kind="empty" title="아직 만든 수업반이 없습니다." description="첫 수업반을 만들면 학생과 일정을 연결할 수 있습니다." icon={<Users size={24} />} className="mt-5" /> : null}
    </MasterPageShell>
    {createOpen ? <ClassCreateSheet
      open
      onClose={closeCreate}
      onCreated={(created) => {
        setCreateOpen(false);
        router.push(sessionReturnDate
          ? buildManageSessionCreateHref(created.id, sessionReturnDate)
          : `/spokedu-master/classes/${created.id}`);
      }}
    /> : null}
  </main>;
}
