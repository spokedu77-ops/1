'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { CreditCard, Star, CheckCircle2, History, Info } from 'lucide-react';

interface MileageLog {
  id: string;
  amount: number;
  reason: string;
  session_title: string;
  created_at: string;
}

interface SessionRecord {
  id: string;
  title: string;
  price: number;
  start_at: string;
  status: string;
}

interface TeacherInfo {
  id: string;
  name: string | null;
  points: number | null;
}

export default function TeacherReportPage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedPeriod, setSelectedPeriod] = useState(now.getDate() <= 15 ? '1' : '2');

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setFetchError(null);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: userData } = await supabase.from('users').select('id, name, points').eq('id', authUser.id).single();
      setTeacher(userData as TeacherInfo | null);

      const { data: mData } = await supabase.from('mileage_logs').select('*').eq('teacher_id', authUser.id).order('created_at', { ascending: false });
      if (mData) setMileageLogs(mData as MileageLog[]);

      const { data: sData } = await supabase.from('sessions').select('id, title, price, start_at, status').eq('created_by', authUser.id).in('status', ['finished', 'verified']).order('start_at', { ascending: false });
      if (sData) setSessions(sData as SessionRecord[]);
    } catch (error) {
      console.error(error);
      setFetchError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const d = new Date(s.start_at);
      const sameMonth = (d.getMonth() + 1) === selectedMonth && d.getFullYear() === now.getFullYear();
      if (!sameMonth) return false;
      return selectedPeriod === '1' ? d.getDate() <= 15 : d.getDate() >= 16;
    });
  }, [sessions, selectedMonth, selectedPeriod, now]);

  // 정산 계산 로직
  const beforeTax = filteredSessions.reduce((acc, s) => acc + (s.price || 0), 0);
  const tax = Math.floor(beforeTax * 0.033); // 3.3% 원천징수 (절사)
  const afterTax = beforeTax - tax; // 최종 실수령액

  const cleanReason = (reason: string) => {
    if (!reason) return '';
    return reason.replace(/\[수업연동\]\s(원복|차감):\s/, '').trim();
  };

  if (fetchError) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500 text-sm font-bold mb-3">{fetchError}</p>
        <button type="button" onClick={fetchData} className="text-indigo-600 text-xs font-black hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  if (loading) return <div className="py-20 text-center font-black italic text-indigo-600">SPOKEDU DATA LOADING...</div>;

  return (
    <div className="space-y-10 pb-24 px-1 animate-in fade-in duration-500">
      
      {/* 1. MILEAGE (전체 누적) */}
      <section className="space-y-4">
        <div className="bg-slate-950 p-6 rounded-[32px] text-white shadow-xl">
          <div className="flex items-center gap-2 opacity-40 mb-1">
            <Star size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Total Points</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black italic">{(teacher?.points || 0).toLocaleString()}</span>
            <span className="text-sm font-bold opacity-30 italic">P</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <History size={14} className="text-slate-400"/>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mileage Log</h3>
          </div>
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
            {mileageLogs.length > 0 ? (
              mileageLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="p-4 flex justify-between items-center">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[12px] font-black text-slate-800 truncate">{log.session_title}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{cleanReason(log.reason)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[12px] font-black ${log.amount >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                      {log.amount > 0 ? '+' : ''}{log.amount.toLocaleString()}
                    </p>
                    <p className="text-[8px] font-bold text-slate-300 tabular-nums">{new Date(log.created_at).toLocaleDateString('ko-KR', {month: 'numeric', day: 'numeric'})}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-200 text-[10px] font-black italic uppercase">No Data</div>
            )}
          </div>
        </div>
      </section>

      {/* 2. SETTLEMENT (정산 - 3.3% 공제 반영) */}
      <section className="space-y-4">
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <CreditCard size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Estimated Payout</span>
          </div>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-3xl font-black text-slate-900">{afterTax.toLocaleString()}</span>
            <span className="text-sm font-bold text-slate-300 italic uppercase">원</span>
          </div>

          {/* 정산 상세 수치 */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400">총 정산액 (세전)</span>
              <span className="text-[12px] font-black text-slate-700">{beforeTax.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400">프리랜서 세액 (3.3%)</span>
              <span className="text-[12px] font-black text-red-500">-{tax.toLocaleString()}원</span>
            </div>
            <div className="pt-2 border-t border-slate-200/50 flex justify-between items-center">
              <span className="text-[11px] font-black text-indigo-600">실수령액</span>
              <span className="text-[13px] font-black text-indigo-600">{afterTax.toLocaleString()}원</span>
            </div>
          </div>

          {/* 차수 선택 */}
          <div className="flex items-center gap-2">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="flex-1 bg-slate-100 py-3 rounded-xl font-black text-[11px] text-center outline-none"
            >
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}월</option>)}
            </select>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="flex-1 bg-indigo-50 py-3 rounded-xl font-black text-[11px] text-indigo-600 text-center outline-none"
            >
              <option value="1">1차 (1-15일)</option>
              <option value="2">2차 (16-말일)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <CheckCircle2 size={14} className="text-slate-400"/>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settlement History</h3>
          </div>
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => (
                <div key={session.id} className="p-4 flex justify-between items-center">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[12px] font-black text-slate-800 truncate">{session.title}</p>
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase mt-1 inline-block">
                      {session.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-black text-slate-900">{session.price.toLocaleString()}원</p>
                    <p className="text-[8px] font-bold text-slate-300 tabular-nums">{new Date(session.start_at).getDate()}일</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-200 text-[10px] font-black italic uppercase">No Classes</div>
            )}
          </div>
        </div>
      </section>

      <div className="px-4 py-2 bg-blue-50/50 rounded-xl flex gap-3 items-start">
        <Info size={14} className="text-blue-400 mt-0.5" />
        <p className="text-[10px] font-bold text-blue-400 leading-relaxed">
          스포키듀의 정산은 프리랜서 사업소득(3.3%) 원천징수 후 지급됩니다. 실제 입금액은 공제 후 금액인 {"'"}실수령액{"'"}과 일치합니다.
        </p>
      </div>

    </div>
  );
}