'use client';

import { ClipboardList, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '../ui/BottomSheet';
import { getRecentActivityOwnerId, reconcileRecentProgramActivities, selectUserRecentProgramActivities } from '../../lib/recentProgramActivity';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { useMasterStore } from '../../store';
import { toClassRecord } from '../../lib/operationalDataAdapter';

function uniqueByProgram<T extends { programId: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.programId || seen.has(item.programId)) return false;
    seen.add(item.programId);
    return true;
  });
}

export function RecordProgramPicker({
  label = '오늘 수업 기록 남기기',
  studentId,
  size = 'default',
}: {
  label?: string;
  studentId?: string;
  size?: 'default' | 'compact';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const programs = useMasterStore((state) => state.programs);
  const profile = useMasterStore((state) => state.profile);
  const recentProgramActivities = useMasterStore((state) => state.recentProgramActivities);
  const operationalData = useOperationalData();
  const records = useMemo(
    () =>
      operationalData.classRecords
        .map(toClassRecord)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [operationalData.classRecords],
  );

  const ownerId = getRecentActivityOwnerId(profile);
  const recentUsedPrograms = useMemo(() => {
    if (!ownerId) return [];
    return reconcileRecentProgramActivities(
      selectUserRecentProgramActivities(recentProgramActivities, ownerId),
      programs,
    ).slice(0, 4);
  }, [ownerId, programs, recentProgramActivities]);
  const recentRecordedPrograms = useMemo(
    () => uniqueByProgram(records).slice(0, 4),
    [records],
  );
  const filteredPrograms = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return programs.slice(0, 10);
    return programs
      .filter((program) => {
        const target = [program.title, program.category, program.grade, ...program.tags].join(' ').toLowerCase();
        return target.includes(keyword);
      })
      .slice(0, 12);
  }, [programs, query]);

  const startRecord = (programId: string) => {
    setOpen(false);
    const params = new URLSearchParams({ program: programId });
    if (studentId) params.set('student', studentId);
    router.push(`/spokedu-master/class-record?${params.toString()}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={size === 'compact'
          ? 'inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-[10px] px-2 text-[11px] font-black text-white'
          : 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] px-5 text-[14px] font-black text-white sm:w-auto'}
        style={{ background: 'var(--spm-acc)' }}
      >
        <ClipboardList size={size === 'compact' ? 13 : 17} />
        {label}
      </button>

      <BottomSheet open={open} title="어떤 수업을 진행했나요?" onClose={() => setOpen(false)} initialFocusSelector="input">
        <div className="grid gap-5">
          {recentUsedPrograms.length ? (
            <section>
              <h3 className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>최근 수업</h3>
              <div className="mt-2 grid gap-2">
                {recentUsedPrograms.map((item) => (
                  <button key={`${item.action}-${item.programId}`} type="button" onClick={() => startRecord(item.programId)} className="flex min-h-12 items-center justify-between gap-3 rounded-[12px] px-3 text-left" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                    <span className="min-w-0 truncate text-[13px] font-black">{item.programTitle}</span>
                    <span className="shrink-0 text-[11px] font-bold text-slate-400">선택</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {recentRecordedPrograms.length ? (
            <section>
              <h3 className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>최근 기록한 수업</h3>
              <div className="mt-2 grid gap-2">
                {recentRecordedPrograms.map((record) => (
                  <button key={record.id} type="button" onClick={() => startRecord(record.programId)} className="flex min-h-12 items-center justify-between gap-3 rounded-[12px] px-3 text-left" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                    <span className="min-w-0 truncate text-[13px] font-black">{record.programTitle}</span>
                    <span className="shrink-0 text-[11px] font-bold text-slate-400">선택</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>다른 수업 찾기</h3>
            <label className="mt-2 flex h-12 items-center gap-2 rounded-[12px] border px-3" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <Search size={16} color="#64748b" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="수업명, 대상, 태그 검색" className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-slate-900 outline-none placeholder:text-slate-400" />
            </label>
            <div className="mt-2 grid max-h-[280px] gap-2 overflow-y-auto">
              {filteredPrograms.length ? filteredPrograms.map((program) => (
                <button key={program.id} type="button" onClick={() => startRecord(program.id)} className="flex min-h-12 items-center justify-between gap-3 rounded-[12px] px-3 text-left" style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-black">{program.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{program.grade} · {program.category}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">선택</span>
                </button>
              )) : (
                <p className="rounded-[12px] p-4 text-[12px] font-bold text-slate-500" style={{ background: '#f8fafc' }}>검색 결과가 없습니다.</p>
              )}
            </div>
          </section>
        </div>
      </BottomSheet>
    </>
  );
}
