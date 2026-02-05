'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { 
  Package, Search, Loader2, 
  Image as ImageIcon, CheckSquare, ListOrdered, Calendar, History, ExternalLink, UserCircle2
} from 'lucide-react';

// URL 링크 변환 헬퍼
const renderTextWithLinks = (text: string) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300 inline-flex items-center gap-0.5 break-all cursor-pointer z-50 relative" onClick={(e) => e.stopPropagation()}>
          {part} <ExternalLink size={10} />
        </a>
      );
    }
    return part;
  });
};

export default function TeacherInventoryPage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [inventory, setInventory] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailItem, setDetailItem] = useState<any>(null);

  const fetchMyData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    
    // 1. 현재 로그인한 유저 확인 (쿠키 세션 사용)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('로그인이 필요합니다.');
      setLoading(false);
      return;
    }

    // 2. 유저 이름 가져오기
    const { data: userData } = await supabase.from('users').select('name').eq('id', user.id).single();
    if (userData) setUserName(userData.name);

    // 3. 내 교구 리스트 가져오기
    const { data: invData } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    // 4. 내 활동 로그 가져오기
    const { data: logData } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (invData) setInventory(invData);
    if (logData) setLogs(logData);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only data fetch */
    void fetchMyData();
  }, [fetchMyData]);

  // 검색 필터링
  const filteredInventory = inventory.filter(item => 
    (item.name ?? '').includes(searchQuery) || (item.category ?? '').includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      
      {/* --- Header --- */}
      <header className="h-16 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                <UserCircle2 size={20} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">My Inventory</p>
                <h1 className="text-sm font-black text-slate-800">{userName ? `${userName} 선생님` : '선생님'}</h1>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                    type="text" 
                    placeholder="교구 검색..." 
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all w-48"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-lg shadow-slate-200">
                Total: {inventory.length}
            </div>
        </div>
      </header>

      {/* --- Main Grid (Scrollable) --- */}
      <main className="flex-1 overflow-y-auto p-6 min-h-0 bg-[#F8FAFC]">
        {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <p className="text-xs font-bold text-slate-400">데이터를 불러오는 중입니다...</p>
            </div>
        ) : filteredInventory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                <Package size={64} strokeWidth={1} className="mb-4" />
                <p className="text-lg font-black text-slate-400">보유 중인 교구가 없습니다.</p>
                <p className="text-xs font-bold mt-1">관리자에게 교구 배부를 요청하세요.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-20">
                {filteredInventory.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => setDetailItem(item)}
                        className="bg-white rounded-[28px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-slate-200 cursor-pointer group"
                    >
                        {/* Image Section */}
                        <div className="h-40 relative overflow-hidden bg-slate-100 flex items-center justify-center">
                            {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <ImageIcon size={32} className="text-slate-300"/>}
                            <div className="absolute top-3 left-3">
                                <span className="bg-black/60 text-white text-[10px] font-black px-2.5 py-1 rounded-full backdrop-blur-md uppercase tracking-wider shadow-sm">
                                    {item.category}
                                </span>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="p-5">
                            <div className="mb-4">
                                <h3 className="text-lg font-black text-slate-800 truncate leading-tight">{item.name}</h3>
                                <div className="flex items-center gap-1.5 mt-1 text-slate-400 font-bold text-[10px] uppercase tracking-tight">
                                    <Calendar size={12} />
                                    {new Date(item.updated_at).toLocaleDateString()} 수령
                                </div>
                            </div>

                            {/* Read-Only Quantity Display */}
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex justify-between items-center group-hover:border-indigo-100 transition-colors">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">보유 수량</span>
                                <span className="text-2xl font-black text-indigo-600">{item.quantity} <span className="text-sm font-bold text-slate-400">ea</span></span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>

      {/* --- Logs Section (Fixed Bottom) --- */}
      <div className="h-48 border-t border-slate-200 bg-white flex flex-col shrink-0 z-20">
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <History size={16} className="text-slate-400" />
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">나의 활동 히스토리</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[#FAFAFA]">
            {logs.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6 italic">아직 기록된 활동이 없습니다.</p>
            ) : (
                logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm px-2 py-1">
                        <span className="text-slate-400 text-[10px] font-bold mt-0.5 whitespace-nowrap min-w-[70px]">
                            {new Date(log.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`font-bold ${log.type === 'in' ? 'text-indigo-600' : log.type === 'out' ? 'text-rose-500' : 'text-slate-700'}`}>
                            {log.content}
                        </span>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* --- Detail Modal (Same Design as Admin) --- */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in" onClick={() => setDetailItem(null)}>
          <div className="w-full max-w-md bg-[#121212] rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 text-white border border-slate-800" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-8 pb-6 border-b border-slate-800 flex gap-6 items-center">
                <div className="w-20 h-20 rounded-[20px] bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-700">
                    {detailItem.image ? <img src={detailItem.image} className="w-full h-full object-cover" /> : <Package size={32} className="text-slate-600"/>}
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">{detailItem.category}</span>
                    <h2 className="text-3xl font-black mt-1 leading-none">{detailItem.name}</h2>
                    <p className="text-sm text-slate-400 mt-3 font-medium leading-snug">{detailItem.simple_desc || '기본 설명이 등록되지 않았습니다.'}</p>
                </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {/* Key Points */}
                <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-slate-800">
                    <h4 className="text-[11px] font-black text-emerald-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
                        <CheckSquare size={14} /> 핵심 포인트
                    </h4>
                    <p className="text-[15px] font-bold text-slate-200 whitespace-pre-line leading-relaxed">
                        {detailItem.key_points || '등록된 포인트가 없습니다.'}
                    </p>
                </div>

                {/* Usage Examples (Clickable Links) */}
                <div>
                    <h4 className="text-[11px] font-black text-blue-400 uppercase mb-4 flex items-center gap-2 tracking-widest">
                        <ListOrdered size={14} /> 활용 방법
                    </h4>
                    <div className="space-y-4">
                        {detailItem.usage_examples ? detailItem.usage_examples.split('\n').map((line: string, i: number) => (
                            <div key={i} className="flex gap-4 items-start group">
                                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-900/30 text-blue-400 text-xs font-black flex items-center justify-center mt-0.5 border border-blue-800/50 group-hover:bg-blue-600 group-hover:text-white transition-colors">{i+1}</span>
                                <p className="text-[15px] text-slate-300 font-bold leading-snug break-all">
                                    {renderTextWithLinks(line)}
                                </p>
                            </div>
                        )) : (
                            <p className="text-slate-500 text-sm italic pl-2 font-bold">등록된 활용 예시가 없습니다.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-black/50 border-t border-slate-800 flex items-center gap-4">
                <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center min-w-[80px]">
                    <span className="text-[9px] font-black text-slate-500 uppercase">내 수량</span>
                    <span className="text-xl font-black text-white">{detailItem.quantity}</span>
                </div>
                <button 
                    onClick={() => setDetailItem(null)} 
                    className="flex-1 py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-slate-200 transition-all active:scale-[0.98]"
                >
                    확인 완료
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}