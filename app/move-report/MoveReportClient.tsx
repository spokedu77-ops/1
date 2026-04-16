'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compute } from './lib/compute';
import { trackMoveReportEvent } from './lib/events';
import { buildMoveReportShareUrl } from './lib/shareLink';
import { Qs } from './data/questions';
import type { AgeGroup, ComputeResult } from './types';
import Intro from './components/Intro';
import Setup from './components/Setup';
import Survey from './components/Survey';
import Loading from './components/Loading';
import Result, { type ResultTab } from './components/Result';

type Screen = 'intro' | 'setup' | 'survey' | 'loading' | 'result';

export default function MoveReportClient() {
  const [sc, setSc] = useState<Screen>('intro');
  const [age, setAge] = useState<AgeGroup>('preschool');
  const [name, setName] = useState('');
  const [qi, setQi] = useState(0);
  const [resps, setResps] = useState<string[]>([]);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [tab, setTab] = useState<ResultTab>('report');
  const [toast, setToast] = useState('');
  const [shareKey, setShareKey] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);

  const questions = useMemo(() => Qs[age], [age]);
  const toastTimer = useRef<number | null>(null);
  const introTrackedRef = useRef(false);
  const stepTimer = useRef<number | null>(null);
  const computeTimer = useRef<number | null>(null);

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
    setAnswering(false);
    go('intro');
  }, [go]);

  const handleShare = useCallback(async () => {
    let url = window.location.href;
    if (result) {
      const bd = result.bd;
      const graphCode = `${bd.social.l}${bd.social.r}${bd.structure.l}${bd.structure.r}${bd.motivation.l}${bd.motivation.r}${bd.energy.l}${bd.energy.r}`;
      url = buildMoveReportShareUrl(window.location.origin, {
        v: 5,
        profileKey: result.key,
        graphCode,
        displayName: result.displayName !== '아이' ? result.displayName : undefined,
      });
    }
    try {
      await navigator.clipboard.writeText(url);
      flash('결과 링크를 복사했어요.');
      void trackMoveReportEvent({ eventName: 'share_clicked', shareKey });
    } catch {
      flash('링크 복사를 지원하지 않는 환경이에요.');
    }
  }, [flash, result, shareKey]);

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
        window.setTimeout(() => {
          go('result');
          setAnswering(false);
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
      {sc === 'result' && result && (
        <Result
          result={result}
          tab={tab}
          onTab={setTab}
          onReset={reset}
          onShare={handleShare}
          flash={flash}
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
