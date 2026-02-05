'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

export default function MasterInsightPage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [stats, setStats] = useState({
    payout: 0,
    totalSessions: 0,
    centerCount: 0,
    privateCount: 0,
    teacherStats: [] as { name: string; count: number }[]
  });

  useEffect(() => {
    async function fetchMasterData() {
      if (!supabase) return;
      const year = new Date().getFullYear();
      const startDate = new Date(year, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(year, selectedMonth, 0, 23, 59, 59).toISOString();

      const { data: sessions } = await supabase
        .from('sessions')
        .select('*, users(name)')
        .gte('start_at', startDate)
        .lte('start_at', endDate);
      
      if (sessions) {
        const payout = sessions.reduce((acc, cur) => acc + (cur.price || 0), 0);
        const centers = sessions.filter(s => s.session_type === 'regular_center').length;
        const privates = sessions.filter(s => s.session_type !== 'regular_center').length;

        const teacherMap = new Map();
        sessions.forEach(s => {
          const name = s.users?.name || '미지정';
          teacherMap.set(name, (teacherMap.get(name) || 0) + 1); // 수업 횟수 기준
        });
        const teacherStats = Array.from(teacherMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        setStats({ payout, totalSessions: sessions.length, centerCount: centers, privateCount: privates, teacherStats });
      }
    }
    fetchMasterData();
  }, [supabase, selectedMonth]);

  return (
    <div className="min-h-screen bg-[#0F1115] text-white p-4 md:p-10 pb-[env(safe-area-inset-bottom,0px)] font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10 min-w-0">
        
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
          <div className="space-y-1 min-w-0">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              MASTER CONSOLE
            </h1>
            <p className="text-gray-500 font-bold text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase">Spokiedu Dispatch Management</p>
          </div>
          
          <div className="flex items-center gap-4 bg-[#1A1D23] p-2 rounded-2xl border border-white/5 min-h-[48px]">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent border-none text-blue-400 font-black text-sm focus:ring-0 cursor-pointer touch-manipulation min-h-[44px]"
            >
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1} className="bg-[#1A1D23]">{i+1}월 분석</option>)}
            </select>
          </div>
        </div>

        {/* 핵심 경영 지표 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#1A1D23] p-8 rounded-[32px] border border-white/5 hover:border-blue-500/30 transition-all">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Total Payout</p>
            <p className="text-3xl font-black tracking-tight">{stats.payout.toLocaleString()}<span className="text-sm ml-1 text-gray-600">₩</span></p>
          </div>
          
          <div className="bg-[#1A1D23] p-8 rounded-[32px] border border-white/5 hover:border-purple-500/30 transition-all">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Est. Revenue</p>
            <p className="text-3xl font-black tracking-tight text-blue-400">{(stats.payout * marginRate).toLocaleString()}<span className="text-sm ml-1 text-gray-600">₩</span></p>
          </div>

          <div className="bg-[#1A1D23] p-8 rounded-[32px] border border-white/5">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Class Volume</p>
            <p className="text-3xl font-black tracking-tight">{stats.totalSessions}<span className="text-sm ml-1 text-gray-600">SESSIONS</span></p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-8 rounded-[32px] shadow-2xl shadow-blue-500/10">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">Teacher Power</p>
            <p className="text-3xl font-black tracking-tight">29<span className="text-sm ml-1 text-white/50">MEMBERS</span></p>
          </div>
        </div>

        {/* 파견 분석 리포트 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 강사 파견 랭킹 */}
          <div className="lg:col-span-2 bg-[#1A1D23] rounded-[40px] p-8 border border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black uppercase tracking-tighter italic">Dispatch Ranking</h3>
              <span className="text-[10px] text-gray-600 font-bold">수업 횟수 기준 TOP 5</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.teacherStats.slice(0, 6).map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-blue-500">0{idx + 1}</span>
                    <span className="font-bold text-gray-300">{t.name} 강사</span>
                  </div>
                  <span className="text-sm font-black text-white">{t.count}회 파견</span>
                </div>
              ))}
            </div>
          </div>

          {/* 파견 영역 비중 */}
          <div className="bg-[#1A1D23] rounded-[40px] p-8 border border-white/5 flex flex-col justify-between">
            <h3 className="text-lg font-black uppercase tracking-tighter italic mb-8 text-center">Dispatch Area</h3>
            <div className="space-y-10">
              <div className="text-center">
                <p className="text-4xl font-black text-blue-400 mb-2">{Math.round((stats.privateCount/stats.totalSessions)*100) || 0}%</p>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">방문 / 일대일</p>
              </div>
              <div className="w-full h-[1px] bg-white/5"></div>
              <div className="text-center">
                <p className="text-4xl font-black text-purple-500 mb-2">{Math.round((stats.centerCount/stats.totalSessions)*100) || 0}%</p>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">센터 파견</p>
              </div>
            </div>
            <div className="mt-8 text-center bg-white/5 py-4 rounded-2xl">
               <p className="text-[10px] font-black text-gray-600 uppercase mb-1">Status</p>
               <p className="text-xs font-bold text-emerald-400">Stable Growth</p>
            </div>
          </div>

        </div>

        {/* CEO FOOTER MESSAGE */}
        <div className="text-center pt-10 border-t border-white/5">
          <p className="text-gray-600 font-bold text-sm">
            &quot;스포키듀의 교육 가치는 29명의 전문 강사진과 연세대학교 운영진의 노하우에서 시작됩니다.&quot;
          </p>
        </div>

      </div>
    </div>
  );
}