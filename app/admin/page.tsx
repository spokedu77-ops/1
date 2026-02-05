'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import type { Schedule } from '@/app/lib/schedules/types';
import { 
  Calendar, RefreshCw, CheckCircle2, 
  Circle, Clock, FileText, User, Users, Plus, X, Trash2, Save, CalendarDays, ExternalLink
} from 'lucide-react';

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
  startAt?: string;
  time: string;
  endTime: string;
  title: string;
  teacher: string;
  isFinished: boolean;
  isPostponed?: boolean;
  isCancelled?: boolean;
  status?: string;
  roundDisplay?: string;
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export default function SpokeduHQDashboard() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [todayClasses, setTodayClasses] = useState<IClassSession[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [vacationRequests, setVacationRequests] = useState<IVacationRequest[]>([]);
  const [scheduleSummary, setScheduleSummary] = useState<Schedule[]>([]);
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
    if (!supabaseUrl || !supabase) return;
    setLoading(true);
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const [classesRes, tasksRes, usersRes, schedulesRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('*, users:created_by(id, name)')
          .gte('start_at', startOfDay)
          .lte('start_at', endOfDay)
          .order('start_at', { ascending: true }),
        supabase.from('todos').select('*').order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id, name, vacation')
          .eq('is_active', true)
          .not('vacation', 'is', null)
          .neq('vacation', ''),
        supabase
          .from('schedules')
          .select('*')
          .order('start_date', { ascending: true, nullsFirst: false })
          .order('updated_at', { ascending: false })
          .limit(7),
      ]);
      const recentSchedules: Schedule[] = (schedulesRes.data ?? []).map((row: Schedule) => ({
        ...row,
        checklist: Array.isArray(row.checklist) ? row.checklist : [],
      }));

      // Class Sessions: 시간 순서 유지 (start_at 오름차순), 연기/취소는 뒤로
      const rawClasses = classesRes.data || [];
      const formattedClasses = rawClasses
        .map((c: { id: string; start_at: string; end_at: string; title?: string; status?: string; round_display?: string; round_index?: number; round_total?: number; users?: { name?: string } }) => {
          const endTime = new Date(c.end_at);
          const isPostponed = c.status === 'postponed';
          const isCancelled = c.status === 'cancelled';
          const roundDisplay = c.round_display ?? (c.round_index != null && c.round_total != null ? `${c.round_index}/${c.round_total}` : undefined);
          return {
            id: c.id,
            startAt: c.start_at,
            time: new Date(c.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
            endTime: endTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
            title: c.title || '제목 없음',
            teacher: c.users?.name || '미정',
            isFinished: now > endTime && c.status === 'finished',
            isPostponed: isPostponed,
            isCancelled: isCancelled,
            status: c.status,
            roundDisplay
          };
        })
        .sort((a, b) => {
          const timeA = new Date(a.startAt).getTime();
          const timeB = new Date(b.startAt).getTime();
          if (timeA !== timeB) return timeA - timeB;
          if (a.isPostponed || a.isCancelled) return 1;
          if (b.isPostponed || b.isCancelled) return -1;
          if (a.isFinished && !b.isFinished) return 1;
          if (!a.isFinished && b.isFinished) return -1;
          return 0;
        });

      setTodayClasses(formattedClasses);
      setTasks(tasksRes.data as ITask[] || []);
      setScheduleSummary(recentSchedules);
      
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
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNoteModal = async (boardId: string) => {
    if (!supabase) return;
    setSelectedBoard(boardId);
    setNoteContent('로딩 중...');
    setIsNoteModalOpen(true);
    
    const { data } = await supabase.from('memos').select('content').eq('assignee', boardId).single();
    setNoteContent(data?.content || '');
  };

  const handleSaveNote = async () => {
    if (!selectedBoard || !supabase) return;
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert(`저장 실패: ${msg}`);
      setIsSavingNote(false);
    }
  };

  const toggleStatus = async (task: ITask, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase) return;
    const nextStatusMap: Record<string, ITask['status']> = { 'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do' };
    await supabase.from('todos').update({ status: nextStatusMap[task.status] }).eq('id', task.id);
    fetchData();
  };

  const handleSaveTask = async () => {
    if (!taskForm.title || !supabase) return;
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
    <div className="min-h-screen bg-white px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:p-6 md:p-8 sm:pt-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-4 sm:space-y-8 md:space-y-12 min-w-0">
        
        {/* Header - 모바일에서 세로 배치, 터치 영역 확보 */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 border-b-2 pb-3 sm:pb-8 border-slate-900">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black italic tracking-tighter text-slate-900 uppercase leading-none mb-1">
              Spokedu HQ
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                Operational Control Center
              </p>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
              </span>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button 
              onClick={fetchData} 
              className="min-h-[44px] min-w-[44px] p-3 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all cursor-pointer group touch-manipulation flex items-center justify-center"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
            <button 
              onClick={() => { 
                setEditingTask(null); 
                setTaskForm({ title: '', assignee: 'Common', status: 'To Do', tag: 'General', description: '' }); 
                setIsTaskModalOpen(true); 
              }} 
              className="min-h-[44px] px-4 sm:px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 touch-manipulation"
            >
              <Plus size={16} />
              New Task
            </button>
          </div>
        </header>

        {/* 1. Today's Sessions */}
        <section className="w-full min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today Session Summary</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                완료 {todayClasses.filter(c => c.isFinished).length} / 
                진행중 {todayClasses.filter(c => !c.isFinished && !c.isPostponed && !c.isCancelled).length} / 
                연기 {todayClasses.filter(c => c.isPostponed).length}
              </span>
            </div>
          </div>
          <div className="border-t border-slate-50 divide-y divide-slate-50 overflow-x-auto">
            {todayClasses.length > 0 ? todayClasses.map((cls) => (
              <div key={cls.id} className={`py-3 flex flex-wrap items-center justify-between gap-2 min-w-0 ${
                cls.isFinished ? 'opacity-20 grayscale' : 
                cls.isPostponed ? 'bg-purple-50 border-l-4 border-purple-400 pl-3' :
                cls.isCancelled ? 'bg-red-50 border-l-4 border-red-400 pl-3 line-through' : ''
              }`}>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0 flex-1">
                  <span className="text-[11px] font-bold tabular-nums text-slate-400 w-20 sm:w-24 shrink-0">{cls.time} - {cls.endTime}</span>
                  {cls.roundDisplay && (
                    <span className="text-[8px] font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase shrink-0">{cls.roundDisplay}</span>
                  )}
                  <span className="text-[12px] font-bold text-slate-800 truncate min-w-0">{(cls.title || '').replace(/^\d+\/\d+\s*/, '').trim() || cls.title}</span>
                  {cls.isPostponed && (
                    <span className="text-[8px] font-black text-purple-600 bg-purple-100 px-2 py-1 rounded uppercase">연기됨</span>
                  )}
                  {cls.isCancelled && (
                    <span className="text-[8px] font-black text-red-600 bg-red-100 px-2 py-1 rounded uppercase">취소됨</span>
                  )}
                </div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter shrink-0">{cls.teacher}</span>
              </div>
            )) : <p className="py-4 text-[11px] text-slate-300 italic">No classes scheduled.</p>}
          </div>
        </section>

        {/* 2. 일정 요약 */}
        <section>
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-slate-400" />
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">일정</h2>
            </div>
            <Link
              href="/admin/schedules"
              className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700"
            >
              전체 보기
              <ExternalLink size={12} />
            </Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden -mx-1 sm:mx-0">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="min-w-full divide-y divide-slate-200 text-sm" style={{ minWidth: '320px' }}>
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">제목</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">담당</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">기간</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {scheduleSummary.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-400 text-[11px]">
                        일정이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    scheduleSummary.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800 truncate max-w-[140px]">{s.title}</td>
                        <td className="px-3 py-2 text-slate-600">{s.assignee ?? '-'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {s.start_date && s.end_date ? `${s.start_date} ~ ${s.end_date}` : s.start_date ?? s.end_date ?? '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium ${
                            s.status === 'done' ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-800'
                          }`}>
                            {s.status === 'done' ? '종료' : '진행중'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 3. 업무 노트 갤러리 (2열 카드) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">업무 노트</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* 공통 공지 카드 */}
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 border-b-4 border-slate-400 pb-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
                  <Users size={18} className="text-slate-900" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">공통 공지</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">수업 연기 알림</p>
                </div>
              </div>
              {vacationRequests.length > 0 ? (
                <div className="space-y-2">
                  {vacationRequests.map((v) => {
                    const dateMatch = v.vacation?.match(/(\d{8})/);
                    const dateStr = dateMatch ? `${dateMatch[0].slice(4, 6)}/${dateMatch[0].slice(6, 8)}` : '';
                    return (
                      <div key={v.id} className="px-3 py-2 bg-rose-50/50 border border-rose-100 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">{v.name}</span>
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{dateStr}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{v.vacation}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">수업 연기 알림 없음</p>
              )}
            </div>

            {/* 담당자별 업무 노트 카드 */}
            {BOARDS.filter((b) => b.id !== 'Common').map((board) => (
              <div key={board.id} className={`rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all ${board.accent}`}>
                <div className={`flex items-center gap-2 border-b-4 ${board.accent} pb-3 mb-4`}>
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${
                    board.id === '최지훈' ? 'from-indigo-100 to-indigo-200' :
                    board.id === '김윤기' ? 'from-blue-100 to-blue-200' :
                    'from-emerald-100 to-emerald-200'
                  }`}>
                    <board.icon size={18} className="text-slate-900" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">{board.name} 업무 노트</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                      {tasks.filter((t) => t.assignee === board.id && t.status !== 'Done').length} Active Tasks
                    </p>
                  </div>
                </div>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {board.hasMemo && (
                    <div
                      onClick={() => openNoteModal(board.id)}
                      className="py-3 px-3 rounded-xl flex items-center gap-3 hover:bg-slate-900 hover:text-white transition-all cursor-pointer group border border-dashed border-slate-200"
                    >
                      <FileText size={16} className="text-slate-400 group-hover:text-white" />
                      <span className="text-sm font-bold">Daily Work Note</span>
                    </div>
                  )}
                  {tasks.filter((t) => t.assignee === board.id).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => { setEditingTask(task); setTaskForm({ ...task }); setIsTaskModalOpen(true); }}
                      className={`py-3 px-3 flex items-start gap-3 rounded-xl border border-slate-100 hover:border-slate-200 cursor-pointer transition-all ${
                        task.status === 'Done' ? 'opacity-60' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleStatus(task, e); }}
                        className="shrink-0 mt-0.5"
                      >
                        {task.status === 'Done' ? (
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        ) : task.status === 'In Progress' ? (
                          <Clock size={18} className="text-blue-500" />
                        ) : (
                          <Circle size={18} className="text-slate-300" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.filter((t) => t.assignee === board.id).length === 0 && !board.hasMemo && (
                    <p className="py-4 text-center text-[11px] text-slate-400 italic">No tasks</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Daily Note Modal - 모바일에서 하단 시트 형태 */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-[#FFFDE7] rounded-t-[32px] sm:rounded-[40px] w-full max-w-2xl max-h-[90vh] sm:h-[70vh] flex flex-col p-6 sm:p-10 shadow-2xl relative border-8 border-white overflow-hidden">
            <button onClick={() => setIsNoteModalOpen(false)} className="absolute top-4 right-4 sm:top-8 sm:right-8 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-900 text-3xl font-light cursor-pointer touch-manipulation">×</button>
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

      {/* Task Editor Modal - 모바일 하단 시트 */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-10 shadow-2xl relative animate-in zoom-in duration-150">
            <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-4 right-4 sm:top-8 sm:right-8 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-slate-900 cursor-pointer touch-manipulation"><X size={20}/></button>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">{editingTask ? 'Edit Task' : 'Register Task'}</h3>
            <div className="space-y-5">
              <input autoFocus type="text" placeholder="Title" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full min-h-[48px] px-5 py-4 bg-slate-50 rounded-2xl text-base sm:text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-100 touch-manipulation" />
              <div className="grid grid-cols-2 gap-4">
                <select value={taskForm.assignee} onChange={e => setTaskForm({...taskForm, assignee: e.target.value})} className="min-h-[48px] px-5 py-4 bg-slate-50 rounded-2xl text-[11px] font-black border-none outline-none touch-manipulation">
                  {BOARDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select value={taskForm.tag} onChange={e => setTaskForm({...taskForm, tag: e.target.value})} className="min-h-[48px] px-5 py-4 bg-slate-50 rounded-2xl text-[11px] font-black border-none outline-none touch-manipulation">
                  {['General', 'Finance', 'Meeting', 'CS', 'Ops', 'Class'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <textarea placeholder="Description" value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="w-full min-h-[140px] px-5 py-4 bg-slate-50 rounded-2xl text-base sm:text-[11px] font-bold border-none outline-none resize-none touch-manipulation" />
              <div className="flex gap-2 pt-2">
                {editingTask && (
                  <button onClick={async () => { if(supabase && confirm('Delete?')) { await supabase.from('todos').delete().eq('id', editingTask.id); setIsTaskModalOpen(false); fetchData(); } }} className="p-4 text-red-400 hover:bg-red-50 rounded-2xl transition-all cursor-pointer"><Trash2 size={24}/></button>
                )}
                <button onClick={handleSaveTask} className="flex-1 min-h-[48px] bg-slate-900 text-white text-[11px] font-black py-5 rounded-2xl hover:bg-indigo-600 shadow-xl transition-all cursor-pointer touch-manipulation">SUBMIT HQ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}