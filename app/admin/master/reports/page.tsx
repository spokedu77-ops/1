'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import html2canvas from 'html2canvas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UltimateSettlementPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[]>([]);
  const [inputStates, setInputStates] = useState<any>({});

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  
  const [year, setYear] = useState(currentYear < 2025 ? 2025 : currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [period, setPeriod] = useState(currentDay >= 16 ? 'second' : 'first');

  useEffect(() => {
    const checkMaster = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== 'choijihoon@spokedu.com') {
        router.replace('/admin'); 
        return;
      }
      setIsAdmin(true);
    };
    checkMaster();
  }, [router]);

  const fetchReport = async () => {
    if (!isAdmin) return; 
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
        .select('*')
        .eq('status', 'finished')
        .gte('start_at', `${startDate}T00:00:00`)
        .lte('start_at', `${endDate}T23:59:59`);

      const { data: dbAdjs } = await supabase
        .from('settlements')
        .select('*')
        .eq('year', year).eq('month', month).eq('period', period);

      const calculatedData = (teachers || []).map((teacher: any) => {
        const teacherSessions = (sessions || []).filter(s => {
          const isMain = String(s.created_by) === String(teacher.id);
          let isExtra = false;
          
          if (s.students_text && s.students_text.includes('EXTRA_TEACHERS:')) {
            try {
              const parts = s.students_text.split('EXTRA_TEACHERS:');
              const jsonStr = parts[1].trim();
              const extras = JSON.parse(jsonStr);
              if (Array.isArray(extras)) {
                isExtra = extras.some((ex: any) => String(ex.id) === String(teacher.id));
              }
            } catch (e) {}
          }
          return isMain || isExtra;
        }).sort((a, b) => a.start_at.localeCompare(b.start_at));

        const sessionsTotal = teacherSessions.reduce((acc, cur) => {
          let amount = 0;
          if (String(cur.created_by) === String(teacher.id)) {
            amount = Number(cur.price) || 0;
          } else {
            try {
              const parts = cur.students_text.split('EXTRA_TEACHERS:');
              const jsonStr = parts[1].trim();
              const extras = JSON.parse(jsonStr);
              const myInfo = extras.find((ex: any) => String(ex.id) === String(teacher.id));
              amount = Number(myInfo?.price) || 0;
            } catch (e) {}
          }
          return acc + amount;
        }, 0);
        
        const teacherAdjs = dbAdjs?.filter(a => a.teacher_id === teacher.id) || [];
        const adjTotal = teacherAdjs.reduce((acc, cur) => acc + Number(cur.amount), 0);
        
        return {
          id: teacher.id,
          name: teacher.name,
          count: teacherSessions.length,
          sessionsTotal,
          finalPay: sessionsTotal + adjTotal,
          details: teacherSessions,
          adjs: teacherAdjs
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

      setReportData(calculatedData);
    } catch (error) {
      console.error('Data load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (isAdmin) fetchReport(); 
  }, [year, month, period, isAdmin]);

  const downloadImage = async (teacher: any) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '500px';
    container.style.padding = '40px';
    container.style.backgroundColor = '#ffffff';
    container.innerHTML = `
      <div style="border: 2px solid #f0f0f0; border-radius: 24px; padding: 32px; font-family: sans-serif;">
        <h1 style="margin: 0; font-size: 24px; color: #111;">${teacher.name} T 명세서</h1>
        <p style="color: #999; font-size: 13px; margin-top: 6px;">${year}년 ${month}월 ${period === 'first' ? '1-15일' : '16-말일'}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
        <div style="text-align: right; margin-bottom: 32px;">
          <p style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: bold;">TOTAL PAYOUT</p>
          <p style="font-size: 36px; font-weight: 900; color: #2563eb; margin: 0;">${teacher.finalPay.toLocaleString()}원</p>
        </div>
        <div style="font-size: 12px; color: #333; margin-bottom: 12px; font-weight: bold; border-left: 4px solid #2563eb; padding-left: 8px;">Breakdown</div>
        ${teacher.details.map((s: any) => {
          let fee = 0;
          if (String(s.created_by) === String(teacher.id)) fee = Number(s.price) || 0;
          else {
            try {
              const extras = JSON.parse(s.students_text.split('EXTRA_TEACHERS:')[1].trim());
              fee = Number(extras.find((ex: any) => String(ex.id) === String(teacher.id))?.price) || 0;
            } catch (e) {}
          }
          return `
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f8f8f8; font-size: 13px;">
              <span>${s.start_at.slice(8, 10)}일 - ${s.title}</span>
              <span style="font-weight: bold;">${fee.toLocaleString()}원</span>
            </div>
          `;
        }).join('')}
        ${teacher.adjs.map((a: any) => `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f7ff; font-size: 13px; color: #2563eb;">
             <span>[기타] ${a.reason}</span>
             <span style="font-weight: bold;">${a.amount > 0 ? '+' : ''}${a.amount.toLocaleString()}원</span>
          </div>
        `).join('')}
      </div>
      <p style="text-align: center; font-size: 11px; color: #bbb; margin-top: 24px; font-weight: bold;">SPOKEDU ADMIN SYSTEM</p>
    `;
    document.body.appendChild(container);
    const canvas = await html2canvas(container, { scale: 2 });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${teacher.name}_명세서_${year}_${month}.png`;
    link.click();
    document.body.removeChild(container);
  };

  const addAdjItem = async (teacherId: string) => {
    const target = inputStates[teacherId];
    if (!target?.amount || !target?.reason) return alert('금액과 사유를 입력하세요.');
    await supabase.from('settlements').insert({
      teacher_id: teacherId, amount: Number(target.amount), reason: target.reason, year, month, period
    });
    setInputStates({...inputStates, [teacherId]: { amount: '', reason: '' }});
    fetchReport();
  };

  const removeAdjItem = async (adjId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await supabase.from('settlements').delete().eq('id', adjId);
      fetchReport();
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 pt-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter uppercase">Payroll</h1>
          <p className="text-blue-500 font-bold text-xs uppercase tracking-widest mt-1">Settlement Management</p>
        </div>
        
        <div className="flex bg-white p-2 rounded-[22px] shadow-sm border border-gray-100 gap-2 font-black items-center">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="p-2 text-gray-400 outline-none bg-transparent cursor-pointer text-sm">
            {Array.from({ length: 6 }, (_, i) => 2025 + i).map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="p-2 text-blue-600 outline-none bg-transparent cursor-pointer text-sm">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
          <div className="flex bg-gray-50 p-1 rounded-xl ml-1 min-w-[140px]">
            <button onClick={() => setPeriod('first')} className={`flex-1 px-3 py-2 rounded-lg text-[11px] cursor-pointer transition-all font-black whitespace-nowrap ${period === 'first' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>1-15일</button>
            <button onClick={() => setPeriod('second')} className={`flex-1 px-3 py-2 rounded-lg text-[11px] cursor-pointer transition-all font-black whitespace-nowrap ${period === 'second' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>16-말일</button>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black rounded-[28px] p-6 text-white shadow-lg">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Total Payout</p>
          <p className="text-3xl font-black italic text-blue-400 tracking-tighter">
            {reportData.reduce((acc: any, curr: any) => acc + (curr.finalPay || 0), 0).toLocaleString()}
            <span className="text-sm ml-1 font-bold not-italic text-white">원</span>
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Total Teachers</p>
          <p className="text-3xl font-black text-gray-800 italic tracking-tighter">{reportData.length}<span className="text-sm ml-1 font-bold not-italic text-gray-400">명</span></p>
        </div>
        <div className="hidden md:flex bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm flex-col justify-center items-end text-right">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">SPOKEDU ADMIN</p>
          <p className="text-[10px] font-black text-gray-300 uppercase mt-1">Management Insight</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start pb-20">
        {reportData.map((teacher: any) => (
          <div key={teacher.id} className="flex flex-col gap-3">
            <div 
              onClick={() => setExpandedTeacher(expandedTeacher === teacher.id ? null : teacher.id)}
              className={`bg-white rounded-[32px] border transition-all cursor-pointer p-6 shadow-sm hover:shadow-md flex justify-between items-center ${
                expandedTeacher === teacher.id ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-100'
              }`}
            >
              <div className="min-w-0 pr-4 font-black">
                <h3 className="text-lg text-gray-800 tracking-tight truncate">{teacher.name} 선생님</h3>
                <p className="text-[10px] text-gray-300 uppercase mt-1 tracking-widest">{teacher.count} Sessions</p>
              </div>
              <div className="text-right shrink-0 font-black">
                <p className="text-[9px] text-gray-300 uppercase mb-1 tracking-tighter">Final Payout</p>
                <p className="text-2xl text-blue-600 italic tracking-tighter">
                  {teacher.finalPay.toLocaleString()}<span className="text-sm ml-1 not-italic">원</span>
                </p>
              </div>
            </div>

            {expandedTeacher === teacher.id && (
              <div className="bg-white rounded-[32px] border-2 border-blue-500 shadow-2xl p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Management</span>
                  <button onClick={() => downloadImage(teacher)} className="text-[10px] font-black text-gray-400 border border-gray-200 px-4 py-2 rounded-full hover:bg-black hover:text-white transition-all uppercase tracking-widest">Receipt</button>
                </div>

                <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-[26px]">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="number" step="1000" placeholder="금액" value={inputStates[teacher.id]?.amount || ''} onChange={(e) => setInputStates({...inputStates, [teacher.id]: {...inputStates[teacher.id], amount: e.target.value}})} className="w-full sm:w-28 bg-white rounded-xl p-3.5 text-sm font-black outline-none border border-gray-100 shrink-0" />
                    <input type="text" placeholder="기타 정산 사유" value={inputStates[teacher.id]?.reason || ''} onChange={(e) => setInputStates({...inputStates, [teacher.id]: {...inputStates[teacher.id], reason: e.target.value}})} className="flex-1 bg-white rounded-xl p-3.5 text-sm font-black outline-none border border-gray-100 min-w-0" />
                  </div>
                  <button onClick={() => addAdjItem(teacher.id)} className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-sm font-black hover:bg-black transition-all shadow-lg shadow-blue-100">항목 추가</button>
                </div>

                <div className="space-y-3 min-w-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2 italic text-blue-500">Breakdown List (날짜순)</p>
                  <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {teacher.details.map((s: any) => {
                       let fee = 0;
                       if (String(s.created_by) === String(teacher.id)) fee = Number(s.price) || 0;
                       else {
                         try {
                           const extras = JSON.parse(s.students_text.split('EXTRA_TEACHERS:')[1].trim());
                           fee = Number(extras.find((ex: any) => String(ex.id) === String(teacher.id))?.price) || 0;
                         } catch (e) {}
                       }
                       return (
                        <div key={s.id} className="flex justify-between items-center p-4 bg-gray-50/30 rounded-2xl text-[13px] font-bold gap-3 overflow-hidden">
                          <span className="text-gray-400 font-mono w-10 italic shrink-0">{s.start_at.slice(8, 10)}일</span>
                          <span className="flex-1 text-gray-700 truncate block">{s.title}</span>
                          <span className="text-gray-900 font-black shrink-0">
                            {fee.toLocaleString()}원
                          </span>
                        </div>
                       );
                    })}
                    {teacher.adjs.map((a: any) => (
                      <div key={a.id} className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-blue-50/30 rounded-2xl text-[13px] font-black text-blue-600 border border-blue-100/20 gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-blue-300 italic font-mono text-[10px] shrink-0 mt-0.5 uppercase">기타</span>
                          <span className="text-blue-800 break-all leading-tight">{a.reason}</span>
                        </div>
                        <div className="flex items-center justify-end gap-4 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-blue-100/30 pt-2 sm:pt-0">
                          <span className="whitespace-nowrap">{a.amount > 0 ? '+' : ''}{a.amount.toLocaleString()}원</span>
                          <button onClick={() => removeAdjItem(a.id)} className="text-red-300 hover:text-red-500 cursor-pointer text-lg p-1">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}