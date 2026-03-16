/**
 * 에듀 에코 AI 리포트 공통 타입.
 */

export type Tone = 'warm' | 'professional' | 'friendly';

export type ColorKey = 'violet' | 'emerald' | 'blue' | 'amber';

export type ReportData = {
  highlight: string;
  growth: string;
  homeActivity: string;
  coachMessage: string;
  strengthSummary: string;
  growthTag: string;
  nextGoal: string;
};

export type ReportMeta = {
  studentName: string;
  classGroup: string;
  period?: string;
  generatedAt: string;
};

export type HistoryReportItem = {
  id: string;
  goal: string | null;
  content: string;
  created_at: string;
};
