'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslator } from '@/app/providers/I18nProvider';
import { AlertCircle, Bot, ChevronDown, History, Loader2, Sparkles, User } from 'lucide-react';
import { useProContext } from '../hooks/useProContext';
import { useStudentStore, type Student } from '../hooks/useStudentStore';
import { SubscriberBadge } from '../components/SubscriberWorkspacePrimitives';
import { trackSpokeduProEvent } from '../utils/spokeduProAnalytics';
import AIReportForm from './ai-report/AIReportForm';
import { getPeriodLabel, OPTION_DARK_CLASS } from './ai-report/constants';
import ReportHistoryPanel from './ai-report/ReportHistoryPanel';
import { EmptyState, ReportCard } from './ai-report/ReportPreview';
import type { HistoryReportItem, ReportData, ReportMeta, Tone } from './ai-report/types';

export default function AIReportView({
  initialStudentId = null,
  onConsumeInitialStudent,
}: {
  initialStudentId?: string | null;
  onConsumeInitialStudent?: () => void;
} = {}) {
  const tr = useTranslator();
  const { students } = useStudentStore();
  const { ctx } = useProContext();

  const plan = ctx.entitlement.plan;
  const usage = ctx.usage;
  const monthlyLimit = usage.aiReportMonthlyLimit;
  const isBlocked = plan === 'free';
  const isLimitReached = monthlyLimit !== null && usage.aiReportThisMonth >= monthlyLimit;
  const remainingReports = monthlyLimit === null ? null : Math.max(monthlyLimit - usage.aiReportThisMonth, 0);

  const [tab, setTab] = useState<'create' | 'history'>('create');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [developmentGoal, setDevelopmentGoal] = useState('인지 상황 판단 향상 (Think)');
  const [additionalGoal, setAdditionalGoal] = useState('');
  const [tone, setTone] = useState<Tone>('warm');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedToHistory, setSavedToHistory] = useState<boolean | null>(null);

  const [historyReports, setHistoryReports] = useState<HistoryReportItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
  const [historyRetryKey, setHistoryRetryKey] = useState(0);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<HistoryReportItem | null>(null);
  const [viewingReport, setViewingReport] = useState<ReportData | null>(null);
  const [viewingMeta, setViewingMeta] = useState<ReportMeta | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;

  useEffect(() => {
    if (!initialStudentId) return;
    setSelectedStudentId(initialStudentId);
    setTab('create');
    onConsumeInitialStudent?.();
  }, [initialStudentId, onConsumeInitialStudent]);

  useEffect(() => {
    if (!selectedHistoryReport) {
      setViewingReport(null);
      setViewingMeta(null);
      return;
    }

    try {
      const parsed = JSON.parse(selectedHistoryReport.content) as { report?: ReportData; meta?: ReportMeta };
      setViewingReport(parsed.report ?? null);
      setViewingMeta(parsed.meta ?? null);
    } catch {
      setViewingReport(null);
      setViewingMeta(null);
    }
  }, [selectedHistoryReport]);

  useEffect(() => {
    if (tab !== 'history' || !selectedStudentId) {
      setHistoryReports([]);
      setSelectedHistoryReport(null);
      setHistoryLoadError(null);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryLoadError(null);
    setSelectedHistoryReport(null);

    fetch(`/api/spokedu-pro/ai-report?studentId=${encodeURIComponent(selectedStudentId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setHistoryLoadError(typeof data.error === 'string' ? data.error : `목록을 불러오지 못했어요. (${res.status})`);
          setHistoryReports([]);
          return;
        }
        if (!data.ok) {
          setHistoryLoadError(data.error ?? '목록을 불러오지 못했어요.');
          setHistoryReports([]);
          return;
        }
        setHistoryReports(data.reports ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistoryLoadError('목록을 불러오지 못했어요.');
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, selectedStudentId, historyRetryKey]);

  const handleGenerate = useCallback(async () => {
    if (!selectedStudent) return;
    setLoading(true);
    setError(null);
    setReport(null);
    setMeta(null);
    setSavedToHistory(null);

    try {
      const res = await fetch('/api/spokedu-pro/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: {
            id: selectedStudent.id,
            name: selectedStudent.name,
            classGroup: selectedStudent.classGroup,
            physical: selectedStudent.physical,
            attendanceStatus: selectedStudent.status,
          },
          sessionNotes,
          developmentGoal,
          additionalGoal,
          tone,
          language: 'korean',
          periodLabel: getPeriodLabel(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? '리포트 생성 실패');
      }

      setReport(data.report);
      setMeta(data.meta);
      setSavedToHistory(data.savedToHistory === true);
      trackSpokeduProEvent('spokedu_pro_report_generate', {
        plan: ctx.entitlement.plan,
        aiReportThisMonth: ctx.usage.aiReportThisMonth,
        aiReportMonthlyLimit: ctx.usage.aiReportMonthlyLimit,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, sessionNotes, developmentGoal, additionalGoal, tone, ctx.entitlement.plan, ctx.usage]);

  const handleCopy = useCallback(async () => {
    const sourceReport = tab === 'history' ? viewingReport : report;
    const sourceMeta = tab === 'history' ? viewingMeta : meta;
    if (!sourceReport || !sourceMeta) return;

    const period = sourceMeta.period ?? '';
    const text = [
      `${sourceMeta.studentName} ${sourceMeta.classGroup} ${tr('수업 리포트')} (${period})`,
      '',
      tr('이번 수업 하이라이트'),
      sourceReport.highlight,
      '',
      tr('우리 아이 성장 포인트'),
      sourceReport.growth,
      '',
      tr('가정 연계 활동'),
      sourceReport.homeActivity,
      '',
      tr('코치 한마디'),
      sourceReport.coachMessage,
      '',
      `${tr('다음 수업 목표:')} ${sourceReport.nextGoal}`,
      '',
      `[${tr('스포키듀 AI 리포트')} | ${new Date(sourceMeta.generatedAt).toLocaleDateString('ko-KR')}]`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('복사에 실패했어요. 내용을 직접 선택해 복사해 주세요.');
    }
  }, [tab, report, meta, viewingReport, viewingMeta, tr]);

  const handleReset = useCallback(() => {
    setReport(null);
    setMeta(null);
    setError(null);
    setSavedToHistory(null);
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!reportRef.current) return;
    const sourceMeta = tab === 'history' ? viewingMeta : meta;
    if (!sourceMeta) return;

    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(reportRef.current, { backgroundColor: '#0F172A', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${sourceMeta.studentName}_${tr('리포트')}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF 저장에 실패했어요.');
    }
  }, [tab, meta, viewingMeta, tr]);

  const handleKakaoShare = useCallback(() => {
    const sourceReport = tab === 'history' ? viewingReport : report;
    const sourceMeta = tab === 'history' ? viewingMeta : meta;
    if (!sourceReport || !sourceMeta) return;

    const text = `${sourceMeta.studentName} ${tr('수업 리포트')}\n\n${sourceReport.highlight}\n\n- ${tr('스포키듀 AI 리포트')}`;
    void (async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setError('공유 문구 복사에 실패했어요. 내용을 직접 선택해 복사해 주세요.');
      }
    })();
  }, [tab, report, meta, viewingReport, viewingMeta, tr]);

  const canGenerate = !!selectedStudent && !loading && !isBlocked && !isLimitReached;

  return (
    <section className="min-h-screen px-4 py-8 pb-28 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-600/20">
                <Bot className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black leading-none tracking-tight text-white sm:text-3xl">
                  {tr('에듀-에코 AI 리포트')}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {tr('수업 메모와 신체 데이터를 학부모용 성장 리포트로 정리합니다.')}
                </p>
              </div>
            </div>
            {!isBlocked && monthlyLimit !== null ? (
              <SubscriberBadge tone={isLimitReached ? 'amber' : 'violet'}>
                {tr('이번 달')} {usage.aiReportThisMonth} / {monthlyLimit}
              </SubscriberBadge>
            ) : null}
          </div>

          {isBlocked ? (
            <StatusBanner
              tone="amber"
              title={tr('AI 리포트는 Basic 이상 플랜에서 사용할 수 있습니다.')}
              description={tr('설정에서 플랜을 업그레이드하거나 운영자에게 문의해 주세요.')}
            />
          ) : null}
          {!isBlocked && !isLimitReached && monthlyLimit !== null && remainingReports !== null && remainingReports <= 2 ? (
            <StatusBanner
              tone="amber"
              title={tr(`이번 달 AI 리포트가 ${remainingReports}회 남았어요.`)}
              description={tr('필요하면 Pro 플랜에서 더 여유롭게 사용할 수 있습니다.')}
            />
          ) : null}
          {!isBlocked && isLimitReached ? (
            <StatusBanner
              tone="red"
              title={tr(`이번 달 AI 리포트 한도(${monthlyLimit}회)를 모두 사용했습니다.`)}
              description={tr('다음 달에 다시 생성하거나 플랜 업그레이드를 검토해 주세요.')}
            />
          ) : null}

          <div className="mt-4 flex w-fit gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
            <TabButton active={tab === 'create'} icon={Sparkles} label={tr('새 리포트 만들기')} onClick={() => setTab('create')} />
            <TabButton active={tab === 'history'} icon={History} label={tr('이전 리포트 보기')} onClick={() => setTab('history')} />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[340px_1fr] lg:grid-cols-[400px_1fr]">
          <div className="space-y-4">
            <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <User className="h-3.5 w-3.5" /> {tr('학생 선택')}
                </label>
                {students.length === 0 ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                    <p className="text-xs font-medium text-amber-400">
                      {tr('학생 데이터가 없습니다. 출석부에서 먼저 학생을 등록해 주세요.')}
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedStudentId}
                      onChange={(event) => setSelectedStudentId(event.target.value)}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30"
                    >
                      <option value="" className={OPTION_DARK_CLASS}>
                        {tr('학생을 선택하세요')}
                      </option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id} className={OPTION_DARK_CLASS}>
                          {student.name} ({student.classGroup})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                )}
              </div>

              {tab === 'history' ? (
                <ReportHistoryPanel
                  historyReports={historyReports}
                  historyLoading={historyLoading}
                  historyLoadError={historyLoadError}
                  onRetry={() => setHistoryRetryKey((key) => key + 1)}
                  selectedHistoryReport={selectedHistoryReport}
                  onSelectReport={setSelectedHistoryReport}
                  selectedStudentId={selectedStudentId}
                />
              ) : null}

              {tab === 'create' ? (
                <AIReportForm
                  selectedStudent={selectedStudent}
                  sessionNotes={sessionNotes}
                  onSessionNotesChange={setSessionNotes}
                  developmentGoal={developmentGoal}
                  onDevelopmentGoalChange={setDevelopmentGoal}
                  additionalGoal={additionalGoal}
                  onAdditionalGoalChange={setAdditionalGoal}
                  tone={tone}
                  onToneChange={setTone}
                  onGenerate={handleGenerate}
                  loading={loading}
                  canGenerate={canGenerate}
                />
              ) : null}
            </div>
          </div>

          <div ref={reportRef} className="flex min-h-[400px] flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            {error ? (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-semibold text-red-300">{tr('생성 실패')}</p>
                  <p className="mt-0.5 text-xs text-red-400/70">{tr(error)}</p>
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-500/20 bg-violet-600/10">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-white">{tr('Gemini가 분석 중입니다')}</p>
                  <p className="mt-1 text-sm text-slate-500">{tr('신체 데이터와 수업 메모를 기반으로 리포트를 작성하고 있어요.')}</p>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {['수업 분석', '성장 포인트 추출', '가정 연계 활동 추천'].map((step) => (
                    <SubscriberBadge key={step}>{tr(step)}</SubscriberBadge>
                  ))}
                </div>
              </div>
            ) : null}

            {!loading && !report && !error && tab === 'create' ? <EmptyState /> : null}

            {tab === 'history' && !selectedHistoryReport && selectedStudentId && !historyLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                <History className="mb-4 h-16 w-16 text-slate-600" />
                <p className="text-sm text-slate-500">{tr('목록에서 볼 리포트를 선택하세요.')}</p>
              </div>
            ) : null}

            {tab === 'history' && selectedHistoryReport ? (
              <HistoryReportPreview
                selectedHistoryReport={selectedHistoryReport}
                onCopy={handleCopy}
                onReset={() => setSelectedHistoryReport(null)}
                onDownloadPdf={handleDownloadPdf}
                onKakaoShare={handleKakaoShare}
                copied={copied}
              />
            ) : null}

            {!loading && report && meta && selectedStudent && tab === 'create' ? (
              <>
                {savedToHistory === false ? (
                  <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                    {tr('이전 리포트 목록에 저장되지 않았을 수 있습니다. 복사 또는 PDF로 보관해 주세요.')}
                  </div>
                ) : null}
                <ReportCard
                  report={report}
                  meta={meta}
                  onCopy={handleCopy}
                  onReset={handleReset}
                  onDownloadPdf={handleDownloadPdf}
                  onKakaoShare={handleKakaoShare}
                  copied={copied}
                  student={selectedStudent}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Sparkles;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
        active ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatusBanner({ tone, title, description }: { tone: 'amber' | 'red'; title: string; description: string }) {
  const toneClass =
    tone === 'red'
      ? 'border-red-500/20 bg-red-500/10 text-red-300'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  const detailClass = tone === 'red' ? 'text-red-400/70' : 'text-amber-400/70';

  return (
    <div className={`mb-3 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${toneClass}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className={`mt-0.5 text-xs ${detailClass}`}>{description}</p>
      </div>
    </div>
  );
}

function HistoryReportPreview({
  selectedHistoryReport,
  onCopy,
  onReset,
  onDownloadPdf,
  onKakaoShare,
  copied,
}: {
  selectedHistoryReport: HistoryReportItem;
  onCopy: () => void;
  onReset: () => void;
  onDownloadPdf: () => void;
  onKakaoShare: () => void;
  copied: boolean;
}) {
  const tr = useTranslator();
  let parsedReport: { report: ReportData; meta: ReportMeta } | null = null;

  try {
    const parsed = JSON.parse(selectedHistoryReport.content) as { report?: ReportData; meta?: ReportMeta };
    const historyReport = parsed.report;
    const historyMeta = parsed.meta;
    if (historyReport && historyMeta) parsedReport = { report: historyReport, meta: historyMeta };
  } catch {
    parsedReport = null;
  }

  if (!parsedReport) {
    return <div className="p-4 text-sm text-slate-500">{tr('리포트를 불러올 수 없습니다.')}</div>;
  }

  const dummyStudent: Student = {
    id: '',
    name: parsedReport.meta.studentName,
    classGroup: parsedReport.meta.classGroup ?? '',
    status: 'present',
    physical: { coordination: 2, agility: 2, endurance: 2, balance: 2, strength: 2 },
  };

  return (
    <ReportCard
      report={parsedReport.report}
      meta={parsedReport.meta}
      onCopy={onCopy}
      onReset={onReset}
      onDownloadPdf={onDownloadPdf}
      onKakaoShare={onKakaoShare}
      copied={copied}
      student={dummyStudent}
      showRadar={false}
      readOnly
    />
  );
}
