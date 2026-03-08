'use client';

import { Bot, Sparkles } from 'lucide-react';

export default function AIReportView() {
  return (
    <section className="px-8 lg:px-16 py-12 pb-32">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="w-16 h-16 bg-purple-600/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-purple-500/30">
            <Bot className="w-8 h-8" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">에듀-에코 가정 연계 리포트</h2>
        </header>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 lg:p-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">수강생 선택 (데이터 연동)</label>
              <select className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-purple-500 font-bold">
                <option>학생 선택</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">핵심 발달 목표</label>
              <select className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-purple-500 font-bold">
                <option value="인지적 상황 판단력">인지적 상황 판단력 향상 (Think)</option>
                <option value="신체 대근육 조절">신체 대근육 및 순발력 향상 (Play)</option>
                <option value="협동 및 규칙 준수">협동심 및 규칙 준수 (Grow)</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black rounded-xl hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center justify-center gap-2 text-lg"
          >
            <Sparkles className="w-5 h-5" /> 학부모 리포트 및 시각화 카드 생성
          </button>
        </div>
      </div>
    </section>
  );
}
