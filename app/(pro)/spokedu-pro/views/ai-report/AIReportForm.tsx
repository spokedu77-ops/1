'use client';

import { ClipboardList, MessageSquare, Target, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { useStudentStore, PHYSICAL_LABELS, LEVEL_LABELS, type Student } from '../../hooks/useStudentStore';
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
  onSessionNotesChange: (v: string) => void;
  developmentGoal: string;
  onDevelopmentGoalChange: (v: string) => void;
  additionalGoal: string;
  onAdditionalGoalChange: (v: string) => void;
  tone: Tone;
  onToneChange: (v: Tone) => void;
  onGenerate: () => void;
  loading: boolean;
  canGenerate: boolean;
}) {
  const periodLabel = getPeriodLabel();

  return (
    <>
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
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${colorMap[v as PhysicalLevel]}`}
                >
                  {PHYSICAL_LABELS[k as keyof typeof PHYSICAL_LABELS]} {LEVEL_LABELS[v as PhysicalLevel]}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          <ClipboardList className="w-3.5 h-3.5" /> 수업 기간
        </label>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium">
          {periodLabel}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          <MessageSquare className="w-3.5 h-3.5" /> 수업 메모
        </label>
        <textarea
          value={sessionNotes}
          onChange={(e) => onSessionNotesChange(e.target.value)}
          placeholder="오늘 수업에서 있었던 특이사항, 잘한 점, 아쉬운 점 등을 자유롭게 입력하세요."
          rows={4}
          className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-600 px-4 py-3 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 text-sm leading-relaxed resize-none transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          <Target className="w-3.5 h-3.5" /> 핵심 발달 목표
        </label>
        <div className="relative">
          <select
            value={developmentGoal}
            onChange={(e) => onDevelopmentGoalChange(e.target.value)}
            className="w-full appearance-none bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 font-medium text-sm transition-all cursor-pointer"
          >
            {DEVELOPMENT_GOAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className={OPTION_DARK_CLASS}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          추가 목표 (선택)
        </label>
        <input
          type="text"
          value={additionalGoal}
          onChange={(e) => onAdditionalGoalChange(e.target.value)}
          placeholder="예: 친구와 사이좋게 나누기"
          className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-600 px-4 py-3 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 text-sm transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          리포트 어조
        </label>
        <div className="flex gap-2">
          <ToneChip value="warm" current={tone} label="따뜻하게" emoji="🤗" onClick={() => onToneChange('warm')} />
          <ToneChip value="professional" current={tone} label="전문적으로" emoji="📋" onClick={() => onToneChange('professional')} />
          <ToneChip value="friendly" current={tone} label="친근하게" emoji="😊" onClick={() => onToneChange('friendly')} />
        </div>
      </div>

      <button
        type="button"
        onClick={onGenerate}
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
      {!selectedStudent && (
        <p className="text-center text-slate-600 text-xs">학생을 선택해야 생성할 수 있습니다.</p>
      )}
    </>
  );
}
