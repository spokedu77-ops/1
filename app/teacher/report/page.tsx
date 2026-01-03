'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TeacherReportPage() {
  const [loading, setLoading] = useState(true);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [reportInfo, setReportInfo] = useState<any>(null);

  useEffect(() => {
    const fetchMyReport = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('settlement_reports')
          .select('*')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          setReportInfo(data);
          setReportUrl(data.image_url);
        }
      } catch (error) {
        console.error('리포트 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyReport();
  }, []);

  return (
    // 상위 TeacherLayout이 배경색과 중앙 정렬을 담당하므로 내부 컨텐츠에 집중
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      
      {/* 1. 페이지 헤더 */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">My Payroll</h1>
        <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">강사 정산 명세서 조회</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading Report...</p>
        </div>
      ) : reportUrl ? (
        <div className="space-y-6">
          {/* 2. 명세서 이미지 카드 */}
          <div className="bg-white rounded-[32px] shadow-xl shadow-indigo-100/50 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Settlement Period</span>
                <span className="text-sm font-black text-slate-700">
                  {reportInfo.year}년 {reportInfo.month}월 {reportInfo.period === 'first' ? '1-15일' : '16-말일'}
                </span>
              </div>
              <a 
                href={reportUrl} 
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-black bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-slate-900 transition-all uppercase tracking-widest shadow-lg shadow-indigo-100"
              >
                View Full Image
              </a>
            </div>
            
            {/* 이미지 영역 */}
            <div className="p-4 bg-white">
              <img 
                src={reportUrl} 
                alt="정산 명세서" 
                className="w-full h-auto rounded-2xl border border-slate-50"
              />
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50">
            <p className="text-[11px] text-indigo-700 font-bold leading-relaxed">
              * 명세서 내용에 이의가 있거나 정산 금액이 실제 수업 횟수와 다를 경우, 채팅을 통해 운영진에게 즉시 문의해 주세요.
            </p>
          </div>
        </div>
      ) : (
        /* 리포트가 없을 때 */
        <div className="bg-white rounded-[32px] p-20 text-center border border-slate-100 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Receipt size={24} className="text-slate-200" />
          </div>
          <p className="text-slate-300 font-black italic text-lg uppercase tracking-tighter">No Report Found</p>
          <p className="text-slate-400 text-[11px] font-bold mt-1">아직 확정된 이번 기수 정산 내역이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

// Lucide 아이콘 보정용 (만약 Receipt 아이콘이 필요하다면 아래 추가)
function Receipt({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/>
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
      <path d="M12 17.5V6.5"/>
    </svg>
  );
}