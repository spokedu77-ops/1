'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compute } from './lib/compute';
import { getMoveReportSessionId, trackMoveReportEvent } from './lib/events';
import { buildMoveReportShareUrl } from './lib/shareLink';
import { Qs } from './data/questions';
import type { AgeGroup, ComputeResult } from './types';
import Intro from './components/Intro';
import Setup from './components/Setup';
import Survey from './components/Survey';
import Loading from './components/Loading';
import Blocked from './components/Blocked';
import Result, { type ResultTab } from './components/Result';
import { getMrCompletionCount, incrementMrCompletionCount } from './lib/completionLimit';

type Screen = 'intro' | 'setup' | 'survey' | 'loading' | 'result' | 'blocked';

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
  const loadLimitTimer = useRef<number | null>(null);
  const gymKeyRef = useRef<string>('');

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
    const d = params.get('d');
    if (d) setShareKey(d);
    const k = params.get('key');
    gymKeyRef.current = typeof k === 'string' ? k.trim() : '';
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
      if (loadLimitTimer.current) clearTimeout(loadLimitTimer.current);
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
        // Save anonymous survey payload for analysis; never block UX on failure.
        void fetch('/api/move-report/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: getMoveReportSessionId(),
            ageGroup: age,
            profileKey: r.key,
            profileTitle: r.profile.char,
            surveyResponses: nr,
          }),
        }).catch(() => undefined);
        go('loading');
        loadLimitTimer.current = window.setTimeout(() => {
          loadLimitTimer.current = null;
          void (async () => {
            try {
              const postLimit = async (body: Record<string, unknown>) => {
                const res = await fetch('/api/move-report/limit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                return (await res.json()) as {
                  ok?: boolean;
                  allowed?: boolean;
                  bypass?: boolean;
                  error?: string;
                };
              };

              const gymKey = gymKeyRef.current;
              if (gymKey) {
                const chk = await postLimit({ action: 'check', gymKey });
                if (chk.ok && chk.bypass && chk.allowed) {
                  go('result');
                  return;
                }
              }

              if (getMrCompletionCount() >= 3) {
                go('blocked');
                return;
              }

              const chk2 = await postLimit({ action: 'check' });
              if (!chk2.ok || !chk2.allowed) {
                go('blocked');
                return;
              }

              const recRes = await fetch('/api/move-report/limit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'record' }),
              });
              const rec = (await recRes.json()) as { ok?: boolean };
              if (!recRes.ok || !rec.ok) {
                go('blocked');
                return;
              }

              incrementMrCompletionCount();
              go('result');
            } catch {
              flash('일시적으로 확인할 수 없어요. 잠시 후 다시 시도해 주세요.');
              go('blocked');
            } finally {
              setAnswering(false);
            }
          })();
        }, 2200);
        computeTimer.current = null;
      }, 200);
    },
    [age, answering, flash, go, name, qi, questions.length, resps, shareKey]
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
      {sc === 'blocked' && <Blocked onHome={() => go('intro')} />}
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
