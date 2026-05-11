'use client';

import Link from 'next/link';
import { Activity, FileText, Share2, TrendingDown, UserRound, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { formatReactionTime } from '../lib/utils';
import { useMasterStore, useStats } from '../store';

const STUDENTS = [
  { id: 's1', name: '김서윤', group: '3학년 A반', attendance: 96, memo: '방향 전환 반응이 안정적이고 참여감이 좋습니다.' },
  { id: 's2', name: '이서준', group: '3학년 A반', attendance: 91, memo: '초반 집중은 빠르지만 후반 페이스 유지가 필요합니다.' },
  { id: 's3', name: '박도윤', group: '3학년 B반', attendance: 98, memo: '점프 신호와 제자리 신호 구분이 좋아졌습니다.' },
  { id: 's4', name: '최하린', group: '4학년 A반', attendance: 94, memo: '협응 과제에서 친구와의 거리 조절이 좋아졌습니다.' },
];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 shrink-0 rounded-full px-3 text-[12px] font-bold"
      style={{
        background: active ? 'var(--spm-acc)' : 'var(--spm-s2)',
        color: active ? '#fff' : 'var(--spm-t2)',
        border: active ? '1px solid transparent' : '1px solid var(--spm-br2)',
      }}
    >
      {label}
    </button>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Activity; tone?: string }) {
  return (
    <div className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--spm-t3)' }}>
          {label}
        </p>
        <Icon size={14} color={tone ?? 'var(--spm-acc)'} />
      </div>
      <p className="mt-3 text-[20px] font-black tracking-[-0.04em]" style={{ fontFamily: 'var(--spm-font-display)', color: tone ?? 'var(--spm-t)' }}>
        {value}
      </p>
    </div>
  );
}

function TrendChart({ values }: { values: number[] }) {
  const chartValues = values.length > 1 ? values.slice(0, 8).reverse() : [420, 390, 360, 340, 328];
  const width = 300;
  const height = 150;
  const min = Math.min(...chartValues, 250);
  const max = Math.max(...chartValues, 480);
  const range = Math.max(max - min, 1);
  const points = chartValues.map((value, index) => {
    const x = (index / Math.max(chartValues.length - 1, 1)) * width;
    const y = height - ((value - min) / range) * (height - 24) - 12;
    return { x, y, value };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  const goalY = height - ((300 - min) / range) * (height - 24) - 12;

  return (
    <div className="overflow-hidden rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-bold tracking-[-0.03em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
          반응시간 추이
        </h2>
        <span className="text-[11px] font-bold" style={{ color: 'var(--spm-grn)' }}>
          목표 300ms
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[150px] w-full overflow-visible">
        <defs>
          <linearGradient id="spm-report-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spm-report-area)" />
        <line x1="0" x2={width} y1={goalY} y2={goalY} stroke="#10b981" strokeDasharray="5 5" strokeOpacity="0.65" />
        <path d={path} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? 5 : 3} fill={index === points.length - 1 ? '#10b981' : '#818cf8'} />
        ))}
      </svg>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mx-[22px] rounded-[18px] p-7 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: 'rgba(99,102,241,0.13)' }}>
        <Zap size={28} color="var(--spm-acc)" />
      </span>
      <h2 className="mt-5 text-[20px] font-black tracking-[-0.04em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
        아직 세션이 없어요
      </h2>
      <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
        SPOMOVE를 한 번 실행하면 반응시간과 세션 기록이 리포트로 정리됩니다.
      </p>
      <Link href="/spokedu-master/spomove/session" className="mt-5 flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
        SPOMOVE 시작
      </Link>
    </section>
  );
}

export default function ReportPage() {
  const sessions = useMasterStore((state) => state.sessions);
  const stats = useStats();
  const [classFilter, setClassFilter] = useState('3학년 A반');
  const [period, setPeriod] = useState('이번주');
  const [studentId, setStudentId] = useState<string | null>(null);
  const selectedStudent = STUDENTS.find((student) => student.id === studentId);
  const reactionValues = useMemo(() => sessions.map((session) => session.avg).filter((value): value is number => typeof value === 'number'), [sessions]);

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>
          growth report
        </p>
        <h1 className="mt-1 text-[32px] font-black tracking-[-0.06em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
          리포트
        </h1>
      </header>

      <section className="mb-4 flex gap-2 overflow-x-auto px-[22px]">
        {['3학년 A반', '3학년 B반', '4학년 A반'].map((item) => (
          <Chip key={item} label={item} active={classFilter === item} onClick={() => setClassFilter(item)} />
        ))}
      </section>

      <section className="mb-7 flex gap-2 overflow-x-auto px-[22px]">
        {['이번주', '이번달', '학기'].map((item) => (
          <Chip key={item} label={item} active={period === item} onClick={() => setPeriod(item)} />
        ))}
      </section>

      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="mb-7 grid grid-cols-2 gap-2 px-[22px]">
            <Metric label="평균 RT" value={formatReactionTime(stats.avgRT)} icon={Activity} tone="var(--spm-grn)" />
            <Metric label="참여율" value="94%" icon={UserRound} />
            <Metric label="총 세션" value={String(stats.totalSessions)} icon={FileText} tone="var(--spm-amb)" />
            <Metric label="이번주" value={String(stats.thisWeekSessions)} icon={TrendingDown} />
          </section>

          <section className="mb-7 px-[22px]">
            <TrendChart values={reactionValues} />
          </section>

          <section className="mb-7 px-[22px]">
            <div className="mb-[14px] flex items-baseline justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.03em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
                학생 리스트
              </h2>
              <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>
                {classFilter}
              </span>
            </div>
            <div className="space-y-2">
              {STUDENTS.filter((student) => student.group === classFilter).map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setStudentId(student.id)}
                  className="flex w-full items-center gap-3 rounded-[14px] p-3 text-left"
                  style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)', fontFamily: 'var(--spm-font-display)' }}>
                    {student.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>
                      {student.name}
                    </strong>
                    <span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>
                      참여율 {student.attendance}% / 평균 {formatReactionTime(stats.avgRT)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mx-[22px] rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>
              parent share
            </p>
            <h2 className="mt-3 text-[24px] font-black leading-tight tracking-[-0.05em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
              {classFilter} 에듀에코 리포트
            </h2>
            <p className="mt-3 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
              이번 주 반응속도 평균은 {formatReactionTime(stats.avgRT)}입니다. 수업 참여 흐름과 집중 전환 기록을 학부모 공유용 문장으로 정리합니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                <Share2 size={15} />
                공유
              </button>
              <button type="button" className="h-11 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                PDF
              </button>
            </div>
          </section>
        </>
      )}

      <BottomSheet open={!!selectedStudent} title="학생 상세" onClose={() => setStudentId(null)}>
        {selectedStudent ? (
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full text-[16px] font-black text-white" style={{ background: 'var(--spm-acc)', fontFamily: 'var(--spm-font-display)' }}>
                {selectedStudent.name.slice(0, 1)}
              </span>
              <div>
                <p className="text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>
                  {selectedStudent.name}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--spm-t3)' }}>
                  {selectedStudent.group}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="참여율" value={`${selectedStudent.attendance}%`} icon={UserRound} />
              <Metric label="평균 RT" value={formatReactionTime(stats.avgRT)} icon={Activity} tone="var(--spm-grn)" />
            </div>
            <p className="mt-5 rounded-[14px] p-4 text-[13px] font-medium leading-6" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)' }}>
              {selectedStudent.memo}
            </p>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
