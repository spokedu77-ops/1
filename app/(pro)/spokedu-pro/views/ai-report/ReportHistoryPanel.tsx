'use client';

import { Loader2, RotateCcw } from 'lucide-react';
import type { HistoryReportItem } from './types';

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
  return (
    <>
      <div className="text-xs text-slate-500">
        위에서 학생을 선택하면 해당 학생의 과거 리포트 목록이 표시됩니다.
      </div>
      {historyLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : historyLoadError ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-slate-400 text-sm">목록을 불러오지 못했어요.</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            다시 시도
          </button>
        </div>
      ) : historyReports.length === 0 && selectedStudentId ? (
        <div className="py-6 text-center text-slate-500 text-sm">
          이전 리포트가 없습니다.
        </div>
      ) : (
        <ul className="space-y-2 max-h-[320px] overflow-y-auto">
          {historyReports.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectReport(item)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selectedHistoryReport?.id === item.id ? 'bg-violet-600/20 border-violet-500/30 text-white' : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'}`}
              >
                <span className="block text-xs text-slate-500">
                  {new Date(item.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="block text-sm font-medium mt-0.5 truncate">
                  {item.goal || '리포트'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
