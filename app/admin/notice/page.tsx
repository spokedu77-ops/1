'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Megaphone, Plus, Trash2, X, Pin, 
  ChevronDown, ChevronUp, BellRing, CheckCircle2, AlertCircle 
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
  author?: string;
}

export default function NoticePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  // Form State
  const [newNotice, setNewNotice] = useState({
    title: '', content: '', category: 'general', is_pinned: false
  });

  // 1. 공지사항 불러오기
  const fetchNotices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false }) // 고정 공지 우선
      .order('created_at', { ascending: false }); // 최신순

    if (error) {
      console.error("Error fetching notices:", error);
      alert("공지사항을 불러오지 못했습니다.");
    } else if (data) {
      setNotices(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // 2. 저장 로직 (Error Handling 추가)
  const handleSave = async () => {
    if (!newNotice.title.trim() || !newNotice.content.trim()) return alert('제목과 내용을 입력해주세요.');

    try {
      const { error } = await supabase
        .from('notices')
        .insert([{
          title: newNotice.title,
          content: newNotice.content,
          category: newNotice.category,
          is_pinned: newNotice.is_pinned,
          author: '운영진', 
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // 성공 시 처리
      alert('공지사항이 등록되었습니다.');
      setIsModalOpen(false);
      setNewNotice({ title: '', content: '', category: 'general', is_pinned: false });
      fetchNotices(); // 목록 새로고침

    } catch (e: any) {
      console.error("Save Error:", e);
      alert('저장 실패: ' + e.message);
    }
  };

  // 3. 삭제 로직
  const handleDelete = async (id: number) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;
    
    try {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) throw error;
      setNotices(prev => prev.filter(n => n.id !== id));
    } catch (e: any) {
      alert('삭제 실패: ' + e.message);
    }
  };

  // --- Helper: 필터링 로직 ---
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

      {/* 1. 헤더 (심플 & 모던) */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-16 flex items-center justify-center transition-all">
        <div className="max-w-3xl w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">공지사항</h1>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md">Admin</span>
          </div>
          <button onClick={() => fetchNotices()} className="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-50">
             <span className="text-xs font-bold">새로고침</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        
        {/* 2. 탭 필터 (Tab Filter) - Toss Style */}
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
              const categoryStyle = CATEGORIES.find(c => c.id === notice.category) || CATEGORIES[2]; // Default general
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
                      <div className="mt-3 flex justify-end">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(notice.id); }}
                          className="flex items-center gap-1.5 text-slate-400 hover:text-rose-600 text-xs font-bold px-3 py-2 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} /> 삭제
                        </button>
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

      {/* 4. 글쓰기 버튼 (Floating Action Button) */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl shadow-slate-400/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 cursor-pointer group"
      >
        <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* 5. 글쓰기 모달 (Clean & Focused) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-[520px] rounded-[32px] p-8 shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200">
            
            {/* 모달 헤더 */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="text-indigo-600 text-xs font-black tracking-widest uppercase mb-1 block">New Notice</span>
                <h2 className="text-2xl font-black text-slate-900">공지사항 작성</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* 카테고리 선택 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">카테고리</label>
                <div className="flex gap-2">
                  {CATEGORIES.filter(c => c.id !== 'ALL').map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setNewNotice({ ...newNotice, category: cat.id })}
                      className={`
                        flex-1 py-3.5 rounded-2xl text-sm font-bold border transition-all cursor-pointer relative overflow-hidden
                        ${newNotice.category === cat.id 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                          : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                        }
                      `}
                    >
                      {newNotice.category === cat.id && <CheckCircle2 size={14} className="absolute top-3 right-3 text-white/30" />}
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 입력 폼 */}
              <div className="space-y-4">
                <div>
                   <input 
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl outline-none font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-text"
                    placeholder="제목을 입력하세요"
                    value={newNotice.title}
                    onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  />
                </div>
                <div>
                  <textarea 
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl outline-none h-48 resize-none text-sm font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-text leading-relaxed"
                    placeholder="공지 내용을 자세히 작성해주세요..."
                    value={newNotice.content}
                    onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                  />
                </div>
              </div>

              {/* 상단 고정 옵션 */}
              <div 
                className={`
                  flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border
                  ${newNotice.is_pinned ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100 hover:border-slate-200'}
                `}
                onClick={() => setNewNotice({ ...newNotice, is_pinned: !newNotice.is_pinned })}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${newNotice.is_pinned ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  <Pin size={14} fill={newNotice.is_pinned ? "currentColor" : "none"} />
                </div>
                <div className="flex-1">
                   <p className={`text-sm font-bold ${newNotice.is_pinned ? 'text-rose-600' : 'text-slate-600'}`}>상단 고정 (필독 공지)</p>
                   {newNotice.is_pinned && <p className="text-[10px] text-rose-400 font-medium">이 공지는 목록 최상단에 강조되어 표시됩니다.</p>}
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${newNotice.is_pinned ? 'bg-rose-500' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${newNotice.is_pinned ? 'translate-x-6' : ''}`} />
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 cursor-pointer mt-4"
              >
                공지사항 등록하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}