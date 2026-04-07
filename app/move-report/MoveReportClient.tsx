'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compute } from './lib/compute';
import { trackMoveReportEvent } from './lib/events';
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
  const [shareKey, setShareKey] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);

  const questions = useMemo(() => Qs[age], [age]);
  const toastTimer = useRef<number | null>(null);
  const introTrackedRef = useRef(false);
  const stepTimer = useRef<number | null>(null);
  const computeTimer = useRef<number | null>(null);
  const leadformTimer = useRef<number | null>(null);

  const flash = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => {
      setToast('');
      toastTimer.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('d');
    if (key) setShareKey(key);
  }, []);

  useEffect(() => {
    if (introTrackedRef.current) return;
    introTrackedRef.current = true;
    void trackMoveReportEvent({ eventName: 'intro_started', shareKey });
  }, [shareKey]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (stepTimer.current) clearTimeout(stepTimer.current);
      if (computeTimer.current) clearTimeout(computeTimer.current);
      if (leadformTimer.current) clearTimeout(leadformTimer.current);
    };
  }, []);

  useEffect(() => {
    if (sc !== 'result') return;
    window.scrollTo(0, 0);
    void trackMoveReportEvent({ eventName: 'result_viewed', shareKey });
    if (shareKey) {
      void trackMoveReportEvent({ eventName: 'shared_entry_completed', shareKey });
      setShareKey(null);
    }
  }, [sc, shareKey]);

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
    setAnswering(false);
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
      const normalizedResponses = questions
        .map((q, idx) => {
          const raw = resps[idx];
          const [left, right] = q.axis.split('/');
          if (typeof raw === 'string' && (raw === left || raw === right)) return raw;
          if (result.key.includes(left)) return left;
          if (result.key.includes(right)) return right;
          return null;
        })
        .filter((v): v is string => typeof v === 'string');
      if (normalizedResponses.length !== questions.length) {
        flash('설문 응답을 확인할 수 없어 다시 시작해 주세요.');
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
            surveyResponses: normalizedResponses,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (data.ok) {
          setSavedPhone(normalizedPhone);
          flash('📱 저장 완료! 요약 카드 이미지로 저장/공유할 수 있어요.');
          void trackMoveReportEvent({ eventName: 'lead_saved', shareKey });
          return true;
        }
        flash(data.error || '저장 중 오류가 발생했어요. 다시 시도해 주세요.');
        return false;
      } catch {
        flash('네트워크 오류가 발생했어요.');
        return false;
      }
    },
    [age, flash, name, questions, resps, result, shareKey]
  );

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash('결과 링크를 복사했어요.');
      void trackMoveReportEvent({ eventName: 'share_clicked', shareKey });
    } catch {
      flash('링크 복사를 지원하지 않는 환경이에요.');
    }
  }, [flash, shareKey]);

  const onAnswer = useCallback(
    (v: string) => {
      if (answering) return;
      setAnswering(true);
      const nr = [...resps];
      nr[qi] = v;
      setResps(nr);
      if (qi < questions.length - 1) {
        stepTimer.current = window.setTimeout(() => {
          setQi((q) => q + 1);
          setAnswering(false);
          stepTimer.current = null;
        }, 160);
        return;
      }
      computeTimer.current = window.setTimeout(() => {
        const r = compute(nr, age, name);
        setResult(r);
        void trackMoveReportEvent({ eventName: 'survey_completed', shareKey });
        go('loading');
        leadformTimer.current = window.setTimeout(() => {
          go('leadform');
          setAnswering(false);
          leadformTimer.current = null;
        }, 2200);
        computeTimer.current = null;
      }, 200);
    },
    [age, answering, go, name, qi, questions.length, resps, shareKey]
  );

  const surveyBack = () => {
    if (answering) return;
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
        <Survey q={currentQ} qi={qi} total={questions.length} resps={resps} name={name} onAnswer={onAnswer} onBack={surveyBack} answering={answering} />
      )}
      {sc === 'loading' && <Loading />}
      {sc === 'leadform' && result && (
        <LeadFormScreen
          onSubmit={async (phone) => {
            const ok = await submitLead(phone);
            if (ok) go('result');
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
          onShare={handleShare}
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
