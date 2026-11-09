'use client';

import type { CorrectionProposal, FieldProposal } from '@/app/lib/automation/feedbackCorrectionProposal';

const LABELS: Record<FieldProposal['key'], string> = {
  main_activity: '주요 활동',
  strengths: '강점',
  improvements: '개선점',
  next_goals: '다음 목표',
  condition_notes: '특이사항',
};

export type CorrectionHistoryItem = {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  consumedAt: string | null;
  errorCode: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  processing: '처리 중',
  completed: '완료',
  failed: '실패',
  cancelled: '취소',
};

export function FeedbackCorrectionReview({
  proposal,
  history,
  onAccept,
}: {
  proposal: CorrectionProposal;
  history: CorrectionHistoryItem[];
  onAccept: (field: FieldProposal) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-900">원문과 교정 제안</p>
      <p className="text-xs text-slate-500">불러오기는 편집창과 저장 데이터를 바꾸지 않습니다. 수락한 항목만 편집창에 들어가고, 검수 저장으로 반영합니다.</p>
      {proposal.fields.map((field) => (
        <article key={field.key} className="space-y-2 rounded-lg border border-slate-100 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-black text-slate-700">{LABELS[field.key]}</h3>
            <span className="text-[11px] font-bold text-slate-500">
              {field.status === 'unchanged' ? '교정 불필요' : field.status === 'blocked' ? '자동 적용 불가' : '변경 제안'}
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-700">{field.source}</p>
            <p className="whitespace-pre-wrap rounded-md bg-emerald-50 p-2 text-xs leading-5 text-slate-800">
              {field.status === 'unchanged' ? field.source : field.revised}
            </p>
          </div>
          {field.reason && <p className="text-[11px] text-slate-500">수정 이유: {field.reason}</p>}
          {field.blockReason && <p className="text-[11px] font-semibold text-rose-700">{field.blockReason}</p>}
          {field.status === 'suggestion' && field.revised && (
            <button
              type="button"
              onClick={() => onAccept(field)}
              className="min-h-9 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
            >
              이 항목 수락
            </button>
          )}
        </article>
      ))}
      <section className="space-y-2">
        <h3 className="text-xs font-black text-slate-700">교육적 보완 의견</h3>
        {proposal.educationalNotes.length === 0 ? (
          <p className="text-xs text-slate-500">별도 의견이 없습니다. 의견은 원문 문장을 바꾸지 않습니다.</p>
        ) : proposal.educationalNotes.map((note, index) => (
          <p key={`${note.key}-${index}`} className="text-xs leading-5 text-slate-700">
            {note.status === 'blocked' ? `제외: ${note.blockReason}` : note.text}
          </p>
        ))}
      </section>
      {history.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-xs font-black text-slate-700">최근 교정 이력</h3>
          {history.slice(0, 5).map((item) => (
            <p key={item.id} className="text-[11px] text-slate-500">
              {STATUS_LABEL[item.status] ?? item.status}
              {item.errorCode ? ` · ${item.errorCode}` : ''}
              {item.completedAt ? ' · 처리됨' : ''}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
