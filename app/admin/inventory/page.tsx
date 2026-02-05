'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Trash2, X, Package, ChevronDown, 
  UserCircle2, Check, Image as ImageIcon, CheckSquare, ListOrdered, History, ExternalLink, Menu
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const renderTextWithLinks = (text: string) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300 inline-flex items-center gap-0.5 break-all cursor-pointer z-[100] relative" onClick={(e) => e.stopPropagation()}>
          {part} <ExternalLink size={10} />
        </a>
      );
    }
    return part;
  });
};

interface CatalogItem { id?: number; name?: string; category?: string; image?: string; simple_desc?: string; key_points?: string; usage_examples?: string; [key: string]: unknown }
interface TeacherBasic { id: string; name?: string; [key: string]: unknown }
interface InventoryItem { id?: number; name?: string; quantity?: number; category?: string; image?: string; simple_desc?: string; key_points?: string; usage_examples?: string; [key: string]: unknown }

export default function AdminInventoryPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherBasic[]>([]);
  const [teacherInventory, setTeacherInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherBasic | null>(null);
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null);
  const [catalogForm, setCatalogForm] = useState({ name: '', category: '', image: '', simple_desc: '', key_points: '', usage_examples: '' });
  const [tempQuantities, setTempQuantities] = useState<{[key: number]: string}>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const fetchCatalog = useCallback(async () => {
    const { data } = await supabase.from('catalog').select('*').order('created_at', { ascending: false });
    if (data) setCatalog(data);
  }, []);

  const fetchTeachers = useCallback(async () => {
    const { data } = await supabase.from('users').select('id, name, role, is_active').eq('is_active', true).order('name');
    if (data) setTeachers(data);
  }, []);

  const fetchTeacherData = useCallback(async (userId: string) => {
    const { data: invData } = await supabase.from('inventory').select('*').eq('user_id', userId).order('name', { ascending: true });
    const { data: logData } = await supabase.from('inventory_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    
    if (invData) {
      setTeacherInventory(invData);
      const qtyMap: {[key: number]: string} = {};
      invData.forEach(item => qtyMap[item.id] = item.quantity.toString());
      setTempQuantities(qtyMap);
    }
    if (logData) setLogs(logData);
  }, []);

  useEffect(() => {
    void fetchCatalog();
    void fetchTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only init
  }, []);

  const filteredTeachers = useMemo(() => 
    teachers.filter(t => t.name.includes(searchQuery)),
    [teachers, searchQuery]
  );

  const addLog = async (userId: string, content: string, type: 'in' | 'out' | 'info' = 'info') => {
    await supabase.from('inventory_logs').insert([{ user_id: userId, content, type }]);
    const { data } = await supabase.from('inventory_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (data) setLogs(data);
  };

  const openCatalogModal = (item: CatalogItem | null = null) => {
    if (item) {
      setEditingCatalogId(item.id);
      setCatalogForm({ name: item.name, category: item.category, image: item.image || '', simple_desc: item.simple_desc || '', key_points: item.key_points || '', usage_examples: item.usage_examples || '' });
    } else {
      setEditingCatalogId(null);
      setCatalogForm({ name: '', category: '', image: '', simple_desc: '', key_points: '', usage_examples: '' });
    }
    setIsCatalogModalOpen(true);
    setIsMobileSidebarOpen(false);
  };

  const handleSelectTeacher = (teacher: TeacherBasic) => {
    setSelectedTeacher(teacher);
    setIsTeacherDropdownOpen(false);
    fetchTeacherData(teacher.id);
  };

  const processAddItem = async (item: InventoryItem) => {
    if (!selectedTeacher) return;
    const existing = teacherInventory.find(i => i.name === item.name);
    const now = new Date().toISOString();

    if (existing) {
      const newQty = (existing.quantity || 0) + 1;
      await supabase.from('inventory').update({ quantity: newQty, updated_at: now }).eq('id', existing.id);
      await addLog(selectedTeacher.id, `${item.name} 1개 추가 배부 (합계: ${newQty}개)`, 'in');
    } else {
      await supabase.from('inventory').insert([{
        user_id: selectedTeacher.id,
        name: item.name,
        quantity: 1,
        category: item.category,
        image: item.image,
        simple_desc: item.simple_desc,
        key_points: item.key_points,
        usage_examples: item.usage_examples,
        updated_at: now
      }]);
      await addLog(selectedTeacher.id, `${item.name} 1개 신규 배부`, 'in');
    }
    fetchTeacherData(selectedTeacher.id);
  };

  const handleDragStart = (e: React.DragEvent, item: InventoryItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (!selectedTeacher) return alert('선생님을 먼저 선택해주세요.');
    const dataJson = e.dataTransfer.getData('application/json');
    if (!dataJson) return;
    try {
      const draggedItem = JSON.parse(dataJson);
      await processAddItem(draggedItem);
    } catch {
      alert('데이터 처리에 실패했습니다.');
    }
  };

  const handleDirectAdd = async (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    if (!selectedTeacher) return alert('선생님을 먼저 선택해주세요.');
    await processAddItem(item);
  };

  const handleReturnAll = async (item: InventoryItem) => {
    if (confirm(`${item.name} 전량을 반납(목록 삭제)하시겠습니까?`)) {
      await supabase.from('inventory').delete().eq('id', item.id);
      await addLog(selectedTeacher.id, `${item.name} 전량 반납 완료`, 'out');
      fetchTeacherData(selectedTeacher.id);
    } else {
      setTempQuantities(prev => ({ ...prev, [item.id]: item.quantity.toString() }));
    }
  };

  const commitQuantity = async (item: InventoryItem) => {
    const val = tempQuantities[item.id];
    const newQty = parseInt(val);
    if (isNaN(newQty) || newQty < 0) return alert('올바른 숫자를 입력하세요.');
    if (newQty === item.quantity) return;
    if (newQty === 0) return handleReturnAll(item);

    const diff = newQty - item.quantity;
    await supabase.from('inventory').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', item.id);
    await addLog(selectedTeacher.id, `${item.name} 수량 변경 (${item.quantity} -> ${newQty})`, diff > 0 ? 'in' : 'out');
    fetchTeacherData(selectedTeacher.id);
  };

  const handleSaveCatalog = async () => {
    if(!catalogForm.name) return alert('교구명을 입력하세요');
    if (editingCatalogId) {
      await supabase.from('catalog').update(catalogForm).eq('id', editingCatalogId);
    } else {
      await supabase.from('catalog').insert([catalogForm]);
    }
    await fetchCatalog();
    setIsCatalogModalOpen(false);
  };

  const handleDeleteCatalog = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if(confirm('마스터 DB에서 삭제하시겠습니까?')) {
      await supabase.from('catalog').delete().eq('id', id);
      await fetchCatalog();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCatalogForm({ ...catalogForm, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-900 relative">
      
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-[110] md:hidden backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* 사이드바 최적화: 닫혔을 때 잔상이 헤더를 침범하지 않도록 함 */}
      <aside className={`
        fixed md:relative top-0 left-0 h-full bg-white border-r border-slate-200 flex flex-col shrink-0 z-[120] shadow-xl md:shadow-sm transition-all duration-300 overflow-hidden
        ${isMobileSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 w-0 md:w-64'}
      `}>
        <div className="flex flex-col h-full w-72 md:w-64">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 h-16">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="text-indigo-600 shrink-0" size={20} /> 
              <h2 className="text-xs font-black text-slate-900 whitespace-nowrap">교구 리스트</h2>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => openCatalogModal()} className="p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg text-indigo-600 cursor-pointer">
                <Plus size={16} />
              </button>
              <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-slate-50/50">
            {catalog.map((item) => (
              <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item)} onClick={() => openCatalogModal(item)} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-md cursor-grab transition-all group relative">
                <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={14} className="text-slate-300"/>}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="text-[12px] font-bold text-slate-700 truncate">{item.name}</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{item.category}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => handleDirectAdd(e, item)} className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg border border-indigo-100 cursor-pointer transition-colors">
                    <Plus size={14} />
                  </button>
                  <div className="w-0 overflow-hidden group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={(e) => handleDeleteCatalog(e, item.id)} className="p-1.5 bg-white text-slate-300 hover:text-red-500 rounded-lg border border-slate-100 cursor-pointer ml-1"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col h-full relative transition-colors ${isDraggingOver ? 'bg-indigo-50' : 'bg-[#F8FAFC]'}`} onDragOver={(e) => { e.preventDefault(); if (selectedTeacher) setIsDraggingOver(true); }} onDragLeave={() => setIsDraggingOver(false)} onDrop={handleDrop}>
        
        {/* 헤더: 사이드바가 닫혔을 때 절대 가려지지 않도록 로직 보호 */}
        <header className="h-16 px-4 flex items-center justify-between sticky top-0 z-[100] bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {!isMobileSidebarOpen && (
              <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer">
                <Menu size={20} />
              </button>
            )}
            
            <div className="flex flex-col text-left shrink-0">
              <p className="text-[10px] font-black text-indigo-600 leading-none tracking-tighter uppercase">SPOKEDU</p>
              <h1 className="text-[11px] font-black text-slate-900 leading-tight">INVENTORY</h1>
            </div>

            <div className="relative z-[150] w-40 sm:w-60 ml-2">
              <button onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white transition-all cursor-pointer w-full overflow-hidden">
                <UserCircle2 size={16} className={`shrink-0 ${selectedTeacher ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">{selectedTeacher ? selectedTeacher.name : '강사 선택'}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              {isTeacherDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden max-h-96 overflow-y-auto z-[200] p-2">
                  <input type="text" placeholder="검색..." className="w-full bg-slate-50 px-3 py-2 rounded-lg text-xs font-bold outline-none border border-slate-100 mb-2" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onClick={e => e.stopPropagation()} />
                  {filteredTeachers.map(t => (
                    <div key={t.id} onClick={() => handleSelectTeacher(t)} className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer flex items-center justify-between rounded-lg">
                      <span className="text-sm font-bold text-slate-700">{t.name}</span>
                      {selectedTeacher?.id === t.id && <Check size={14} className="text-indigo-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button onClick={() => openCatalogModal()} className="md:hidden p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg cursor-pointer">
            <Plus size={18} />
          </button>
        </header>

        {/* 인벤토리 목록 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
          {!selectedTeacher ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
              <UserCircle2 size={60} strokeWidth={1} className="opacity-20 mb-4" />
              <h2 className="text-lg font-bold">강사를 선택해 주세요</h2>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6 pb-20">
              {teacherInventory.map((item) => (
                <div key={item.id} onClick={() => setDetailItem(item)} className="bg-white rounded-[24px] md:rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 cursor-pointer">
                  <div className="h-40 md:h-44 relative overflow-hidden bg-slate-100 flex items-center justify-center">
                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-slate-300"/>}
                    <div className="absolute top-3 left-3 md:top-4 md:left-4"><span className="bg-black/60 text-white text-[9px] font-black px-2 py-1 rounded-full backdrop-blur-md uppercase tracking-wider">{item.category}</span></div>
                    <button onClick={(e) => { e.stopPropagation(); handleReturnAll(item); }} className="absolute top-3 right-3 md:top-4 md:right-4 bg-white/20 hover:bg-rose-600 text-white p-2 rounded-full backdrop-blur-md transition-all cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                  <div className="p-4 md:p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg md:text-xl font-black text-slate-800 mb-3 md:mb-4 truncate leading-tight text-left">{item.name}</h3>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-50 rounded-2xl p-1 md:p-1.5 border border-slate-100 shadow-inner">
                            <input 
                                type="number" className="w-full bg-transparent text-center font-black text-xl md:text-2xl text-slate-800 outline-none" 
                                value={tempQuantities[item.id] || ''}
                                onChange={(e) => setTempQuantities({ ...tempQuantities, [item.id]: e.target.value })}
                            />
                        </div>
                        {tempQuantities[item.id] !== (item.quantity?.toString() || '0') && (
                            <button onClick={() => commitQuantity(item)} className="bg-indigo-600 text-white p-3 md:p-3.5 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all animate-in zoom-in-50 cursor-pointer"><Check size={18} strokeWidth={3} /></button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 히스토리 패널 */}
        {selectedTeacher && (
            <div className="h-32 md:h-48 border-t border-slate-200 bg-white flex flex-col shrink-0 z-[90]">
                <div className="px-4 md:px-6 py-2 md:py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                    <History size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">활동 히스토리</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1 md:space-y-2 custom-scrollbar">
                    {logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between gap-3 text-xs md:text-sm group">
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-slate-400 text-[9px] font-bold whitespace-nowrap">
                                    {new Date(log.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`font-bold ${log.type === 'in' ? 'text-indigo-600' : log.type === 'out' ? 'text-rose-500' : 'text-slate-700'}`}>
                                    {log.content}
                                </span>
                            </div>
                            <button onClick={async () => { if(confirm("로그를 삭제하시겠습니까?")) { await supabase.from('inventory_logs').delete().eq('id', log.id); setLogs(prev => prev.filter(l => l.id !== log.id)); } }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1 cursor-pointer transition-opacity"><X size={12}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>

      {/* 교구 상세 모달: 사진/포인트/활용방법 유지 */}
      {detailItem && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in" onClick={() => setDetailItem(null)}>
          <div className="w-full max-w-md bg-[#121212] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 text-white border border-slate-800 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 md:p-8 pb-4 md:pb-6 border-b border-slate-800 flex gap-4 md:gap-6 items-center shrink-0 text-left">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[16px] md:rounded-[20px] bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {detailItem.image ? <img src={detailItem.image} alt="" className="w-full h-full object-cover" /> : <Package size={28} className="text-slate-600"/>}
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[9px] md:text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">{detailItem.category}</span>
                    <h2 className="text-2xl md:text-3xl font-black mt-1 leading-none truncate">{detailItem.name}</h2>
                    <p className="text-xs md:text-sm text-slate-400 mt-2 line-clamp-2">{detailItem.simple_desc}</p>
                </div>
            </div>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar flex-1 text-left">
                <div className="bg-[#1a1a1a] p-4 md:p-5 rounded-2xl border border-slate-800">
                    <h4 className="text-[10px] md:text-[11px] font-black text-emerald-400 uppercase mb-2 md:mb-3 flex items-center gap-2"><CheckSquare size={14} /> 핵심 포인트</h4>
                    <p className="text-sm md:text-[15px] font-bold text-slate-200 whitespace-pre-line leading-relaxed">{detailItem.key_points}</p>
                </div>
                <div>
                    <h4 className="text-[10px] md:text-[11px] font-black text-blue-400 uppercase mb-3 md:mb-4 flex items-center gap-2"><ListOrdered size={14} /> 활용 방법</h4>
                    <div className="space-y-3 md:space-y-4">
                        {detailItem.usage_examples?.split('\n').map((line: string, i: number) => (
                            <div key={i} className="flex gap-3 md:gap-4 items-start">
                                <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-lg bg-blue-900/30 text-blue-400 text-[10px] md:text-xs font-black flex items-center justify-center mt-0.5">{i+1}</span>
                                <p className="text-sm md:text-[15px] text-slate-300 font-bold leading-snug break-all">{renderTextWithLinks(line)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-4 md:p-6 bg-black/50 border-t border-slate-800 shrink-0">
                <button onClick={() => setDetailItem(null)} className="w-full py-3 md:py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-slate-200 transition-all cursor-pointer">확인 완료</button>
            </div>
          </div>
        </div>
      )}

      {/* [핵심 복구] 카탈로그 등록/수정 모달: 사진 업로드 및 모든 필드 복구 */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-2 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsCatalogModalOpen(false)}>
          <div className="bg-white w-full max-w-xl rounded-[24px] md:rounded-[40px] p-6 md:p-10 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[95vh] custom-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-black text-slate-900">{editingCatalogId ? '교구 정보 수정' : '새 마스터 교구 등록'}</h3>
              <button onClick={() => setIsCatalogModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer"><X size={20}/></button>
            </div>
            <div className="space-y-4 md:space-y-6 text-left">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">교구명</label><input className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-black border-none outline-none focus:ring-2 focus:ring-indigo-500" value={catalogForm.name} onChange={e => setCatalogForm({...catalogForm, name: e.target.value})} /></div>
                    <div className="sm:w-1/3"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">카테고리</label><input className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-black border-none outline-none focus:ring-2 focus:ring-indigo-500" value={catalogForm.category} onChange={e => setCatalogForm({...catalogForm, category: e.target.value})} /></div>
                </div>

                {/* 이미지 업로드 영역 복구 */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">이미지 업로드</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <label className="w-full sm:flex-1 flex flex-col items-center justify-center p-6 md:p-8 bg-slate-50 border-2 border-dashed rounded-3xl cursor-pointer hover:bg-slate-100 transition-colors">
                            <ImageIcon className="text-slate-300 mb-2" size={32} />
                            <span className="text-xs font-bold text-slate-400">파일 선택</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 border border-slate-100">
                            {catalogForm.image ? <img src={catalogForm.image} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-slate-300">Preview</span>}
                        </div>
                    </div>
                </div>

                {/* 상세 설명 필드 복구 */}
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">한 줄 설명</label><input className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={catalogForm.simple_desc} onChange={e => setCatalogForm({...catalogForm, simple_desc: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">핵심 포인트</label><textarea className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold h-20 md:h-24 outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none" value={catalogForm.key_points} onChange={e => setCatalogForm({...catalogForm, key_points: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">활용 방법 (링크 가능)</label><textarea className="w-full p-3 md:p-4 bg-slate-50 rounded-2xl font-bold h-32 md:h-40 outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none" value={catalogForm.usage_examples} onChange={e => setCatalogForm({...catalogForm, usage_examples: e.target.value})} /></div>
                
                <button onClick={handleSaveCatalog} className="w-full py-4 md:py-5 bg-indigo-600 text-white rounded-[20px] md:rounded-[28px] font-black text-base md:text-lg hover:bg-indigo-700 transition-all cursor-pointer shadow-lg shadow-indigo-200">마스터 데이터 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}