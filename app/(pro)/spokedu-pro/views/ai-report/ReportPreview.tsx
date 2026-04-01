'use client';

import {
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  FileDown,
  Share2,
  Star,
  TrendingUp,
  Home,
  Award,
  Bot,
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useEffect, useState } from 'react';
import { useStudentStore, PHYSICAL_LABELS, LEVEL_LABELS, type Student } from '../../hooks/useStudentStore';
import type { ReportData, ReportMeta, ColorKey } from './types';

type PhysicalLevel = 1 | 2 | 3;

function buildRadarData(student: Student) {
  return Object.entries(student.physical).map(([k, v]) => ({
    subject: PHYSICAL_LABELS[k as keyof typeof PHYSICAL_LABELS],
    value: (v as PhysicalLevel) * 33.3,
    level: LEVEL_LABELS[v as PhysicalLevel],
  }));
}

function RadarChartCard({ student }: { student: Student }) {
  const data = buildRadarData(student);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">신체 기능 프로파일</p>
      {ready ? (
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
      ) : (
        <div className="h-[180px] w-full rounded-xl bg-white/5 border border-white/10" />
      )}
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

export function ReportCard({
  report,
  meta,
  onCopy,
  onReset,
  onDownloadPdf,
  onKakaoShare,
  copied,
  student,
  showRadar = true,
  readOnly = false,
}: {
  report: ReportData;
  meta: ReportMeta;
  onCopy: () => void;
  onReset: () => void;
  onDownloadPdf: () => void;
  onKakaoShare: () => void;
  copied: boolean;
  student: Student;
  showRadar?: boolean;
  readOnly?: boolean;
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
          {!readOnly && (
            <button
              type="button"
              onClick={onReset}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              title="다시 작성"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <button
            type="button"
            onClick={onDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-600/20 hover:bg-slate-600/30 border border-slate-500/30 text-slate-300 rounded-xl text-xs font-bold transition-all"
            title="PDF 저장"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF 저장
          </button>
          <button
            type="button"
            onClick={onKakaoShare}
            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 rounded-xl text-xs font-bold transition-all"
            title="카카오로 부모님께 공유"
          >
            <Share2 className="w-3.5 h-3.5" />
            카카오 공유
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

      {showRadar && <RadarChartCard student={student} />}

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

export function EmptyState() {
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
