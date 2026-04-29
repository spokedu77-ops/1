'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MonitorSmartphone, X, Play, RotateCcw, Music, SkipBack, SkipForward } from 'lucide-react';

export default function SpokeduProToolkit({
  open,
  onToggle,
  onOpenToolsView,
}: {
  open: boolean;
  onToggle: () => void;
  onOpenToolsView: () => void;
}) {
  const tr = useTranslator();
  const [mounted, setMounted] = useState(false);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [scoreRed, setScoreRed] = useState(0);
  const [scoreBlue, setScoreBlue] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateScore = useCallback((team: 'red' | 'blue', delta: number) => {
    if (team === 'red') setScoreRed((s) => Math.max(0, s + delta));
    else setScoreBlue((s) => Math.max(0, s + delta));
  }, []);

  const stack = (
    <div className="spokedu-pro pointer-events-none fixed inset-0 z-[210] overflow-visible">
      <div className="pointer-events-auto flex flex-col items-end gap-4 fixed right-3 bottom-[max(0.75rem,calc(5.35rem+env(safe-area-inset-bottom)))] md:bottom-6 md:right-6">
        <div
          className={`tool-panel bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 w-[min(100vw-1.5rem,340px)] md:w-[340px] overflow-y-auto max-h-[min(70vh,520px)] md:max-h-[85vh] custom-scroll ${open ? 'show' : ''}`}
        >
          <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3 sticky top-0 bg-slate-800 z-10">
            <h3 className="font-bold text-white flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4 text-blue-400" /> {tr('스마트 마스터 툴킷')}
            </h3>
            <button type="button" onClick={onToggle} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-xl p-4 text-center border border-slate-800">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">{tr('수업 진행 타이머')}</p>
              <div className="text-4xl font-black text-white font-mono tracking-tighter">
                {String(Math.floor(stopwatchMs / 60000)).padStart(2, '0')}:
                {String(Math.floor((stopwatchMs % 60000) / 1000)).padStart(2, '0')}.{(stopwatchMs % 1000) / 10}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStopwatchRunning((r) => !r)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> {stopwatchRunning ? tr('일시정지') : tr('시작')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStopwatchRunning(false);
                  setStopwatchMs(0);
                }}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="mt-6 space-y-3 border-t border-slate-700 pt-5">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <Music className="w-3 h-3 text-emerald-400" /> {tr('스포키듀 DJ 브금 플레이어')}
            </p>
            <div className="bg-slate-900 rounded-xl p-3 flex items-center justify-between border border-slate-800">
              <select className="bg-transparent text-slate-300 text-xs font-bold focus:outline-none w-32 truncate">
                <option>{tr('텐션 폭발 도입부')}</option>
                <option>{tr('집중 모드 메인 활동')}</option>
                <option>{tr('릴렉스 마무리 쿨다운')}</option>
              </select>
              <div className="flex items-center gap-3">
                <button type="button" className="text-slate-500 hover:text-white transition-colors">
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>
                <button
                  type="button"
                  className="w-8 h-8 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
                <button type="button" className="text-slate-500 hover:text-white transition-colors">
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3 border-t border-slate-700 pt-5">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{tr('실시간 팀 점수판')}</p>
            <div className="flex justify-between gap-4">
              <div className="flex-1 bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-center">
                <p className="text-xs font-bold text-red-400 mb-2">{tr('A 팀')}</p>
                <div className="flex items-center justify-between bg-slate-900 rounded p-1">
                  <button type="button" onClick={() => updateScore('red', -1)} className="px-2 text-slate-400 hover:text-white">
                    -
                  </button>
                  <span className="font-bold text-lg text-white">{scoreRed}</span>
                  <button type="button" onClick={() => updateScore('red', 1)} className="px-2 text-slate-400 hover:text-white">
                    +
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 text-center">
                <p className="text-xs font-bold text-blue-400 mb-2">{tr('B 팀')}</p>
                <div className="flex items-center justify-between bg-slate-900 rounded p-1">
                  <button type="button" onClick={() => updateScore('blue', -1)} className="px-2 text-slate-400 hover:text-white">
                    -
                  </button>
                  <span className="font-bold text-lg text-white">{scoreBlue}</span>
                  <button type="button" onClick={() => updateScore('blue', 1)} className="px-2 text-slate-400 hover:text-white">
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3 border-t border-slate-700 pt-5">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center justify-between">
              <span>{tr('수업 보조도구')}</span>
              <button type="button" onClick={onOpenToolsView} className="text-blue-400 hover:text-blue-300 text-[10px] underline">
                {tr('큰 화면으로 보기')}
              </button>
            </p>
            <p className="text-slate-400 text-xs">
              {tr('스톱워치·점수판을 큰 화면에서 사용하려면 위 링크를 눌러주세요.')}
            </p>
            <p className="text-slate-500 text-[11px] leading-relaxed border-t border-slate-700/80 pt-2">
              {tr('술래·팀 나누기·순서 정하기는 「큰 화면으로 보기」 탭에서 이어서 할 수 있어요.')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 monster-float"
        >
          <MonitorSmartphone className="w-7 h-7" />
        </button>
      </div>
    </div>
  );

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(stack, document.body);
}
