'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Bot,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  User,
  ClipboardList,
  Target,
  MessageSquare,
  Loader2,
  AlertCircle,
  Star,
  TrendingUp,
  Home,
  Award,
  RotateCcw,
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useStudentStore, PHYSICAL_LABELS, LEVEL_LABELS, type Student } from '../hooks/useStudentStore';
import { useProContext } from '../hooks/useProContext';

// ── Types ────────────────────────────────────────────────────────────────────
type Tone = 'warm' | 'professional' | 'friendly';
type PhysicalLevel = 1 | 2 | 3;
type ColorKey = 'violet' | 'emerald' | 'blue' | 'amber';

type ReportData = {
  highlight: string;
  growth: string;
  homeActivity: string;
  coachMessage: string;
  strengthSummary: string;
  growthTag: string;
  nextGoal: string;
};

type ReportMeta = {
  studentName: string;
  classGroup: string;
  period?: string;
  generatedAt: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getPeriodLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const week = Math.ceil(d / 7);
  return `${y}년 ${m}월 ${week}주차`;
}

function buildRadarData(student: Student) {
  return Object.entries(student.physical).map(([k, v]) => ({
    subject: PHYSICAL_LABELS[k as keyof typeof PHYSICAL_LABELS],
    value: (v as PhysicalLevel) * 33.3,
    level: LEVEL_LABELS[v as PhysicalLevel],
  }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToneChip({
  value,
  current,
  label,
  emoji,
  onClick,
}: {
  value: Tone;
  current: Tone;
  label: string;
  emoji: string;
  onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
        active
          ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20'
          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
      }`}
    >
      <span className="mr-1">{emoji}</span>
      {label}
    </button>
  );
}

function RadarChartCard({ student }: { student: Student }) {
  const data = buildRadarData(student);
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">신체 기능 프로파일</p>
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius={65}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
          />
          <Radar
            name="신체기능"
            dataKey="value"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10 }}
            formatter={(_value: unknown, _name: unknown, props: { payload?: { subject: string; level: string } }) =>
              [props.payload?.level ?? '', props.payload?.subject ?? ''] as [string, string]
            }
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReportSection({
  icon: Icon,
  label,
  content,
  color,
}: {
  icon: React.ElementType;
  label: string;
  content: string;
  color: ColorKey;
}) {
  const colors: Record<ColorKey, { bg: string; border: string; icon: string; label: string }> = {
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: 'text-violet-400', label: 'text-violet-300' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', label: 'text-emerald-300' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-400', label: 'text-blue-300' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400', label: 'text-amber-300' },
  };
  const c = colors[color];
  const lines = content.split('\n').filter(Boolean);
  const isList = lines.length > 1;

  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-4 space-y-2`}>
      <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${c.label}`}>
        <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
        {label}
      </div>
      {isList ? (
        <ul className="space-y-1.5">
          {lines.map((line, i) => (
            <li key={i} className="text-slate-200 text-sm leading-relaxed flex gap-2">
              <span className={`${c.icon} font-bold shrink-0`}>•</span>
              <span>{line.replace(/^\d+\.\s*/, '')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-200 text-sm leading-relaxed">{content}</p>
      )}
    </div>
  );
}

function ReportCard({
  report,
  meta,
  onCopy,
  onReset,
  copied,
  student,
}: {
  report: ReportData;
  meta: ReportMeta;
  onCopy: () => void;
  onReset: () => void;
  copied: boolean;
  student: Student;
}) {
  const date = new Date(meta.generatedAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-bold rounded-full">
              AI 리포트
            </span>
            {meta.period && (
              <span className="text-xs text-slate-500">{meta.period}</span>
            )}
          </div>
          <h3 className="text-xl font-black text-white">
            {meta.studentName}
            <span className="text-slate-400 font-normal text-base ml-2">{meta.classGroup}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{date} 생성</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
            title="다시 작성"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 rounded-xl text-xs font-bold transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-full">
          <Star className="w-3 h-3" /> {report.strengthSummary}
        </span>
        <span className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
          <TrendingUp className="w-3 h-3" /> {report.growthTag}
        </span>
      </div>

      <RadarChartCard student={student} />

      <div className="space-y-3">
        <ReportSection icon={Sparkles} label="이번 수업 하이라이트" color="violet" content={report.highlight} />
        <ReportSection icon={TrendingUp} label="우리 아이 성장 포인트" color="emerald" content={report.growth} />
        <ReportSection icon={Home} label="가정 연계 활동 추천" color="blue" content={report.homeActivity} />
        <ReportSection icon={Award} label="코치 한마디" color="amber" content={report.coachMessage} />
      </div>

      <div className="bg-gradient-to-r from-violet-600/10 to-blue-600/10 border border-violet-500/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">다음 수업 목표</p>
        <p className="text-white font-medium text-sm">{report.nextGoal}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-20 h-20 bg-violet-600/10 border border-violet-500/20 rounded-3xl flex items-center justify-center mb-5">
        <Bot className="w-9 h-9 text-violet-400" />
      </div>
      <h3 className="text-white font-bold text-lg mb-2">AI 리포트 대기 중</h3>
      <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
        학생을 선택하고 수업 내용을 입력하면 맞춤형 학부모 리포트를 자동 생성합니다.
      </p>
      <div className="mt-6 flex gap-2 flex-wrap justify-center">
        {['신체 기능 데이터 기반', 'AI 분석', '가정 연계 활동'].map((tag) => (
          <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 text-slate-500 text-xs rounded-full">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
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

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [developmentGoal, setDevelopmentGoal] = useState('인지적 상황 판단력 향상 (Think)');
  const [additionalGoal, setAdditionalGoal] = useState('');
  const [tone, setTone] = useState<Tone>('warm');
  const [periodLabel] = useState(getPeriodLabel());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [copied, setCopied] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

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
          periodLabel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? '리포트 생성 실패');
      }
      setReport(data.report);
      setMeta(data.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, sessionNotes, developmentGoal, additionalGoal, tone, periodLabel]);

  const handleCopy = useCallback(async () => {
    if (!report || !meta) return;
    const text = [
      `📋 ${meta.studentName} ${meta.classGroup} 수업 리포트 (${meta.period ?? ''})`,
      '',
      `✨ 이번 수업 하이라이트`,
      report.highlight,
      '',
      `📈 성장 포인트`,
      report.growth,
      '',
      `🏠 가정 연계 활동`,
      report.homeActivity,
      '',
      `💬 코치 한마디`,
      report.coachMessage,
      '',
      `🎯 다음 수업 목표: ${report.nextGoal}`,
      '',
      `[스포키듀 AI 리포트 | ${new Date(meta.generatedAt).toLocaleDateString('ko-KR')}]`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('복사 실패 — 수동으로 선택해 복사해주세요.');
    }
  }, [report, meta]);

  const handleReset = useCallback(() => {
    setReport(null);
    setMeta(null);
    setError(null);
  }, []);

  const canGenerate = !!selectedStudent && !loading && !isBlocked && !isLimitReached;

  return (
    <section className="min-h-screen px-4 sm:px-6 lg:px-10 py-8 pb-28">
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
        </header>

        {/* ── Main Layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[400px_1fr] gap-5">

          {/* ── LEFT: Form Panel ── */}
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-5">

              {/* Student select */}
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
                      <option value="">— 학생을 선택하세요 —</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.classGroup})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Physical preview */}
              {selectedStudent && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">신체 기능 현황</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(selectedStudent.physical).map(([k, v]) => {
                      const colorMap: Record<number, string> = {
                        1: 'bg-red-500/20 text-red-400 border-red-500/20',
                        2: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
                        3: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
                      };
                      return (
                        <span
                          key={k}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${colorMap[v as number]}`}
                        >
                          {PHYSICAL_LABELS[k as keyof typeof PHYSICAL_LABELS]} {LEVEL_LABELS[v as PhysicalLevel]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Period */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  <ClipboardList className="w-3.5 h-3.5" /> 수업 기간
                </label>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium">
                  {periodLabel}
                </div>
              </div>

              {/* Session notes */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  <MessageSquare className="w-3.5 h-3.5" /> 수업 메모
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="오늘 수업에서 있었던 특이사항, 잘한 점, 아쉬운 점 등을 자유롭게 입력하세요."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-600 px-4 py-3 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 text-sm leading-relaxed resize-none transition-all"
                />
              </div>

              {/* Development goal */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  <Target className="w-3.5 h-3.5" /> 핵심 발달 목표
                </label>
                <div className="relative">
                  <select
                    value={developmentGoal}
                    onChange={(e) => setDevelopmentGoal(e.target.value)}
                    className="w-full appearance-none bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 font-medium text-sm transition-all cursor-pointer"
                  >
                    <option value="인지적 상황 판단력 향상 (Think)">인지적 상황 판단력 향상 (Think)</option>
                    <option value="신체 대근육 및 순발력 향상 (Play)">신체 대근육 및 순발력 향상 (Play)</option>
                    <option value="협동심 및 규칙 준수 (Grow)">협동심 및 규칙 준수 (Grow)</option>
                    <option value="집중력 및 자기조절력 (Focus)">집중력 및 자기조절력 (Focus)</option>
                    <option value="창의적 표현 및 자신감 (Express)">창의적 표현 및 자신감 (Express)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Additional goal */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  추가 목표 (선택)
                </label>
                <input
                  type="text"
                  value={additionalGoal}
                  onChange={(e) => setAdditionalGoal(e.target.value)}
                  placeholder="예: 친구와 사이좋게 나누기"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-600 px-4 py-3 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 text-sm transition-all"
                />
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  리포트 어조
                </label>
                <div className="flex gap-2">
                  <ToneChip value="warm" current={tone} label="따뜻하게" emoji="🤗" onClick={() => setTone('warm')} />
                  <ToneChip value="professional" current={tone} label="전문적으로" emoji="📋" onClick={() => setTone('professional')} />
                  <ToneChip value="friendly" current={tone} label="친근하게" emoji="😊" onClick={() => setTone('friendly')} />
                </div>
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-black rounded-2xl hover:from-violet-700 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-violet-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Gemini 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> 학부모 리포트 생성
                </>
              )}
            </button>

            {!selectedStudent && students.length > 0 && (
              <p className="text-center text-slate-600 text-xs">학생을 선택해야 생성할 수 있습니다.</p>
            )}
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

            {!loading && !report && !error && <EmptyState />}

            {!loading && report && meta && selectedStudent && (
              <ReportCard
                report={report}
                meta={meta}
                onCopy={handleCopy}
                onReset={handleReset}
                copied={copied}
                student={selectedStudent}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
