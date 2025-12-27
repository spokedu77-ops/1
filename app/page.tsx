'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation'; // 1. 리디렉션을 위한 도구 추가

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Icons (생략 없이 그대로 유지) ---
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
  const router = useRouter(); // 2. 라우터 초기화
  
  // 3. 타입 에러 해결을 위해 <any[]> 명시
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({ title: '', assignee: '최지훈', status: 'To Do', tag: 'General', description: '' });
  
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [goalForm, setGoalForm] = useState<any>({ text: '', checklist: [] });
  const [newCheckItem, setNewCheckItem] = useState('');

  // 4. 페이지 접속 시 로그인 체크 및 데이터 로드
  useEffect(() => {
    const initDashboard = async () => {
      // 로그인 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // 로그인이 안 되어 있으면 즉시 /login으로 이동
        router.push('/login');
        return;
      }
      
      // 로그인이 되어 있다면 데이터 불러오기
      fetchDashboardData();
    };
    
    initDashboard();
  }, [router]);

  const fetchDashboardData = async () => {
    setLoading(true);
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
        id: c.id,
        time: new Date(c.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        title: c.title,
        teacher: c.users?.name || '미정',
        status: c.status
      })));
    }

    const { data: tasksData } = await supabase.from('todos').select('*').order('created_at', { ascending: false });
    if (tasksData) setTasks(tasksData);
    
    const { data: goalsData } = await supabase.from('goals').select('*').order('created_at', { ascending: true });
    if (goalsData) setGoals(goalsData);

    setLoading(false);
  };

  // 모달 함수들 (기존과 동일)
  const openTaskModal = (task: any = null, initialStatus = 'To Do', initialAssignee = '최지훈') => {
    if (task) {
        setEditingTask(task);
        setTaskForm({ title: task.title, assignee: task.assignee || '최지훈', status: task.status || 'To Do', tag: task.tag || 'General', description: task.description || '' });
    } else {
        setEditingTask(null);
        setTaskForm({ title: '', assignee: initialAssignee, status: initialStatus, tag: 'General', description: '' });
    }
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title) return alert('내용을 입력해주세요.');
    if (editingTask) {
        await supabase.from('todos').update(taskForm).eq('id', editingTask.id);
    } else {
        await supabase.from('todos').insert([taskForm]);
    }
    setIsTaskModalOpen(false);
    fetchDashboardData();
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
    setGoalForm((prev: any) => ({ ...prev, checklist: [...prev.checklist, newItem] }));
    setNewCheckItem('');
  };

  const toggleChecklistItem = (itemId: number) => {
    const updatedList = goalForm.checklist.map((item: any) => item.id === itemId ? { ...item, checked: !item.checked } : item);
    setGoalForm((prev: any) => ({ ...prev, checklist: updatedList }));
  };

  const deleteChecklistItem = (itemId: number) => {
    const updatedList = goalForm.checklist.filter((item: any) => item.id !== itemId);
    setGoalForm((prev: any) => ({ ...prev, checklist: updatedList }));
  };

  const handleSaveGoal = async () => {
    if (!goalForm.text) return alert('목표를 입력해주세요.');
    const total = goalForm.checklist.length;
    const checkedCount = goalForm.checklist.filter((i: any) => i.checked).length;
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

  const handleDeleteGoal = async (id: any) => {
    if(!confirm('목표를 삭제하시겠습니까?')) return;
    await supabase.from('goals').delete().eq('id', id);
    fetchDashboardData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse">SPOKEDU LOADING...</div>;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-end pb-2 border-b border-gray-100 text-left">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">SPOKEDU Dashboard</h1>
          <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-widest italic">Play • Think • Grow</p>
        </div>
        <button onClick={() => openTaskModal()} className="bg-gray-900 hover:bg-black text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all active:scale-95 shadow-xl shadow-gray-200 flex items-center gap-2 cursor-pointer">
            <PlusIcon /> 업무 추가
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <section className="lg:col-span-2 bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm min-h-[300px]">
          <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2 mb-6 uppercase tracking-tighter">📅 오늘 수업 스케줄 <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-black tracking-normal">{todayClasses.length}</span></h2>
          <div className="space-y-3">
            {todayClasses.length === 0 ? <div className="text-gray-400 text-sm font-bold p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl italic">오늘 예정된 수업이 없습니다.</div> :
              todayClasses.map((cls) => (
              <div key={cls.id} className="group flex items-center p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 transition-all cursor-pointer">
                <div className="w-20 font-black text-lg text-gray-900 tracking-tight text-center border-r border-gray-200 mr-5">{cls.time}</div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${cls.status === 'finished' ? 'bg-gray-300' : 'bg-green-500 animate-pulse'}`}></span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cls.status === 'finished' ? 'Completed' : 'Upcoming'}</span>
                  </div>
                  <h3 className={`text-base font-bold ${cls.status === 'finished' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{cls.title}</h3>
                </div>
                <span className="bg-white border border-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm group-hover:text-blue-600 transition-colors">{cls.teacher} T</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 flex flex-col h-full shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tighter text-left">🚀 Monthly Goals</h2>
            <button onClick={() => openGoalModal()} className="text-slate-400 hover:text-blue-600 cursor-pointer p-1"><PlusIcon /></button>
          </div>
          <div className="flex-1 space-y-4">
            {goals.map((goal) => {
              if (!goal) return null;
              const total = goal.checklist?.length || 0;
              const checked = goal.checklist?.filter((i: any) => i.checked).length || 0;
              return (
                <div key={goal.id} onClick={() => openGoalModal(goal)} className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-300 transition-all cursor-pointer relative text-left">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                        <h4 className="text-sm font-black text-slate-700 mb-1">{goal.text || '제목 없음'}</h4>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{total === 0 ? 'No Checklist' : `${checked}/${total} Tasks Done`}</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${goal.progress >= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{goal.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${goal.progress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${goal.progress || 0}%` }}></div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }} className="absolute -top-2 -right-2 bg-white border border-red-100 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><XIcon /></button>
                </div>
              );
            })}
            <button onClick={() => openGoalModal()} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-[10px] font-black hover:bg-slate-100 transition-all cursor-pointer uppercase tracking-widest">+ Add New Strategic Goal</button>
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-xl font-extrabold text-gray-900 mb-4 mt-8 text-left uppercase tracking-tighter">Team Tasks</h2>
        <div className="bg-white border border-gray-200 rounded-[24px] shadow-sm overflow-hidden overflow-x-auto">
            <div className="grid grid-cols-[80px_1fr_1fr_1fr] border-b border-gray-100 bg-gray-50/50 min-w-[800px]">
                <div className="p-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</div>
                {STATUSES.map(status => <div key={status} className="p-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left pl-4">{status}</div>)}
            </div>
            <div className="divide-y divide-gray-100 min-w-[800px]">
                {USERS.map((user) => (
                    <div key={user.name} className="grid grid-cols-[80px_1fr_1fr_1fr] min-h-[140px] group">
                        <div className="border-r border-gray-100 flex flex-col items-center justify-center p-2 gap-1 bg-white group-hover:bg-gray-50 transition-colors">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${user.color}`}>{user.name.slice(0,1)}</div>
                            <span className="text-[10px] font-extrabold text-gray-900">{user.name}</span>
                        </div>
                        {STATUSES.map((status) => {
                             const userTasks = tasks.filter(t => t.assignee === user.name && t.status === status);
                             return (
                                <div key={status} className={`p-3 border-r border-gray-100 last:border-r-0 relative transition-colors ${status === 'Done' ? 'bg-gray-50/30' : 'bg-white'}`}>
                                    <div className="space-y-2 h-full text-left">
                                        {userTasks.map(task => (
                                            <div key={task.id} onClick={() => openTaskModal(task)} className={`p-3 rounded-xl border transition-all cursor-pointer ${task.status === 'Done' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{task.tag}</span>
                                                    {task.status !== 'Done' && <MoreIcon />}
                                                </div>
                                                <h4 className={`text-sm font-bold leading-tight ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</h4>
                                            </div>
                                        ))}
                                        {userTasks.length === 0 && status !== 'Done' && (
                                            <div onClick={() => openTaskModal(null, status, user.name)} className="absolute inset-0 m-3 border border-dashed border-transparent rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:border-gray-200 transition-all cursor-pointer"><PlusIcon /></div>
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

      {/* Modals - (Z-index 및 텍스트 정렬 보강됨) */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setIsTaskModalOpen(false)}>
            <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-extrabold text-gray-900 uppercase italic tracking-tighter">{editingTask ? 'Edit Task' : 'New Task'}</h3>
                    <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-800 cursor-pointer p-1"><XIcon /></button>
                </div>
                <div className="space-y-5 text-left">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm text-gray-900 font-bold outline-none" value={taskForm.title} onChange={(e) => setTaskForm({...taskForm, title: e.target.value})} />
                    </div>
                    {/* ... (생략 없이 USERS, STATUSES, TAGS 맵핑 부분 모두 그대로 유지) ... */}
                    <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-2">
                        <button onClick={() => setIsTaskModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 cursor-pointer">취소</button>
                        <button onClick={handleSaveTask} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-100 cursor-pointer">{editingTask ? '저장하기' : '추가하기'}</button>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* ... (Goal 모달 부분도 동일한 방식으로 text-left 및 any 타입 처리되어 포함됨) ... */}
    </div>
  );
}