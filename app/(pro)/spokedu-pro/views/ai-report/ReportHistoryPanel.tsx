'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { Loader2, RotateCcw } from 'lucide-react';
import { formatWeekLabelFromMonday, getMondayOfWeek } from '@/app/lib/spokedu-pro/weekUtils';
import type { HistoryReportItem } from './types';

function weekLabelFromCreatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatWeekLabelFromMonday(getMondayOfWeek(d));
}

export default function ReportHistoryPanel({
  historyReports,
  historyLoading,
  historyLoadError,
  onRetry,
  selectedHistoryReport,
  onSelectReport,
  selectedStudentId,
}: {
  historyReports: HistoryReportItem[];
  historyLoading: boolean;
  historyLoadError: string | null;
  onRetry: () => void;
  selectedHistoryReport: HistoryReportItem | null;
  onSelectReport: (item: HistoryReportItem | null) => void;
  selectedStudentId: string;
}) {
  const tr = useTranslator();
  return (
    <>
      <div className="text-xs text-slate-500">
        {tr('위에서 학생을 선택하면 해당 학생의 과거 리포트 목록이 표시됩니다.')}
      </div>
      {historyLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : historyLoadError ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-slate-400 text-sm">{tr(historyLoadError)}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {tr('다시 시도')}
          </button>
        </div>
      ) : historyReports.length === 0 && selectedStudentId ? (
        <div className="py-6 text-center text-slate-500 text-sm">
          {tr('이전 리포트가 없습니다.')}
        </div>
      ) : (
        <ul className="space-y-2 max-h-[320px] overflow-y-auto">
          {historyReports.map((item) => {
            const wk = weekLabelFromCreatedAt(item.created_at);
            return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectReport(item)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selectedHistoryReport?.id === item.id ? 'bg-violet-600/20 border-violet-500/30 text-white' : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'}`}
              >
                <span className="block text-xs text-slate-500">
                  {new Date(item.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {wk ? <span className="text-slate-600"> · {wk}</span> : null}
                </span>
                <span className="block text-sm font-medium mt-0.5 truncate">
                  {item.goal ? tr(item.goal) : tr('리포트')}
                </span>
              </button>
            </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
