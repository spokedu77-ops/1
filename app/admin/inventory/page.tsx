'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Trash2, X, Package, ChevronDown, 
  GripVertical, Loader2, Info, Settings2,
  UserCircle2, Check, ArrowDownToLine, Edit3, Image as ImageIcon, CheckSquare, ListOrdered, Calendar, History, ExternalLink
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const renderTextWithLinks = (text: string) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
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

export default function AdminInventoryPage() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherInventory, setTeacherInventory] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null);
  const [catalogForm, setCatalogForm] = useState({ name: '', category: '', image: '', simple_desc: '', key_points: '', usage_examples: '' });
  const [tempQuantities, setTempQuantities] = useState<{[key: number]: string}>({});

  useEffect(() => {
    fetchCatalog();
    fetchTeachers();
  }, []);

  const fetchCatalog = async () => {
    const { data } = await supabase.from('catalog').select('*').order('created_at', { ascending: false });
    if (data) setCatalog(data);
  };

  const fetchTeachers = async () => {
    const { data } = await supabase.from('users').select('id, name, role').order('name');
    if (data) setTeachers(data);
  };

  const fetchTeacherData = async (userId: string) => {
    setLoading(true);
    const { data: invData } = await supabase.from('inventory').select('*').eq('user_id', userId).order('name', { ascending: true });
    const { data: logData } = await supabase.from('inventory_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    
    if (invData) {
        setTeacherInventory(invData);
        const qtyMap: any = {};
        invData.forEach(item => qtyMap[item.id] = item.quantity.toString());
        setTempQuantities(qtyMap);
    }
    if (logData) setLogs(logData);
    setLoading(false);
  };

  const addLog = async (userId: string, content: string, type: 'in' | 'out' | 'info' = 'info') => {
    const { error } = await supabase.from('inventory_logs').insert([{ user_id: userId, content, type }]);
    if (error) return;
    const { data } = await supabase.from('inventory_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (data) setLogs(data);
  };

  const openCatalogModal = (item: any = null) => {
    if (item) {
        setEditingCatalogId(item.id);
        setCatalogForm({ name: item.name, category: item.category, image: item.image || '', simple_desc: item.simple_desc || '', key_points: item.key_points || '', usage_examples: item.usage_examples || '' });
    } else {
        setEditingCatalogId(null);
        setCatalogForm({ name: '', category: '', image: '', simple_desc: '', key_points: '', usage_examples: '' });
    }
    setIsCatalogModalOpen(true);
  };

  const handleSelectTeacher = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsTeacherDropdownOpen(false);
    fetchTeacherData(teacher.id);
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
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
      const existing = teacherInventory.find(i => i.name === draggedItem.name);
      const now = new Date().toISOString();

      if (existing) {
        const newQty = (existing.quantity || 0) + 1;
        await supabase.from('inventory').update({ quantity: newQty, updated_at: now }).eq('id', existing.id);
        await addLog(selectedTeacher.id, `${draggedItem.name} 1개를 추가 배부했습니다. (합계: ${newQty}개)`, 'in');
      } else {
        await supabase.from('inventory').insert([{
          user_id: selectedTeacher.id,
          name: draggedItem.name,
          quantity: 1,
          category: draggedItem.category,
          image: draggedItem.image,
          simple_desc: draggedItem.simple_desc,
          key_points: draggedItem.key_points,
          usage_examples: draggedItem.usage_examples,
          updated_at: now
        }]);
        await addLog(selectedTeacher.id, `${draggedItem.name} 1개를 신규 배부했습니다.`, 'in');
      }
      fetchTeacherData(selectedTeacher.id);
    } catch (err) {
      alert('데이터 처리에 실패했습니다.');
    }
  };

  const handleReturnAll = async (item: any) => {
    if (confirm(`${item.name} 전량을 반납(목록 삭제)하시겠습니까?`)) {
        await supabase.from('inventory').delete().eq('id', item.id);
        await addLog(selectedTeacher.id, `${item.name} 전량을 반납 받았습니다.`, 'out');
        fetchTeacherData(selectedTeacher.id);
    } else {
        setTempQuantities(prev => ({ ...prev, [item.id]: item.quantity.toString() }));
    }
  };

  const commitQuantity = async (item: any) => {
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
    if (editingCatalogId) await supabase.from('catalog').update(catalogForm).eq('id', editingCatalogId);
    else await supabase.from('catalog').insert([catalogForm]);
    fetchCatalog();
    setIsCatalogModalOpen(false);
  };

  const handleDeleteCatalog = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if(confirm('마스터 DB에서 삭제하시겠습니까?')) {
        await supabase.from('catalog').delete().eq('id', id);
        fetchCatalog();
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

  const filteredTeachers = teachers.filter(t => t.name.includes(searchQuery));

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-900">
      <aside className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-sm transition-all">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-900 flex items-center gap-2 whitespace-nowrap overflow-hidden">
            <Package className="text-indigo-600 shrink-0" size={20} /> 
            <span className="hidden md:block">교구 리스트</span>
          </h2>
          <button onClick={() => openCatalogModal()} className="hidden md:block p-1 bg-slate-50 hover:bg-indigo-50 rounded text-indigo-600 cursor-pointer"><Plus size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-slate-50/50">
          {catalog.map((item) => (
            <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item)} onClick={() => openCatalogModal(item)} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-md cursor-grab transition-all group relative">
              <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={14} className="text-slate-300"/>}
              </div>
              <div className="flex-1 min-w-0 hidden md:block">
                <h3 className="text-[12px] font-bold text-slate-700 truncate">{item.name}</h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">{item.category}</span>
              </div>
              <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                 <button onClick={(e) => handleDeleteCatalog(e, item.id)} className="p-1.5 bg-white text-slate-300 hover:text-red-500 rounded-lg border border-slate-100"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className={`flex-1 flex flex-col h-full relative transition-colors ${isDraggingOver ? 'bg-indigo-50' : 'bg-[#F8FAFC]'}`} onDragOver={(e) => { e.preventDefault(); if (selectedTeacher) setIsDraggingOver(true); }} onDragLeave={() => setIsDraggingOver(false)} onDrop={handleDrop}>
        <header className="h-16 px-6 flex items-center justify-between sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shrink-0">
          <div className="relative z-50">
            <button onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)} className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:shadow-md cursor-pointer min-w-[240px]">
              <UserCircle2 size={20} className={selectedTeacher ? 'text-indigo-600' : 'text-slate-400'} />
              <div className="text-left flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-xs">선생님 리스트</p>
                <p className="text-sm font-black text-slate-800">{selectedTeacher ? selectedTeacher.name : '선생님 선택'}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {isTeacherDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden max-h-96 overflow-y-auto z-50 p-2 animate-in fade-in slide-in-from-top-2 bg-white">
                <input type="text" placeholder="이름 검색..." className="w-full bg-slate-50 px-3 py-2 rounded-lg text-xs font-bold outline-none border border-slate-100 mb-2" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onClick={e => e.stopPropagation()} />
                {filteredTeachers.map(t => (
                  <div key={t.id} onClick={() => handleSelectTeacher(t)} className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer flex items-center justify-between rounded-lg">
                    <span className="text-sm font-bold text-slate-700">{t.name}</span>
                    {selectedTeacher?.id === t.id && <Check size={14} className="text-indigo-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedTeacher && <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Kit: <span className="text-indigo-600 text-sm ml-1">{teacherInventory.length}</span></div>}
        </header>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {!selectedTeacher ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
              <UserCircle2 size={80} strokeWidth={1} className="opacity-20 mb-4" />
              <h2 className="text-xl font-bold">강사를 먼저 선택하세요</h2>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
              {teacherInventory.map((item) => (
                <div key={item.id} onClick={() => setDetailItem(item)} className="bg-white rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 cursor-pointer">
                  <div className="h-44 relative overflow-hidden bg-slate-100 flex items-center justify-center">
                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-slate-300"/>}
                    <div className="absolute top-4 left-4"><span className="bg-black/60 text-white text-[10px] font-black px-3 py-1 rounded-full backdrop-blur-md uppercase tracking-wider">{item.category}</span></div>
                    <button onClick={(e) => { e.stopPropagation(); handleReturnAll(item); }} className="absolute top-4 right-4 bg-white/20 hover:bg-rose-600 text-white p-2 rounded-full backdrop-blur-md transition-all"><Trash2 size={16} /></button>
                  </div>
                  <div className="p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-black text-slate-800 mb-4 truncate leading-tight">{item.name}</h3>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-50 rounded-2xl p-1.5 border border-slate-100 shadow-inner">
                            <input 
                                type="number" className="w-full bg-transparent text-center font-black text-2xl text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={tempQuantities[item.id] || ''}
                                onChange={(e) => setTempQuantities({ ...tempQuantities, [item.id]: e.target.value })}
                            />
                        </div>
                        {tempQuantities[item.id] !== item.quantity.toString() && (
                            <button onClick={() => commitQuantity(item)} className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all animate-in zoom-in-50"><Check size={20} strokeWidth={3} /></button>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-4 text-slate-400 font-bold text-[9px] uppercase tracking-tight px-1">
                        <Calendar size={11} /> {new Date(item.updated_at).toLocaleDateString()} 변경됨
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTeacher && (
            <div className="h-48 border-t border-slate-200 bg-white flex flex-col shrink-0">
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                    <History size={16} className="text-slate-400" />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">활동 히스토리</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between gap-3 text-sm group">
                            <div className="flex items-center gap-3">
                                <span className="text-slate-400 text-[10px] font-bold whitespace-nowrap min-w-[70px]">
                                    {new Date(log.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`font-bold ${log.type === 'in' ? 'text-indigo-600' : log.type === 'out' ? 'text-rose-500' : 'text-slate-700'}`}>
                                    {log.content}
                                </span>
                            </div>
                            <button onClick={async () => { if(confirm("로그를 삭제하시겠습니까?")) { await supabase.from('inventory_logs').delete().eq('id', log.id); setLogs(prev => prev.filter(l => l.id !== log.id)); } }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1 cursor-pointer transition-opacity"><X size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>

      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in" onClick={() => setDetailItem(null)}>
          <div className="w-full max-w-md bg-[#121212] rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 text-white border border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-6 border-b border-slate-800 flex gap-6 items-center">
                <div className="w-20 h-20 rounded-[20px] bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {detailItem.image ? <img src={detailItem.image} className="w-full h-full object-cover" /> : <Package size={32} className="text-slate-600"/>}
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">{detailItem.category}</span>
                    <h2 className="text-3xl font-black mt-1 leading-none">{detailItem.name}</h2>
                    <p className="text-sm text-slate-400 mt-3">{detailItem.simple_desc}</p>
                </div>
            </div>
            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
                <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-slate-800">
                    <h4 className="text-[11px] font-black text-emerald-400 uppercase mb-3 flex items-center gap-2"><CheckSquare size={14} /> 핵심 포인트</h4>
                    <p className="text-[15px] font-bold text-slate-200 whitespace-pre-line">{detailItem.key_points}</p>
                </div>
                <div>
                    <h4 className="text-[11px] font-black text-blue-400 uppercase mb-4 flex items-center gap-2"><ListOrdered size={14} /> 활용 방법</h4>
                    <div className="space-y-4">
                        {detailItem.usage_examples?.split('\n').map((line: string, i: number) => (
                            <div key={i} className="flex gap-4 items-start">
                                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-900/30 text-blue-400 text-xs font-black flex items-center justify-center mt-0.5">{i+1}</span>
                                <p className="text-[15px] text-slate-300 font-bold leading-snug break-all">{renderTextWithLinks(line)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-6 bg-black/50 border-t border-slate-800">
                <button onClick={() => setDetailItem(null)} className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">확인 완료</button>
            </div>
          </div>
        </div>
      )}

      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsCatalogModalOpen(false)}>
          <div className="bg-white w-full max-w-xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-slate-900 mb-8">{editingCatalogId ? '교구 정보 수정' : '새 마스터 교구 등록'}</h3>
            <div className="space-y-6">
                <div className="flex gap-6">
                    <div className="flex-1"><label className="text-[10px] font-black text-slate-400 uppercase">교구명</label><input className="w-full p-4 bg-slate-50 rounded-2xl font-black border-none" value={catalogForm.name} onChange={e => setCatalogForm({...catalogForm, name: e.target.value})} /></div>
                    <div className="w-1/3"><label className="text-[10px] font-black text-slate-400 uppercase">카테고리</label><input className="w-full p-4 bg-slate-50 rounded-2xl font-black border-none" value={catalogForm.category} onChange={e => setCatalogForm({...catalogForm, category: e.target.value})} /></div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">이미지 업로드</label>
                    <div className="flex gap-6 items-center">
                        <label className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed rounded-3xl cursor-pointer hover:bg-slate-100">
                            <ImageIcon className="text-slate-300 mb-2" size={32} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                        <div className="w-32 h-32 rounded-3xl bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                            {catalogForm.image ? <img src={catalogForm.image} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-300">Preview</span>}
                        </div>
                    </div>
                </div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-xs">한 줄 설명</label><input className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={catalogForm.simple_desc} onChange={e => setCatalogForm({...catalogForm, simple_desc: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-xs">핵심 포인트</label><textarea className="w-full p-4 bg-slate-50 rounded-2xl font-bold h-24" value={catalogForm.key_points} onChange={e => setCatalogForm({...catalogForm, key_points: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-xs">활동 방법 (링크 가능)</label><textarea className="w-full p-4 bg-slate-50 rounded-2xl font-bold h-40" value={catalogForm.usage_examples} onChange={e => setCatalogForm({...catalogForm, usage_examples: e.target.value})} /></div>
                <button onClick={handleSaveCatalog} className="w-full py-5 bg-indigo-600 text-white rounded-[28px] font-black text-lg">마스터 데이터 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}