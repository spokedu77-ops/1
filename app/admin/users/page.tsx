'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Search, Smartphone, School, 
  Loader2, Upload, Trash2, Edit3, X, Save, FileText, Download,
  Activity, CheckCircle2, Power, GraduationCap, UserPlus
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DocumentFile {
  name: string;
  url: string;
}

interface UserData {
  id: string;
  name: string;
  role: 'admin' | 'teacher';
  phone: string | null;
  organization: string | null;
  bio?: string | null;
  documents: DocumentFile[] | null;
  is_active: boolean; 
}

export default function UserDashboardPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState<'live' | 'done'>('live');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserData>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // 강사 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPartner, setNewPartner] = useState<Partial<UserData>>({
    role: 'teacher',
    is_active: true
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['admin', 'teacher'])
        .order('name');
      if (error) throw error;
      setUsers((data as UserData[]).map(u => ({ ...u, is_active: u.is_active ?? true })));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 새로운 강사 등록 로직
  const handleAddPartner = async () => {
    if (!newPartner.name) return alert('이름을 입력해주세요.');
    try {
      const { error } = await supabase.from('users').insert([newPartner]);
      if (error) throw error;
      setIsAddModalOpen(false);
      setNewPartner({ role: 'teacher', is_active: true });
      fetchUsers();
    } catch (error) {
      alert('등록 실패: RLS 정책 및 컬럼을 확인하세요.');
    }
  };

  const toggleActiveStatus = async (user: UserData) => {
    const nextStatus = !user.is_active;
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: nextStatus } : u));
    try {
      await supabase.from('users').update({ is_active: nextStatus }).eq('id', user.id);
    } catch (error) {
      fetchUsers();
    }
  };

  const handleSaveInfo = async (userId: string) => {
    try {
      await supabase.from('users').update({
        name: editForm.name,
        phone: editForm.phone,
        organization: editForm.organization,
        bio: editForm.bio
      }).eq('id', userId);
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      alert('저장 실패');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, user: UserData) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(user.id);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      await supabase.storage.from('instructors').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('instructors').getPublicUrl(filePath);
      const updatedDocs = [...(user.documents || []), { name: file.name, url: publicUrl }];
      await supabase.from('users').update({ documents: updatedDocs }).eq('id', user.id);
      fetchUsers();
    } finally {
      setUploadingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').includes(searchTerm) || (u.organization || '').includes(searchTerm);
    const matchesTab = currentTab === 'live' ? u.is_active : !u.is_active;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 text-slate-800">
      <header className="max-w-6xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter">SPOKEDU <span className="text-blue-600 not-italic">HRM</span></h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Partner Management System</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="검색..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold transition-all" onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-blue-600 transition-all cursor-pointer shadow-lg shadow-slate-900/10">
              <UserPlus className="w-4 h-4" /> 추가
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-200 shadow-inner">
          {[{ id: 'live', label: '수업 중', icon: Activity }, { id: 'done', label: '수업 종료', icon: CheckCircle2 }].map((tab) => (
            <button key={tab.id} onClick={() => setCurrentTab(tab.id as any)} className={`flex items-center gap-2.5 px-6 py-2 rounded-xl text-[13px] font-black transition-all cursor-pointer ${currentTab === tab.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
              <span className="ml-1 text-[10px] opacity-60">{users.filter(u => (tab.id === 'live' ? u.is_active : !u.is_active)).length}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div key={user.id} className={`bg-white rounded-[2rem] p-6 border-2 transition-all duration-300 flex flex-col hover:shadow-xl ${user.is_active ? 'border-blue-500 shadow-blue-500/5' : 'border-transparent shadow-sm'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${user.role === 'teacher' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>{user.role === 'teacher' ? 'Inst' : 'Adm'}</span>
                <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${user.is_active ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>{user.is_active ? '수업 중' : '종료'}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleActiveStatus(user)} className={`p-2 rounded-xl transition-all cursor-pointer shadow-sm ${user.is_active ? 'bg-blue-500 text-white hover:bg-rose-500' : 'bg-slate-100 text-slate-400 hover:bg-blue-500 hover:text-white'}`}><Power className="w-3.5 h-3.5" /></button>
                <button onClick={() => editingId === user.id ? setEditingId(null) : (setEditingId(user.id), setEditForm(user))} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {editingId === user.id ? (
              <div className="space-y-3 flex-1">
                <input className="w-full px-2 py-1 text-xl font-black border-b-2 border-blue-500 outline-none" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                <input className="w-full px-3 py-2 text-xs border rounded-xl" placeholder="학교 / 학과" value={editForm.organization || ''} onChange={e => setEditForm({...editForm, organization: e.target.value})} />
                <input className="w-full px-3 py-2 text-xs border rounded-xl" placeholder="전화번호" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                <button onClick={() => handleSaveInfo(user.id)} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black cursor-pointer">수정 완료</button>
              </div>
            ) : (
              <div className="flex-1">
                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{user.name} <span className="text-lg text-slate-400 font-bold">선생님</span></h3>
                <div className="flex flex-col gap-2 mb-6 text-[11px] font-bold">
                  <div className="flex items-center text-blue-600 bg-blue-50/50 w-fit px-3 py-1.5 rounded-xl border border-blue-100"><GraduationCap className="w-3.5 h-3.5 mr-2" /> {user.organization || '학교 미등록'}</div>
                  <div className="flex items-center text-slate-500 bg-slate-50 w-fit px-3 py-1.5 rounded-xl border border-slate-100"><Smartphone className="w-3.5 h-3.5 mr-2" /> {user.phone || '연락처 미등록'}</div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex flex-wrap gap-2 mb-4">
                {user.documents?.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <FileText className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[60px]">{doc.name}</span>
                    <a href={doc.url} target="_blank" className="text-slate-300 hover:text-blue-500"><Download className="w-3 h-3" /></a>
                  </div>
                ))}
              </div>
              <label className="flex items-center justify-center w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all">
                {uploadingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Document Add</span>}
                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, user)} disabled={!!uploadingId} />
              </label>
            </div>
          </div>
        ))}
      </main>

      {/* 강사 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">새 파트너 등록</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">이름</label>
                <input className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold" onChange={e => setNewPartner({...newPartner, name: e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">학교 / 학과</label>
                <input className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold" onChange={e => setNewPartner({...newPartner, organization: e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">전화번호</label>
                <input className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold" placeholder="010-0000-0000" onChange={e => setNewPartner({...newPartner, phone: e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">구분</label>
                <div className="flex gap-2 mt-1">
                  {['teacher', 'admin'].map(r => (
                    <button key={r} onClick={() => setNewPartner({...newPartner, role: r as any})} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${newPartner.role === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{r === 'teacher' ? '강사' : '관리자'}</button>
                  ))}
                </div>
              </div>
              <button onClick={handleAddPartner} className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black mt-6 shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer">등록하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}