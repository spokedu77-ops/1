'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { Loader2, RotateCcw } from 'lucide-react';
import { formatWeekLabelFromMonday, getMondayOfWeek } from '@/app/lib/spokedu-pro/weekUtils';
import { SubscriberButton } from '../../components/SubscriberWorkspacePrimitives';
import type { HistoryReportItem } from './types';

function weekLabelFromCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return formatWeekLabelFromMonday(getMondayOfWeek(date));
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
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      ) : historyLoadError ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-slate-400">{tr(historyLoadError)}</p>
          <SubscriberButton tone="purple" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={onRetry}>
            {tr('다시 시도')}
          </SubscriberButton>
        </div>
      ) : historyReports.length === 0 && selectedStudentId ? (
        <div className="py-6 text-center text-sm text-slate-500">
          {tr('이전 리포트가 없습니다.')}
        </div>
      ) : (
        <ul className="max-h-[320px] space-y-2 overflow-y-auto">
          {historyReports.map((item) => {
            const weekLabel = weekLabelFromCreatedAt(item.created_at);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectReport(item)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                    selectedHistoryReport?.id === item.id
                      ? 'border-violet-500/30 bg-violet-600/20 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <span className="block text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {weekLabel ? <span className="text-slate-600"> · {weekLabel}</span> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-medium">
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
