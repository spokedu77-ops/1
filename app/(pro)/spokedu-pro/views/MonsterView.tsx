'use client';

import { Trophy } from 'lucide-react';

export default function MonsterView() {
  return (
    <section className="px-8 lg:px-16 py-12 pb-32">
      <header className="space-y-4 border-b border-slate-800 pb-10 flex justify-between items-end">
        <div>
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-3">
            <Trophy className="w-4 h-4" /> Spokedu Gamification
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">클래스 몬스터 리그</h2>
        </div>
        <button type="button" className="px-6 py-3 bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-xl">
          알 속성 변경
        </button>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
        <div className="lg:col-span-2 bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl border border-slate-700 flex flex-col items-center justify-center p-12 min-h-[500px]">
          <div className="text-[120px] monster-float mb-8">🥚</div>
          <div className="text-center space-y-4 w-full max-w-md">
            <div className="flex justify-between items-end">
              <h3 className="text-3xl font-black text-white">불꽃의 알 (Lv.1)</h3>
              <span className="text-red-400 font-bold text-xl">80 / 100 XP</span>
            </div>
            <div className="h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
              <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 w-[80%] rounded-full" />
            </div>
            <p className="text-slate-400 font-medium">다음 단계 부화까지 20 XP 남음!</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-3xl p-6">
            <h3 className="text-sm font-black text-blue-400 mb-4">EXP 획득 가이드</h3>
            <ul className="space-y-3">
              <li className="flex justify-between text-xs text-slate-300 font-medium border-b border-blue-500/20 pb-2">
                <span>출석부 작성</span> <span className="text-white font-bold">+10 XP</span>
              </li>
              <li className="flex justify-between text-xs text-slate-300 font-medium border-b border-blue-500/20 pb-2">
                <span>스크린 플레이 15분</span> <span className="text-white font-bold">+30 XP</span>
              </li>
              <li className="flex justify-between text-xs text-slate-300 font-medium border-b border-blue-500/20 pb-2">
                <span>성장 리포트 발송</span> <span className="text-emerald-400 font-bold">+50 XP</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
