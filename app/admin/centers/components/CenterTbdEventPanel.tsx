'use client';

import { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import {
  buildRounds,
  todayDateInputValue,
  type LocalTbdClass,
} from '../lib/localTbdStorage';

interface CenterTbdEventPanelProps {
  open: boolean;
  classItem: LocalTbdClass | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (item: LocalTbdClass) => void;
  onDelete: (classId: string) => void;
}

function toTimeInputValue(time: string) {
  const t = String(time ?? '').trim();
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  return '10:00';
}

export default function CenterTbdEventPanel({
  open,
  classItem,
  isNew,
  onClose,
  onSave,
  onDelete,
}: CenterTbdEventPanelProps) {
  const [draft, setDraft] = useState<LocalTbdClass | null>(null);

  useEffect(() => {
    if (!open || !classItem) {
      setDraft(null);
      return;
    }
    setDraft({ ...classItem, rounds: classItem.rounds.map((r) => ({ ...r })) });
  }, [open, classItem]);

  if (!open || !draft) return null;

  const anchorDate = draft.rounds[0]?.date ?? todayDateInputValue();

  const setRoundTotal = (raw: number) => {
    const total = Math.max(1, Math.min(52, Math.floor(raw) || 1));
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        roundTotal: total,
        rounds: buildRounds(total, prev.rounds[0]?.date ?? anchorDate, prev.rounds),
      };
    });
  };

  const updateRoundDate = (roundIndex: number, date: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rounds: prev.rounds.map((r) => (r.roundIndex === roundIndex ? { ...r, date } : r)),
      };
    });
  };

  const handleSave = () => {
    const total = Math.max(1, Math.min(52, draft.roundTotal));
    onSave({
      ...draft,
      title: draft.title.trim() || '제목 없음',
      mainTeacherName: draft.mainTeacherName.trim(),
      extraTeacherName: draft.extraTeacherName.trim(),
      roundTotal: total,
      startTime: toTimeInputValue(draft.startTime),
      endTime: toTimeInputValue(draft.endTime),
      rounds: buildRounds(total, draft.rounds[0]?.date ?? anchorDate, draft.rounds),
    });
    onClose();
  };

  return (
    <>
      <button
        type="button"
        aria-label="패널 닫기"
        className="fixed inset-0 z-40 bg-slate-900/30"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="center-tbd-panel-title"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 id="center-tbd-panel-title" className="text-base font-semibold text-slate-900">
            {isNew ? '수업 추가' : '수업 편집'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">수업명</label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="수업명"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">총 회차</label>
            <input
              type="number"
              min={1}
              max={52}
              value={draft.roundTotal}
              onChange={(e) => setRoundTotal(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">공통 시작</label>
              <input
                type="time"
                value={toTimeInputValue(draft.startTime)}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">공통 종료</label>
              <input
                type="time"
                value={toTimeInputValue(draft.endTime)}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">메인 강사 (이름)</label>
            <input
              type="text"
              value={draft.mainTeacherName}
              onChange={(e) => setDraft({ ...draft, mainTeacherName: e.target.value })}
              placeholder="비우면 미정(빨간 표시)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">보조 강사 (이름)</label>
            <input
              type="text"
              value={draft.extraTeacherName}
              onChange={(e) => setDraft({ ...draft, extraTeacherName: e.target.value })}
              placeholder="선택"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">회차별 날짜</span>
              <span className="text-[10px] text-slate-500">{draft.roundTotal}회</span>
            </div>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-[240px] overflow-y-auto">
              {draft.rounds.map((round) => (
                <div key={round.id} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-xs font-bold text-slate-600 tabular-nums">
                    {round.roundIndex}/{draft.roundTotal}
                  </span>
                  <input
                    type="date"
                    value={round.date}
                    onChange={(e) => updateRoundDate(round.roundIndex, e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            이 브라우저에만 저장됩니다. 수업 관리 DB와 연동되지 않습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 min-h-[44px] rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            저장
          </button>
          {!isNew ? (
            <button
              type="button"
              onClick={() => {
                if (confirm('이 수업(전체 회차)을 삭제할까요?')) {
                  onDelete(draft.id);
                  onClose();
                }
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
}
