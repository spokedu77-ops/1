'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compute } from './lib/compute';
import { normalizeMoveReportPhone } from './lib/phone';
import { Qs } from './data/questions';
import type { AgeGroup, ComputeResult } from './types';
import Intro from './components/Intro';
import Setup from './components/Setup';
import Survey from './components/Survey';
import Loading from './components/Loading';
import LeadFormScreen from './components/LeadFormScreen';
import Result, { type ResultTab } from './components/Result';

type Screen = 'intro' | 'setup' | 'survey' | 'loading' | 'leadform' | 'result';

export default function MoveReportClient() {
  const [sc, setSc] = useState<Screen>('intro');
  const [age, setAge] = useState<AgeGroup>('preschool');
  const [name, setName] = useState('');
  const [qi, setQi] = useState(0);
  const [resps, setResps] = useState<string[]>([]);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [tab, setTab] = useState<ResultTab>('report');
  const [toast, setToast] = useState('');
  const [savedPhone, setSavedPhone] = useState('');

  const questions = useMemo(() => Qs[age], [age]);
  const toastTimer = useRef<number | null>(null);

  const flash = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => {
      setToast('');
      toastTimer.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const go = useCallback((s: Screen) => {
    setSc(s);
    window.scrollTo(0, 0);
  }, []);

  const reset = useCallback(() => {
    setResps([]);
    setQi(0);
    setResult(null);
    setTab('report');
    setSavedPhone('');
    go('intro');
  }, [go]);

  const submitLead = useCallback(
    async (phone: string): Promise<boolean> => {
      if (!result) return false;
      const normalizedPhone = normalizeMoveReportPhone(phone);
      if (!normalizedPhone) {
        flash('전화번호 11자리(010-0000-0000)를 입력해 주세요.');
        return false;
      }
      try {
        const res = await fetch('/api/move-report/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: normalizedPhone,
            childName: name.trim() || undefined,
            ageGroup: age,
            profileKey: result.key,
            profileTitle: result.profile.char,
            consent: true,
            surveyResponses: resps,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (data.ok) {
          setSavedPhone(normalizedPhone);
          flash('📱 저장 완료! 요약 카드 이미지로 저장/공유할 수 있어요.');
          return true;
        }
        flash(data.error || '저장 중 오류가 발생했어요. 다시 시도해 주세요.');
        return false;
      } catch {
        flash('네트워크 오류가 발생했어요.');
        return false;
      }
    },
    [age, flash, name, resps, result]
  );

  const onAnswer = useCallback(
    (v: string) => {
      const nr = [...resps];
      nr[qi] = v;
      setResps(nr);
      if (qi < questions.length - 1) {
        window.setTimeout(() => setQi((q) => q + 1), 160);
        return;
      }
      window.setTimeout(() => {
        const r = compute(nr, age, name);
        setResult(r);
        go('loading');
        window.setTimeout(() => go('leadform'), 2200);
      }, 200);
    },
    [age, go, name, qi, questions.length, resps]
  );

  const surveyBack = () => {
    if (qi === 0) {
      go('setup');
      return;
    }
    setQi((q) => q - 1);
  };

  const currentQ = qi < questions.length ? questions[qi] : null;

  return (
    <main className="mr-page" style={{ padding: 0 }}>
      {sc === 'intro' && <Intro onStart={() => go('setup')} />}
      {sc === 'setup' && (
        <div className="mr-page-inner" style={{ paddingTop: '28px', paddingBottom: '120px' }}>
          <Setup
            name={name}
            onName={setName}
            age={age}
            onAge={setAge}
            onBack={() => go('intro')}
            onNext={() => {
              if (!name.trim()) setName('아이');
              setQi(0);
              setResps([]);
              go('survey');
            }}
          />
        </div>
      )}
      {sc === 'survey' && currentQ && (
        <Survey q={currentQ} qi={qi} resps={resps} name={name} onAnswer={onAnswer} onBack={surveyBack} />
      )}
      {sc === 'loading' && <Loading name={name} />}
      {sc === 'leadform' && result && (
        <LeadFormScreen
          onSubmit={async (phone) => {
            void (await submitLead(phone));
            go('result');
          }}
          onSkip={() => go('result')}
        />
      )}
      {sc === 'result' && result && (
        <Result
          result={result}
          tab={tab}
          onTab={setTab}
          onReset={reset}
          onLeadSubmit={submitLead}
          savedPhone={savedPhone}
          flash={flash}
            onRequestLead={() => go('leadform')}
        />
      )}
      {toast ? (
        <div className="toast-bar toast-bar--top" role="status">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
