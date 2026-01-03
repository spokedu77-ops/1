'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Pin, ChevronDown, RefreshCw, Layout, ChevronRight, Package } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Notice {
  id: number;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
}

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  must: { label: '필독', color: 'bg-rose-50 text-rose-600 border-rose-100' },
  general: { label: '일반', color: 'bg-slate-50 text-slate-600 border-slate-100' },
  event: { label: '이벤트', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
};

export default function TeacherMainPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices((data as Notice[]) ?? []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  return (
    <div className="px-6 pt-8 pb-32">
      {/* 웰컴 배너 및 퀵 버튼 */}
      <section className="mb-10">
        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-6 leading-tight">
              선생님, 오늘도<br />아이들과 즐겁게 몰입하세요!
            </h2>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => router.push('/teacher/my-classes')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                오늘 스케줄 <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => router.push('/teacher/inventory')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Package size={16} /> 교구 목록
              </button>
            </div>
          </div>
          <Layout className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12 pointer-events-none" />
        </div>
      </section>

      {/* 공지사항 섹션 */}
      <section className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6 px-1">
          <h3 className="text-xl font-black text-slate-900">공지사항</h3>
          <button 
            onClick={fetchNotices} 
            className={`p-2 cursor-pointer hover:bg-slate-100 rounded-full transition-all ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={18} className="text-slate-400" />
          </button>
        </div>

        {/* 공지사항 스크롤 영역: 한 화면에 가득 차지 않게 조정 */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {loading ? (
             <div className="py-20 text-center flex flex-col items-center bg-white rounded-[32px] border border-slate-50">
                <div className="w-8 h-8 border-2 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 text-xs font-bold">로딩 중...</p>
             </div>
          ) : notices.length > 0 ? (
              notices.map((notice) => {
                const category = CATEGORY_MAP[notice.category] ?? CATEGORY_MAP.general;
                const isExpanded = expandedId === notice.id;

                return (
                  <div key={notice.id} className={`bg-white rounded-[28px] transition-all duration-300 border overflow-hidden shadow-sm hover:border-indigo-100
                      ${isExpanded ? 'border-indigo-200 ring-4 ring-indigo-500/5' : 'border-slate-100'}
                      ${notice.is_pinned && !isExpanded ? 'bg-rose-50/30 border-rose-100' : ''}
                    `}
                  >
                    <div 
                      className="p-6 cursor-pointer flex flex-col" 
                      onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                    >
                      <div className="flex items-center gap-2 mb-3 pointer-events-none">
                        {notice.is_pinned && <Pin size={12} className="text-rose-500 fill-rose-500" />}
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${category.color}`}>{category.label}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(notice.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-4 pointer-events-none">
                        <h3 className={`text-[15px] font-black leading-tight flex-1 ${isExpanded ? 'text-indigo-600' : 'text-slate-800'}`}>
                          {notice.title}
                        </h3>
                        <ChevronDown size={18} className={`text-slate-300 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="text-[14px] text-slate-600 font-medium leading-relaxed whitespace-pre-wrap bg-slate-50 p-5 rounded-[20px] border border-slate-100 break-all select-text">
                          {notice.content}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            <div className="py-20 text-center bg-white rounded-[32px] border border-slate-50">
              <p className="text-slate-300 text-sm font-bold">등록된 공지사항이 없습니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}