'use client';

import { useState } from 'react';
import { X, PlayCircle } from 'lucide-react';

type GamePhase = 'idle' | 'playing';

type ModeConfig = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  instructions: string[];
  accentColor: string;
  bgGradient: string;
  icon: string;
  readyLabel: string;
};

const MODE_CONFIGS: ModeConfig[] = [
  {
    id: 'CHALLENGE',
    title: 'CHALLENGE',
    subtitle: '순발력 & 신체 통제',
    description: '화면에 뜨는 타겟을 최대한 빠르게 터치하고 돌아오세요. 반응 속도와 순발력을 극한까지 끌어올립니다.',
    instructions: ['화면에 타겟이 무작위로 나타납니다', '가장 빠르게 터치하고 돌아오세요', '빗나가면 감점됩니다'],
    accentColor: 'text-orange-400',
    bgGradient: 'from-orange-900/40 via-[#0B1120] to-[#0B1120]',
    icon: '🎯',
    readyLabel: '챌린지 시작',
  },
  {
    id: 'FLOW',
    title: 'FLOW',
    subtitle: '동작 연결 & 신체 협응',
    description: '화면에 제시되는 방향 시퀀스를 끊김 없이 연결하세요. 리듬에 맞춰 유연하게 움직입니다.',
    instructions: ['화살표 방향으로 이동하세요', 'BPM에 맞춰 동작을 연결하세요', '흐름을 끊지 마세요'],
    accentColor: 'text-blue-400',
    bgGradient: 'from-blue-900/40 via-[#0B1120] to-[#0B1120]',
    icon: '🌊',
    readyLabel: '플로우 시작',
  },
  {
    id: '반응인지',
    title: '반응인지',
    subtitle: '시각 자극 반응 훈련',
    description: '다양한 색상 신호에 맞춰 즉각 반응하세요. 시각-운동 통합 능력과 신체 반응 속도를 향상시킵니다.',
    instructions: ['제시된 색상 신호를 확인하세요', '해당 색상 구역으로 빠르게 이동하세요', '정확도와 속도 모두 중요합니다'],
    accentColor: 'text-yellow-400',
    bgGradient: 'from-yellow-900/30 via-[#0B1120] to-[#0B1120]',
    icon: '⚡',
    readyLabel: '반응인지 시작',
  },
  {
    id: '순차기억',
    title: '순차기억',
    subtitle: '동작 순서 기억 훈련',
    description: '화면이 보여주는 동작 순서를 기억하고 그대로 재현하세요. 작업 기억력과 순서 처리 능력을 강화합니다.',
    instructions: ['화면의 동작 순서를 기억하세요', '순서대로 동작을 재현하세요', '라운드마다 난이도가 높아집니다'],
    accentColor: 'text-purple-400',
    bgGradient: 'from-purple-900/30 via-[#0B1120] to-[#0B1120]',
    icon: '🧠',
    readyLabel: '순차기억 시작',
  },
  {
    id: '스트룹',
    title: '스트룹',
    subtitle: '인지 억제 & 집중력',
    description: '색상 이름과 실제 색상이 불일치할 때 올바른 선택을 하세요. 인지 억제력과 선택적 집중력을 훈련합니다.',
    instructions: ['글자의 색상을 보고 판단하세요 (글자 내용이 아닌)', '지정된 색상 구역으로 이동하세요', '헷갈릴수록 뇌가 성장합니다'],
    accentColor: 'text-pink-400',
    bgGradient: 'from-pink-900/30 via-[#0B1120] to-[#0B1120]',
    icon: '🎨',
    readyLabel: '스트룹 시작',
  },
  {
    id: '이중과제',
    title: '이중과제',
    subtitle: '분리 주의 & 신체-인지 협응',
    description: '신체 동작과 인지 과제를 동시에 수행하세요. 분리 주의 능력과 고급 신체-인지 협응 능력을 개발합니다.',
    instructions: ['두 가지 과제를 동시에 수행하세요', '신체 동작과 인지 판단을 병행합니다', '집중력을 분배하는 것이 핵심입니다'],
    accentColor: 'text-teal-400',
    bgGradient: 'from-teal-900/30 via-[#0B1120] to-[#0B1120]',
    icon: '🔀',
    readyLabel: '이중과제 시작',
  },
];

function GameIdleScreen({ config, onStart }: { config: ModeConfig; onStart: () => void }) {
  return (
    <div className={`flex flex-col items-center justify-center h-full px-8 bg-gradient-to-b ${config.bgGradient}`}>
      <div className="text-center space-y-8 max-w-2xl w-full">
        <div className="text-[80px] leading-none select-none">{config.icon}</div>

        <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-current/30 bg-current/10 ${config.accentColor}`}>
          {config.subtitle}
        </div>

        <h1 className="text-[clamp(3rem,12vw,8rem)] font-black text-white tracking-tighter leading-none">
          {config.title}
        </h1>

        <p className="text-slate-300 text-lg font-medium leading-relaxed">{config.description}</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-3">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">진행 방식</p>
          {config.instructions.map((instr, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`shrink-0 w-6 h-6 rounded-full border border-current/40 flex items-center justify-center text-xs font-black ${config.accentColor}`}>
                {i + 1}
              </span>
              <span className="text-slate-300 text-sm">{instr}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="flex items-center gap-3 px-12 py-5 bg-white text-[#0B1120] font-black text-xl rounded-2xl shadow-2xl hover:bg-slate-100 transition-colors mx-auto"
        >
          <PlayCircle className="w-7 h-7" />
          {config.readyLabel}
        </button>

        <p className="text-slate-600 text-xs">게임 로직 연동 전 UI 확인 화면입니다</p>
      </div>
    </div>
  );
}

function GamePlayingScreen({ config, onStop }: { config: ModeConfig; onStop: () => void }) {
  return (
    <div className={`flex flex-col items-center justify-center h-full bg-gradient-to-b ${config.bgGradient}`}>
      <div className="text-center space-y-8">
        <div className="text-[100px] leading-none animate-pulse select-none">{config.icon}</div>
        <div className={`text-4xl font-black ${config.accentColor}`}>{config.title} 진행 중</div>
        <p className="text-slate-400 font-medium text-sm">게임 엔진이 이 화면을 대체합니다</p>
        <button
          type="button"
          onClick={onStop}
          className="px-10 py-4 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
        >
          대기 화면으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default function SpokeduProInteractiveScreen({
  mode,
  open,
  onClose,
  onToast,
}: {
  mode: string;
  open: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [phase, setPhase] = useState<GamePhase>('idle');

  const config =
    MODE_CONFIGS.find((m) => m.id === mode) ?? {
      id: mode,
      title: mode,
      subtitle: '인터랙티브 모드',
      description: '스크린 플레이 모드입니다.',
      instructions: [],
      accentColor: 'text-blue-400',
      bgGradient: 'from-blue-900/30 via-[#0B1120] to-[#0B1120]',
      icon: '▶',
      readyLabel: '시작',
    };

  if (!open) return null;

  const handleClose = () => {
    setPhase('idle');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0B1120] z-[200] flex flex-col">
      {/* 좌상단 뱃지 */}
      <div className="absolute top-6 left-6 z-10">
        <div className="px-3 py-1.5 bg-white/5 border border-slate-700 rounded-full text-xs font-black text-slate-400 uppercase tracking-widest">
          SPOKEDU · {config.id}
        </div>
      </div>

      {/* 닫기 버튼 */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="닫기"
        className="absolute top-6 right-6 z-10 flex items-center gap-2 text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-slate-700 text-sm font-bold"
      >
        <X className="w-4 h-4" />
        닫기
      </button>

      {/* 본문 */}
      <div className="flex-1 min-h-0">
        {phase === 'idle' ? (
          <GameIdleScreen
            config={config}
            onStart={() => {
              setPhase('playing');
              onToast(`${config.title} 모드를 시작합니다`);
            }}
          />
        ) : (
          <GamePlayingScreen config={config} onStop={() => setPhase('idle')} />
        )}
      </div>
    </div>
  );
}
