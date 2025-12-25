'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SalesDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    centerSales: {},
    teacherPerformance: [],
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear < 2025 ? 2025 : currentYear);
  const [month, setMonth] = useState(now.getMonth() + 1);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      // 1. 해당 월의 완료된 수업 데이터
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'finished')
        .gte('start_at', `${startDate}T00:00:00`)
        .lte('start_at', `${endDate}T23:59:59`);

      // 2. 해당 월의 기타 정산(보너스/차감) 데이터
      const { data: adjs } = await supabase
        .from('settlements')
        .select('*')
        .eq('year', year)
        .eq('month', month);

      let total = 0;
      const centers = {};
      const teachers = {};

      // 수업 매출 집계
      sessions?.forEach(s => {
        const fee = Number(s.fee) || Number(s.price) || Number(s.teacher_fee) || 0;
        total += fee;

        const type = s.session_type === 'center' ? '센터 정규수업' : '외부/기타수업';
        centers[type] = (centers[type] || 0) + fee;

        const tName = s.instructor || '미지정';
        teachers[tName] = (teachers[tName] || 0) + fee;
      });

      // 기타 정산 집계 (매출에 포함 또는 별도 표기 가능, 여기서는 합산)
      adjs?.forEach(a => {
        const amount = Number(a.amount);
        total += amount;
        
        // 강사별 성과에 보너스 합산
        const { data: userData } = supabase.from('users').select('name').eq('id', a.teacher_id).single();
        // 실제 운영 시에는 user 정보를 join해서 가져오는 것이 효율적입니다.
      });

      setStats({
        totalSales: total,
        centerSales: centers,
        teacherPerformance: Object.entries(teachers).sort((a, b) => b[1] - a[1]),
      });
    } catch (error) {
      console.error('Stats load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, [year, month]);

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 italic tracking-tighter uppercase">Spokedu Insight</h1>
          <p className="text-blue-500 font-bold text-xs uppercase tracking-widest mt-1 italic">Data Driven Business Dashboard</p>
        </div>

        {/* 연도/월 선택 UI (2025-2030) */}
        <div className="flex bg-white p-2.5 rounded-[24px] shadow-sm border border-gray-100 gap-2 font-black items-center">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="p-2 text-gray-400 outline-none bg-transparent cursor-pointer text-sm">
            {Array.from({ length: 6 }, (_, i) => 2025 + i).map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="p-2 text-blue-600 outline-none bg-transparent cursor-pointer text-sm">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
        </div>
      </div>

      {/* 대시보드 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-blue-600 rounded-[48px] p-10 text-white shadow-2xl shadow-blue-200">
          <p className="text-[11px] font-black opacity-60 uppercase tracking-widest mb-3">Monthly Total Revenue</p>
          <p className="text-5xl font-black tracking-tighter italic">{stats.totalSales.toLocaleString()}<span className="text-2xl ml-1 not-italic font-bold">원</span></p>
          <div className="mt-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-wider">Live Settlement Data</span>
          </div>
        </div>

        <div className="bg-white rounded-[48px] p-10 border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest mb-3">Active Partners</p>
          <p className="text-5xl font-black text-gray-900 tracking-tighter">{stats.teacherPerformance.length}<span className="text-2xl ml-1 font-bold">명</span></p>
          <p className="text-[10px] font-black text-blue-500 mt-4 uppercase tracking-widest">수업 진행 강사 수</p>
        </div>

        <div className="bg-white rounded-[48px] p-10 border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest mb-4">Revenue Mix</p>
          <div className="space-y-3">
            {Object.entries(stats.centerSales).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center font-black">
                <span className="text-[11px] text-gray-400 uppercase">{key}</span>
                <span className="text-sm text-gray-800">{((val / stats.totalSales) * 100 || 0).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 강사별 매출 기여도 랭킹 */}
      <div className="bg-white rounded-[56px] border border-gray-100 shadow-sm p-10 md:p-14">
        <div className="flex justify-between items-end mb-12">
          <h3 className="text-2xl font-black text-gray-900 italic tracking-tight">Teacher Performance Rank</h3>
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest pb-1">Top Contributors</span>
        </div>

        <div className="space-y-10">
          {stats.teacherPerformance.length > 0 ? (
            stats.teacherPerformance.map(([name, total], index) => (
              <div key={name} className="group">
                <div className="flex justify-between items-end mb-4 px-2">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-blue-100 italic group-hover:text-blue-600 transition-colors">0{index + 1}</span>
                    <span className="text-lg font-black text-gray-800 uppercase">{name} 선생님</span>
                  </div>
                  <span className="text-sm font-black text-gray-400 italic">{total.toLocaleString()}원</span>
                </div>
                <div className="w-full bg-gray-50 h-4 rounded-full overflow-hidden p-1">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{ width: `${(total / stats.teacherPerformance[0][1]) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center">
              <p className="text-xs font-black text-gray-200 uppercase tracking-widest italic">No Performance Data Found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
