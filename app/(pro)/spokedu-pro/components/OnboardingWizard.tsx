'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import Link from 'next/link';
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
  const t = useTranslator();
  const { refresh } = useProContext();
  const [step, setStep] = useState<Step>(1);
  const [centerName, setCenterName] = useState('');
  const [firstClassName, setFirstClassName] = useState('');
  const [studentRows, setStudentRows] = useState<{ name: string }[]>([{ name: '' }, { name: '' }, { name: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialNotApproved, setTrialNotApproved] = useState(false);

  const handleStep1 = useCallback(async () => {
    const name = centerName.trim() || '내 센터';
    setLoading(true);
    setError(null);
    setTrialNotApproved(false);
    try {
      const res = await fetch('/api/spokedu-pro/context/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centerName: name }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (res.status === 403 && data.error === 'trial_not_approved') {
        setTrialNotApproved(true);
        return;
      }
      if (!res.ok || !data.ok) {
        setError(typeof data.message === 'string' ? data.message : data.error ?? '센터 생성 실패');
        return;
      }
      await refresh();
      setStep(2);
    } catch {
      setError('네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 시도해 주세요.');
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
                  <h2 className="text-xl font-black text-white">{t('센터 이름을 알려주세요')}</h2>
                  <p className="text-slate-400 text-sm">{t('14일 무료 체험이 시작됩니다.')}</p>
                </div>
              </div>
              <input
                type="text"
                value={centerName}
                onChange={(e) => {
                  setCenterName(e.target.value);
                  setTrialNotApproved(false);
                }}
                placeholder={t('예: OO 체육관')}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
              {trialNotApproved ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100 space-y-3">
                  <p className="leading-relaxed">
                    SPOKEDU PRO 체험은 베타 관장단 신청 후 운영팀 승인으로 제공됩니다.
                    <br />
                    아직 신청하지 않으셨다면 베타 관장단 신청을 먼저 진행해 주세요.
                    <br />
                    <br />
                    이미 신청하셨다면, 신청한 이메일과 현재 로그인한 이메일이 같은지 확인해 주세요.
                  </p>
                  <Link
                    href="/pro/apply"
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-500"
                  >
                    베타 관장단 신청하기
                  </Link>
                </div>
              ) : null}
              {error && !trialNotApproved ? <p className="text-red-400 text-sm">{error}</p> : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {t('나중에')}
                </button>
                <button
                  type="button"
                  onClick={handleStep1}
                  disabled={loading}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  {t('시작하기')}
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
                  <h2 className="text-xl font-black text-white">{t('원생 등록 (선택)')}</h2>
                  <p className="text-slate-400 text-sm">{t('나중에 출석부에서도 추가할 수 있어요.')}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('첫 반 이름')}</label>
                <input
                  type="text"
                  value={firstClassName}
                  onChange={(e) => setFirstClassName(e.target.value)}
                  placeholder={t('예: 유치부 인지반')}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('원생 이름 (최대 5명)')}</label>
                {studentRows.map((row, i) => (
                  <input
                    key={i}
                    type="text"
                    value={row.name}
                    onChange={(e) => setStudentName(i, e.target.value)}
                    placeholder={t(`원생 ${i + 1}`)}
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                  />
                ))}
                {studentRows.length < 5 && (
                  <button
                    type="button"
                    onClick={addStudentRow}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold"
                  >
                    {t('+ 한 명 더')}
                  </button>
                )}
              </div>
              {error && <p className="text-red-400 text-sm">{t(error)}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleStep2Skip}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {t('건너뛰기')}
                </button>
                <button
                  type="button"
                  onClick={handleStep2Continue}
                  disabled={loading}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('등록하고 계속')}
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
                  <h2 className="text-xl font-black text-white">{t('준비 완료!')}</h2>
                  <p className="text-slate-400 text-sm">{t('지금 바로 반 전체 리포트를 뽑아보세요.')}</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {t('14일 동안 Basic 기능을 무료로 사용할 수 있어요. AI 리포트 20회, 반 3개까지 이용 가능합니다.')}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {t('닫기')}
                </button>
                <button
                  type="button"
                  onClick={handleStep3Start}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('AI 리포트 시작')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
