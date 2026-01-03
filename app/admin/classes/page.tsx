"use client";

import { useState, useRef } from 'react';
import Link from 'next/link';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';
import { useClassManagement } from './hooks/useClassManagement';
import SessionEditModal from './components/SessionEditModal';
import { SessionEvent, TeacherInput } from './types';

export default function ClassManagementPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const { filteredEvents, teacherList, fetchSessions, supabase, currentView, setCurrentView } = useClassManagement();
  
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editFields, setEditFields] = useState({ title: '', teachers: [] as TeacherInput[], date: '', start: '', end: '', memo: '' });

  const handleEventClick = (info: any) => {
    const p = info.event.extendedProps;
    const startObj = new Date(info.event.start);
    const endObj = new Date(info.event.end);
    setSelectedEvent({ id: info.event.id, title: info.event.title, start: info.event.start, end: info.event.end, ...p });
    
    let loadedTeachers = [{ id: p.teacherId, price: p.price }];
    let cleanMemo = p.studentsText || '';
    if (cleanMemo.includes('EXTRA_TEACHERS:')) {
      const parts = cleanMemo.split('EXTRA_TEACHERS:');
      cleanMemo = parts[0].trim();
      try { loadedTeachers = [{ id: p.teacherId, price: p.price }, ...JSON.parse(parts[1])]; } catch (e) {}
    }

    setEditFields({ 
      title: p.roundInfo ? `${p.roundInfo} ${info.event.title}` : info.event.title, 
      teachers: loadedTeachers, 
      date: startObj.toLocaleDateString('en-CA'), start: startObj.toTimeString().slice(0, 5), 
      end: endObj.toTimeString().slice(0, 5), memo: cleanMemo 
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedEvent) return;
    const mainT = editFields.teachers[0];
    const extras = editFields.teachers.slice(1).filter(t => t.id);
    let finalMemo = editFields.memo.split('EXTRA_TEACHERS:')[0].trim();
    if (extras.length > 0) finalMemo += `\nEXTRA_TEACHERS:${JSON.stringify(extras)}`;
    await supabase.from('sessions').update({
      title: editFields.title, created_by: mainT.id || null, price: Number(mainT.price) || 0,
      start_at: new Date(`${editFields.date}T${editFields.start}:00`).toISOString(),
      end_at: new Date(`${editFields.date}T${editFields.end}:00`).toISOString(),
      students_text: finalMemo
    }).eq('id', selectedEvent.id);
    setIsModalOpen(false); fetchSessions();
  };

  const updateStatus = async (status: string | null) => {
    if (!selectedEvent) return;
    if (status === 'deleted') {
      if (!confirm('영구 삭제하시겠습니까?')) return;
      await supabase.from('sessions').delete().eq('id', selectedEvent.id);
    } else {
      await supabase.from('sessions').update({ status }).eq('id', selectedEvent.id);
    }
    setIsModalOpen(false); fetchSessions();
  };

  const handlePostponeCascade = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const targetId = selectedEvent?.id;
    if (!targetId) return;
    if (!confirm('이 수업을 포함하여 이후 모든 일정을 1주일씩 미루시겠습니까?')) return;
    const { data: currentSession } = await supabase.from('sessions').select('*').eq('id', targetId).single();
    const groupId = currentSession?.group_id;
    if (!groupId) return alert('그룹 ID 없음');
    const { data: future } = await supabase.from('sessions').select('*').eq('group_id', groupId).gte('start_at', currentSession.start_at).order('start_at', { ascending: false });
    if (future) {
      for (const s of future) {
        const ns = new Date(new Date(s.start_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const ne = new Date(new Date(s.end_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('sessions').update({ start_at: ns, end_at: ne }).eq('id', s.id);
      }
    }
    const { id, created_at, ...copyData } = currentSession;
    await supabase.from('sessions').insert([{ ...copyData, start_at: currentSession.start_at, status: 'postponed' }]);
    setIsModalOpen(false); fetchSessions();
  };

  const handleUndoPostpone = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const targetId = selectedEvent?.id;
    if (!targetId || !confirm('연기 취소 및 일정을 당기시겠습니까?')) return;
    const { data: currentSession } = await supabase.from('sessions').select('*').eq('id', targetId).single();
    if (!currentSession?.group_id) return;
    const { data: future } = await supabase.from('sessions').select('*').eq('group_id', currentSession.group_id).gt('start_at', currentSession.start_at).order('start_at', { ascending: true });
    if (future) {
      for (const s of future) {
        const ns = new Date(new Date(s.start_at).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const ne = new Date(new Date(s.end_at).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('sessions').update({ start_at: ns, end_at: ne }).eq('id', s.id);
      }
    }
    await supabase.from('sessions').delete().eq('id', targetId);
    setIsModalOpen(false); fetchSessions();
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      <Sidebar />
      <div className="flex-1 overflow-hidden flex flex-col">
        <style>{`
          .fc-event, button, select, a { cursor: pointer !important; }
          .fc-daygrid-day-number { font-size: 1.1rem; font-weight: 900; font-style: italic; color: #CBD5E1; padding: 8px !important; }
          .fc-day-today { background-color: #F8FAFC !important; }
          .month-row-info { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%; font-size: 9px; font-weight: 600; color: #475569; }
          .four-day-title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.25; font-size: 10px; font-weight: 800; margin-top: 4px; color: #1E293B; word-break: keep-all; white-space: normal; }
        `}</style>

        <nav className="border-b px-4 py-3 bg-white flex justify-between items-center z-50">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black italic uppercase">SPOKEDU</h1>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => calendarRef.current?.getApi().prev()} className="p-1.5 hover:bg-white rounded-md transition-all"><ChevronLeft size={16}/></button>
              <button onClick={() => calendarRef.current?.getApi().today()} className="px-3 text-[10px] font-black uppercase">TODAY</button>
              <button onClick={() => calendarRef.current?.getApi().next()} className="p-1.5 hover:bg-white rounded-md transition-all"><ChevronRight size={16}/></button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 p-0.5 bg-slate-100 rounded-lg flex items-center mr-2">
              <button onClick={() => {calendarRef.current?.getApi().changeView('rollingFourDay'); setCurrentView('rollingFourDay');}} className={`px-4 text-[10px] font-black ${currentView === 'rollingFourDay' ? 'bg-white rounded-md shadow-sm text-blue-600' : 'text-slate-400'}`}>4-DAY</button>
              <button onClick={() => {calendarRef.current?.getApi().changeView('dayGridMonth'); setCurrentView('dayGridMonth');}} className={`px-4 text-[10px] font-black ${currentView === 'dayGridMonth' ? 'bg-white rounded-md shadow-sm text-blue-600' : 'text-slate-400'}`}>MONTH</button>
            </div>
            <Link href="/class/create" className="h-9 px-4 bg-blue-600 text-white text-xs font-black rounded-lg flex items-center shadow-md">+ NEW</Link>
          </div>
        </nav>

        <main className="flex-1 p-2 overflow-auto">
          <FullCalendar
            ref={calendarRef} plugins={[dayGridPlugin, interactionPlugin]} initialView="rollingFourDay"
            views={{ rollingFourDay: { type: 'dayGrid', duration: { days: 4 } } }}
            editable={true} headerToolbar={false} locale="ko" events={filteredEvents} eventClick={handleEventClick} height="auto"
            eventContent={(info) => {
              const { teacher, themeColor, status, isAdmin, roundInfo } = info.event.extendedProps;
              const dateObj = new Date(info.event.start || '');
              const time24 = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
              const isPostponed = status === 'postponed', isCancelled = status === 'cancelled';
              const isFinished = (info.event.end || info.event.start || 0) < new Date();
              let bgColor = isAdmin ? '#FEFCE8' : '#FFFFFF', borderColor = themeColor;
              if (isCancelled) { bgColor = '#FEF2F2'; borderColor = '#EF4444'; }
              if (isPostponed) { bgColor = '#F5F3FF'; borderColor = '#8B5CF6'; }
              if (isFinished && !isCancelled && !isPostponed) { bgColor = '#F8FAFC'; borderColor = '#CBD5E1'; }

              return (
                <div className="w-full flex flex-col p-2.5 rounded-xl border-l-[4px] shadow-sm" style={{ borderLeftColor: borderColor, backgroundColor: bgColor }}>
                  <div className="flex justify-between items-start"><div className="text-[10px] font-bold text-slate-400 tabular-nums">{time24}</div>{(isPostponed || isCancelled) && <span className={`text-white text-[7px] px-1.5 py-0.5 rounded-full font-black ${isPostponed ? 'bg-purple-500' : 'bg-red-500'}`}>{isPostponed ? '연기됨' : '취소됨'}</span>}</div>
                  <div className="flex justify-between items-end mt-1"><div className={`text-[11px] font-black ${isAdmin ? 'text-amber-700' : 'text-blue-600'}`}>{teacher}T</div>{roundInfo && <span className="text-[9px] font-black text-slate-300">{roundInfo}</span>}</div>
                  <div className={`four-day-title ${isFinished || isPostponed || isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{info.event.title}</div>
                </div>
              );
            }}
          />
        </main>
      </div>

      <SessionEditModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        selectedEvent={selectedEvent} editFields={editFields} setEditFields={setEditFields}
        teacherList={teacherList} onUpdate={handleUpdate} onUpdateStatus={updateStatus}
        onPostpone={handlePostponeCascade} onUndoPostpone={handleUndoPostpone}
      />
    </div>
  );
}