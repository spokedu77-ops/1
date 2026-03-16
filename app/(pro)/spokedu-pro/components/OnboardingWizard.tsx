'use client';

import { useState, useCallback } from 'react';
import { Building2, UserPlus, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { useProContext } from '../hooks/useProContext';
import type { ViewId } from '../hooks/useSpokeduProUI';

type Step = 1 | 2 | 3;

export default function OnboardingWizard({
  onComplete,
  onDismiss,
  onSwitchView,
}: {
  onComplete: () => void;
  onDismiss: () => void;
  onSwitchView: (viewId: ViewId) => void;
}) {
  const { refresh } = useProContext();
  const [step, setStep] = useState<Step>(1);
  const [centerName, setCenterName] = useState('');
  const [firstClassName, setFirstClassName] = useState('');
  const [studentRows, setStudentRows] = useState<{ name: string }[]>([{ name: '' }, { name: '' }, { name: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStep1 = useCallback(async () => {
    const name = centerName.trim() || '내 센터';
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/spokedu-pro/context/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centerName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '센터 생성 실패');
      await refresh();
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [centerName, refresh]);

  const addStudentRow = useCallback(() => {
    setStudentRows((prev) => (prev.length < 5 ? [...prev, { name: '' }] : prev));
  }, []);

  const setStudentName = useCallback((index: number, value: string) => {
    setStudentRows((prev) => prev.map((r, i) => (i === index ? { name: value } : r)));
  }, []);

  const handleStep2Skip = useCallback(() => {
    setStep(3);
  }, []);

  const handleStep2Continue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const classToUse = firstClassName.trim();
      if (classToUse) {
        const classRes = await fetch('/api/spokedu-pro/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: classToUse }),
        });
        if (!classRes.ok) {
          const d = await classRes.json();
          if (d.error !== 'duplicate_name') throw new Error(d.message ?? '반 생성 실패');
        }
      }
      const names = studentRows.map((r) => r.name.trim()).filter(Boolean);
      for (const name of names) {
        await fetch('/api/spokedu-pro/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, classGroup: classToUse || '미분류' }),
        });
      }
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록 실패');
    } finally {
      setLoading(false);
    }
  }, [firstClassName, studentRows]);

  const handleStep3Start = useCallback(() => {
    onSwitchView('ai');
    onComplete();
  }, [onSwitchView, onComplete]);

  const handleClose = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.setItem('onboardingDismissed', '1');
    onDismiss();
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          {step === 1 && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">센터 이름을 알려주세요</h2>
                  <p className="text-slate-400 text-sm">14일 무료 체험이 시작됩니다.</p>
                </div>
              </div>
              <input
                type="text"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                placeholder="예: OO 체육관"
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-bold"
                >
                  나중에
                </button>
                <button
                  type="button"
                  onClick={handleStep1}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  시작하기
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">원생 등록 (선택)</h2>
                  <p className="text-slate-400 text-sm">나중에 출석부에서도 추가할 수 있어요.</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">첫 반 이름</label>
                <input
                  type="text"
                  value={firstClassName}
                  onChange={(e) => setFirstClassName(e.target.value)}
                  placeholder="예: 유치부 인지반"
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">원생 이름 (최대 5명)</label>
                {studentRows.map((row, i) => (
                  <input
                    key={i}
                    type="text"
                    value={row.name}
                    onChange={(e) => setStudentName(i, e.target.value)}
                    placeholder={`원생 ${i + 1}`}
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                  />
                ))}
                {studentRows.length < 5 && (
                  <button
                    type="button"
                    onClick={addStudentRow}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold"
                  >
                    + 한 명 더
                  </button>
                )}
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleStep2Skip}
                  className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-bold"
                >
                  건너뛰기
                </button>
                <button
                  type="button"
                  onClick={handleStep2Continue}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  등록하고 계속
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">준비 완료!</h2>
                  <p className="text-slate-400 text-sm">지금 바로 반 전체 리포트를 뽑아보세요.</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                14일 동안 Basic 기능을 무료로 사용할 수 있어요. AI 리포트 20회, 반 3개까지 이용 가능합니다.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-bold"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleStep3Start}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  AI 리포트 시작
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
