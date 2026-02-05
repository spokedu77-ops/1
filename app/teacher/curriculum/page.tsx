'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { 
  Instagram, AlertCircle, 
  Sparkles, X, Calendar, MoreHorizontal, 
  CheckSquare, Box, ListOrdered, Play
} from 'lucide-react';

const MONTHLY_THEMES: { [key: number]: { title: string; desc: string } } = {
  3: { title: '새로운 시작과 적응', desc: '친구들과 친해지고 규칙을 익히는 시기입니다.' },
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const WEEKS = [1, 2, 3, 4];

export default function TeacherCurriculumPage() {
 const currentMonth = new Date().getMonth() + 1;
 const [selectedMonth, setSelectedMonth] = useState(currentMonth);
 const [selectedWeek, setSelectedWeek] = useState(1);
 const [items, setItems] = useState<any[]>([]);
 
 // 상세 모달 상태 (입력 모달은 필요 없음)
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [selectedItem, setSelectedItem] = useState<any>(null);

 const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));

 // 데이터 불러오기 (Read Only, 쿠키 세션 사용)
 const fetchItems = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('curriculum')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('Error fetching curriculum:', error);
      return;
    }

    if (data) {
      // DB(snake_case) -> UI(camelCase) 매핑
      const formattedData = data.map(item => ({
        ...item,
        expertTip: item.expert_tip,
        checkList: item.check_list,
        equipment: item.equipment,
        steps: item.steps
      }));
      setItems(formattedData);
    }
 }, [supabase]);

 useEffect(() => {
   /* eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only data fetch */
   void fetchItems();
 }, [fetchItems]);

 const filteredItems = useMemo(() => {
   return items.filter(item => item.month === selectedMonth && item.week === selectedWeek);
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

 const openDetailModal = (item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
 };

 return (
   <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-900 w-full">
     <style>{`
       @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
       * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.025em; box-sizing: border-box; }
       .no-scrollbar::-webkit-scrollbar { display: none; }
       button, select, [onClick] { cursor: pointer !important; }
     `}</style>

     {/* 헤더: Admin -> Teacher 로 텍스트 변경 */}
     <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-16 flex items-center justify-center">
        <div className="max-w-4xl w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">S</div>
                <div>
                    <p className="text-[10px] font-bold text-indigo-600 leading-tight">SPOKEDU ARCHIVE</p>
                    <h1 className="text-sm font-black text-slate-900 leading-tight">연간 커리큘럼</h1>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {/* 뱃지: Teacher */}
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase">Teacher</span>
                <MoreHorizontal size={20} className="text-slate-400" />
            </div>
        </div>
     </header>

     <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6 w-full text-left">
            {/* 월 선택 */}
            <div className="grid grid-cols-6 md:grid-cols-12 gap-2 w-full">
                {MONTHS.map((m) => {
                    const isCurrentMonth = m === currentMonth;
                    const isLocked = m !== currentMonth;
                    const isSelected = selectedMonth === m;
                    
                    return (
                        <button 
                            key={m} 
                            onClick={() => {
                                if (isLocked) {
                                    alert('관리자 권한입니다');
                                    return;
                                }
                                setSelectedMonth(m);
                            }}
                            className={`h-16 rounded-2xl flex items-center justify-center transition-all border font-black relative
                            ${isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 
                              isLocked ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 
                              'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}
                        >
                            {isLocked && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 rounded-2xl">
                                    <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                            <span className={isLocked ? 'opacity-0' : ''}>{m}월</span>
                        </button>
                    );
                })}
            </div>

            {/* 배너 */}
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

            {/* 주차 선택 */}
            <div className="w-full flex bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
                {WEEKS.map((w) => (
                    <button key={w} onClick={() => setSelectedWeek(w)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
                        ${selectedWeek === w ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {w}주차
                    </button>
                ))}
            </div>

            {/* 리스트 (수정/삭제 버튼 제거됨) */}
            <div className="w-full">
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredItems.map((item) => (
                            <div key={item.id} className="group bg-white rounded-[28px] border border-slate-100 overflow-hidden hover:shadow-xl transition-all relative cursor-pointer" onClick={() => openDetailModal(item)}>
                                {/* Edit/Delete 버튼 제거됨 */}
                                <div className="relative aspect-video bg-slate-100">
                                    {item.type === 'instagram' ? (
                                        <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex flex-col items-center justify-center text-white p-6">
                                            <Instagram size={48} className="mb-2 opacity-80" />
                                            <span className="text-[10px] font-black tracking-widest uppercase opacity-80">Instagram Reels</span>
                                        </div>
                                    ) : (
                                        {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail URL */}
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
     </main>

     {/* (+) 버튼 제거됨 */}

     {/* 상세 모달 (읽기 전용) */}
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
                <div className="p-8 space-y-8 overflow-y-auto bg-[#2C2C2C] text-white">
                    <div>
                        <h2 className="text-2xl font-black mb-2">{selectedItem.title}</h2>
                        <p className="text-slate-400 text-sm font-bold">{selectedItem.month}월 {selectedItem.week}주차 커리큘럼</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600">
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
                        <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600">
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
                    <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600">
                        <div className="flex items-center gap-2 mb-4 text-blue-400 font-black text-sm uppercase">
                            <ListOrdered size={16} /> 활동 방법
                        </div>
                        <ol className="space-y-4">
                             {selectedItem.steps && selectedItem.steps.length > 0 ? selectedItem.steps.map((step: string, i: number) => (
                                <li key={i} className="flex gap-4 items-start">
                                    <span className="w-6 h-6 bg-slate-700 text-slate-300 rounded flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{i+1}</span>
                                    <p className="text-sm font-bold text-slate-200 leading-relaxed">{step}</p>
                                </li>
                             )) : <li className="text-slate-500 text-sm">등록된 활동 방법이 없습니다.</li>}
                        </ol>
                    </div>
                    <div className="bg-indigo-900/30 p-6 rounded-2xl border border-indigo-500/30 text-left">
                        <div className="flex items-center gap-2 mb-2 text-indigo-400 font-black text-xs uppercase">
                            <Sparkles size={14} /> Expert Tip
                        </div>
                        <p className="text-indigo-100 font-bold text-sm leading-relaxed whitespace-pre-wrap">
                            {selectedItem.expertTip || "등록된 팁이 없습니다."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
     )}
   </div>
 );
}