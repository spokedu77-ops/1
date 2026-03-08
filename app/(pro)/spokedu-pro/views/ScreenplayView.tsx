'use client';

import { MonitorPlay, PlayCircle } from 'lucide-react';

type ScreenMode = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  tagColor: string;
  gradient: string;
  border: string;
  icon: string;
};

const MODES: ScreenMode[] = [
  {
    id: 'CHALLENGE',
    title: 'CHALLENGE 모드',
    subtitle: '순발력 & 신체 통제',
    description: '화면에 무작위로 뜨는 목표 타겟을 가장 빠르게 터치하고 돌아오는 한계 돌파 챌린지입니다.',
    tag: '순발력 및 신체 통제',
    tagColor: 'bg-orange-500',
    gradient: 'from-orange-600/20 to-red-600/10',
    border: 'border-orange-500/30',
    icon: '🎯',
  },
  {
    id: 'FLOW',
    title: 'FLOW 모드',
    subtitle: '동작 연결 & 신체 협응',
    description: '화면에 제시되는 동작 시퀀스를 끊김 없이 부드럽게 연결하며 수행하는 모빌리티 프로그램입니다.',
    tag: '동작 연결 및 신체 협응',
    tagColor: 'bg-blue-500',
    gradient: 'from-blue-600/20 to-indigo-600/10',
    border: 'border-blue-500/30',
    icon: '🌊',
  },
  {
    id: '반응인지',
    title: '반응인지 모드',
    subtitle: '시각 자극 반응 훈련',
    description: '다양한 색상과 신호에 맞춰 즉각 반응하는 시각-운동 통합 훈련입니다. 신체 반응 속도를 높입니다.',
    tag: '시각 반응 및 인지',
    tagColor: 'bg-yellow-500',
    gradient: 'from-yellow-600/20 to-amber-600/10',
    border: 'border-yellow-500/30',
    icon: '⚡',
  },
  {
    id: '순차기억',
    title: '순차기억 모드',
    subtitle: '동작 순서 기억 훈련',
    description: '화면이 보여주는 동작 순서를 기억하고 그대로 재현하는 작업 기억력 강화 훈련입니다.',
    tag: '기억력 및 순서 처리',
    tagColor: 'bg-purple-500',
    gradient: 'from-purple-600/20 to-violet-600/10',
    border: 'border-purple-500/30',
    icon: '🧠',
  },
  {
    id: '스트룹',
    title: '스트룹 모드',
    subtitle: '인지 억제 & 집중력',
    description: '색상 이름과 실제 색상이 불일치하는 자극 속에서 올바른 반응을 선택하는 인지 억제 훈련입니다.',
    tag: '인지 억제 및 집중력',
    tagColor: 'bg-pink-500',
    gradient: 'from-pink-600/20 to-rose-600/10',
    border: 'border-pink-500/30',
    icon: '🎨',
  },
  {
    id: '이중과제',
    title: '이중과제 모드',
    subtitle: '분리 주의 & 협응',
    description: '두 가지 다른 과제를 동시에 수행하는 분리 주의 훈련으로 고급 신체-인지 협응 능력을 개발합니다.',
    tag: '분리 주의 및 협응',
    tagColor: 'bg-teal-500',
    gradient: 'from-teal-600/20 to-cyan-600/10',
    border: 'border-teal-500/30',
    icon: '🔀',
  },
];

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
          체육관 모니터 또는 태블릿에 연결하세요. 원하는 인터랙티브 모드를 선택하면 즉시 전체화면으로 수업이 시작됩니다.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MODES.map((m) => (
          <div
            key={m.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenInteractive(m.id)}
            onKeyDown={(e) => e.key === 'Enter' && onOpenInteractive(m.id)}
            className={`media-card bg-gradient-to-br ${m.gradient} border ${m.border} p-8 rounded-3xl relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01]`}
          >
            {/* 배경 아이콘 */}
            <div className="absolute right-6 top-6 text-[80px] opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all select-none pointer-events-none">
              {m.icon}
            </div>

            <div className="relative z-10 space-y-4">
              <span className={`inline-block ${m.tagColor} text-white px-3 py-1 rounded-lg font-bold text-xs`}>
                {m.tag}
              </span>
              <h3 className="text-2xl lg:text-3xl font-black text-white">{m.title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed max-w-lg">{m.description}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenInteractive(m.id); }}
                className={`mt-4 px-6 py-3 ${m.tagColor} hover:opacity-90 text-white font-bold rounded-xl flex items-center gap-2 transition-opacity shadow-lg text-sm`}
              >
                <PlayCircle className="w-5 h-5" /> 전체화면 실행
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
