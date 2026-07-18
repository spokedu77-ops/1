'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compute } from '../../lib/compute';
import { captureMoveReportAttribution, getMoveReportAttribution } from '../../lib/attribution';
import { getMoveReportSessionId, trackMoveReportEvent } from '../../lib/events';
import { saveCoachObserveResult } from '../../lib/coachObserveHistory';
import { getQuestions } from '../../data/catalog';
import { coachUi } from '../../i18n/coachUi';
import type { AgeGroup, ComputeResult } from '../../types';
import Setup from '../../components/Setup';
import Survey from '../../components/Survey';
import Loading from '../../components/Loading';
import Result, { type ResultTab } from '../../components/Result';

type Screen = 'setup' | 'survey' | 'loading' | 'result';

const DISPLAY = coachUi.displayName;

export default function CoachObserveClient() {
  const router = useRouter();
  const [sc, setSc] = useState<Screen>('setup');
  const [age, setAge] = useState<AgeGroup>('preschool');
  const [qi, setQi] = useState(0);
  const [resps, setResps] = useState<string[]>([]);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [tab, setTab] = useState<ResultTab>('report');
  const [toast, setToast] = useState('');
  const [answering, setAnswering] = useState(false);

  const questions = useMemo(() => getQuestions('ko')[age], [age]);
  const toastTimer = useRef<number | null>(null);
  const startedRef = useRef(false);
  const savedHistoryRef = useRef(false);
  const stepTimer = useRef<number | null>(null);
  const computeTimer = useRef<number | null>(null);
  const resultTimer = useRef<number | null>(null);

  const flash = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => {
      setToast('');
      toastTimer.current = null;
    }, 2800);
  }, []);

  useLayoutEffect(() => {
    captureMoveReportAttribution();
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void trackMoveReportEvent({ eventName: 'move_report_started', meta: { locale: 'ko', variant: 'coach_observe' } });
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (stepTimer.current) clearTimeout(stepTimer.current);
      if (computeTimer.current) clearTimeout(computeTimer.current);
      if (resultTimer.current) clearTimeout(resultTimer.current);
    };
  }, []);

  useEffect(() => {
    if (sc !== 'result' || !result || savedHistoryRef.current) return;
    savedHistoryRef.current = true;
    saveCoachObserveResult(age, result);
    flash(coachUi.result.historyHint);
    void trackMoveReportEvent({
      eventName: 'result_viewed',
      meta: { locale: 'ko', variant: 'coach_observe', profileKey: result.key },
    });
  }, [sc, result, age, flash]);

  const go = useCallback((s: Screen) => {
    setSc(s);
    window.scrollTo(0, 0);
  }, []);

  const goHub = useCallback(() => {
    router.push('/move-report/coach');
  }, [router]);

  const retakeAnother = useCallback(() => {
    setResps([]);
    setQi(0);
    setResult(null);
    setTab('report');
    setAnswering(false);
    savedHistoryRef.current = false;
    go('setup');
  }, [go]);

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
        const r = compute(nr, age, DISPLAY, 'ko');
        setResult({ ...r, displayName: DISPLAY });
        void trackMoveReportEvent({
          eventName: 'move_report_completed',
          meta: { locale: 'ko', variant: 'coach_observe', profileKey: r.key },
        });
        const attr = { ...getMoveReportAttribution(), mr_source: 'coach_observe' };
        void fetch('/api/move-report/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: getMoveReportSessionId(),
            ageGroup: age,
            profileKey: r.key,
            profileTitle: r.profile.char,
            surveyResponses: nr,
            attribution: attr,
          }),
        }).catch(() => undefined);
        go('loading');
        resultTimer.current = window.setTimeout(() => {
          resultTimer.current = null;
          setAnswering(false);
          go('result');
        }, 1800);
        computeTimer.current = null;
      }, 200);
    },
    [age, answering, go, qi, questions.length, resps]
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
    <main className="mr-page" style={{ padding: 0 }} lang="ko">
      {sc === 'setup' && (
        <div className="mr-page-inner" style={{ paddingTop: '28px', paddingBottom: '120px' }}>
          <Setup
            locale="ko"
            ageOnly
            name=""
            onName={() => undefined}
            age={age}
            onAge={setAge}
            onBack={goHub}
            onNext={() => {
              setQi(0);
              setResps([]);
              go('survey');
            }}
          />
        </div>
      )}
      {sc === 'survey' && currentQ && (
        <Survey
          locale="ko"
          q={currentQ}
          qi={qi}
          total={questions.length}
          resps={resps}
          name="아이"
          onAnswer={onAnswer}
          onBack={surveyBack}
          answering={answering}
        />
      )}
      {sc === 'loading' && <Loading locale="ko" displayName={DISPLAY} />}
      {sc === 'result' && result && (
        <Result
          locale="ko"
          variant="coachObserve"
          result={result}
          tab={tab}
          onTab={setTab}
          onReset={goHub}
          onAnotherChild={retakeAnother}
          flash={flash}
          showEducatorCta={false}
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
