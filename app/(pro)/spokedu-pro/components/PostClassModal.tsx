'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentStore, type AttendanceStatus } from '../hooks/useStudentStore';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function memoKey(date: string, classGroup: string): string {
  return `spokedu-pro:class-memo:${date}:${classGroup}`;
}

function loadPastMemos(classGroup: string, today: string): string {
  if (typeof localStorage === 'undefined') return '';
  const prefix = 'spokedu-pro:class-memo:';
  const rows: { date: string; text: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(prefix)) continue;
    const rest = k.slice(prefix.length);
    const m = rest.match(/^(\d{4}-\d{2}-\d{2}):([\s\S]+)$/);
    if (!m) continue;
    const [, date, grp] = m;
    if (grp !== classGroup || date === today) continue;
    try {
      const text = localStorage.getItem(k);
      if (text?.trim()) rows.push({ date, text: text.trim() });
    } catch {
      /* ignore */
    }
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows.map((r) => `${r.date}\n${r.text}`).join('\n---\n');
}

type Step = 1 | 2 | 3;

export default function PostClassModal({
  open,
  classGroupName,
  onClose,
  onGoToAI,
  onDoneLater,
}: {
  open: boolean;
  classGroupName: string;
  onClose: () => void;
  onGoToAI: (studentId: string) => void;
  onDoneLater?: () => void;
}) {
  const { students, setAttendanceStatus } = useStudentStore();
  const [step, setStep] = useState<Step>(1);
  const [memo, setMemo] = useState('');
  const [showPastMemo, setShowPastMemo] = useState(false);
  const [pastMemoText, setPastMemoText] = useState('');
  const [reportStudentIds, setReportStudentIds] = useState<Record<string, boolean>>({});

  const classStudents = useMemo(
    () => students.filter((s) => s.classGroup === classGroupName),
    [students, classGroupName]
  );

  const dateStr = todayISO();

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setMemo('');
    setShowPastMemo(false);
    const init: Record<string, boolean> = {};
    classStudents.forEach((s) => {
      init[s.id] = true;
    });
    setReportStudentIds(init);
  }, [open, classGroupName, classStudents]);

  useEffect(() => {
    if (!open || !classGroupName) return;
    setPastMemoText(loadPastMemos(classGroupName, dateStr));
  }, [open, classGroupName, dateStr]);

  const persistMemo = useCallback(() => {
    const trimmed = memo.trim();
    if (!trimmed || !classGroupName) return;
    try {
      localStorage.setItem(memoKey(dateStr, classGroupName), trimmed);
    } catch {
      /* ignore */
    }
  }, [memo, classGroupName, dateStr]);

  const handleSetStatus = (id: string, status: AttendanceStatus) => {
    setAttendanceStatus(id, status);
  };

  const selectedForReport = useMemo(
    () => classStudents.filter((s) => reportStudentIds[s.id]),
    [classStudents, reportStudentIds]
  );

  const goNext = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      persistMemo();
      setStep(3);
    }
  };

  const goPrev = () => {
    if (step > 1) setStep((s) => (s === 3 ? 2 : 1));
  };

  const handleGenerateNow = () => {
    persistMemo();
    const first = selectedForReport[0];
    if (!first) {
      toast.message('리포트할 학생을 한 명 이상 선택해 주세요.');
      return;
    }
    if (selectedForReport.length > 1) {
      toast.message('한 번에 한 명씩 생성합니다. 첫 번째 선택 학생으로 이동합니다.');
    }
    onGoToAI(first.id);
    onClose();
  };

  const handleLater = () => {
    persistMemo();
    onDoneLater?.();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-class-modal-title"
    >
      <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scroll">
        <h2 id="post-class-modal-title" className="text-lg font-black text-white mb-4">
          수업 마무리
          {classGroupName ? (
            <span className="block text-sm font-bold text-slate-400 mt-1">{classGroupName}</span>
          ) : null}
        </h2>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center justify-between mb-6 px-1">
          {([1, 2, 3] as const).map((n, i) => (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 ${
                  step >= n ? 'border-amber-400 bg-amber-400/20 text-amber-400' : 'border-slate-600 text-slate-500'
                }`}
              >
                {n}
              </div>
              {i < 2 && (
                <div className={`flex-1 h-0.5 mx-2 rounded ${step > n ? 'bg-amber-400' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400 font-medium">오늘 출결을 확인해 주세요.</p>
            {classStudents.length === 0 ? (
              <p className="text-slate-500 text-sm">이 반에 등록된 원생이 없습니다. 원생 관리에서 추가해 주세요.</p>
            ) : (
              <ul className="space-y-2">
                {classStudents.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5"
                  >
                    <span className="text-white font-bold text-sm truncate">{s.name}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetStatus(s.id, 'present')}
                        className={`p-2 rounded-lg border transition-colors ${
                          s.status === 'present'
                            ? 'bg-emerald-500/30 border-emerald-500 text-emerald-400'
                            : 'border-slate-600 text-slate-500 hover:border-emerald-500/50'
                        }`}
                        aria-label="출석"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetStatus(s.id, 'late')}
                        className={`p-2 rounded-lg border transition-colors ${
                          s.status === 'late'
                            ? 'bg-amber-500/30 border-amber-500 text-amber-400'
                            : 'border-slate-600 text-slate-500 hover:border-amber-500/50'
                        }`}
                        aria-label="지각"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetStatus(s.id, 'absent')}
                        className={`p-2 rounded-lg border transition-colors ${
                          s.status === 'absent'
                            ? 'bg-red-500/30 border-red-500 text-red-400'
                            : 'border-slate-600 text-slate-500 hover:border-red-500/50'
                        }`}
                        aria-label="결석"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-300">오늘 수업 한줄 메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="부모님께 전달할 내용, 다음 수업 포인트 등"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/60 resize-none"
            />
            {pastMemoText ? (
              <div className="border border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPastMemo((v) => !v)}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-400 hover:bg-slate-800/80"
                >
                  {showPastMemo ? '접기' : '지난 수업 메모 보기'}
                </button>
                {showPastMemo && (
                  <pre className="px-4 pb-3 text-xs text-slate-500 whitespace-pre-wrap font-sans max-h-32 overflow-y-auto">
                    {pastMemoText}
                  </pre>
                )}
              </div>
            ) : null}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400 font-medium">리포트를 생성할 학생을 선택하세요.</p>
            <ul className="space-y-2 max-h-48 overflow-y-auto custom-scroll">
              {classStudents.map((s) => (
                <li key={s.id} className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2">
                  <input
                    type="checkbox"
                    id={`rep-${s.id}`}
                    checked={!!reportStudentIds[s.id]}
                    onChange={(e) =>
                      setReportStudentIds((prev) => ({ ...prev, [s.id]: e.target.checked }))
                    }
                    className="rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor={`rep-${s.id}`} className="text-sm font-bold text-white flex-1 cursor-pointer">
                    {s.name}
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">에듀-에코 리포트는 한 번에 한 명씩 생성할 수 있어요.</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
          {step > 1 && (
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl font-bold border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> 이전
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold border border-slate-600 text-slate-400 hover:text-white transition-colors ml-auto sm:ml-0"
          >
            취소
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 transition-colors"
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleLater}
                className="px-5 py-2.5 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={handleGenerateNow}
                className="px-5 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                지금 생성
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
