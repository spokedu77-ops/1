'use client';

import type { ElementType } from 'react';
import { useEffect, useState } from 'react';
import { useTranslator } from '@/app/providers/I18nProvider';
import { Award, Bot, Check, Copy, FileDown, Home, RotateCcw, Share2, Sparkles, Star, TrendingUp } from 'lucide-react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { LEVEL_LABELS, PHYSICAL_LABELS, type Student } from '../../hooks/useStudentStore';
import { SubscriberBadge, SubscriberButton } from '../../components/SubscriberWorkspacePrimitives';
import type { ColorKey, ReportData, ReportMeta } from './types';

type PhysicalLevel = 1 | 2 | 3;

function buildRadarData(student: Student) {
  return Object.entries(student.physical).map(([key, value]) => ({
    subject: PHYSICAL_LABELS[key as keyof typeof PHYSICAL_LABELS],
    value: (value as PhysicalLevel) * 33.3,
    level: LEVEL_LABELS[value as PhysicalLevel],
  }));
}

function RadarChartCard({ student }: { student: Student }) {
  const tr = useTranslator();
  const data = buildRadarData(student);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">{tr('신체 기능 프로파일')}</p>
      {ready ? (
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius={65}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
            <Radar
              name={tr('신체 기능')}
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
        <div className="h-[180px] w-full rounded-xl border border-white/10 bg-white/5" />
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
  icon: ElementType;
  label: string;
  content: string;
  color: ColorKey;
}) {
  const tr = useTranslator();
  const colors: Record<ColorKey, { bg: string; border: string; icon: string; label: string }> = {
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: 'text-violet-400', label: 'text-violet-300' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', label: 'text-emerald-300' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-400', label: 'text-blue-300' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400', label: 'text-amber-300' },
  };
  const theme = colors[color];
  const lines = content.split('\n').filter(Boolean);
  const isList = lines.length > 1;

  return (
    <div className={`${theme.bg} ${theme.border} space-y-2 rounded-xl border p-4`}>
      <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${theme.label}`}>
        <Icon className={`h-3.5 w-3.5 ${theme.icon}`} />
        {tr(label)}
      </div>
      {isList ? (
        <ul className="space-y-1.5">
          {lines.map((line) => (
            <li key={line} className="flex gap-2 text-sm leading-relaxed text-slate-200">
              <span className={`${theme.icon} shrink-0 font-bold`}>-</span>
              <span>{line.replace(/^\d+\.\s*/, '')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-slate-200">{content}</p>
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
  const tr = useTranslator();
  const date = new Date(meta.generatedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <SubscriberBadge tone="violet">{tr('AI 리포트')}</SubscriberBadge>
            {meta.period ? <span className="text-xs text-slate-500">{tr(meta.period)}</span> : null}
          </div>
          <h3 className="text-xl font-black text-white">
            {meta.studentName}
            <span className="ml-2 text-base font-normal text-slate-400">{meta.classGroup}</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {date} {tr('생성')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!readOnly ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all hover:bg-white/10"
              title={tr('다시 작성')}
            >
              <RotateCcw className="h-4 w-4 text-slate-400" />
            </button>
          ) : null}
          <SubscriberButton tone="slate" size="sm" icon={<FileDown className="h-3.5 w-3.5" />} onClick={onDownloadPdf}>
            {tr('PDF 저장')}
          </SubscriberButton>
          <SubscriberButton tone="amber" size="sm" icon={<Share2 className="h-3.5 w-3.5" />} onClick={onKakaoShare}>
            {tr('공유 문구 복사')}
          </SubscriberButton>
          <SubscriberButton tone="purple" size="sm" icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} onClick={onCopy}>
            {copied ? tr('복사됨') : tr('복사')}
          </SubscriberButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SubscriberBadge tone="amber">
          <Star className="h-3 w-3" /> {report.strengthSummary}
        </SubscriberBadge>
        <SubscriberBadge tone="emerald">
          <TrendingUp className="h-3 w-3" /> {report.growthTag}
        </SubscriberBadge>
      </div>

      {showRadar ? <RadarChartCard student={student} /> : null}

      <div className="space-y-3">
        <ReportSection icon={Sparkles} label="이번 수업 하이라이트" color="violet" content={report.highlight} />
        <ReportSection icon={TrendingUp} label="우리 아이 성장 포인트" color="emerald" content={report.growth} />
        <ReportSection icon={Home} label="가정 연계 활동 추천" color="blue" content={report.homeActivity} />
        <ReportSection icon={Award} label="코치 한마디" color="amber" content={report.coachMessage} />
      </div>

      <div className="rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-600/10 to-blue-600/10 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-400">{tr('다음 수업 목표')}</p>
        <p className="text-sm font-medium text-white">{report.nextGoal}</p>
      </div>
    </div>
  );
}

export function EmptyState() {
  const tr = useTranslator();
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-500/20 bg-violet-600/10">
        <Bot className="h-9 w-9 text-violet-400" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-white">{tr('AI 리포트 대기 중')}</h3>
      <p className="max-w-xs text-sm leading-relaxed text-slate-500">
        {tr('학생을 선택하고 수업 내용을 입력하면 맞춤형 학부모 리포트를 자동 생성합니다.')}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {['신체 기능 데이터 기반', 'AI 분석', '가정 연계 활동'].map((tag) => (
          <SubscriberBadge key={tag}>{tr(tag)}</SubscriberBadge>
        ))}
      </div>
    </div>
  );
}
