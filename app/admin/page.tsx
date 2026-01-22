'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Calendar, AlertCircle, RefreshCw, CheckCircle2, 
  Circle, Clock, FileText, User, Users, Plus, X, Trash2, Save
} from 'lucide-react';

// --- Supabase Client (Vercel 환경 변수 예외 처리) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Interfaces ---
interface ITask {
  id: string;
  title: string;
  assignee: string;
  status: 'To Do' | 'In Progress' | 'Done';
  tag: string;
  description: string;
}

interface IClassSession {
  id: string;
  time: string;
  endTime: string;
  title: string;
  teacher: string;
  isFinished: boolean;
  isPostponed?: boolean;
  isCancelled?: boolean;
  status?: string;
}

interface IVacationRequest {
  id: string;
  name: string;
  vacation: string;
}

// --- Constants ---
const BOARDS = [
  { id: 'Common', name: '공통 운영', icon: Users, accent: 'border-slate-400', hasMemo: false },
  { id: '최지훈', name: '최지훈', icon: User, accent: 'border-indigo-500', hasMemo: true },
  { id: '김윤기', name: '김윤기', icon: User, accent: 'border-blue-500', hasMemo: true },
  { id: '김구민', name: '김구민', icon: User, accent: 'border-emerald-500', hasMemo: true },
];

export default function SpokeduHQDashboard() {
  const [todayClasses, setTodayClasses] = useState<IClassSession[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [vacationRequests, setVacationRequests] = useState<IVacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  
  // State for Daily Note
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // State for Task Form
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [taskForm, setTaskForm] = useState<Omit<ITask, 'id'>>({ 
    title: '', assignee: 'Common', status: 'To Do', tag: 'General', description: '' 
  });

  const fetchData = useCallback(async () => {
    if (!supabaseUrl) return;
    setLoading(true);
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const [classesRes, tasksRes, usersRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('*, users:created_by(id, name)')
          .gte('start_at', startOfDay)
          .lte('start_at', endOfDay),
        supabase.from('todos').select('*').order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id, name, vacation')
          .eq('is_active', true)
          .not('vacation', 'is', null)
          .neq('vacation', '')
      ]);

      // Class Sessions Sorting
      const formattedClasses = (classesRes.data || []).map((c: any) => {
        const endTime = new Date(c.end_at);
        const isPostponed = c.status === 'postponed';
        const isCancelled = c.status === 'cancelled';
        
        return {
          id: c.id,
          time: new Date(c.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
          endTime: endTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
          title: c.title || '제목 없음',
          teacher: c.users?.name || '미정',
          isFinished: now > endTime && c.status === 'finished',
          isPostponed: isPostponed,
          isCancelled: isCancelled,
          status: c.status
        };
      }).sort((a, b) => {
        if (a.isPostponed || a.isCancelled) return 1;
        if (b.isPostponed || b.isCancelled) return -1;
        if (a.isFinished && !b.isFinished) return 1;
        if (!a.isFinished && b.isFinished) return -1;
        return 0;
      });

      setTodayClasses(formattedClasses);
      setTasks(tasksRes.data as ITask[] || []);
      
      // Vacation Filtering (오늘 이전 데이터 자동 제외)
      const validVacations = (usersRes.data || []).filter(v => {
        const dateMatch = v.vacation?.match(/\d{8}/);
        return dateMatch ? dateMatch[0] >= todayStr : true;
      });
      setVacationRequests(validVacations as IVacationRequest[]);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNoteModal = async (boardId: string) => {
    setSelectedBoard(boardId);
    setNoteContent('로딩 중...');
    setIsNoteModalOpen(true);
    
    const { data } = await supabase.from('memos').select('content').eq('assignee', boardId).single();
    setNoteContent(data?.content || '');
  };

  const handleSaveNote = async () => {
    if (!selectedBoard) return;
    setIsSavingNote(true);
    
    try {
      const { error } = await supabase
        .from('memos')
        .upsert({ 
          assignee: selectedBoard, 
          content: noteContent,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'assignee' 
        });
      
      if (error) {
        console.error('Save error:', error);
        alert(`저장 실패: ${error.message || JSON.stringify(error)}`);
        setIsSavingNote(false);
        return;
      }
      
      alert('저장되었습니다!');
      setIsSavingNote(false);
      setIsNoteModalOpen(false);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      alert(`저장 실패: ${err?.message || '알 수 없는 오류'}`);
      setIsSavingNote(false);
    }
  };

  const toggleStatus = async (task: ITask, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatusMap: Record<string, ITask['status']> = { 'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do' };
    await supabase.from('todos').update({ status: nextStatusMap[task.status] }).eq('id', task.id);
    fetchData();
  };

  const handleSaveTask = async () => {
    if (!taskForm.title) return;
    const { error } = editingTask 
      ? await supabase.from('todos').update(taskForm).eq('id', editingTask.id)
      : await supabase.from('todos').insert([taskForm]);
    if (!error) {
      setIsTaskModalOpen(false);
      fetchData();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic text-slate-300">HQ INITIALIZING...</div>;

  return (
    <div className="min-h-screen bg-white p-6 sm:p-12 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-12">
        
        {/* Header */}
        <header className="flex justify-between items-end border-b-2 pb-8 border-slate-900">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase leading-none mb-1">
              Spokedu HQ
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                Operational Control Center
              </p>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchData} 
              className="p-3 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all cursor-pointer group"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
            <button 
              onClick={() => { 
                setEditingTask(null); 
                setTaskForm({ title: '', assignee: 'Common', status: 'To Do', tag: 'General', description: '' }); 
                setIsTaskModalOpen(true); 
              }} 
              className="px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus size={16} />
              New Task
            </button>
          </div>
        </header>

        {/* 1. Today's Sessions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today Session Summary</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-400">
                완료 {todayClasses.filter(c => c.isFinished).length} / 
                진행중 {todayClasses.filter(c => !c.isFinished && !c.isPostponed && !c.isCancelled).length} / 
                연기 {todayClasses.filter(c => c.isPostponed).length}
              </span>
            </div>
          </div>
          <div className="border-t border-slate-50 divide-y divide-slate-50">
            {todayClasses.length > 0 ? todayClasses.map((cls) => (
              <div key={cls.id} className={`py-3 flex items-center justify-between ${
                cls.isFinished ? 'opacity-20 grayscale' : 
                cls.isPostponed ? 'bg-purple-50 border-l-4 border-purple-400 pl-3' :
                cls.isCancelled ? 'bg-red-50 border-l-4 border-red-400 pl-3 line-through' : ''
              }`}>
                <div className="flex items-center gap-10">
                  <span className="text-[11px] font-bold tabular-nums text-slate-400 w-24">{cls.time} - {cls.endTime}</span>
                  <span className="text-[12px] font-bold text-slate-800">{cls.title}</span>
                  {cls.isPostponed && (
                    <span className="text-[8px] font-black text-purple-600 bg-purple-100 px-2 py-1 rounded uppercase">연기됨</span>
                  )}
                  {cls.isCancelled && (
                    <span className="text-[8px] font-black text-red-600 bg-red-100 px-2 py-1 rounded uppercase">취소됨</span>
                  )}
                </div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{cls.teacher}</span>
              </div>
            )) : <p className="py-4 text-[11px] text-slate-300 italic">No classes scheduled.</p>}
          </div>
        </section>

        {/* 2~5. Individual Boards Stack */}
        <div className="space-y-8">
          {BOARDS.map((board) => (
            <section key={board.id} className="flex flex-col bg-gradient-to-br from-white to-slate-50 rounded-3xl p-6 border-2 border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className={`flex items-center justify-between border-b-4 ${board.accent} pb-4 mb-5`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${
                    board.id === 'Common' ? 'from-slate-100 to-slate-200' :
                    board.id === '최지훈' ? 'from-indigo-100 to-indigo-200' :
                    board.id === '김윤기' ? 'from-blue-100 to-blue-200' :
                    'from-emerald-100 to-emerald-200'
                  }`}>
                    <board.icon size={18} className="text-slate-900" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-slate-900 uppercase">{board.name}</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                      {tasks.filter(t => t.assignee === board.id && t.status !== 'Done').length} Active Tasks
                    </p>
                  </div>
                </div>
              </div>

              {/* Vacation Alerts (Only for Common) */}
              {board.id === 'Common' && vacationRequests.length > 0 && (
                <div className="mb-4 p-5 bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border-2 border-rose-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={16} className="text-rose-600" />
                    <h4 className="text-[11px] font-black text-rose-700 uppercase tracking-widest">수업 연기 알림</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {vacationRequests.map(v => {
                      const dateMatch = v.vacation?.match(/(\d{8})/);
                      const dateStr = dateMatch ? `${dateMatch[0].slice(4,6)}/${dateMatch[0].slice(6,8)}` : '';
                      return (
                        <div key={v.id} className="px-4 py-3 bg-white border-2 border-rose-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-black text-slate-800">{v.name} T</span>
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">{dateStr}</span>
                          </div>
                          <p className="text-[9px] font-medium text-slate-500 mt-1 truncate">{v.vacation}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Task List (With Daily Note if applicable) */}
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-50 pr-2">
                
                {/* 운영진 전용 데일리 노트 */}
                {board.hasMemo && (
                  <div 
                    onClick={() => openNoteModal(board.id)}
                    className="py-5 px-3 mb-1 bg-slate-50/50 rounded-2xl flex items-center gap-4 hover:bg-slate-900 hover:text-white transition-all cursor-pointer group border border-dashed border-slate-200"
                  >
                    <FileText size={18} className="text-slate-400 group-hover:text-white" />
                    <div className="flex-1">
                      <h4 className="text-[13px] font-black uppercase tracking-tight">Open Daily Work Note</h4>
                      <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-0.5 group-hover:text-slate-300">Detailed memo and history</p>
                    </div>
                  </div>
                )}

                {/* Individual Items */}
                {tasks.filter(t => t.assignee === board.id).map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => { setEditingTask(task); setTaskForm({...task}); setIsTaskModalOpen(true); }}
                    className={`py-4 px-4 flex items-start gap-4 bg-white hover:bg-slate-50 transition-all cursor-pointer rounded-xl border-2 border-transparent hover:border-slate-200 shadow-sm hover:shadow-md ${
                      task.status === 'Done' ? 'opacity-40' : ''
                    }`}
                  >
                    <button 
                      onClick={(e) => toggleStatus(task, e)} 
                      className="mt-0.5 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                    >
                      {task.status === 'Done' ? 
                        <CheckCircle2 size={20} className="text-emerald-500" /> : 
                       task.status === 'In Progress' ? 
                        <Clock size={20} className="text-blue-500 animate-pulse" /> : 
                        <Circle size={20} className="text-slate-300 group-hover:text-slate-400" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-4">
                        <h4 className="text-[13px] font-bold text-slate-800 truncate">{task.title}</h4>
                        <span className={`text-[8px] font-black uppercase tracking-widest shrink-0 px-2 py-1 rounded ${
                          task.tag === 'Finance' ? 'bg-emerald-100 text-emerald-700' :
                          task.tag === 'Meeting' ? 'bg-blue-100 text-blue-700' :
                          task.tag === 'CS' ? 'bg-purple-100 text-purple-700' :
                          task.tag === 'Ops' ? 'bg-orange-100 text-orange-700' :
                          task.tag === 'Class' ? 'bg-pink-100 text-pink-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{task.tag}</span>
                      </div>
                      {task.description && (
                        <div className="space-y-1">
                          {task.description.split('\n').filter(l => l.trim()).map((line, i) => (
                            <p key={i} className="text-[11px] text-slate-500 font-medium leading-relaxed">
                              • {line.trim()}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {tasks.filter(t => t.assignee === board.id).length === 0 && !board.hasMemo && (
                  <p className="py-8 text-center text-[11px] text-slate-300 italic font-bold">No active tasks.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Daily Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-[#FFFDE7] rounded-[40px] w-full max-w-2xl h-[70vh] flex flex-col p-10 shadow-2xl relative border-8 border-white">
            <button onClick={() => setIsNoteModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 text-3xl font-light cursor-pointer">×</button>
            <div className="mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-600 mb-2">Daily Note Pad</h3>
              <h2 className="text-2xl font-black text-slate-900">{selectedBoard} 업무 메모</h2>
            </div>
            <textarea 
              autoFocus
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="flex-1 w-full bg-transparent border-none outline-none resize-none text-[15px] font-medium leading-relaxed text-slate-700 custom-scrollbar"
              placeholder="상세 업무 내용을 자유롭게 기록하세요..."
            />
            <div className="mt-6 flex justify-end">
              <button onClick={handleSaveNote} className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black hover:bg-yellow-600 transition-all shadow-xl cursor-pointer">
                {isSavingNote ? <RefreshCw className="animate-spin w-4 h-4"/> : <Save size={16}/>}
                SAVE & CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Editor Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-[32px] w-full max-w-md p-10 shadow-2xl relative animate-in zoom-in duration-150">
            <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 cursor-pointer"><X size={20}/></button>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">{editingTask ? 'Edit Task' : 'Register Task'}</h3>
            <div className="space-y-5">
              <input autoFocus type="text" placeholder="Title" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-100" />
              <div className="grid grid-cols-2 gap-4">
                <select value={taskForm.assignee} onChange={e => setTaskForm({...taskForm, assignee: e.target.value})} className="px-5 py-4 bg-slate-50 rounded-2xl text-[11px] font-black border-none outline-none">
                  {BOARDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select value={taskForm.tag} onChange={e => setTaskForm({...taskForm, tag: e.target.value})} className="px-5 py-4 bg-slate-50 rounded-2xl text-[11px] font-black border-none outline-none">
                  {['General', 'Finance', 'Meeting', 'CS', 'Ops', 'Class'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <textarea placeholder="Description" value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-[11px] font-bold min-h-[140px] border-none outline-none resize-none" />
              <div className="flex gap-2 pt-2">
                {editingTask && (
                  <button onClick={async () => { if(confirm('Delete?')) { await supabase.from('todos').delete().eq('id', editingTask.id); setIsTaskModalOpen(false); fetchData(); } }} className="p-4 text-red-400 hover:bg-red-50 rounded-2xl transition-all cursor-pointer"><Trash2 size={24}/></button>
                )}
                <button onClick={handleSaveTask} className="flex-1 bg-slate-900 text-white text-[11px] font-black py-5 rounded-2xl hover:bg-indigo-600 shadow-xl transition-all cursor-pointer">SUBMIT HQ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}