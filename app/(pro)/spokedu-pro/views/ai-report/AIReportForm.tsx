'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { ChevronDown, ClipboardList, Loader2, MessageSquare, Sparkles, Target } from 'lucide-react';
import { LEVEL_LABELS, PHYSICAL_LABELS, type Student } from '../../hooks/useStudentStore';
import { SubscriberBadge, SubscriberButton } from '../../components/SubscriberWorkspacePrimitives';
import { DEVELOPMENT_GOAL_OPTIONS, getPeriodLabel, OPTION_DARK_CLASS } from './constants';
import type { Tone } from './types';
import ToneChip from './ToneChip';

type PhysicalLevel = 1 | 2 | 3;

export default function AIReportForm({
  selectedStudent,
  sessionNotes,
  onSessionNotesChange,
  developmentGoal,
  onDevelopmentGoalChange,
  additionalGoal,
  onAdditionalGoalChange,
  tone,
  onToneChange,
  onGenerate,
  loading,
  canGenerate,
}: {
  selectedStudent: Student | null;
  sessionNotes: string;
  onSessionNotesChange: (value: string) => void;
  developmentGoal: string;
  onDevelopmentGoalChange: (value: string) => void;
  additionalGoal: string;
  onAdditionalGoalChange: (value: string) => void;
  tone: Tone;
  onToneChange: (value: Tone) => void;
  onGenerate: () => void;
  loading: boolean;
  canGenerate: boolean;
}) {
  const tr = useTranslator();
  const periodLabel = getPeriodLabel();

  return (
    <>
      {selectedStudent ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-500">{tr('신체 기능 현황')}</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(selectedStudent.physical).map(([key, value]) => {
              const level = value as PhysicalLevel;
              const tone = level === 3 ? 'emerald' : level === 2 ? 'amber' : 'slate';
              return (
                <SubscriberBadge key={key} tone={tone}>
                  {tr(PHYSICAL_LABELS[key as keyof typeof PHYSICAL_LABELS])} {tr(LEVEL_LABELS[level])}
                </SubscriberBadge>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
          <ClipboardList className="h-3.5 w-3.5" /> {tr('수업 기간')}
        </label>
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white">
          {tr(periodLabel)}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
          <MessageSquare className="h-3.5 w-3.5" /> {tr('수업 메모')}
        </label>
        <textarea
          value={sessionNotes}
          onChange={(event) => onSessionNotesChange(event.target.value)}
          placeholder={tr('오늘 수업에서 보인 반응, 어려워한 점, 잘한 점을 자유롭게 입력하세요.')}
          rows={4}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
          <Target className="h-3.5 w-3.5" /> {tr('핵심 발달 목표')}
        </label>
        <div className="relative">
          <select
            value={developmentGoal}
            onChange={(event) => onDevelopmentGoalChange(event.target.value)}
            className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30"
          >
            {DEVELOPMENT_GOAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className={OPTION_DARK_CLASS}>
                {tr(option.label)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {tr('추가 목표')}
        </label>
        <input
          type="text"
          value={additionalGoal}
          onChange={(event) => onAdditionalGoalChange(event.target.value)}
          placeholder={tr('예: 친구와 사이좋게 나누기')}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {tr('리포트 어조')}
        </label>
        <div className="flex gap-2">
          <ToneChip value="warm" current={tone} label="따뜻하게" onClick={() => onToneChange('warm')} />
          <ToneChip value="professional" current={tone} label="전문적으로" onClick={() => onToneChange('professional')} />
          <ToneChip value="friendly" current={tone} label="친근하게" onClick={() => onToneChange('friendly')} />
        </div>
      </div>

      <SubscriberButton
        tone="purple"
        wide
        disabled={!canGenerate}
        className="w-full sm:w-full"
        icon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
        onClick={onGenerate}
      >
        {loading ? tr('Gemini 분석 중...') : tr('학부모 리포트 생성')}
      </SubscriberButton>
      {!selectedStudent ? (
        <p className="text-center text-xs text-slate-600">{tr('학생을 선택해야 리포트를 생성할 수 있습니다.')}</p>
      ) : null}
    </>
  );
}
