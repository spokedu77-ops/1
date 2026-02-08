'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { 
  Search, Smartphone, Loader2, Edit3, X, FileText, Download,
  Activity, CheckCircle2, Power, GraduationCap, UserPlus, Clock, AlertCircle, FileCheck, MapPin, Medal
} from 'lucide-react';
import MileageDetailModal from '@/app/components/admin/MileageDetailModal';

interface DocumentFile {
  name: string;
  url: string;
}

const STAFF_NAMES = ['최지훈', '김구민', '김윤기'];

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher';
  phone: string | null;
  organization: string | null;
  departure_location?: string | null;
  schedule?: string | null;
  vacation?: string | null;
  documents: DocumentFile[] | null;
  is_active: boolean;
  points?: number;
  session_count?: number;
}

export default function UserDashboardPage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [users, setUsers] = useState<UserData[]>([]);
  const [, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState<'live' | 'done'>('live');
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserData>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPartner, setNewPartner] = useState<Partial<UserData>>({ role: 'teacher', is_active: true });
  const [mileageModalUser, setMileageModalUser] = useState<UserData | null>(null);

  const fetchUsers = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') console.log('[users] fetchUsers 시작, supabase:', !!supabase);
    if (!supabase) {
      if (process.env.NODE_ENV === 'development') console.error('[users] fetchUsers: supabase가 null입니다');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .order('name');
      
      if (process.env.NODE_ENV === 'development') console.log('[users] fetchUsers 결과, data:', data?.length, 'error:', error);
      if (error) {
        console.error('[users] fetchUsers error:', error);
        throw error;
      }
      
      const fetchedUsers = (data as UserData[]).map(u => ({ 
        ...u, 
        is_active: u.is_active ?? true,
        documents: u.documents || [] 
      }));
      setUsers(fetchedUsers);
      if (process.env.NODE_ENV === 'development') console.log('[users] setUsers 완료, users.length:', fetchedUsers.length);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: me } = await supabase.from('users').select('id, name, role').eq('id', user.id).single();
        if (me) setCurrentUser(me as UserData);
      }
    } catch (err: unknown) {
      console.error('[users] fetchUsers catch error:', err);
    } finally {
      setIsLoading(false);
      if (process.env.NODE_ENV === 'development') console.log('[users] fetchUsers 종료');
    }
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSaveInfo = async (userId: string) => {
    if (!supabase || currentUser?.role !== 'admin') return alert('관리자 권한이 없습니다.');
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          phone: editForm.phone,
          organization: editForm.organization,
          departure_location: editForm.departure_location,
          schedule: editForm.schedule,
          vacation: editForm.vacation
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      setEditingId(null);
      fetchUsers();
      alert('성공적으로 업데이트되었습니다.');
    } catch {
      alert('저장 실패: DB 컬럼을 확인해주세요.');
    }
  };

  const toggleActiveStatus = async (user: UserData) => {
    if (!supabase || currentUser?.role !== 'admin') return alert('권한이 없습니다.');
    const nextStatus = !user.is_active;
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: nextStatus } : u));
    try {
      await supabase.from('users').update({ is_active: nextStatus }).eq('id', user.id);
    } catch {
      fetchUsers();
    }
  };

  const handleAddPartner = async () => {
    if (!supabase || currentUser?.role !== 'admin') return alert('관리자 권한이 필요합니다.');
    if (!newPartner.name) return alert('이름을 입력해주세요.');
    try {
      const name = newPartner.name;
      const email = (newPartner as Partial<UserData & { email?: string }>).email || 
                    `${name.toLowerCase().replace(/\s+/g, '.')}@spokedu.com`;
      
      const insertData: Partial<UserData> & { id: string; email: string } = {
        ...newPartner,
        id: crypto.randomUUID(),
        email: email
      };
      
      const { error } = await supabase
        .from('users')
        .insert([insertData])
        .select();
      
      if (error) {
        console.error('등록 실패 상세:', error);
        throw error;
      }
      
      setIsAddModalOpen(false);
      setNewPartner({ role: 'teacher', is_active: true });
      fetchUsers();
      alert('성공적으로 등록되었습니다.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      alert(`등록 실패: ${msg}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, user: UserData) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setUploadingId(user.id);
    try {
      // 파일명을 안전하게 인코딩
      const timestamp = Date.now();
      const fileExt = file.name.substring(file.name.lastIndexOf('.'));
      const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
      const sanitizedBaseName = baseName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      
      const filePath = `${user.id}/${timestamp}_${sanitizedBaseName}${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('instructors')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('instructors')
        .getPublicUrl(filePath);
      
      const updatedDocs = [...(user.documents || []), { 
        name: file.name,
        url: publicUrl 
      }];
      
      await supabase.from('users').update({ documents: updatedDocs }).eq('id', user.id);
      fetchUsers();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      alert('파일 업로드에 실패했습니다: ' + msg);
    } finally {
      setUploadingId(null);
    }
  };

  const deleteDocument = async (user: UserData, index: number) => {
    if (!confirm('해당 서류를 삭제하시겠습니까?')) return;
    const updatedDocs = (user.documents || []).filter((_, i) => i !== index);
    try {
      await supabase.from('users').update({ documents: updatedDocs }).eq('id', user.id);
      fetchUsers();
    } catch {
      alert('삭제 실패');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').includes(searchTerm) || (u.organization || '').includes(searchTerm);
    const matchesTab = currentTab === 'live' ? u.is_active : !u.is_active;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 md:p-10 pb-[env(safe-area-inset-bottom,0px)] text-slate-800">
      <header className="max-w-6xl mx-auto mb-6 sm:mb-10">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 italic tracking-tighter">SPOKEDU <span className="text-blue-600 not-italic">HRM</span></h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Partner Management System</p>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full md:w-auto min-w-0">
            <div className="relative flex-1 md:w-64 group min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="검색..." className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-base sm:text-sm font-bold transition-all touch-manipulation" onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {currentUser?.role === 'admin' && (
              <button onClick={() => setIsAddModalOpen(true)} className="min-h-[44px] flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-blue-600 transition-all cursor-pointer shadow-lg shadow-slate-900/10 touch-manipulation shrink-0">
                <UserPlus className="w-4 h-4" /> 추가
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-full sm:w-fit border border-slate-200 shadow-inner overflow-x-auto">
          {[{ id: 'live', label: '수업 중', icon: Activity }, { id: 'done', label: '수업 종료', icon: CheckCircle2 }].map((tab) => (
            <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`min-h-[44px] flex items-center gap-2.5 px-5 sm:px-6 py-2 rounded-xl text-[13px] font-black transition-all cursor-pointer touch-manipulation shrink-0 ${currentTab === tab.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
              <span className="ml-1 text-[10px] opacity-60">{users.filter(u => (tab.id === 'live' ? u.is_active : !u.is_active)).length}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        {filteredUsers.map((user) => (
          <div key={user.id} className={`bg-white rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 border-2 transition-all duration-300 flex flex-col hover:shadow-xl min-w-0 ${user.is_active ? 'border-blue-500 shadow-blue-500/5' : 'border-transparent shadow-sm'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${user.role === 'teacher' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>{user.role === 'teacher' ? 'Inst' : 'Adm'}</span>
                <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${user.is_active ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>{user.is_active ? '수업 중' : '종료'}</span>
              </div>
              {currentUser?.role === 'admin' && (
                <div className="flex gap-1">
                  {!STAFF_NAMES.includes(user.name || '') && (
                    <button onClick={() => setMileageModalUser(user)} className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all cursor-pointer flex items-center justify-center touch-manipulation" title="마일리지/카운팅 관리"><Medal className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={() => toggleActiveStatus(user)} className={`min-h-[44px] min-w-[44px] p-2 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center touch-manipulation ${user.is_active ? 'bg-blue-500 text-white hover:bg-rose-500' : 'bg-slate-100 text-slate-400 hover:bg-blue-500 hover:text-white'}`}><Power className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (editingId === user.id) { setEditingId(null); } else { setEditingId(user.id); setEditForm({ ...user }); } }} className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 cursor-pointer flex items-center justify-center touch-manipulation"><Edit3 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            {editingId === user.id ? (
              <div className="space-y-3 flex-1">
                <input className="w-full px-2 py-1 text-xl font-black border-b-2 border-blue-500 outline-none" value={editForm.name || ''} onChange={e => setEditForm(prev => ({...prev, name: e.target.value}))} />
                <input className="w-full px-3 py-2 text-xs border rounded-xl" placeholder="학력" value={editForm.organization || ''} onChange={e => setEditForm(prev => ({...prev, organization: e.target.value}))} />
                <input className="w-full px-3 py-2 text-xs border rounded-xl" placeholder="연락처" value={editForm.phone || ''} onChange={e => setEditForm(prev => ({...prev, phone: e.target.value}))} />
                <input className="w-full px-3 py-2 text-xs border rounded-xl" placeholder="출발장소" value={editForm.departure_location || ''} onChange={e => setEditForm(prev => ({...prev, departure_location: e.target.value}))} />
                <textarea className="w-full px-3 py-2 text-xs border rounded-xl h-20" placeholder="수업 스케줄 (쉼표로 구분: 월 15-18, 화 16-19)" value={editForm.schedule || ''} onChange={e => setEditForm(prev => ({...prev, schedule: e.target.value}))} />
                <textarea className="w-full px-3 py-2 text-xs border rounded-xl h-20" placeholder="연기 요청 (쉼표로 구분: 1.23 화요일, 1.30 금요일)" value={editForm.vacation || ''} onChange={e => setEditForm(prev => ({...prev, vacation: e.target.value}))} />
                <button onClick={() => handleSaveInfo(user.id)} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black cursor-pointer">저장</button>
              </div>
            ) : (
              <div className="flex-1">
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{user.name} <span className="text-lg text-slate-400 font-bold">선생님</span></h3>
                
                <div className="space-y-4 mb-6">
                  {/* 학력 */}
                  <div className="flex items-center text-[11px] font-bold text-slate-600">
                    <GraduationCap className="w-4 h-4 mr-3 text-blue-500" />
                    <span className="text-slate-400 w-20 shrink-0">학력</span>
                    <span className="truncate">{user.organization || '-'}</span>
                  </div>
                  
                  {/* 연락처 */}
                  <div className="flex items-center text-[11px] font-bold text-slate-600">
                    <Smartphone className="w-4 h-4 mr-3 text-blue-500" />
                    <span className="text-slate-400 w-20 shrink-0">연락처</span>
                    <span>{user.phone || '-'}</span>
                  </div>
                  
                  {/* 출발장소 */}
                  <div className="flex items-center text-[11px] font-bold text-slate-600">
                    <MapPin className="w-4 h-4 mr-3 text-blue-500" />
                    <span className="text-slate-400 w-20 shrink-0">출발장소</span>
                    <span>{user.departure_location || '-'}</span>
                  </div>
                  
                  {/* 수업 스케줄 */}
                  <div className="space-y-2">
                    <div className="flex items-center text-[11px] font-bold text-slate-400 mb-1">
                      <Clock className="w-3.5 h-3.5 mr-3 text-blue-500" /> 수업 스케줄
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-7">
                      {(user.schedule || '').split(',').filter(s => s.trim()).length > 0 ? (
                        (user.schedule || '').split(',').map((s, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black border border-blue-100">
                            {s.trim()}
                          </span>
                        ))
                      ) : <span className="text-[10px] text-slate-300 italic">등록된 스케줄 없음</span>}
                    </div>
                  </div>
                  
                  {/* 연기 요청 */}
                  <div className="space-y-2 bg-rose-50/50 p-3 rounded-2xl border border-rose-100/50">
                    <div className="flex items-center text-[11px] font-bold text-rose-400 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 mr-3" /> 연기 요청
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-7">
                      {(user.vacation || '').split(',').filter(v => v.trim()).length > 0 ? (
                        (user.vacation || '').split(',').map((v, i) => (
                          <span key={i} className="px-2 py-1 bg-white text-rose-600 rounded-md text-[10px] font-black border border-rose-200 shadow-sm">
                            {v.trim()}
                          </span>
                        ))
                      ) : <span className="text-[10px] text-slate-300 italic">없음</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 서류 관리 섹션 */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <FileCheck className="w-3 h-3" /> 서류 등록
                </h4>
              </div>
              <div className="space-y-2 mb-4">
                {(user.documents || []).length > 0 ? (
                  (user.documents || []).map((doc, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 hover:bg-blue-50/50 p-2.5 rounded-xl border border-slate-100 group transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm"><FileText className="w-3.5 h-3.5 text-blue-500" /></div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700 truncate max-w-[120px]">{doc.name}</span>
                          <span className="text-[9px] font-bold text-blue-500 uppercase">
                            {doc.name.includes('신분증') ? 'Identity' : doc.name.includes('통장') ? 'Bank' : 'Doc'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <a href={doc.url} target="_blank" className="p-1.5 hover:text-blue-600 text-slate-400"><Download className="w-3.5 h-3.5" /></a>
                        <button onClick={() => deleteDocument(user, i)} className="p-1.5 hover:text-rose-600 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-center py-4 text-slate-300 font-bold border-2 border-dashed border-slate-50 rounded-2xl">No documents</p>
                )}
              </div>
              <label className="flex items-center justify-center w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all">
                {uploadingId === user.id ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <span className="text-[10px] font-black text-slate-400 uppercase">Add Document</span>}
                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, user)} disabled={!!uploadingId} />
              </label>
            </div>
          </div>
        ))}
      </main>

      {mileageModalUser && (
        <MileageDetailModal
          teacher={{ id: mileageModalUser.id, name: mileageModalUser.name || '', points: mileageModalUser.points ?? 0, session_count: mileageModalUser.session_count ?? 0 }}
          supabase={supabase}
          onClose={() => setMileageModalUser(null)}
          onSaved={() => fetchUsers()}
        />
      )}

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
              <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">출발장소</label>
                <input className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold" onChange={e => setNewPartner({...newPartner, departure_location: e.target.value})} /></div>
              <button onClick={handleAddPartner} className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black mt-6 shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer">등록하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}