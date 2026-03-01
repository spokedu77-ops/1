'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import html2canvas from 'html2canvas';
import { CreditCard, Users, Calculator, Download, History, Info, TrendingUp } from 'lucide-react';

type TeacherRow = { id: string; name: string };
type ExtraTeacher = { id: string; price?: number };
type SessionRow = { id: string; created_by: string; price?: number; students_text?: string; start_at?: string; title?: string };
type SettlementRow = { id: string; teacher_id: string; amount?: number; reason?: string };
type ReportTeacher = {
  id: string;
  name: string;
  count: number;
  grossTotal: number;
  tax: number;
  netPay: number;
  details: SessionRow[];
  adjs: SettlementRow[];
};

export default function UltimateSettlementPage() {
  const router = useRouter();
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportTeacher[]>([]);
  const [inputStates, setInputStates] = useState<Record<string, { amount?: string; reason?: string }>>({});

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState(now.getDate() >= 16 ? 'second' : 'first');

  useEffect(() => {
    const checkMaster = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.email !== 'choijihoon@spokedu.com') {
        router.replace('/admin'); 
        return;
      }
      setIsAdmin(true);
    };
    checkMaster();
  }, [router, supabase]);

  const fetchReport = useCallback(async () => {
    if (!supabase || !isAdmin) return; 
    setLoading(true);
    try {
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${year}-${String(month).padStart(2, '0')}-${period === 'first' ? '01' : '16'}`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${period === 'first' ? '15' : lastDay}`;

      const { data: teachers } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'teacher')
        .eq('is_active', true);

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, created_by, price, students_text, start_at, title')
        .eq('status', 'finished')
        .gte('start_at', `${startDate}T00:00:00`)
        .lte('start_at', `${endDate}T23:59:59`);

      const { data: dbAdjs } = await supabase
        .from('settlements')
        .select('*')
        .eq('year', year).eq('month', month).eq('period', period);

      const calculatedData = (teachers || []).map((teacher: TeacherRow) => {
        const teacherSessions = (sessions || []).filter((s: SessionRow) => {
          const isMain = String(s.created_by) === String(teacher.id);
          let isExtra = false;
          if (s.students_text?.includes('EXTRA_TEACHERS:')) {
            try {
              const extras = JSON.parse(s.students_text.split('EXTRA_TEACHERS:')[1].trim()) as ExtraTeacher[];
              isExtra = extras.some((ex) => String(ex.id) === String(teacher.id));
            } catch {
              // ignore parse error
            }
          }
          return isMain || isExtra;
        });

        const sessionsTotal = teacherSessions.reduce((acc: number, cur: { created_by?: string; price?: number; students_text?: string }) => {
          let amount = 0;
          if (String(cur.created_by) === String(teacher.id)) amount = Number(cur.price) || 0;
          else {
            try {
              const extras = JSON.parse(cur.students_text!.split('EXTRA_TEACHERS:')[1].trim()) as ExtraTeacher[];
              amount = Number(extras.find((ex) => String(ex.id) === String(teacher.id))?.price) || 0;
            } catch {
              // ignore parse error
            }
          }
          return acc + amount;
        }, 0);
        
        const teacherAdjs = (dbAdjs?.filter((a: SettlementRow) => a.teacher_id === teacher.id) || []) as SettlementRow[];
        const adjTotal = teacherAdjs.reduce((acc: number, cur: { amount?: number }) => acc + (Number(cur.amount) ?? 0), 0);
        
        const grossTotal = sessionsTotal + adjTotal;
        const tax = Math.floor(grossTotal * 0.033);
        const netPay = grossTotal - tax;

        const detailsByDate = [...teacherSessions].sort((a, b) =>
          (a.start_at || '').localeCompare(b.start_at || '')
        );

        return {
          id: teacher.id,
          name: teacher.name || 'Unknown',
          count: teacherSessions.length,
          grossTotal: grossTotal || 0,
          tax: tax || 0,
          netPay: netPay || 0,
          details: detailsByDate,
          adjs: teacherAdjs
        };
      })
      .sort((a: { netPay: number; name: string }, b: { netPay: number; name: string }) => b.netPay - a.netPay || a.name.localeCompare(b.name, 'ko'));

      setReportData(calculatedData);
    } catch (error) {
      console.error('Data load error:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, isAdmin, year, month, period]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // 대시보드 합계 데이터
  const stats = {
    totalNet: reportData.reduce((acc, curr) => acc + (curr.netPay || 0), 0),
    totalTax: reportData.reduce((acc, curr) => acc + (curr.tax || 0), 0),
    totalGross: reportData.reduce((acc, curr) => acc + (curr.grossTotal || 0), 0),
    activeCount: reportData.filter(t => t.count > 0 || t.adjs.length > 0).length,
    totalCount: reportData.length
  };

  const downloadImage = async (teacher: ReportTeacher) => {
    const container = document.createElement('div');
    container.style.position = 'absolute'; container.style.left = '-9999px'; container.style.top = '-9999px';
    container.style.width = '500px'; container.style.padding = '40px'; container.style.backgroundColor = '#ffffff';
    container.innerHTML = `
      <div style="border: 2px solid #f0f0f0; border-radius: 24px; padding: 32px; font-family: sans-serif;">
        <h1 style="margin: 0; font-size: 24px; color: #111;">${teacher.name} T 정산 내역</h1>
        <p style="color: #999; font-size: 13px; margin-top: 6px;">${year}년 ${month}월 ${period === 'first' ? '1-15일' : '16-말일'}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
        <div style="margin-bottom: 24px; background: #f8fafc; padding: 20px; border-radius: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-bottom: 8px;"><span>세전 합계</span><span>${(teacher.grossTotal || 0).toLocaleString()}원</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #ef4444; margin-bottom: 12px;"><span>원천징수(3.3%)</span><span>-${(teacher.tax || 0).toLocaleString()}원</span></div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            <span style="font-weight: bold; font-size: 13px; color: #1e293b;">실지급액</span>
            <span style="font-size: 24px; font-weight: 900; color: #2563eb;">${(teacher.netPay || 0).toLocaleString()}원</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    const canvas = await html2canvas(container, { scale: 2 });
    const link = document.createElement('a'); link.href = canvas.toDataURL('image/png');
    link.download = `${teacher.name}_정산서_${year}_${month}.png`; link.click();
    document.body.removeChild(container);
  };

  const addAdjItem = async (teacherId: string) => {
    const target = inputStates[teacherId];
    if (!target?.amount || !target?.reason) return toast.error('금액과 사유를 입력하세요.');
    await supabase.from('settlements').insert({ teacher_id: teacherId, amount: Number(target.amount), reason: target.reason, year, month, period });
    setInputStates({...inputStates, [teacherId]: { amount: '', reason: '' }});
    fetchReport();
  };

  const removeAdjItem = async (adjId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) { await supabase.from('settlements').delete().eq('id', adjId); fetchReport(); }
  };

  if (!isAdmin) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pb-32 pt-10 font-sans">
      
      {/* 상단 헤더 & 필터 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">Payroll</h1>
          <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-[0.3em]">Master Settlement Dashboard</p>
        </div>
        
        <div className="flex bg-white p-2 rounded-3xl shadow-sm border border-slate-100 gap-2 items-center">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="p-2 text-slate-400 outline-none bg-transparent cursor-pointer text-xs font-black uppercase">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}Y</option>)}
          </select>
          <div className="w-[1px] h-3 bg-slate-100 mx-1"></div>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="p-2 text-indigo-600 outline-none bg-transparent cursor-pointer text-xs font-black">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
          <div className="flex bg-slate-50 p-1 rounded-2xl gap-1">
            <button onClick={() => setPeriod('first')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${period === 'first' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>1-15일</button>
            <button onClick={() => setPeriod('second')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${period === 'second' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>16-말일</button>
          </div>
        </div>
      </div>

      {/* [ Image of Monthly Settlement Summary Dashboard ] */}
      {/* 1. 월별 정산 총합 대시보드 (Total Summary) */}
      <section className="mb-10 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 rounded-[32px] p-8 text-white shadow-2xl md:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={80}/></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><CreditCard size={14}/> Total Net Payout</p>
          <p className="text-4xl font-black italic text-blue-400 tracking-tighter">
            {(stats.totalNet || 0).toLocaleString()}
            <span className="text-sm ml-2 not-italic text-white opacity-40">KRW</span>
          </p>
          <div className="mt-6 flex items-center gap-4 text-[11px] font-black text-slate-400">
            <span className="flex items-center gap-1.5"><Users size={12}/> {stats.activeCount} Active</span>
            <span className="opacity-20">|</span>
            <span>Tax Total: {(stats.totalTax || 0).toLocaleString()}원</span>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Calculator size={14}/> 3.3% Tax</p>
          <p className="text-2xl font-black text-red-500 italic tracking-tighter">
            {(stats.totalTax || 0).toLocaleString()}
            <span className="text-xs ml-1 not-italic text-slate-300">원</span>
          </p>
        </div>
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic text-indigo-600">Total Gross</p>
          <p className="text-2xl font-black text-slate-800 italic tracking-tighter">
            {(stats.totalGross || 0).toLocaleString()}
            <span className="text-xs ml-1 not-italic text-slate-300">원</span>
          </p>
        </div>
      </section>

      {/* 2. 강사별 정산 리스트 (0원 포함) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {reportData.map((teacher: ReportTeacher) => (
          <div key={teacher.id} className="group flex flex-col gap-2">
            <div 
              onClick={() => setExpandedTeacher(expandedTeacher === teacher.id ? null : teacher.id)} 
              className={`bg-white rounded-[28px] border p-5 flex justify-between items-center transition-all cursor-pointer shadow-sm ${
                expandedTeacher === teacher.id ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-50 hover:border-indigo-100'
              } ${teacher.netPay === 0 ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${teacher.netPay > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {teacher.name.slice(0, 1)}
                </div>
                <div className="font-black">
                  <h3 className="text-[15px] text-slate-900 leading-tight">{teacher.name} T</h3>
                  <p className="text-[9px] text-slate-300 uppercase tracking-widest">{teacher.count} Sessions</p>
                </div>
              </div>
              <div className="text-right font-black">
                <p className={`text-xl italic tracking-tighter ${teacher.netPay > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                  {(teacher.netPay || 0).toLocaleString()}<span className="text-[10px] ml-1 not-italic">원</span>
                </p>
              </div>
            </div>

            {expandedTeacher === teacher.id && (
              <div className="bg-white rounded-[32px] border-2 border-indigo-600 p-6 space-y-6 animate-in fade-in slide-in-from-top-2 shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                  <div className="flex gap-4 font-black text-[10px] text-slate-400 uppercase">
                    <span>Gross: {(teacher.grossTotal || 0).toLocaleString()}원</span>
                    <span className="text-red-400">Tax: {(teacher.tax || 0).toLocaleString()}원</span>
                  </div>
                  <button onClick={() => downloadImage(teacher)} className="text-[9px] font-black px-4 py-2 border border-slate-200 rounded-full hover:bg-black hover:text-white transition-all flex items-center gap-2"><Download size={12}/> RECEIPT</button>
                </div>

                <div className="bg-slate-50 p-4 rounded-3xl space-y-2">
                  <div className="flex gap-2">
                    <input type="number" placeholder="금액" value={inputStates[teacher.id]?.amount || ''} onChange={(e) => setInputStates({...inputStates, [teacher.id]: {...inputStates[teacher.id], amount: e.target.value}})} className="w-24 bg-white rounded-xl p-3 text-xs font-black outline-none border border-slate-100" />
                    <input type="text" placeholder="기타 정산 사유" value={inputStates[teacher.id]?.reason || ''} onChange={(e) => setInputStates({...inputStates, [teacher.id]: {...inputStates[teacher.id], reason: e.target.value}})} className="flex-1 bg-white rounded-xl p-3 text-xs font-black outline-none border border-slate-100" />
                  </div>
                  <button onClick={() => addAdjItem(teacher.id)} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-xs font-black hover:bg-black transition-all">정산 항목 추가</button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2 mb-2"><History size={10} className="inline mr-1"/> Activity Details</p>
                  {teacher.details.map((s: SessionRow) => {
                    let fee = 0;
                    if (String(s.created_by) === String(teacher.id)) fee = Number(s.price) || 0;
                    else { try { const extras = JSON.parse(s.students_text!.split('EXTRA_TEACHERS:')[1].trim()) as ExtraTeacher[]; fee = Number(extras.find((ex) => String(ex.id) === String(teacher.id))?.price) || 0; } catch { /* ignore */ } }
                    return (
                      <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl text-[11px] font-black group-hover:bg-white transition-colors">
                        <span className="text-slate-300 italic">{(s.start_at || '').slice(8, 10)}일</span>
                        <span className="flex-1 text-slate-700 truncate mx-4">{s.title}</span>
                        <span className="text-slate-900">{(fee || 0).toLocaleString()}원</span>
                      </div>
                    );
                  })}
                  {teacher.adjs.map((a: SettlementRow) => (
                    <div key={a.id} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl text-[11px] font-black text-indigo-600 border border-indigo-100/20">
                      <span className="flex-1 truncate mx-2">[기타] {a.reason}</span>
                      <div className="flex items-center gap-3">
                        <span>{(a.amount ?? 0) > 0 ? '+' : ''}{(Number(a.amount ?? 0)).toLocaleString()}원</span>
                        <button onClick={() => removeAdjItem(a.id)} className="text-red-300 hover:text-red-500 transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                  {teacher.count === 0 && teacher.adjs.length === 0 && (
                    <div className="py-10 text-center text-slate-200 text-[9px] font-black uppercase italic">No activity record for this period</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 p-6 bg-blue-50/50 rounded-3xl border border-blue-100/30 flex items-start gap-4">
        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><Info size={16}/></div>
        <div>
          <h4 className="text-xs font-black text-blue-900 uppercase tracking-tight mb-1">Settlement Policy Notice</h4>
          <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
            모든 강사료는 프리랜서 사업소득(3.3%) 원천징수 후 지급됩니다. 활동이 없는 강사님도 누락 방지를 위해 명단에 포함되어 있으며, 최종 지급액이 0원인 경우 별도의 명세서가 발행되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}