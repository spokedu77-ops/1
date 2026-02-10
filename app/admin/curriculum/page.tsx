'use client';

import { useState, useMemo, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { 
  Instagram, Plus, Sparkles, X, Calendar, MoreHorizontal, Edit2, Trash2, 
  CheckSquare, Box, ListOrdered, Play, AlertCircle
} from 'lucide-react';

const MONTHLY_THEMES: { [key: number]: { title: string; desc: string } } = {
  3: { title: '새로운 시작과 적응', desc: '친구들과 친해지고 규칙을 익히는 시기입니다.' },
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const WEEKS = [1, 2, 3, 4];

interface CurriculumItem {
  id: number;
  type?: string;
  title?: string;
  url?: string;
  month?: number;
  week?: number;
  expertTip?: string;
  checkList?: string[];
  equipment?: string[];
  steps?: string[];
  [key: string]: unknown;
}

export default function AdminCurriculumPage() {
  const currentMonth = new Date().getMonth() + 1;
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CurriculumItem | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [newPost, setNewPost] = useState({ 
    title: '', url: '', month: currentMonth, week: 1, 
    expertTip: '', checkListText: '', equipmentText: '', stepsText: '' 
  });

  const fetchItems = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('curriculum')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('Error fetching curriculum:', error);
    } else if (data) {
      const formattedData = data.map((item: any) => ({
        ...item,
        expertTip: item.expert_tip,
        checkList: item.check_list,
        equipment: item.equipment,
        steps: item.steps
      }));
      setItems(formattedData);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when supabase ready; fetchItems stable
  }, [supabase]);

  const filteredItems = useMemo(() => {
    return items.filter((item: CurriculumItem) => item.month === selectedMonth && item.week === selectedWeek);
  }, [items, selectedMonth, selectedWeek]);

  const currentTheme = MONTHLY_THEMES[selectedMonth] || { 
    title: `${selectedMonth}월 집중 교육 목표`, 
    desc: '스포키듀와 함께 건강한 에너지를 발산해보세요!' 
  };

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getSafeThumbnailUrl = (item: { url?: string; thumbnail?: string }) => {
    const id = getYouTubeId(item.url ?? '');
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    if (item.thumbnail?.includes('img.youtube.com')) {
      if (item.thumbnail.includes('vi/null')) return '';
      return item.thumbnail.replace('maxresdefault', 'hqdefault');
    }
    return item.thumbnail ?? '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const videoId = getYouTubeId(newPost.url);
    const isInsta = newPost.url.includes('instagram.com');
    const type = isInsta ? 'instagram' : 'youtube';
    
    const checkList = newPost.checkListText.split('\n').filter((t: string) => t.trim() !== '');
    const equipment = newPost.equipmentText.split('\n').filter((t: string) => t.trim() !== '');
    const steps = newPost.stepsText.split('\n').filter((t: string) => t.trim() !== '');

    const postData = {
      title: newPost.title, 
      url: newPost.url, 
      month: newPost.month, 
      week: newPost.week, 
      expert_tip: newPost.expertTip,
      check_list: checkList, 
      equipment: equipment, 
      steps: steps, 
      type,
      thumbnail: isInsta ? '' : (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '')
    };
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from('curriculum')
          .update(postData)
          .eq('id', editingId);

        if (error) throw error;
        alert('수정되었습니다.');
      } else {
        const { error } = await supabase
          .from('curriculum')
          .insert([postData]);

        if (error) throw error;
        alert('등록되었습니다.');
      }
      
      await fetchItems();
      closeInputModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('저장 중 오류 발생: ' + msg);
    }
  };

  const deleteItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase || !confirm('정말 삭제하시겠습니까? (복구 불가)')) return;
    try {
      // .select()를 추가하여 실제로 삭제된 행이 있는지 확인
      const { data, error } = await supabase
          .from('curriculum')
          .delete()
          .eq('id', id)
          .select();

      if (error) throw error;

      // data 배열이 비어있다면 DB 권한(RLS) 문제로 실제 삭제가 안 된 것임
      if (!data || data.length === 0) {
        alert('삭제되지 않았습니다. Supabase의 RLS(Delete) 정책을 확인해주세요.');
        return;
      }

      // 실제 삭제가 확인된 경우에만 UI 업데이트
      setItems(prev => prev.filter((item: CurriculumItem) => item.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('삭제 실패: ' + msg);
    }
  };

  const openEditModal = (item: CurriculumItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setNewPost({ 
      title: item.title, 
      url: item.url, 
      month: item.month, 
      week: item.week, 
      expertTip: item.expertTip || '',
      checkListText: item.checkList ? item.checkList.join('\n') : '',
      equipmentText: item.equipment ? item.equipment.join('\n') : '',
      stepsText: item.steps ? item.steps.join('\n') : ''
    });
    setIsInputModalOpen(true);
  };

  const openDetailModal = (item: CurriculumItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const closeInputModal = () => {
    setIsInputModalOpen(false);
    setEditingId(null);
    setNewPost({ title: '', url: '', month: selectedMonth, week: selectedWeek, expertTip: '', checkListText: '', equipmentText: '', stepsText: '' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] text-slate-900 w-full">
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.025em; box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        button, select, [onClick] { cursor: pointer !important; }
      `}</style>
      
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-center pt-[env(safe-area-inset-top,0px)]">
         <div className="max-w-4xl w-full flex items-center justify-between min-w-0">
             <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">S</div>
                 <div>
                     <p className="text-[10px] font-bold text-indigo-600 leading-tight">SPOKEDU ARCHIVE</p>
                     <h1 className="text-sm font-black text-slate-900 leading-tight">연간 커리큘럼 관리자</h1>
                 </div>
             </div>
             <div className="flex items-center gap-4">
                 <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase">Admin</span>
                 <MoreHorizontal size={20} className="text-slate-400" />
             </div>
         </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
         {isLoading ? (
           <div className="flex flex-col items-center justify-center py-24 gap-4">
             <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
             <p className="text-sm font-bold text-slate-400">커리큘럼 불러오는 중...</p>
           </div>
         ) : (
         <div className="space-y-6 w-full text-left min-w-0">
             <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2 w-full">
                 {MONTHS.map((m: number) => (
                     <button key={m} onClick={() => setSelectedMonth(m)}
                         className={`min-h-[48px] sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all border font-black text-sm sm:text-base touch-manipulation
                         ${selectedMonth === m ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}
                     >
                         {m}월
                     </button>
                 ))}
             </div>

             <div className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                 <Sparkles size={120} className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4" />
                 <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2 opacity-90 text-[10px] font-bold uppercase">
                         <Calendar size={14} /> {selectedMonth}월 집중 교육 목표
                     </div>
                     <h2 className="text-2xl md:text-3xl font-black mb-2">{currentTheme.title}</h2>
                     <p className="text-indigo-100 font-medium text-sm md:text-base">{currentTheme.desc}</p>
                 </div>
             </div>

             <div className="w-full flex bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
                 {WEEKS.map((w: number) => (
                     <button key={w} onClick={() => setSelectedWeek(w)}
                         className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
                         ${selectedWeek === w ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                         {w}주차
                     </button>
                 ))}
             </div>

             <div className="w-full">
                 {filteredItems.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {filteredItems.map((item: CurriculumItem) => (
                             <div key={item.id} className="group bg-white rounded-[28px] border border-slate-100 overflow-hidden hover:shadow-xl transition-all relative cursor-pointer" onClick={() => openDetailModal(item)}>
                                 <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={(e) => openEditModal(item, e)} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-600 hover:text-indigo-600 shadow-sm"><Edit2 size={16}/></button>
                                     <button onClick={(e) => deleteItem(item.id, e)} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-600 hover:text-red-600 shadow-sm"><Trash2 size={16}/></button>
                                 </div>
                                 <div className="relative aspect-video bg-slate-100">
                                     {item.type === 'instagram' ? (
                                         <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex flex-col items-center justify-center text-white p-6">
                                             <Instagram size={48} className="mb-2 opacity-80" />
                                             <span className="text-[10px] font-black tracking-widest uppercase opacity-80">Instagram Reels</span>
                                         </div>
                                     ) : (
                                         <img src={getSafeThumbnailUrl(item) || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'} className="w-full h-full object-cover" alt="" />
                                     )}
                                     <div className="absolute top-4 left-4">
                                         <span className={`px-2 py-1 rounded text-[10px] font-black text-white uppercase ${item.type === 'youtube' ? 'bg-red-600' : 'bg-purple-600'}`}>{item.type}</span>
                                     </div>
                                     <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
                                         <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                             <Play size={20} className="fill-slate-900 text-slate-900 ml-1"/>
                                         </div>
                                     </div>
                                 </div>
                                 <div className="p-6 space-y-3">
                                     <h4 className="text-lg font-black line-clamp-1">{item.title}</h4>
                                     <div className="bg-slate-50 p-4 rounded-2xl flex gap-2 items-start">
                                         <AlertCircle size={14} className="text-slate-400 mt-1 flex-shrink-0" />
                                         <p className="text-xs text-slate-500 font-bold leading-relaxed line-clamp-3">{item.expertTip}</p>
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <div className="w-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-black">
                         해당 주차에 등록된 커리큘럼이 없습니다.
                     </div>
                 )}
             </div>
         </div>
         )}
      </main>

      <button className="fixed bottom-8 right-8 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 shadow-slate-900/40" onClick={() => {
        setNewPost({ title: '', url: '', month: selectedMonth, week: selectedWeek, expertTip: '', checkListText: '', equipmentText: '', stepsText: '' });
        setIsInputModalOpen(true);
      }}>
        <Plus size={32} />
      </button>

      {isDetailModalOpen && selectedItem && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} />
             <div className="relative bg-[#1A1A1A] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                 <div className="relative w-full aspect-video bg-black">
                     {selectedItem.type === 'youtube' && getYouTubeId(selectedItem.url) ? (
                         <iframe 
                             src={`https://www.youtube.com/embed/${getYouTubeId(selectedItem.url)}?autoplay=1`} 
                             className="w-full h-full" 
                             allow="autoplay; encrypted-media" 
                             allowFullScreen 
                         />
                     ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-white">
                             <Instagram size={64} className="mb-4" />
                             <a href={selectedItem.url} target="_blank" className="bg-white text-black px-6 py-3 rounded-full font-bold">인스타그램에서 보기</a>
                         </div>
                     )}
                     <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-all"><X size={20}/></button>
                 </div>
                 
                 <div className="p-8 space-y-8 overflow-y-auto no-scrollbar bg-[#2C2C2C] text-white">
                     <div>
                         <h2 className="text-2xl font-black mb-2">{selectedItem.title}</h2>
                         <p className="text-slate-400 text-sm font-bold">{selectedItem.month}월 {selectedItem.week}주차 커리큘럼</p>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
                             <div className="flex items-center gap-2 mb-4 text-green-400 font-black text-sm uppercase">
                                 <CheckSquare size={16} /> 사전 체크리스트
                             </div>
                             <ul className="space-y-3">
                                 {selectedItem.checkList && selectedItem.checkList.length > 0 ? selectedItem.checkList.map((check: string, i: number) => (
                                     <li key={i} className="flex gap-3 items-start text-sm font-bold text-slate-200">
                                         <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-500 accent-green-500 bg-transparent" readOnly checked />
                                         <span className="leading-relaxed">{check}</span>
                                     </li>
                                 )) : <li className="text-slate-500 text-sm">등록된 체크리스트가 없습니다.</li>}
                             </ul>
                         </div>
                         <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
                             <div className="flex items-center gap-2 mb-4 text-orange-400 font-black text-sm uppercase">
                                 <Box size={16} /> 필요 교구 List
                             </div>
                             <ul className="space-y-3">
                                 {selectedItem.equipment && selectedItem.equipment.length > 0 ? selectedItem.equipment.map((eq: string, i: number) => (
                                     <li key={i} className="flex gap-3 items-start text-sm font-bold text-slate-200">
                                         <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                                         <span className="leading-relaxed">{eq}</span>
                                     </li>
                                 )) : <li className="text-slate-500 text-sm">등록된 교구가 없습니다.</li>}
                             </ul>
                         </div>
                     </div>

                     <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
                         <div className="flex items-center gap-2 mb-4 text-blue-400 font-black text-sm uppercase">
                             <ListOrdered size={16} /> 활동 방법
                         </div>
                         <ol className="space-y-4 text-left">
                              {selectedItem.steps && selectedItem.steps.length > 0 ? selectedItem.steps.map((step: string, i: number) => (
                                  <li key={i} className="flex gap-4 items-start text-left">
                                      <span className="w-6 h-6 bg-slate-700 text-slate-300 rounded flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{i+1}</span>
                                      <p className="text-sm font-bold text-slate-200 leading-relaxed text-left">{step}</p>
                                  </li>
                              )) : <li className="text-slate-500 text-sm">등록된 활동 방법이 없습니다.</li>}
                         </ol>
                     </div>

                     <div className="bg-indigo-900/30 p-6 rounded-2xl border border-indigo-500/30 text-left">
                         <div className="flex items-center gap-2 mb-2 text-indigo-400 font-black text-xs uppercase text-left">
                             <Sparkles size={14} /> Expert Tip
                         </div>
                         <p className="text-indigo-100 font-bold text-sm leading-relaxed whitespace-pre-wrap text-left">
                             {selectedItem.expertTip || "등록된 팁이 없습니다."}
                         </p>
                     </div>
                 </div>
             </div>
         </div>
      )}
      
      {isInputModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeInputModal} />
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar text-left">
            <div className="flex justify-between items-center text-left">
              <h2 className="text-2xl font-black">{editingId ? '커리큘럼 수정' : '새 커리큘럼 등록'}</h2>
              <X className="text-slate-400 cursor-pointer" onClick={closeInputModal} />
            </div>
            
            <div className="space-y-4 font-bold text-left">
              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-slate-400 uppercase text-left">Title</label>
                <input required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" placeholder="수업 제목" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Month</label>
                  <select className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={newPost.month} onChange={e => setNewPost({...newPost, month: Number(e.target.value)})}>
                    {MONTHS.map((m: number) => <option key={m} value={m}>{m}월</option>)}
                  </select>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Week</label>
                  <select className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={newPost.week} onChange={e => setNewPost({...newPost, week: Number(e.target.value)})}>
                    {WEEKS.map((w: number) => <option key={w} value={w}>{w}주차</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">URL (YouTube / Shorts)</label>
                  <input required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" placeholder="유튜브 영상 또는 쇼츠 링크" value={newPost.url} onChange={e => setNewPost({...newPost, url: e.target.value})} />
              </div>

              <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Checklist (엔터로 구분)</label>
                  <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none text-sm" placeholder="예: 2인 1조 구성&#13;&#10;후프 배치" value={newPost.checkListText} onChange={e => setNewPost({...newPost, checkListText: e.target.value})} />
              </div>

              <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Equipment (엔터로 구분)</label>
                  <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none text-sm" placeholder="예: 후프 2개&#13;&#10;공 1개" value={newPost.equipmentText} onChange={e => setNewPost({...newPost, equipmentText: e.target.value})} />
              </div>

              <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Activity Steps (엔터로 구분)</label>
                  <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-32 resize-none text-sm" placeholder="1. 준비 자세&#13;&#10;2. 이동 방법&#13;&#10;3. 마무리" value={newPost.stepsText} onChange={e => setNewPost({...newPost, stepsText: e.target.value})} />
              </div>

              <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Expert Tip</label>
                  <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none" placeholder="간단한 팁" value={newPost.expertTip} onChange={e => setNewPost({...newPost, expertTip: e.target.value})} />
              </div>
            </div>
            
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-600 transition-all text-center">{editingId ? '수정 내용 저장' : '등록 완료'}</button>
          </form>
        </div>
      )}
    </div>
  );
}