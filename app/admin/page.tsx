'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Icons ---
const PlusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const XIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const MoreIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>;

const USERS = [
  { name: '최지훈', role: '대표', color: 'bg-slate-900 text-white' },
  { name: '김윤기', role: '총괄', color: 'bg-blue-600 text-white' },
  { name: '김구민', role: '팀장', color: 'bg-emerald-600 text-white' },
];
const STATUSES = ['To Do', 'In Progress', 'Done'];
const TAGS = ['General', 'Finance', 'Meeting', 'CS', 'Ops', 'Class'];

export default function SpokeduDashboard() {
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({ title: '', assignee: '최지훈', status: 'To Do', tag: 'General', description: '' });
  
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [goalForm, setGoalForm] = useState<{text: string, checklist: any[]}>({ text: '', checklist: [] });
  const [newCheckItem, setNewCheckItem] = useState('');

  // --- 핵심 로직: 로그인 상태 체크 ---
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // 세션 없으면 로그인 페이지로 이동
          window.location.href = '/login';
          return;
        }
        
        // 로그인 성공 시에만 데이터 로드
        await fetchDashboardData();
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: classesData } = await supabase
        .from('sessions')
        .select('*, users(name)')
        .gte('start_at', today.toISOString())
        .lt('start_at', tomorrow.toISOString())
        .order('start_at', { ascending: true });

      if (classesData) {
        setTodayClasses(classesData.map(c => ({
          id: c?.id || Math.random().toString(),
          time: c?.start_at ? new Date(c.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--',
          title: c?.title || '제목 없음',
          teacher: (c as any).users?.name || '미정',
          status: c?.status || 'scheduled'
        })));
      }

      const { data: tasksData } = await supabase.from('todos').select('*').order('created_at', { ascending: false });
      if (tasksData) setTasks(tasksData);
      
      const { data: goalsData } = await supabase.from('goals').select('*').order('created_at', { ascending: true });
      if (goalsData) setGoals(goalsData);
    } catch (error) {
      console.error('Data fetch error:', error);
    }
  };

  const openTaskModal = (task: any = null, initialStatus = 'To Do', initialAssignee = '최지훈') => {
    if (task) {
        setEditingTask(task);
        setTaskForm({ title: task.title || '', assignee: task.assignee || '최지훈', status: task.status || 'To Do', tag: task.tag || 'General', description: task.description || '' });
    } else {
        setEditingTask(null);
        setTaskForm({ title: '', assignee: initialAssignee, status: initialStatus, tag: 'General', description: '' });
    }
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title) return alert('내용을 입력해주세요.');
    try {
      if (editingTask) {
          await supabase.from('todos').update(taskForm).eq('id', editingTask.id);
      } else {
          await supabase.from('todos').insert([taskForm]);
      }
      setIsTaskModalOpen(false);
      fetchDashboardData();
    } catch (e) { alert('저장에 실패했습니다.'); }
  };

  const handleDeleteTask = async () => {
    if (!editingTask || !confirm('삭제하시겠습니까?')) return;
    await supabase.from('todos').delete().eq('id', editingTask.id);
    setIsTaskModalOpen(false);
    fetchDashboardData();
  };

  const openGoalModal = (goal: any = null) => {
    setNewCheckItem('');
    if (goal) {
      setEditingGoal(goal);
      setGoalForm({ text: goal.text || '', checklist: Array.isArray(goal.checklist) ? goal.checklist : [] });
    } else {
      setEditingGoal(null);
      setGoalForm({ text: '', checklist: [] });
    }
    setIsGoalModalOpen(true);
  };

  const addChecklistItem = () => {
    if (!newCheckItem.trim()) return;
    const newItem = { id: Date.now(), text: newCheckItem, checked: false };
    setGoalForm(prev => ({ ...prev, checklist: [...prev.checklist, newItem] }));
    setNewCheckItem('');
  };

  const toggleChecklistItem = (itemId: number) => {
    const updatedList = goalForm.checklist.map(item => item.id === itemId ? { ...item, checked: !item.checked } : item);
    setGoalForm(prev => ({ ...prev, checklist: updatedList }));
  };

  const deleteChecklistItem = (itemId: number) => {
    const updatedList = goalForm.checklist.filter(item => item.id !== itemId);
    setGoalForm(prev => ({ ...prev, checklist: updatedList }));
  };

  const handleSaveGoal = async () => {
    if (!goalForm.text) return alert('목표를 입력해주세요.');
    const total = goalForm.checklist.length;
    const checkedCount = goalForm.checklist.filter(i => i.checked).length;
    const calculatedProgress = total === 0 ? 0 : Math.round((checkedCount / total) * 100);

    const saveData = { text: goalForm.text, checklist: goalForm.checklist, progress: calculatedProgress };
    if (editingGoal) {
      await supabase.from('goals').update(saveData).eq('id', editingGoal.id);
    } else {
      await supabase.from('goals').insert([saveData]);
    }
    setIsGoalModalOpen(false);
    fetchDashboardData();
  };

  const handleDeleteGoal = async (id: string) => {
    if(!confirm('목표를 삭제하시겠습니까?')) return;
    await supabase.from('goals').delete().eq('id', id);
    fetchDashboardData();
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-black text-gray-900">SPOKEDU LOADING...</div>;

  return (
    <div className="w-full bg-white text-gray-900 min-h-screen p-4 md:p-6 space-y-8 animate-in fade-in duration-500 pb-20 text-left">
      <header className="flex justify-between items-end pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight uppercase italic">SPOKEDU Dashboard</h1>
          <p className="text-[10px] md:text-sm text-gray-500 font-medium mt-1">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
        <button onClick={() => openTaskModal()} className="bg-gray-900 hover:bg-black text-white text-[11px] md:text-sm font-bold px-3 py-2 md:px-4 md:py-2 rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer">
            <PlusIcon /> 업무 추가
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* 1. 오늘 수업 스케줄 */}
        <section className="lg:col-span-2 bg-white rounded-[24px] p-5 md:p-6 border border-gray-100 shadow-sm min-h-[300px]">
          <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2 mb-6 text-left">📅 오늘 수업 스케줄 <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full">{todayClasses.length}</span></h2>
          <div className="space-y-3">
            {todayClasses.length === 0 ? <div className="text-gray-400 text-sm font-bold p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">오늘 예정된 수업이 없습니다.</div> :
              todayClasses.map((cls) => (
              <div key={cls.id} className="group flex items-center p-3 md:p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 transition-all cursor-pointer">
                <div className="w-16 md:w-20 font-black text-base md:text-lg text-gray-900 tracking-tight text-center border-r border-gray-200 mr-4 md:mr-5 shrink-0">{cls.time}</div>
                <div className="flex-1 min-w-0 text-left px-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${cls.status === 'finished' ? 'bg-gray-300' : 'bg-green-500 animate-pulse'}`}></span>
                    <span className="text-[10px] font-bold text-gray-400">{cls.status === 'finished' ? '수업 완료' : '수업 예정'}</span>
                  </div>
                  <h3 className={`text-sm md:text-base font-bold truncate ${cls.status === 'finished' ? 'text-gray-300 line-through' : 'text-gray-900'}`}>{cls.title}</h3>
                </div>
                <span className="bg-white border border-gray-200 text-gray-700 text-[10px] md:text-xs font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-lg shadow-sm shrink-0">{cls.teacher} T</span>
              </div>
            ))}
          </div>
        </section>

        {/* 2. 이달의 목표 */}
        <section className="bg-slate-50 rounded-[24px] p-5 md:p-6 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-extrabold text-slate-800">🚀 이달의 목표</h2>
            <button onClick={() => openGoalModal()} className="text-slate-400 hover:text-blue-600 cursor-pointer p-1"><PlusIcon /></button>
          </div>
          <div className="space-y-4">
            {goals.map((goal) => {
              if (!goal) return null;
              const total = goal.checklist?.length || 0;
              const checked = goal.checklist?.filter((i: any) => i?.checked).length || 0;
              return (
                <div key={goal.id} onClick={() => openGoalModal(goal)} className="group bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-300 transition-all cursor-pointer relative">
                  <div className="flex justify-between items-start mb-3 min-w-0">
                    <div className="text-left min-w-0 flex-1 pr-4">
                        <h4 className="text-sm font-black text-slate-700 mb-1 truncate">{goal.text || '제목 없음'}</h4>
                        <span className="text-[10px] text-gray-400 font-bold">{total === 0 ? '체크리스트 없음' : `${checked}/${total} 완료`}</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 ${goal.progress >= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{goal.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${goal.progress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${goal.progress || 0}%` }}></div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }} className="absolute -top-2 -right-2 bg-white border border-red-100 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><XIcon /></button>
                </div>
              );
            })}
            <button onClick={() => openGoalModal()} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer">+ 목표 추가하기</button>
          </div>
        </section>
      </div>

      {/* 3. Team Tasks */}
      <section className="text-left">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 mt-8">Team Tasks</h2>
        <div className="bg-white border border-gray-200 rounded-[24px] shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[100px_1fr_1fr_1fr] border-b border-gray-100 bg-gray-50/50">
                <div className="p-3 text-center text-[10px] font-black text-gray-400 uppercase">Team</div>
                {STATUSES.map(status => <div key={status} className="p-3 text-[10px] font-black text-gray-400 uppercase tracking-wider pl-4">{status}</div>)}
            </div>
            
            <div className="divide-y divide-gray-100">
                {USERS.map((user) => (
                    <div key={user.name} className="flex flex-col md:grid md:grid-cols-[100px_1fr_1fr_1fr] min-h-[140px] group">
                        <div className="border-b md:border-b-0 md:border-r border-gray-100 flex md:flex-col items-center justify-start md:justify-center p-3 gap-3 bg-white md:bg-gray-50/30 transition-colors">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm shrink-0 ${user.color}`}>{user.name.slice(0,1)}</div>
                            <span className="text-xs font-extrabold text-gray-900">{user.name}</span>
                        </div>
                        
                        {STATUSES.map((status) => {
                             const userTasks = tasks.filter(t => t?.assignee === user.name && t?.status === status);
                             return (
                                <div key={status} className={`p-3 border-b md:border-b-0 md:border-r last:border-r-0 relative transition-colors ${status === 'Done' ? 'bg-gray-50/30' : 'bg-white'}`}>
                                    <div className="md:hidden text-[9px] font-black text-gray-300 uppercase mb-2">{status}</div>
                                    <div className="space-y-2 h-full">
                                        {userTasks.map(task => (
                                            <div key={task.id} onClick={() => openTaskModal(task)} className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${task.status === 'Done' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{task.tag}</span>
                                                    {task.status !== 'Done' && <MoreIcon />}
                                                </div>
                                                <h4 className={`text-xs font-bold ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</h4>
                                            </div>
                                        ))}
                                        {userTasks.length === 0 && status !== 'Done' && (
                                            <button onClick={() => openTaskModal(null, status, user.name)} className="w-full py-2 border border-dashed border-gray-100 rounded-xl flex items-center justify-center text-gray-300 hover:text-blue-500 transition-all">
                                                <PlusIcon />
                                            </button>
                                        )}
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* 4. 업무 모달 */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsTaskModalOpen(false)}>
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-6 md:p-8 text-left animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900">{editingTask ? '업무 수정' : '새 업무 추가'}</h3>
                    <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-800 cursor-pointer p-1"><XIcon /></button>
                </div>
                <div className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Title</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-900 outline-none" placeholder="업무 제목" value={taskForm.title} onChange={(e) => setTaskForm({...taskForm, title: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Assignee</label>
                            <select className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 outline-none" value={taskForm.assignee} onChange={(e) => setTaskForm({...taskForm, assignee: e.target.value})}>
                                {USERS.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                             <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Status</label>
                             <select className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 outline-none" value={taskForm.status} onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}>
                                 {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tag</label>
                         <div className="flex flex-wrap gap-2 pt-1">
                            {TAGS.map(tag => (
                                <button key={tag} onClick={() => setTaskForm({...taskForm, tag})} className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${taskForm.tag === tag ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>{tag}</button>
                            ))}
                         </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Description</label>
                        <textarea className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm text-gray-700 font-medium min-h-[80px] resize-none outline-none" placeholder="상세 내용" value={taskForm.description} onChange={(e) => setTaskForm({...taskForm, description: e.target.value})} />
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={handleDeleteTask} className="flex-1 py-4 rounded-2xl text-sm font-bold text-red-400 hover:bg-red-50 transition-colors">삭제</button>
                    <button onClick={handleSaveTask} className="flex-[2] py-4 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-100 cursor-pointer">{editingTask ? '저장하기' : '추가하기'}</button>
                </div>
            </div>
        </div>
      )}

      {/* 5. 목표 모달 */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsGoalModalOpen(false)}>
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-7 md:p-8 max-h-[85vh] overflow-y-auto text-left animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-black text-gray-900 mb-6">{editingGoal ? '목표 수정' : '새 목표 설정'}</h3>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Goal</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-900 outline-none" placeholder="큰 목표 입력" value={goalForm.text} onChange={(e) => setGoalForm({...goalForm, text: e.target.value})} />
                    </div>
                    <div className="space-y-2 text-left">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Checklist</label>
                        <div className="flex gap-2 mb-4">
                            <input type="text" className="flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold outline-none" placeholder="+ 세부 과제" value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()} />
                            <button onClick={addChecklistItem} className="bg-gray-900 text-white rounded-xl px-4 font-bold text-lg cursor-pointer">+</button>
                        </div>
                        <div className="space-y-2">
                            {goalForm.checklist.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl group transition-colors hover:bg-gray-100">
                                    <input type="checkbox" checked={item.checked} onChange={() => toggleChecklistItem(item.id)} className="w-4 h-4 cursor-pointer rounded" />
                                    <span className={`flex-1 text-xs font-bold ${item.checked ? 'text-gray-300 line-through' : 'text-gray-700'}`}>{item.text}</span>
                                    <button onClick={() => deleteChecklistItem(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><TrashIcon /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex gap-3">
                    <button onClick={() => setIsGoalModalOpen(false)} className="flex-1 py-4 rounded-2xl text-sm font-bold text-gray-400 hover:bg-gray-50 cursor-pointer">취소</button>
                    <button onClick={handleSaveGoal} className="flex-[2] py-4 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-100 cursor-pointer">{editingGoal ? '업데이트' : '목표 생성'}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}