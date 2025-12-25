'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Pin, ChevronDown, BellRing, AlertCircle, Megaphone 
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Constants & Types ---
const CATEGORIES = [
  { id: 'ALL', label: '전체' },
  { id: 'must', label: '필독', color: 'bg-rose-100 text-rose-600 border-rose-200' },
  { id: 'general', label: '일반', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { id: 'event', label: '이벤트', color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
];

interface Notice {
  id: number;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
}

export default function TeacherNoticePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('ALL');

  // 1. 공지사항 불러오기
  const fetchNotices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false }) // 고정 공지 우선
      .order('created_at', { ascending: false }); // 최신순

    if (data) setNotices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // 필터링 로직
  const filteredNotices = notices.filter(n => {
    if (activeTab === 'ALL') return true;
    return n.category === activeTab;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-900 w-full font-sans">
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.01em; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      {/* 1. 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-16 flex items-center justify-center transition-all">
        <div className="max-w-3xl w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Megaphone size={20} className="text-indigo-600" /> 공지사항
            </h1>
          </div>
          <div className="bg-slate-100 p-2 rounded-full">
            <BellRing size={18} className="text-slate-400" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        
        {/* 2. 탭 필터 (Tab Filter) */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`
                px-4 py-2 rounded-[14px] text-sm font-bold whitespace-nowrap transition-all cursor-pointer
                ${activeTab === cat.id 
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-200 scale-100' 
                  : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50 hover:text-slate-600'
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>
        
        {/* 3. 공지 리스트 */}
        <div className="space-y-3">
          {loading ? (
             <div className="py-20 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full mx-auto mb-4"></div>
                <p className="text-slate-400 text-sm font-bold">공지사항을 불러오는 중...</p>
             </div>
          ) : filteredNotices.length > 0 ? (
            filteredNotices.map((notice) => {
              const categoryStyle = CATEGORIES.find(c => c.id === notice.category) || CATEGORIES[2];
              const isExpanded = expandedId === notice.id;

              return (
                <div 
                  key={notice.id} 
                  className={`
                    group bg-white rounded-[20px] transition-all overflow-hidden cursor-pointer
                    ${notice.is_pinned 
                      ? 'border-2 border-rose-100 shadow-sm' 
                      : 'border border-slate-100 hover:border-indigo-100 hover:shadow-md'
                    }
                  `}
                  onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                >
                  {/* 카드 헤더 */}
                  <div className={`p-5 flex items-start gap-4 ${notice.is_pinned ? 'bg-rose-50/30' : ''}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {notice.is_pinned && <Pin size={14} className="text-rose-500 fill-rose-500" />}
                        <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-black border ${categoryStyle.color}`}>
                          {categoryStyle.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(notice.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className={`text-[17px] font-bold leading-snug ${notice.is_pinned ? 'text-slate-900' : 'text-slate-800'}`}>
                        {notice.title}
                      </h3>
                    </div>
                    <div className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-500' : 'group-hover:text-slate-400'}`}>
                      <ChevronDown size={24} />
                    </div>
                  </div>

                  {/* 카드 내용 (Accordion) */}
                  <div 
                    className={`
                      overflow-hidden transition-all duration-300 ease-in-out
                      ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}
                    `}
                  >
                    <div className="px-5 pb-5">
                      <div className="text-[15px] text-slate-600 font-medium leading-relaxed whitespace-pre-wrap bg-slate-50 p-5 rounded-2xl border border-slate-100/50">
                        {notice.content}
                      </div>
                      <div className="mt-3 text-right">
                         <span className="text-[10px] font-bold text-slate-300">SPOKEDU Official Notice</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-24 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50">
              <AlertCircle size={40} className="text-slate-200 mb-4" />
              <p className="text-slate-400 text-sm font-bold">등록된 공지사항이 없습니다.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}