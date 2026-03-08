'use client';

import { X } from 'lucide-react';

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[#0B1120] z-[200] flex flex-col items-center justify-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors bg-white/10 p-3 rounded-full border border-slate-700"
      >
        <X className="w-8 h-8" />
      </button>
      <div className="text-center space-y-12">
        <div className="inline-block px-6 py-2 bg-blue-600/20 text-blue-400 rounded-full text-lg font-black uppercase tracking-widest border border-blue-500/30">
          SPOKEDU Immersive Engine
        </div>
        <h1 className="text-7xl lg:text-8xl font-black text-white tracking-tighter">{mode}</h1>
        <div className="flex justify-center gap-8 mt-16">
          <div className="w-40 h-40 bg-red-500 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-lg">
            1
          </div>
          <div className="w-40 h-40 bg-blue-500 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-lg">
            2
          </div>
          <div className="w-40 h-40 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-lg">
            3
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToast('시각 자극 시퀀스가 시작되었습니다.')}
          className="mt-16 px-12 py-5 bg-white text-black font-black text-2xl rounded-full shadow-lg"
        >
          시각 자극 시퀀스 시작
        </button>
      </div>
    </div>
  );
}
