'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Timer, LayoutList } from 'lucide-react';

type TabId = 'stopwatch' | 'scoreboard';

export default function AssistantToolsView() {
  const [tab, setTab] = useState<TabId>('stopwatch');
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [scoreRed, setScoreRed] = useState(0);
  const [scoreBlue, setScoreBlue] = useState(0);

  useEffect(() => {
    if (!stopwatchRunning) return;
    const start = Date.now() - stopwatchMs;
    const t = setInterval(() => setStopwatchMs(Date.now() - start), 10);
    return () => clearInterval(t);
  }, [stopwatchRunning, stopwatchMs]);

  const updateScore = useCallback((team: 'red' | 'blue', delta: number) => {
    if (team === 'red') setScoreRed((s) => Math.max(0, s + delta));
    else setScoreBlue((s) => Math.max(0, s + delta));
  }, []);

  const minutes = Math.floor(stopwatchMs / 60000);
  const seconds = Math.floor((stopwatchMs % 60000) / 1000);
  const centis = Math.floor((stopwatchMs % 1000) / 10);

  return (
    <section className="flex flex-col h-full min-h-0 bg-[#0F172A]">
      {/* 탭 */}
      <div className="shrink-0 flex border-b border-slate-800 bg-slate-900/50">
        <button
          type="button"
          onClick={() => setTab('stopwatch')}
          className={`flex items-center gap-3 px-8 py-5 text-sm font-bold border-b-2 transition-colors ${
            tab === 'stopwatch'
              ? 'border-amber-400 text-amber-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'
          }`}
        >
          <Timer className="w-5 h-5" />
          스톱워치
        </button>
        <button
          type="button"
          onClick={() => setTab('scoreboard')}
          className={`flex items-center gap-3 px-8 py-5 text-sm font-bold border-b-2 transition-colors ${
            tab === 'scoreboard'
              ? 'border-amber-400 text-amber-400 bg-slate-800/50'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'
          }`}
        >
          <LayoutList className="w-5 h-5" />
          점수판
        </button>
      </div>

      {/* 큰화면 콘텐츠 */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-8">
        {tab === 'stopwatch' && (
          <div className="w-full max-w-4xl flex flex-col items-center justify-center">
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mb-6">수업 진행 타이머</p>
            <div className="font-mono text-[clamp(4rem,18vw,12rem)] font-black text-white tracking-tighter tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}.{String(centis).padStart(2, '0')}
            </div>
            <div className="flex gap-4 mt-10">
              <button
                type="button"
                onClick={() => setStopwatchRunning((r) => !r)}
                className="flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-2xl transition-colors shadow-lg"
              >
                <Play className="w-6 h-6 fill-current" />
                {stopwatchRunning ? '일시정지' : '시작'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStopwatchRunning(false);
                  setStopwatchMs(0);
                }}
                className="flex items-center gap-3 px-10 py-5 bg-slate-700 hover:bg-slate-600 text-white font-black text-lg rounded-2xl transition-colors"
              >
                <RotateCcw className="w-6 h-6" />
                리셋
              </button>
            </div>
          </div>
        )}

        {tab === 'scoreboard' && (
          <div className="w-full max-w-5xl grid grid-cols-2 gap-8 lg:gap-12">
            <div className="bg-red-900/20 border-2 border-red-500/50 rounded-3xl p-8 lg:p-12 flex flex-col items-center justify-center min-h-[280px]">
              <p className="text-red-400 font-black text-sm uppercase tracking-widest mb-6">A 팀</p>
              <div className="text-[clamp(4rem,15vw,10rem)] font-black text-white tabular-nums leading-none">
                {scoreRed}
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => updateScore('red', -1)}
                  className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-black text-2xl flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => updateScore('red', 1)}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-2xl flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            <div className="bg-blue-900/20 border-2 border-blue-500/50 rounded-3xl p-8 lg:p-12 flex flex-col items-center justify-center min-h-[280px]">
              <p className="text-blue-400 font-black text-sm uppercase tracking-widest mb-6">B 팀</p>
              <div className="text-[clamp(4rem,15vw,10rem)] font-black text-white tabular-nums leading-none">
                {scoreBlue}
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => updateScore('blue', -1)}
                  className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-black text-2xl flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => updateScore('blue', 1)}
                  className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-2xl flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
