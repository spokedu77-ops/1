'use client';

import { Users, CheckCircle } from 'lucide-react';

export default function DataCenterView() {
  return (
    <section className="px-8 lg:px-16 py-12 pb-32 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-400" /> 원생 관리 및 평가
        </h2>
        <div className="flex items-center gap-3">
          <select className="bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-4 py-3 focus:outline-none">
            <option>유치부 인지반</option>
            <option>초등 기초반</option>
          </select>
          <button
            type="button"
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> 전체 출석
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">클래스 출석률 (오늘)</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-white">0</span>
            <span className="text-xl text-slate-400 font-bold mb-1">/ 0명</span>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">작성 완료된 관찰 기록</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-blue-400">0</span>
            <span className="text-xl text-blue-500 font-bold mb-1">건</span>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">오늘 획득한 클래스 경험치</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-purple-400">+45</span>
            <span className="text-xl text-purple-500 font-bold mb-1">XP</span>
          </div>
        </div>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
        <p className="text-slate-400 font-medium">원생 카드 그리드 및 상세 패널은 API·데이터 연동 후 배치됩니다.</p>
      </div>
    </section>
  );
}
