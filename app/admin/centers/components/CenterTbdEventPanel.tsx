'use client';

import { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import {
  buildRounds,
  todayDateInputValue,
  toTimeInputValue,
  type CenterTbdClass,
} from '../lib/localTbdStorage';
import type { CenterTbdTeacherOption } from '../lib/centerTbdApi';

interface CenterTbdEventPanelProps {
  open: boolean;
  classItem: CenterTbdClass | null;
  isNew: boolean;
  teachers: CenterTbdTeacherOption[];
  saving?: boolean;
  onClose: () => void;
  onSave: (item: CenterTbdClass) => void | Promise<unknown>;
  onDelete: (classId: string) => void | Promise<void>;
}

function teacherSelectValue(id: string | null) {
  return id ?? '';
}

export default function CenterTbdEventPanel({
  open,
  classItem,
  isNew,
  teachers,
  saving = false,
  onClose,
  onSave,
  onDelete,
}: CenterTbdEventPanelProps) {
  const [draft, setDraft] = useState<CenterTbdClass | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !classItem) {
      setDraft(null);
      return;
    }
    setDraft({ ...classItem, rounds: classItem.rounds.map((r) => ({ ...r })) });
  }, [open, classItem]);

  if (!open || !draft) return null;

  const anchorDate = draft.rounds[0]?.date ?? todayDateInputValue();
  const defaultStart = toTimeInputValue(draft.rounds[0]?.startTime);
  const defaultEnd = toTimeInputValue(draft.rounds[0]?.endTime);

  const setRoundTotal = (raw: number) => {
    const total = Math.max(1, Math.min(52, Math.floor(raw) || 1));
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        roundTotal: total,
        rounds: buildRounds(
          total,
          prev.rounds[0]?.date ?? anchorDate,
          prev.rounds,
          defaultStart,
          defaultEnd
        ),
      };
    });
  };

  const updateRound = (roundIndex: number, patch: Partial<(typeof draft.rounds)[0]>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rounds: prev.rounds.map((r) =>
          r.roundIndex === roundIndex ? { ...r, ...patch } : r
        ),
      };
    });
  };

  const setMainTeacher = (teacherId: string) => {
    const found = teachers.find((t) => t.id === teacherId);
    setDraft((prev) => {
      if (!prev) return prev;
      if (!teacherId) {
        return { ...prev, mainTeacherId: null, mainTeacherName: '' };
      }
      return {
        ...prev,
        mainTeacherId: teacherId,
        mainTeacherName: found?.name ?? prev.mainTeacherName,
      };
    });
  };

  const setExtraTeacher = (teacherId: string) => {
    const found = teachers.find((t) => t.id === teacherId);
    setDraft((prev) => {
      if (!prev) return prev;
      if (!teacherId) {
        return { ...prev, extraTeacherId: null, extraTeacherName: '' };
      }
      return {
        ...prev,
        extraTeacherId: teacherId,
        extraTeacherName: found?.name ?? prev.extraTeacherName,
      };
    });
  };

  const handleSave = async () => {
    const total = Math.max(1, Math.min(52, draft.roundTotal));
    const payload: CenterTbdClass = {
      ...draft,
      title: draft.title.trim() || '제목 없음',
      roundTotal: total,
      rounds: buildRounds(
        total,
        draft.rounds[0]?.date ?? anchorDate,
        draft.rounds,
        defaultStart,
        defaultEnd
      ),
    };
    setSubmitting(true);
    try {
      await onSave(payload);
      onClose();
    } catch {
      /* error surfaced by parent */
    } finally {
      setSubmitting(false);
    }
  };

  const busy = saving || submitting;

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

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">메인 강사</label>
            <select
              value={teacherSelectValue(draft.mainTeacherId)}
              onChange={(e) => setMainTeacher(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="">미정 (빨간 표시)</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">보조 강사</label>
            <select
              value={teacherSelectValue(draft.extraTeacherId)}
              onChange={(e) => setExtraTeacher(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="">없음</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">회차별 일정</span>
              <span className="text-[10px] text-slate-500">{draft.roundTotal}회</span>
            </div>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-[320px] overflow-y-auto">
              {draft.rounds.map((round) => (
                <div key={round.id} className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs font-bold text-slate-600 tabular-nums">
                      {round.roundIndex}/{draft.roundTotal}
                    </span>
                    <input
                      type="date"
                      value={round.date}
                      onChange={(e) => updateRound(round.roundIndex, { date: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-16">
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">시작</label>
                      <input
                        type="time"
                        value={toTimeInputValue(round.startTime)}
                        onChange={(e) =>
                          updateRound(round.roundIndex, { startTime: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">종료</label>
                      <input
                        type="time"
                        value={toTimeInputValue(round.endTime)}
                        onChange={(e) =>
                          updateRound(round.roundIndex, { endTime: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
            관리자 간 공유됩니다. 수업 관리(classes-v2) DB와는 연동되지 않습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={busy}
            className="flex-1 min-h-[44px] rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? '저장 중…' : '저장'}
          </button>
          {!isNew ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm('이 수업(전체 회차)을 삭제할까요?')) {
                  void (async () => {
                    setSubmitting(true);
                    try {
                      await onDelete(draft.id);
                      onClose();
                    } catch {
                      /* error surfaced by parent */
                    } finally {
                      setSubmitting(false);
                    }
                  })();
                }
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
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
