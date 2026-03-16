'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Script from 'next/script';
import { Bot, Sparkles, User, Loader2, AlertCircle, History, ChevronDown } from 'lucide-react';
import { useStudentStore, type Student } from '../hooks/useStudentStore';
import { useProContext } from '../hooks/useProContext';
import { getPeriodLabel, OPTION_DARK_CLASS } from './ai-report/constants';
import type { ReportData, ReportMeta, HistoryReportItem, Tone } from './ai-report/types';
import AIReportForm from './ai-report/AIReportForm';
import ReportHistoryPanel from './ai-report/ReportHistoryPanel';
import { ReportCard, EmptyState } from './ai-report/ReportPreview';

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (options: { objectType: string; text: string; link: { mobileWebUrl: string; webUrl: string } }) => void;
      };
    };
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AIReportView() {
  const { students } = useStudentStore();
  const { ctx } = useProContext();

  const plan = ctx.entitlement.plan;
  const usage = ctx.usage;
  const monthlyLimit = usage.aiReportMonthlyLimit;
  const isBlocked = plan === 'free';
  const isLimitReached = monthlyLimit !== null && usage.aiReportThisMonth >= monthlyLimit;

  const [tab, setTab] = useState<'create' | 'history'>('create');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [developmentGoal, setDevelopmentGoal] = useState('인지적 상황 판단력 향상 (Think)');
  const [additionalGoal, setAdditionalGoal] = useState('');
  const [tone, setTone] = useState<Tone>('warm');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [copied, setCopied] = useState(false);
  /** 마지막 생성 리포트가 이전 리포트 목록에 저장되었는지 (false면 저장 실패 안내) */
  const [savedToHistory, setSavedToHistory] = useState<boolean | null>(null);

  const [historyReports, setHistoryReports] = useState<HistoryReportItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
  const [historyRetryKey, setHistoryRetryKey] = useState(0);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<HistoryReportItem | null>(null);
  /** 이전 리포트 보기에서 표시 중인 report/meta (복사·PDF에 사용) */
  const [viewingReport, setViewingReport] = useState<ReportData | null>(null);
  const [viewingMeta, setViewingMeta] = useState<ReportMeta | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  // 이전 리포트 선택 시 파싱해 viewing 설정
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

  // 이전 리포트 목록 조회 (학생 선택 시 또는 다시 시도)
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
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
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
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [tab, selectedStudentId, historyRetryKey]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  const handleGenerate = useCallback(async () => {
    if (!selectedStudent) return;
    setLoading(true);
    setError(null);
    setReport(null);
    setMeta(null);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, sessionNotes, developmentGoal, additionalGoal, tone]);

  const handleCopy = useCallback(async () => {
    const sourceReport = tab === 'history' ? viewingReport : report;
    const sourceMeta = tab === 'history' ? viewingMeta : meta;
    if (!sourceReport || !sourceMeta) return;
    const text = [
      `📋 ${sourceMeta.studentName} ${sourceMeta.classGroup} 수업 리포트 (${sourceMeta.period ?? ''})`,
      '',
      `✨ 이번 수업 하이라이트`,
      sourceReport.highlight,
      '',
      `📈 성장 포인트`,
      sourceReport.growth,
      '',
      `🏠 가정 연계 활동`,
      sourceReport.homeActivity,
      '',
      `💬 코치 한마디`,
      sourceReport.coachMessage,
      '',
      `🎯 다음 수업 목표: ${sourceReport.nextGoal}`,
      '',
      `[스포키듀 AI 리포트 | ${new Date(sourceMeta.generatedAt).toLocaleDateString('ko-KR')}]`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('복사 실패 — 수동으로 선택해 복사해주세요.');
    }
  }, [tab, report, meta, viewingReport, viewingMeta]);

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
      pdf.save(`${sourceMeta.studentName}_리포트.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF 저장 실패');
    }
  }, [tab, meta, viewingMeta]);

  const handleKakaoShare = useCallback(() => {
    const sourceReport = tab === 'history' ? viewingReport : report;
    const sourceMeta = tab === 'history' ? viewingMeta : meta;
    if (!sourceReport || !sourceMeta || !window.Kakao?.isInitialized()) return;
    window.Kakao.Share.sendDefault({
      objectType: 'text',
      text: `${sourceMeta.studentName} 수업 리포트\n\n${sourceReport.highlight}\n\n- 스포키듀 AI 리포트`,
      link: { mobileWebUrl: window.location.href, webUrl: window.location.href },
    });
  }, [tab, report, meta, viewingReport, viewingMeta]);

  const canGenerate = !!selectedStudent && !loading && !isBlocked && !isLimitReached;

  return (
    <section className="min-h-screen px-4 sm:px-6 lg:px-10 py-8 pb-28">
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onLoad={() => {
          const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
          if (key && window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key);
        }}
      />
      <div className="max-w-6xl mx-auto">

        {/* ── Page Header ── */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                에듀-에코 AI 리포트
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">Gemini 기반 학부모 연계 리포트 자동 생성</p>
            </div>
          </div>

          {/* 플랜 제한 배너 */}
          {isBlocked && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 font-semibold">AI 리포트는 Basic 이상 플랜에서 사용 가능합니다.</p>
                <p className="text-amber-400/70 text-xs mt-0.5">설정 → 플랜 업그레이드 또는 운영팀에 문의해 주세요.</p>
              </div>
            </div>
          )}
          {!isBlocked && !isLimitReached && usage.aiReportThisMonth >= 18 && monthlyLimit !== null && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 font-semibold">이번 달 AI 리포트를 18회 사용했습니다. 2회 남았어요.</p>
                <p className="text-amber-400/70 text-xs mt-0.5">Pro 업그레이드 시 무제한 생성 가능합니다.</p>
              </div>
            </div>
          )}
          {!isBlocked && isLimitReached && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-semibold">이번 달 AI 리포트 한도({monthlyLimit}회)를 모두 사용했습니다.</p>
                <p className="text-red-400/70 text-xs mt-0.5">Pro 플랜 업그레이드 시 무제한으로 사용할 수 있습니다.</p>
              </div>
            </div>
          )}
          {!isBlocked && !isLimitReached && monthlyLimit !== null && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Bot className="w-3.5 h-3.5" />
              이번 달 사용: <span className="text-slate-300 font-bold">{usage.aiReportThisMonth} / {monthlyLimit}회</span>
            </div>
          )}

          {/* 탭: 새 리포트 / 이전 리포트 보기 */}
          <div className="flex gap-2 mt-4 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setTab('create')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'create' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-4 h-4" />
              새 리포트 만들기
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'history' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <History className="w-4 h-4" />
              이전 리포트 보기
            </button>
          </div>
        </header>

        {/* ── Main Layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[400px_1fr] gap-5">

          {/* ── LEFT: Form Panel or History List ── */}
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-5">

              {/* 수강생 선택 (공통) */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  <User className="w-3.5 h-3.5" /> 수강생 선택
                </label>
                {students.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                    <p className="text-amber-400 text-xs font-medium">
                      수강생 데이터가 없습니다. 출석부에서 먼저 학생을 등록해 주세요.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full appearance-none bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 font-medium text-sm transition-all cursor-pointer"
                    >
                      <option value="" className={OPTION_DARK_CLASS}>— 학생을 선택하세요 —</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id} className={OPTION_DARK_CLASS}>
                          {s.name} ({s.classGroup})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                )}
              </div>

              {tab === 'history' && (
                <ReportHistoryPanel
                  historyReports={historyReports}
                  historyLoading={historyLoading}
                  historyLoadError={historyLoadError}
                  onRetry={() => setHistoryRetryKey((k) => k + 1)}
                  selectedHistoryReport={selectedHistoryReport}
                  onSelectReport={setSelectedHistoryReport}
                  selectedStudentId={selectedStudentId}
                />
              )}

              {tab === 'create' && (
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
              )}
            </div>
          </div>

          {/* ── RIGHT: Preview Panel ── */}
          <div
            ref={reportRef}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 min-h-[400px] flex flex-col"
          >
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-semibold text-sm">생성 실패</p>
                  <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                <div className="w-16 h-16 bg-violet-600/10 border border-violet-500/20 rounded-3xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">Gemini가 분석 중입니다</p>
                  <p className="text-slate-500 text-sm mt-1">신체 데이터와 수업 메모를 기반으로 리포트를 작성하고 있어요.</p>
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap justify-center">
                  {['수업 분석', '성장 포인트 도출', '가정 활동 추천'].map((step) => (
                    <span
                      key={step}
                      className="px-2 py-1 bg-white/5 border border-white/10 text-slate-500 text-xs rounded-lg"
                    >
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!loading && !report && !error && tab === 'create' && <EmptyState />}

            {tab === 'history' && !selectedHistoryReport && selectedStudentId && !historyLoading && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
                <History className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-500 text-sm">목록에서 볼 리포트를 선택하세요.</p>
              </div>
            )}

            {tab === 'history' && selectedHistoryReport && (() => {
              try {
                const parsed = JSON.parse(selectedHistoryReport.content) as { report?: ReportData; meta?: ReportMeta };
                const histReport = parsed.report;
                const histMeta = parsed.meta;
                if (!histReport || !histMeta) return null;
                const dummyStudent: Student = {
                  id: '',
                  name: histMeta.studentName,
                  classGroup: histMeta.classGroup ?? '',
                  status: 'present',
                  physical: { coordination: 2, agility: 2, endurance: 2, balance: 2, strength: 2 },
                };
                return (
                  <ReportCard
                    report={histReport}
                    meta={histMeta}
                    onCopy={handleCopy}
                    onReset={() => setSelectedHistoryReport(null)}
                    onDownloadPdf={handleDownloadPdf}
                    onKakaoShare={handleKakaoShare}
                    copied={copied}
                    student={dummyStudent}
                    showRadar={false}
                    readOnly
                  />
                );
              } catch {
                return (
                  <div className="text-slate-500 text-sm p-4">리포트를 불러올 수 없습니다.</div>
                );
              }
            })()}

            {!loading && report && meta && selectedStudent && tab === 'create' && (
              <>
                {savedToHistory === false && (
                  <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-200">
                    이전 리포트 목록에 저장되지 않았을 수 있습니다. 복사·PDF로 보관해 주세요.
                  </div>
                )}
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
