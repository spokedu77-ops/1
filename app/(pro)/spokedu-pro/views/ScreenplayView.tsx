'use client';

import { MonitorPlay, Target, Brain, Wind, PlayCircle } from 'lucide-react';

export default function ScreenplayView({
  onOpenInteractive,
  onToast,
}: {
  onOpenInteractive: (mode: string) => void;
  onToast: (msg: string) => void;
}) {
  return (
    <section className="px-8 lg:px-16 py-12 pb-32 space-y-10">
      <header className="space-y-4 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold uppercase tracking-widest">
          <MonitorPlay className="w-4 h-4" /> Live Immersive Engine
        </div>
        <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">스크린 플레이 즉시 실행</h2>
        <p className="text-lg text-slate-400 font-medium">
          체육관 모니터 혹은 태블릿을 연결하셨나요? 원하는 인터랙티브 모드를 클릭하여 수업을 바로 시작하세요.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          className="media-card bg-gradient-to-br from-orange-600/20 to-red-600/10 border border-orange-500/30 p-8 rounded-3xl relative overflow-hidden group cursor-pointer"
          onClick={() => onOpenInteractive('CHALLENGE')}
        >
          <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Target className="w-32 h-32 text-orange-500" />
          </div>
          <div className="relative z-10 space-y-4">
            <span className="bg-orange-500 text-white px-3 py-1 rounded font-bold text-xs">순발력 및 신체 통제</span>
            <h3 className="text-3xl font-black text-white">CHALLENGE 모드</h3>
            <p className="text-orange-200">
              화면에 무작위로 뜨는 목표 타겟을 가장 빠르게 터치하고 돌아오는 한계 돌파 챌린지입니다.
            </p>
            <button
              type="button"
              className="mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onOpenInteractive('CHALLENGE');
              }}
            >
              <PlayCircle className="w-5 h-5" /> 전체화면 실행
            </button>
          </div>
        </div>
        <div
          className="media-card bg-gradient-to-br from-emerald-600/20 to-teal-600/10 border border-emerald-500/30 p-8 rounded-3xl relative overflow-hidden group cursor-pointer"
          onClick={() => onOpenInteractive('THINK')}
        >
          <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Brain className="w-32 h-32 text-emerald-500" />
          </div>
          <div className="relative z-10 space-y-4">
            <span className="bg-emerald-500 text-white px-3 py-1 rounded font-bold text-xs">상황 판단 및 인지 훈련</span>
            <h3 className="text-3xl font-black text-white">THINK 모드</h3>
            <p className="text-emerald-200">
              화면의 시각 정보(색상, 모양)를 읽고, 머리로 먼저 판단한 뒤 알맞은 교구로 이동하는 인지결합 알고리즘입니다.
            </p>
            <button
              type="button"
              className="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onOpenInteractive('THINK');
              }}
            >
              <PlayCircle className="w-5 h-5" /> 전체화면 실행
            </button>
          </div>
        </div>
        <div
          className="media-card bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/30 p-8 rounded-3xl relative overflow-hidden group cursor-pointer md:col-span-2"
          onClick={() => onOpenInteractive('FLOW')}
        >
          <div className="absolute right-10 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Wind className="w-32 h-32 text-blue-500" />
          </div>
          <div className="relative z-10 space-y-4 w-full md:w-1/2">
            <span className="bg-blue-500 text-white px-3 py-1 rounded font-bold text-xs">동작 연결 및 신체 협응</span>
            <h3 className="text-3xl font-black text-white">FLOW 모드</h3>
            <p className="text-blue-200">
              화면에 제시되는 여러 동작 시퀀스를 끊김 없이 부드럽게 연결하며 수행하는 모빌리티 프로그램입니다.
            </p>
            <button
              type="button"
              className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onOpenInteractive('FLOW');
              }}
            >
              <PlayCircle className="w-5 h-5" /> 전체화면 실행
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
