'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, Check, ExternalLink, FileText, MessageCircle, Share2, UserRound, Zap, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { generateGrowthReportBatch, type GrowthReportResult, type RetryQueueItem } from '../lib/serviceContracts';
import { canUseMonthlyLimit, createParentPreviewToken } from '../lib/subscription';
import { formatReactionTime } from '../lib/utils';
import { useMasterStore, useStats } from '../store';

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-8 shrink-0 rounded-full px-3 text-[12px] font-bold" style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s2)', color: active ? '#fff' : 'var(--spm-t2)', border: active ? '1px solid transparent' : '1px solid var(--spm-br2)' }}>{label}</button>;
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: LucideIcon; tone?: string }) {
  return (
    <div className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
        <Icon size={14} color={tone ?? 'var(--spm-acc)'} />
      </div>
      <p className="mt-3 text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: tone ?? 'var(--spm-t)' }}>{value}</p>
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
  const points = chartValues.map((value, index) => ({ x: (index / Math.max(chartValues.length - 1, 1)) * width, y: height - ((value - min) / range) * (height - 24) - 12 }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  const goalY = height - ((300 - min) / range) * (height - 24) - 12;
  return (
    <div className="overflow-hidden rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>반응시간 추이</h2>
        <span className="text-[11px] font-bold" style={{ color: 'var(--spm-grn)' }}>목표 300ms</span>
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
        {points.map((point, index) => <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? 5 : 3} fill={index === points.length - 1 ? '#10b981' : '#818cf8'} />)}
      </svg>
    </div>
  );
}

export default function ReportPage() {
  const profile = useMasterStore((state) => state.profile);
  const sessions = useMasterStore((state) => state.sessions);
  const classRecords = useMasterStore((state) => state.classRecords);
  const students = useMasterStore((state) => state.students);
  const stats = useStats();
  const classes = useMemo(() => Array.from(new Set(students.map((student) => student.group))), [students]);
  const [classFilter, setClassFilter] = useState(classes[0] ?? '3학년 A반');
  const [period, setPeriod] = useState('이번 주');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStep, setShareStep] = useState<'preview' | 'generating' | 'done'>('preview');
  const [reportResult, setReportResult] = useState<GrowthReportResult | null>(null);
  const [retryQueue, setRetryQueue] = useState<RetryQueueItem[]>([]);
  const reactionValues = useMemo(() => sessions.map((session) => session.avg).filter((value): value is number => typeof value === 'number'), [sessions]);
  const filteredStudents = students.filter((student) => student.group === classFilter);
  const filteredRecords = classRecords.filter((record) => record.classId === classFilter);
  const presentTotal = filteredRecords.reduce((sum, record) => sum + record.present, 0);
  const absentTotal = filteredRecords.reduce((sum, record) => sum + record.absent, 0);
  const attendanceRate = presentTotal + absentTotal > 0 ? Math.round((presentTotal / (presentTotal + absentTotal)) * 100) : Math.round(filteredStudents.reduce((sum, student) => sum + student.attendance, 0) / Math.max(filteredStudents.length, 1));
  const skillCount = filteredRecords.reduce((sum, record) => sum + record.skillCount, 0);
  const focusCount = filteredRecords.reduce((sum, record) => sum + record.focusCount, 0);
  const previewStudent = filteredStudents.find((student) => selectedReportIds.includes(student.id)) ?? filteredStudents[0];
  const pdfUsed = classRecords.length;
  const pdfStatus = canUseMonthlyLimit(profile?.plan ?? 'free', pdfUsed, 'pdf');
  const kakaoStatus = canUseMonthlyLimit(profile?.plan ?? 'free', classRecords.filter((record) => record.kakaoSent).length, 'kakao');

  const toggleReportTarget = (id: string) => setSelectedReportIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  const openShareFlow = () => {
    if (selectedReportIds.length === 0) setSelectedReportIds(filteredStudents.map((student) => student.id));
    setShareStep('preview');
    setShareOpen(true);
  };
  const generateReports = async () => {
    if (!pdfStatus.allowed) return;
    const targets = filteredStudents.filter((student) => selectedReportIds.includes(student.id));
    const reportStudents = targets.length > 0 ? targets : filteredStudents;
    setShareStep('generating');
    const result = await generateGrowthReportBatch({
      profile,
      classId: classFilter,
      period,
      students: reportStudents,
      records: filteredRecords,
    });
    if (result.ok) {
      setReportResult(result.data);
      setShareStep('done');
      return;
    }
    setRetryQueue((items) => [
      {
        id: `pdf-${Date.now()}`,
        type: 'pdf-report',
        title: `${classFilter} ${period} 성장 리포트`,
        createdAt: new Date().toISOString(),
        retryable: result.retryable,
      },
      ...items,
    ]);
    setShareStep('preview');
  };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>growth report</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>성장 리포트</h1>
      </header>

      <section className="mb-4 flex gap-2 overflow-x-auto px-[22px] sm:px-8 lg:px-10">{classes.map((item) => <Chip key={item} label={item} active={classFilter === item} onClick={() => setClassFilter(item)} />)}</section>
      <section className="mb-7 flex gap-2 overflow-x-auto px-[22px] sm:px-8 lg:px-10">{['이번 주', '이번 달', '학기'].map((item) => <Chip key={item} label={item} active={period === item} onClick={() => setPeriod(item)} />)}</section>

      <section className="mb-7 grid grid-cols-2 gap-2 px-[22px] sm:px-8 lg:grid-cols-4 lg:px-10">
        <Metric label="평균 RT" value={formatReactionTime(stats.avgRT)} icon={Activity} tone="var(--spm-grn)" />
        <Metric label="출석률" value={`${attendanceRate}%`} icon={UserRound} />
        <Metric label="수업 기록" value={`${filteredRecords.length}건`} icon={FileText} tone="var(--spm-amb)" />
        <Metric label="동작 체크" value={`${skillCount}개`} icon={Zap} />
      </section>

      <div className="grid gap-5 px-[22px] sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-10">
        <section className="space-y-5">
          <TrendChart values={reactionValues} />
          <div className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>semester report</p>
                <h2 className="mt-2 text-[24px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{classFilter} 성장 리포트</h2>
              </div>
              <span className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: pdfStatus.allowed ? 'rgba(16,185,129,0.13)' : 'rgba(239,68,68,0.13)', color: pdfStatus.allowed ? 'var(--spm-grn)' : 'var(--spm-red)' }}>PDF {pdfStatus.label}</span>
            </div>
            <p className="mt-3 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>수업 기록, SPOMOVE 반응 데이터, 학생별 배지와 관찰 메모를 학부모 상담 자료로 묶습니다.</p>
            {!pdfStatus.allowed ? (
              <p className="mt-4 flex gap-2 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>
                <AlertTriangle size={15} />
                {pdfStatus.reason}
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                ['학생', `${filteredStudents.length}명`],
                ['관찰', `${focusCount}건`],
                ['출석', `${attendanceRate}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s3)' }}>
                  <p className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
                  <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={openShareFlow} disabled={!pdfStatus.allowed} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-50" style={{ background: 'var(--spm-acc)' }}>
              <FileText size={16} />
              {selectedReportIds.length > 0 ? `${selectedReportIds.length}명 리포트 생성` : `${filteredStudents.length}명 일괄 생성`}
            </button>
          </div>
        </section>

        <section>
          <div className="mb-[14px] flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>학생 선택</h2>
            <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{classFilter}</span>
          </div>
          <div className="space-y-2">
            {filteredStudents.map((student) => (
              <div key={student.id} className="flex items-center gap-3 rounded-[14px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
                <button type="button" onClick={() => toggleReportTarget(student.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: selectedReportIds.includes(student.id) ? 'var(--spm-acc)' : 'var(--spm-s3)', color: selectedReportIds.includes(student.id) ? '#fff' : 'var(--spm-t3)' }} aria-label={`${student.name} 리포트 선택`}>
                  {selectedReportIds.includes(student.id) ? <Check size={15} /> : null}
                </button>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)', fontFamily: 'var(--spm-font-display)' }}>{student.name.slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{student.name}</strong>
                  <span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>출석률 {student.attendance}% / 누적 {student.classes}회</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mx-[22px] mt-5 rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>parent share</p>
            <h2 className="mt-3 text-[24px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{classFilter} 학부모 리포트</h2>
          </div>
          <span className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: kakaoStatus.allowed ? 'rgba(16,185,129,0.13)' : 'rgba(239,68,68,0.13)', color: kakaoStatus.allowed ? 'var(--spm-grn)' : 'var(--spm-red)' }}>카카오 {kakaoStatus.label}</span>
        </div>
        <p className="mt-3 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>카카오 공유 문장, 학부모 웹뷰 링크, PDF 리포트를 함께 준비합니다.</p>
        {retryQueue.length > 0 ? (
          <p className="mt-4 rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>
            PDF 생성 실패 {retryQueue.length}건이 재시도 대기 중입니다.
          </p>
        ) : null}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={openShareFlow} disabled={!kakaoStatus.allowed || !pdfStatus.allowed} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white disabled:opacity-50" style={{ background: 'var(--spm-acc)' }}>
            <Share2 size={15} />
            공유
          </button>
          <button type="button" onClick={openShareFlow} disabled={!pdfStatus.allowed} className="h-11 rounded-[12px] text-[13px] font-black disabled:opacity-50" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>PDF</button>
        </div>
      </section>

      <BottomSheet open={shareOpen} title="리포트 생성" onClose={() => setShareOpen(false)}>
        {previewStudent ? (
          <div className="max-h-[72dvh] overflow-y-auto pr-1">
            {shareStep === 'preview' ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[18px]" style={{ background: '#f8fafc', color: '#111827' }}>
                  <div className="p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">SPOKEDU GROWTH REPORT</p>
                    <h3 className="mt-3 text-[25px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>{previewStudent.name} 성장 리포트</h3>
                    <p className="mt-1 text-[12px] font-bold text-slate-500">{previewStudent.group} / {period}</p>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {[
                        ['수업', `${previewStudent.classes}회`],
                        ['출석률', `${previewStudent.attendance}%`],
                        ['배지', `${previewStudent.badges.length}개`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[12px] bg-white p-3 text-center ring-1 ring-slate-200">
                          <p className="text-[18px] font-black">{value}</p>
                          <p className="mt-1 text-[10px] font-bold text-slate-400">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-slate-200 p-5">
                    <p className="mb-3 text-[13px] font-black">동작 성장</p>
                    <div className="space-y-3">
                      {previewStudent.skills.slice(0, 3).map((skill) => (
                        <div key={skill.label}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[12px] font-bold">{skill.label}</span>
                            <span className="text-[11px] font-black text-emerald-600">{skill.delta}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: `${skill.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-5 rounded-[12px] bg-slate-100 p-3 text-[12px] font-semibold leading-5 text-slate-600">{previewStudent.name}은 수업 참여가 안정적이며, 다음 수업에서는 가장 성장 여지가 큰 동작을 더 세밀하게 관찰하겠습니다.</p>
                  </div>
                </div>
                <Link href={`/spokedu-master/parent/${previewStudent.id}?token=${createParentPreviewToken(previewStudent.id)}`} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                  <ExternalLink size={16} />
                  학부모 링크 미리보기
                </Link>
                <button type="button" onClick={generateReports} className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                  <MessageCircle size={16} />
                  {selectedReportIds.length > 0 ? `${selectedReportIds.length}명 생성하고 공유` : '일괄 생성하고 공유'}
                </button>
              </div>
            ) : null}
            {shareStep === 'generating' ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
                <p className="mt-5 text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>리포트를 생성하고 있어요</p>
                <p className="mt-2 text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>Cloud Function 계약에 맞춰 PDF와 카카오 공유 문장을 준비합니다.</p>
              </div>
            ) : null}
            {shareStep === 'done' ? (
              <div className="py-6 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: 'rgba(16,185,129,0.14)' }}>
                  <Check size={30} color="var(--spm-grn)" />
                </div>
                <h3 className="mt-5 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>리포트 준비 완료</h3>
                <p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>{reportResult?.pdfCount ?? (selectedReportIds.length || filteredStudents.length)}명의 PDF와 카카오 공유 문장이 생성되었습니다.</p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button type="button" disabled={!kakaoStatus.allowed} className="h-11 rounded-[12px] text-[13px] font-black text-white disabled:opacity-50" style={{ background: 'var(--spm-acc)' }}>카카오 발송</button>
                  <button type="button" className="h-11 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>PDF 저장</button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
