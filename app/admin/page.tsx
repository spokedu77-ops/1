'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, X, Trash2, Calendar, Target, LayoutDashboard, Send,
  ChevronLeft, ChevronRight, AlertCircle, RefreshCw, GripVertical,
  ExternalLink, FileText, Maximize2, RotateCcw
} from 'lucide-react';

// --- 1. 타입 정의 (Vercel 빌드 에러 방지) ---
interface User { 
  name: string; 
  role: string; 
  color: string; 
}

interface ITask { 
  id: string; 
  title: string; 
  assignee: string; 
  status: 'To Do' | 'In Progress' | 'Done'; 
  tag: string; 
  description: string; 
  created_at?: string; 
}

interface IGoal { 
  id: string; 
  text: string; 
  progress: number; 
}

interface IClassSession { 
  id: string; 
  time: string; 
  title: string; 
  teacher: string; 
  feedbackStatus: 'VERIFIED' | 'DONE' | 'WAIT'; 
  students_text?: string; 
  photo_url?: string[]; 
  file_url?: string[]; 
  start_at: string; 
  created_by?: string;
  session_type?: string;
}

// --- 2. 환경 설정 및 템플릿 ---
const FEEDBACK_TEMPLATE = `✅ 오늘 수업의 주요 활동\n-\n\n✅ 강점 및 긍정적인 부분\n-\n\n✅ 개선이 필요한 부분 및 피드백\n-\n\n✅ 다음 수업 목표 및 계획\n-\n\n✅ 특이사항 및 컨디션 체크\n- `;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const USERS: User[] = [
  { name: '최지훈', role: '대표', color: 'bg-slate-900 text-white' },
  { name: '김윤기', role: '총괄', color: 'bg-indigo-600 text-white' },
  { name: '김구민', role: '팀장', color: 'bg-emerald-600 text-white' },
];

const STATUSES: ITask['status'][] = ['To Do', 'In Progress', 'Done'];
const TAGS = ['General', 'Finance', 'Meeting', 'CS', 'Ops', 'Class'];

export default function SpokeduCombinedDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todayClasses, setTodayClasses] = useState<IClassSession[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [goals, setGoals] = useState<IGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 드래그 앤 드롭 상태
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetUser, setDropTargetUser] = useState<string | null>(null);

  // 모달 제어 상태
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  // 데이터 폼 상태
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [taskForm, setTaskForm] = useState<Omit<ITask, 'id'>>({ title: '', assignee: '최지훈', status: 'To Do', tag: 'General', description: '' });
  const [editingGoal, setEditingGoal] = useState<IGoal | null>(null);
  const [goalForm, setGoalForm] = useState<Omit<IGoal, 'id'>>({ text: '', progress: 0 });
  const [selectedQCEvent, setSelectedQCEvent] = useState<IClassSession | null>(null);
  const [feedback, setFeedback] = useState('');

  // --- 3. 데이터 패칭 ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = new Date(selectedDate); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(end.getDate() + 1);

      const [classesRes, tasksRes, goalsRes] = await Promise.all([
        supabase.from('sessions').select('*, users(name)').gte('start_at', start.toISOString()).lt('start_at', end.toISOString()).order('start_at', { ascending: true }),
        supabase.from('todos').select('*').order('created_at', { ascending: false }),
        supabase.from('goals').select('*').order('created_at', { ascending: true })
      ]);

      if (classesRes.error) throw classesRes.error;
      
      setTodayClasses((classesRes.data || []).map((c: any) => ({
        ...c,
        id: c.id,
        time: c.start_at ? new Date(c.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--',
        title: c.title || '제목 없음',
        teacher: c.users?.name || '미정',
        feedbackStatus: c.status === 'verified' ? 'VERIFIED' : ((c.students_text?.length || 0) > 20 ? 'DONE' : 'WAIT')
      })));
      setTasks(tasksRes.data as ITask[]);
      setGoals(goalsRes.data as IGoal[]);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- 4. 핸들러 함수들 ---
  const onDragStart = (id: string) => setDraggedTaskId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = async (newAssignee: string) => {
    if (!draggedTaskId) return;
    setDropTargetUser(null);
    setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, assignee: newAssignee } : t));
    await supabase.from('todos').update({ assignee: newAssignee }).eq('id', draggedTaskId);
    setDraggedTaskId(null);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title) return;
    const { error: saveError } = editingTask ? await supabase.from('todos').update(taskForm).eq('id', editingTask.id) : await supabase.from('todos').insert([taskForm]);
    if (!saveError) { setIsTaskModalOpen(false); fetchData(); }
  };

  const handleSaveGoal = async () => {
    if (!goalForm.text) return;
    const { error: saveError } = editingGoal ? await supabase.from('goals').update(goalForm).eq('id', editingGoal.id) : await supabase.from('goals').insert([goalForm]);
    if (!saveError) { setIsGoalModalOpen(false); fetchData(); }
  };

  const handleSaveQC = async (newStatus: string) => {
    if (!selectedQCEvent) return;
    const { error } = await supabase.from('sessions').update({ status: newStatus, students_text: feedback }).eq('id', selectedQCEvent.id);
    if (!error) { 
      alert(newStatus === 'verified' ? '검수 승인 완료!' : '수정 요청 완료'); 
      setIsQCModalOpen(false); 
      fetchData(); 
    }
  };

  return (
    <div className="w-full bg-[#F9FAFB] min-h-screen p-4 md:p-8 space-y-8 text-left">
      {/* 줌 이미지 레이어 */}
      {zoomedImg && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImg(null)}>
          <img src={zoomedImg} className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95 duration-200" alt="확대" />
          <button className="absolute top-10 right-10 text-white/50 hover:text-white"><X size={40} /></button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2.5 rounded-2xl text-white shadow-xl shadow-slate-200"><LayoutDashboard size={24} /></div>
          <div>
            <h1 className="text-2xl font-black italic text-slate-800 tracking-tighter uppercase leading-none">Spokedu HQ</h1>
            <p className="text-[10px] font-bold text-indigo-600 mt-1 tracking-widest uppercase">Expert Sport Education</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setSelectedDate(new Date())} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">TODAY</button>
           <div className="flex items-center gap-6 bg-white px-5 py-2.5 rounded-xl border border-gray-100 shadow-sm text-xs font-bold">
            <button onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))} className="p-1 cursor-pointer hover:text-indigo-600"><ChevronLeft size={20}/></button>
            <span className="min-w-[120px] text-center">{selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
            <button onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))} className="p-1 cursor-pointer hover:text-indigo-600"><ChevronRight size={20}/></button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between text-red-600">
          <div className="flex items-center gap-3"><AlertCircle size={20} /><span className="text-sm font-bold">{error}</span></div>
          <button onClick={fetchData} className="p-2 hover:bg-red-100 rounded-xl transition-colors"><RefreshCw size={18}/></button>
        </div>
      )}

      {/* 메인 그리드 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Feedbacks 섹션 */}
        <section className="lg:col-span-8 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-left">
          <h2 className="text-sm font-black flex items-center gap-2 text-slate-800 mb-6 uppercase tracking-widest"><Calendar size={18} className="text-indigo-600" /> Feedbacks</h2>
          <div className="space-y-3">
            {todayClasses.map(cls => (
              <div key={cls.id} className="flex flex-col md:flex-row justify-between p-5 bg-slate-50/50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all group">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-slate-800">{cls.time}</span>
                  <span className="text-xs font-bold text-slate-600">{cls.title}</span>
                </div>
                <div className="flex items-center gap-3 justify-end mt-3 md:mt-0">
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-full ${cls.feedbackStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{cls.feedbackStatus}</span>
                  <button 
                    onClick={() => { 
                      if(cls.feedbackStatus !== 'VERIFIED') return alert('검수 완료된 리포트만 공유 가능합니다.');
                      navigator.clipboard.writeText(`${window.location.origin}/report/${cls.id}`); 
                      alert('학부모 전달용 링크 복사 완료'); 
                    }} 
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="링크 복사"
                  ><Send size={16}/></button>
                  <button onClick={() => { setSelectedQCEvent(cls); setFeedback(cls.students_text || FEEDBACK_TEMPLATE); setIsQCModalOpen(true); }} className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-xl cursor-pointer hover:bg-indigo-600 transition-colors">검수</button>
                </div>
              </div>
            ))}
            {!loading && todayClasses.length === 0 && <div className="py-10 text-center text-gray-300 text-xs font-bold font-black tracking-widest uppercase">No classes scheduled</div>}
          </div>
        </section>

        {/* Goals 섹션 */}
        <section className="lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-left">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black flex items-center gap-2 text-slate-800 uppercase tracking-widest"><Target size={18} className="text-orange-500" /> Goals</h2>
            <button onClick={() => { setEditingGoal(null); setGoalForm({text:'', progress:0}); setIsGoalModalOpen(true); }} className="p-2 text-orange-500 cursor-pointer"><Plus size={20} /></button>
          </div>
          <div className="space-y-6">
            {goals.map(goal => (
              <div key={goal.id} onClick={() => { setEditingGoal(goal); setGoalForm({text:goal.text, progress:goal.progress}); setIsGoalModalOpen(true); }} className="cursor-pointer group">
                <div className="flex justify-between text-[11px] font-black mb-2 px-1"><span>{goal.text}</span><span className="text-orange-600">{goal.progress}%</span></div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: `${goal.progress}%` }}></div></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Task 보드 (드래그 앤 드롭) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {USERS.map(user => (
          <div key={user.name} onDragOver={(e) => { onDragOver(e); setDropTargetUser(user.name); }} onDrop={() => onDrop(user.name)} onDragLeave={() => setDropTargetUser(null)}
            className={`flex flex-col bg-white rounded-3xl border transition-all min-h-[500px] ${dropTargetUser === user.name ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-100 shadow-sm'}`}
          >
            <div className="p-5 border-b border-gray-50 flex items-center justify-between sticky top-0 z-10 bg-white/80 backdrop-blur-md rounded-t-3xl">
              <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shadow-lg ${user.color}`}>{user.name[0]}</div><div><span className="text-sm font-black text-slate-800 block">{user.name}</span><span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</span></div></div>
              <button onClick={() => { setEditingTask(null); setTaskForm({title: '', assignee: user.name, status: 'To Do', tag: 'General', description: ''}); setIsTaskModalOpen(true); }} className="p-2.5 text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors"><Plus size={24}/></button>
            </div>
            <div className="p-4 space-y-4 flex-1">
              {tasks.filter(t => t.assignee === user.name).map(task => (
                <div key={task.id} draggable onDragStart={() => onDragStart(task.id)} onClick={() => { setEditingTask(task); setTaskForm({title:task.title, assignee:task.assignee, status:task.status, tag:task.tag, description:task.description}); setIsTaskModalOpen(true); }}
                  className={`p-5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing hover:shadow-xl group ${task.status === 'Done' ? 'bg-gray-50/50 opacity-50 border-gray-100' : 'bg-white border-slate-100 shadow-sm hover:border-indigo-100'}`}
                >
                  <div className="flex justify-between items-center mb-3"><span className="text-[8px] font-black px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 uppercase border border-indigo-100">{task.tag}</span><GripVertical size={14} className="text-slate-300" /></div>
                  <div className="font-bold text-slate-800 leading-snug text-sm mb-2">{task.title}</div>
                  {task.description && <div className="text-[10px] text-slate-400 line-clamp-2 italic bg-slate-50 p-2.5 rounded-xl">{task.description}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* --- QC 리포트 검수 모달 (통합됨) --- */}
      {isQCModalOpen && selectedQCEvent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[999] flex items-center justify-center p-4" onClick={() => setIsQCModalOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-10 border-b flex justify-between items-center bg-white sticky top-0 z-10 text-left">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedQCEvent.title}</h2>
                <button onClick={() => window.open(`/report/${selectedQCEvent.id}`, '_blank')} className="text-indigo-500 text-xs font-bold flex items-center gap-1 mt-1 hover:underline cursor-pointer"><ExternalLink size={12} /> 미리보기</button>
              </div>
              <button onClick={() => setIsQCModalOpen(false)} className="text-slate-300 hover:text-slate-900 cursor-pointer"><X size={32} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/50 text-left">
              {/* 파일 섹션 */}
              {Array.isArray(selectedQCEvent.file_url) && selectedQCEvent.file_url.length > 0 && (
                <div className="bg-white p-5 rounded-[24px] border border-indigo-100 space-y-3">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 font-mono">Attached Docs</p>
                  {selectedQCEvent.file_url.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl hover:bg-indigo-100 transition-colors">
                      <FileText size={18} className="text-indigo-500" />
                      <span className="text-sm font-bold text-slate-600 truncate">{decodeURIComponent(url.split('/').pop() || 'File')}</span>
                    </a>
                  ))}
                </div>
              )}
              {/* 사진 섹션 */}
              {Array.isArray(selectedQCEvent.photo_url) && selectedQCEvent.photo_url.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {selectedQCEvent.photo_url.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-[24px] overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-all cursor-zoom-in group" onClick={() => setZoomedImg(url)}>
                      <img src={url} className="w-full h-full object-cover" alt="수업 사진" />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"><Maximize2 size={20} className="text-white" /></div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 block">Final Review</label>
                <textarea className="w-full h-80 bg-white border-none shadow-inner rounded-[32px] p-8 text-base leading-relaxed text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              </div>
            </div>
            <div className="p-10 bg-white border-t flex gap-4">
              <button onClick={() => handleSaveQC('finished')} className="flex-1 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-rose-500 hover:bg-rose-50"><RotateCcw size={18} className="inline mr-1" /> 수정 요청</button>
              <button onClick={() => handleSaveQC('verified')} className="flex-[2] py-5 bg-slate-900 rounded-3xl font-black text-white shadow-xl hover:bg-indigo-600 transition-all">검수 승인 및 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Task & Goal 모달 생략 없이 모두 포함 */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setIsTaskModalOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl relative overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-gray-100 flex justify-between items-center"><h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{editingTask ? 'Edit Task' : 'New Task'}</h3><button onClick={() => setIsTaskModalOpen(false)}><X size={20}/></button></div>
            <div className="p-8 space-y-6 text-left">
              <input type="text" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white" placeholder="업무 제목" />
              <div className="grid grid-cols-2 gap-4">
                <select value={taskForm.assignee} onChange={e => setTaskForm({...taskForm, assignee: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none">{USERS.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}</select>
                <select value={taskForm.tag} onChange={e => setTaskForm({...taskForm, tag: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none">{TAGS.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              <textarea value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none min-h-[120px] resize-none" placeholder="상세 내용..." />
              <div className="flex gap-2">{STATUSES.map(s => (<button key={s} onClick={() => setTaskForm({...taskForm, status: s})} className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${taskForm.status === s ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>{s}</button>))}</div>
              <div className="flex gap-3">
                {editingTask && <button onClick={async () => { if(confirm('삭제?')) { await supabase.from('todos').delete().eq('id', editingTask.id); setIsTaskModalOpen(false); fetchData(); } }} className="p-4 text-red-400 hover:bg-red-50 rounded-2xl"><Trash2 size={20}/></button>}
                <button onClick={handleSaveTask} className="flex-1 bg-indigo-600 text-white text-xs font-black py-4 rounded-2xl shadow-xl">SAVE TASK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isGoalModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setIsGoalModalOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl relative animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-8 space-y-6 text-left">
              <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Monthly Goal</h3><button onClick={() => setIsGoalModalOpen(false)}><X size={20}/></button></div>
              <input type="text" value={goalForm.text} onChange={e => setGoalForm({...goalForm, text: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" placeholder="목표 내용" />
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-black"><span>Progress</span><span className="text-orange-600">{goalForm.progress}%</span></div>
                <input type="range" min="0" max="100" value={goalForm.progress} onChange={e => setGoalForm({...goalForm, progress: parseInt(e.target.value)})} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              </div>
              <div className="flex gap-3">
                {editingGoal && <button onClick={async () => { if(confirm('삭제?')) { await supabase.from('goals').delete().eq('id', editingGoal.id); setIsGoalModalOpen(false); fetchData(); } }} className="p-4 text-red-400 hover:bg-red-50 rounded-2xl"><Trash2 size={20}/></button>}
                <button onClick={handleSaveGoal} className="flex-1 bg-orange-500 text-white text-xs font-black py-4 rounded-2xl shadow-xl">SAVE GOAL</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}