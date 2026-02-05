'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { Plus, Trash2, X, Pin, ChevronDown, RefreshCw, Edit3 } from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: '전체' },
  { id: 'must', label: '필독', color: 'bg-rose-50 text-rose-600 border-rose-100' },
  { id: 'general', label: '일반', color: 'bg-slate-50 text-slate-600 border-slate-100' },
  { id: 'event', label: '이벤트', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
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
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('ALL');

  const [form, setForm] = useState({
    title: '', content: '', category: 'general', is_pinned: false
  });

  const fetchNotices = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) setNotices(data as Notice[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const handleSave = async () => {
    if (!supabase || !form.title.trim() || !form.content.trim()) return alert('제목과 내용을 입력해주세요.');

    try {
      if (editingId) {
        const { error } = await supabase
          .from('notices')
          .update({
            title: form.title,
            content: form.content,
            category: form.category,
            is_pinned: form.is_pinned,
          })
          .eq('id', editingId);
        if (error) throw error;
        alert('수정되었습니다.');
      } else {
        const { error } = await supabase
          .from('notices')
          .insert([{ ...form, author: '운영진', created_at: new Date().toISOString() }]);
        if (error) throw error;
        alert('등록되었습니다.');
      }

      setIsModalOpen(false);
      setEditingId(null);
      setForm({ title: '', content: '', category: 'general', is_pinned: false });
      fetchNotices();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('저장 실패: ' + msg);
    }
  };

  const openEdit = (notice: Notice, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(notice.id);
    setForm({
      title: notice.title,
      content: notice.content,
      category: notice.category,
      is_pinned: notice.is_pinned
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase || !confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (!error) setNotices(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F9FBFF] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] text-slate-900 w-full font-sans overflow-x-hidden text-left">
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.02em; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-center pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-2xl w-full flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate">공지사항</h1>
            <div className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0">Admin</div>
          </div>
          <button onClick={() => fetchNotices()} className={`min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-slate-100 transition-all flex items-center justify-center touch-manipulation ${loading ? 'animate-spin' : ''}`}>
            <RefreshCw size={18} className="text-slate-400" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setActiveTab(cat.id)}
              className={`min-h-[44px] px-5 py-2.5 rounded-full text-sm font-bold transition-all border shrink-0 touch-manipulation
                ${activeTab === cat.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>
        
        <div className="space-y-4">
          {loading ? (
             <div className="py-32 text-center flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold">불러오는 중...</p>
             </div>
          ) : notices.filter(n => activeTab === 'ALL' || n.category === activeTab).map((notice) => {
              const categoryStyle = CATEGORIES.find(c => c.id === notice.category) || CATEGORIES[2];
              const isExpanded = expandedId === notice.id;

              return (
                <div key={notice.id} className={`bg-white rounded-[28px] transition-all duration-300 border overflow-hidden
                    ${isExpanded ? 'border-indigo-200 shadow-xl shadow-indigo-500/5' : 'border-slate-100 hover:border-slate-200 shadow-sm'}
                    ${notice.is_pinned && !isExpanded ? 'bg-rose-50/20 border-rose-100' : ''}
                  `}
                >
                  <div className="p-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : notice.id)}>
                    <div className="flex items-center gap-2 mb-3">
                      {notice.is_pinned && <Pin size={14} className="text-rose-500 fill-rose-500" />}
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${categoryStyle.color}`}>{categoryStyle.label}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{new Date(notice.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <h3 className={`text-lg font-black leading-tight flex-1 ${isExpanded ? 'text-indigo-600' : 'text-slate-800'}`}>{notice.title}</h3>
                      <ChevronDown size={20} className={`text-slate-300 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`} />
                    </div>
                  </div>

                  <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 space-y-4">
                      {/* 내용 잘림 방지: max-h와 overflow-y-auto 적용 */}
                      <div className="text-[15px] text-slate-600 font-medium leading-relaxed whitespace-pre-wrap bg-slate-50 p-6 rounded-[20px] border border-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar break-all">
                        {notice.content}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={(e) => openEdit(notice, e)} className="min-h-[44px] flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 text-xs font-bold px-4 py-2 hover:bg-indigo-50 rounded-full transition-all touch-manipulation">
                          <Edit3 size={14} /> 수정
                        </button>
                        <button onClick={(e) => handleDelete(notice.id, e)} className="min-h-[44px] flex items-center gap-1.5 text-slate-500 hover:text-rose-600 text-xs font-bold px-4 py-2 hover:bg-rose-50 rounded-full transition-all touch-manipulation">
                          <Trash2 size={14} /> 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
          })}
        </div>
      </main>

      <button onClick={() => { setEditingId(null); setForm({ title: '', content: '', category: 'general', is_pinned: false }); setIsModalOpen(true); }}
        className="fixed bottom-6 right-4 sm:bottom-10 sm:right-10 w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50 touch-manipulation"
        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Plus size={28} className="sm:w-8 sm:h-8" />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6 sm:mb-8 text-left">
              <div>
                <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">{editingId ? 'Edit' : 'New'} Notice</p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">공지 {editingId ? '수정' : '작성'}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="min-h-[44px] min-w-[44px] p-2 bg-slate-100 rounded-full text-slate-500 flex items-center justify-center touch-manipulation"><X size={20} /></button>
            </div>

            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Category</label>
                <div className="flex gap-2">
                  {CATEGORIES.filter(c => c.id !== 'ALL').map((cat) => (
                    <button key={cat.id} onClick={() => setForm({ ...form, category: cat.id })}
                      className={`flex-1 min-h-[48px] py-3 rounded-2xl text-sm font-bold border transition-all touch-manipulation
                        ${form.category === cat.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100'}
                      `}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <input className="w-full min-h-[48px] bg-slate-50 border-none p-4 rounded-2xl outline-none font-bold text-base sm:text-sm text-slate-800 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all touch-manipulation"
                  placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <textarea className="w-full min-h-[160px] bg-slate-50 border-none p-4 rounded-2xl outline-none h-40 resize-none font-medium text-base sm:text-sm text-slate-700 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all leading-relaxed touch-manipulation"
                  placeholder="내용을 입력하세요..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>

              <div className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border
                  ${form.is_pinned ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}
                `}
                onClick={() => setForm({ ...form, is_pinned: !form.is_pinned })}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${form.is_pinned ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Pin size={16} fill={form.is_pinned ? "currentColor" : "none"} />
                  </div>
                  <span className={`text-sm font-black ${form.is_pinned ? 'text-rose-600' : 'text-slate-600'}`}>상단 고정 (필독)</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${form.is_pinned ? 'bg-rose-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${form.is_pinned ? 'left-6' : 'left-1'}`} />
                </div>
              </div>

              <button onClick={handleSave} className="w-full min-h-[52px] bg-indigo-600 text-white py-5 rounded-[24px] font-black text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all touch-manipulation">
                {editingId ? '수정 내용 저장' : '공지사항 게시하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}