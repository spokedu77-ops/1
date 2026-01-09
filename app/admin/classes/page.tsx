"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg, EventDropArg } from "@fullcalendar/core";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';
import { useClassManagement } from './hooks/useClassManagement';
import SessionEditModal from './components/SessionEditModal';
import { SessionEvent, TeacherInput } from './types';

const MILEAGE_DATA = [
  { label: '蹂닿퀬 ?꾨씫', val: -1000 },
  { label: '?쇰뱶諛??꾨씫', val: -1000 },
  { label: '?곌린 ?붿껌', val: -5000 },
  { label: '?뱀씪 ?붿껌', val: -15000 },
  { label: '?섏뾽 ?곌린', val: 2500 },
  { label: '?뱀씪 ?곌린', val: 5000 },
];

export default function ClassManagementPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const { filteredEvents, teacherList, fetchSessions, supabase, currentView, setCurrentView } = useClassManagement();
  
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editFields, setEditFields] = useState({ 
    title: '', 
    teachers: [] as TeacherInput[], 
    date: '', 
    start: '', 
    end: '', 
    memo: '',
    mileageAction: '' 
  });

  const autoFinishSessions = async () => {
    const now = new Date().toISOString();
    try {
      const { data: endedSessions } = await supabase
        .from('sessions')
        .select('id')
        .lt('end_at', now)
        .in('status', ['opened', null])
        .not('status', 'in', '("cancelled","postponed","deleted")');
      
      if (endedSessions && endedSessions.length > 0) {
        await supabase.from('sessions').update({ status: 'finished' }).in('id', endedSessions.map(s => s.id));
        fetchSessions();
      }
    } catch (error) {}
  };

  useEffect(() => {
    autoFinishSessions();
    const interval = setInterval(autoFinishSessions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const safeJsonParse = (text: string, fallback: any = []) => {
    try { return JSON.parse(text); } catch (e) { return fallback; }
  };

  const handleEventClick = (info: EventClickArg) => {
    const p = info.event.extendedProps;
    const startObj = info.event.start; 
    const endObj = info.event.end;
    if (!startObj || !endObj) return;
    
    let cleanMemo = p.studentsText || '';
    // [洹쇰낯 ?닿껐 3] types.ts??異붽???mileage_option ?띿꽦???덉쟾?섍쾶 李몄“
    let existingMileage = p.mileage_option || p.mileageOption || ''; 
    
    if (!existingMileage && cleanMemo.includes('MILEAGE_ACTIONS:')) {
      const parts = cleanMemo.split('MILEAGE_ACTIONS:');
      cleanMemo = parts[0].trim();
      existingMileage = parts[1]?.trim() || '';
    }

    // [洹쇰낯 ?닿껐 4] SessionEvent ?명꽣?섏씠??洹쒓꺽??留욎떠 媛앹껜 ?앹꽦
    const eventData: SessionEvent = { 
      id: info.event.id, 
      title: info.event.title, 
      start: startObj, 
      end: endObj, 
      teacher: p.teacher || '',
      teacherId: p.teacherId || '',
      type: p.type || '',
      status: p.status || null,
      groupId: p.groupId,
      price: p.price || 0,
      studentsText: p.studentsText || '',
      themeColor: p.themeColor || '',
      isAdmin: !!p.isAdmin,
      roundInfo: p.roundInfo,
      mileageAction: existingMileage,
      session_type: p.session_type, // Modal ?먮윭 ?닿껐??
      mileage_option: existingMileage // ?곗씠???뺥빀?깆슜
    };

    setSelectedEvent(eventData);
    
    let loadedTeachers: TeacherInput[] = [{ id: p.teacherId || '', price: p.price || 0 }];
    if (cleanMemo.includes('EXTRA_TEACHERS:')) {
      const parts = cleanMemo.split('EXTRA_TEACHERS:');
      cleanMemo = parts[0].trim();
      const extraTeachers = safeJsonParse(parts[1], []);
      if (Array.isArray(extraTeachers)) {
        loadedTeachers = [{ id: p.teacherId || '', price: p.price || 0 }, ...extraTeachers];
      }
    }

    setEditFields({ 
      title: p.roundInfo ? `${p.roundInfo} ${info.event.title}` : info.event.title, 
      teachers: loadedTeachers, 
      date: startObj.toLocaleDateString('en-CA'), 
      start: startObj.toTimeString().slice(0, 5), 
      end: endObj.toTimeString().slice(0, 5), 
      memo: cleanMemo,
      mileageAction: existingMileage
    });
    setIsModalOpen(true);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const eventId = info.event.id;
    if (!info.event.start || !info.event.end) { info.revert(); return; }
    try {
      await supabase.from('sessions').update({
        start_at: info.event.start.toISOString(),
        end_at: info.event.end.toISOString()
      }).eq('id', eventId);
      fetchSessions();
    } catch (err) { info.revert(); }
  };

  const handleUpdate = async () => {
    if (!selectedEvent) return;
    const mainT = editFields.teachers[0];
    if (!mainT?.id) { alert('媛뺤궗瑜??좏깮?댁＜?몄슂.'); return; }
    
    try {
      const [y, m, d] = editFields.date.split('-').map(Number);
      const [hh, mm] = editFields.start.split(':').map(Number);
      const newStart = new Date(y, m - 1, d, hh, mm);
      const duration = new Date(selectedEvent.end).getTime() - new Date(selectedEvent.start).getTime();
      const newEnd = new Date(newStart.getTime() + (isNaN(duration) ? 3600000 : duration));

      const getActionTotal = (actionStr: string) => {
        const actions = actionStr ? actionStr.split(',').map(s => s.trim()).filter(Boolean) : [];
        return actions.reduce((sum, label) => sum + (MILEAGE_DATA.find(d => d.label === label)?.val || 0), 0);
      };

      const oldTotal = getActionTotal(selectedEvent.mileageAction || '');
      const newTotal = getActionTotal(editFields.mileageAction || '');
      const diff = newTotal - oldTotal; 

      const extras = editFields.teachers.slice(1).filter(t => t.id);
      let finalMemo = editFields.memo; 
      if (extras.length > 0) finalMemo += `\nEXTRA_TEACHERS:${JSON.stringify(extras)}`;
      
      const updatePayload: any = {
        title: editFields.title, 
        created_by: mainT.id, 
        price: Number(mainT.price) || 0,
        start_at: newStart.toISOString(),
        end_at: newEnd.toISOString(),
        students_text: finalMemo,
        mileage_option: editFields.mileageAction
      };

      const { error: sessionError } = await supabase.from('sessions').update(updatePayload).eq('id', selectedEvent.id);
      if (sessionError) throw sessionError;

      if (diff !== 0) {
        const { data: user } = await supabase.from('users').select('points').eq('id', mainT.id).single();
        const currentPoints = user?.points ?? 0;
        await supabase.from('users').update({ points: currentPoints + diff }).eq('id', mainT.id);
        
        try {
          await supabase.from('mileage_logs').insert([{
            teacher_id: mainT.id,
            amount: diff,
            reason: `[?섏뾽?곕룞] ${diff > 0 ? '?먮났' : '李④컧'}: ${editFields.mileageAction || '?댁젣'}`,
            session_title: editFields.title
          }]);
        } catch (e) { console.warn(e); }
      }

      setIsModalOpen(false); 
      fetchSessions();
    } catch (error: any) {
      alert('????ㅽ뙣: ' + (error.message || 'Error'));
    }
  };

  const updateStatus = async (status: string | null) => {
    if (!selectedEvent) return;
    try {
      if (status === 'deleted') {
        if (!confirm('?곴뎄 ??젣?섏떆寃좎뒿?덇퉴?')) return;
        await supabase.from('sessions').delete().eq('id', selectedEvent.id);
      } else {
        await supabase.from('sessions').update({ status }).eq('id', selectedEvent.id);
      }
      setIsModalOpen(false); fetchSessions();
    } catch (error) {}
  };

  const handlePostponeCascade = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const targetId = selectedEvent?.id;
    if (!targetId || !confirm('1二쇱씪??誘몃（?쒓쿋?듬땲源?')) return;
    try {
      const { data: curr } = await supabase.from('sessions').select('*').eq('id', targetId).single();
      if (!curr?.group_id) return;
      const { data: future } = await supabase.from('sessions').select('*').eq('group_id', curr.group_id).gte('start_at', curr.start_at);
      if (future) {
        await Promise.all(future.map(async (s) => {
          const ns = new Date(new Date(s.start_at).getTime() + 7*24*60*60*1000).toISOString();
          const ne = new Date(new Date(s.end_at).getTime() + 7*24*60*60*1000).toISOString();
          return supabase.from('sessions').update({ start_at: ns, end_at: ne }).eq('id', s.id);
        }));
      }
      const { id, created_at, ...copyData } = curr;
      await supabase.from('sessions').insert([{ ...copyData, start_at: curr.start_at, status: 'postponed' }]);
      setIsModalOpen(false); fetchSessions();
    } catch (error) {}
  };

  const handleUndoPostpone = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const targetId = selectedEvent?.id;
    if (!targetId || !confirm('蹂듦뎄?섏떆寃좎뒿?덇퉴?')) return;
    try {
      const { data: curr } = await supabase.from('sessions').select('*').eq('id', targetId).single();
      if (!curr?.group_id) return;
      const { data: future } = await supabase.from('sessions').select('*').eq('group_id', curr.group_id).gt('start_at', curr.start_at);
      if (future) {
        await Promise.all(future.map(async (s) => {
          const ns = new Date(new Date(s.start_at).getTime() - 7*24*60*60*1000).toISOString();
          const ne = new Date(new Date(s.end_at).getTime() - 7*24*60*60*1000).toISOString();
          return supabase.from('sessions').update({ start_at: ns, end_at: ne }).eq('id', s.id);
        }));
      }
      await supabase.from('sessions').delete().eq('id', targetId);
      setIsModalOpen(false); fetchSessions();
    } catch (error) {}
  };

  const handleAddTeacher = () => setEditFields({ ...editFields, teachers: [...editFields.teachers, { id: '', price: 0 }] });
  const handleRemoveTeacher = (i: number) => setEditFields({ ...editFields, teachers: editFields.teachers.filter((_, idx) => idx !== i) });

  return (
    <div className="flex min-h-screen bg-white text-slate-900 w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <style>{`
          .fc-event, .fc-daygrid-event, .fc-daygrid-day-top, button, select, a, [role="button"], .cursor-pointer { cursor: pointer !important; }
          .fc-daygrid-day-number { font-size: 0.9rem; font-weight: 900; font-style: italic; color: #CBD5E1; padding: 6px 10px !important; position: relative; z-index: 1; }
          .fc-day-today { background-color: #F8FAFC !important; }
          .fc-daygrid-event { white-space: normal !important; overflow: hidden !important; background: transparent !important; border: none !important; }
          .month-event-card { background: white; border-radius: 6px; padding: 4px; margin: 1px 2px; font-size: 10px; line-height: 1.2; border-left: 3px solid; box-shadow: 0 1px 2px rgba(0,0,0,0.05); width: calc(100% - 4px); box-sizing: border-box; overflow: hidden; }
          .month-event-time { font-weight: 700; color: #64748b; font-size: 9px; }
          .month-event-teacher { font-weight: 800; font-size: 9px; margin-top: 1px; }
          .month-event-title { font-weight: 600; color: #1e293b; margin-top: 1px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-all; }
          .four-day-title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.25; font-size: 10px; font-weight: 800; margin-top: 4px; color: #1E293B; word-break: keep-all; white-space: normal; }
          .fc-daygrid-day-frame { min-height: 100px !important; }
        `}</style>

        <nav className="border-b px-2 sm:px-4 py-2 sm:py-3 bg-white flex justify-between items-center z-50">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-base sm:text-lg font-black italic uppercase text-slate-950">SPOKEDU</h1>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => calendarRef.current?.getApi().prev()} className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"><ChevronLeft size={14}/></button>
              <button onClick={() => calendarRef.current?.getApi().today()} className="px-2 sm:px-3 text-[9px] sm:text-[10px] font-black uppercase">TODAY</button>
              <button onClick={() => calendarRef.current?.getApi().next()} className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"><ChevronRight size={14}/></button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-8 sm:h-9 p-0.5 bg-slate-100 rounded-lg flex items-center">
              <button onClick={() => { calendarRef.current?.getApi().changeView('rollingFourDay'); setCurrentView('rollingFourDay'); }} className={`px-2.5 sm:px-4 text-[9px] sm:text-[10px] font-black ${currentView === 'rollingFourDay' ? 'bg-white rounded-md shadow-sm text-blue-600' : 'text-slate-400'}`}>4-DAY</button>
              <button onClick={() => { calendarRef.current?.getApi().changeView('dayGridMonth'); setCurrentView('dayGridMonth'); }} className={`px-2.5 sm:px-4 text-[9px] sm:text-[10px] font-black ${currentView === 'dayGridMonth' ? 'bg-white rounded-md shadow-sm text-blue-600' : 'text-slate-400'}`}>MONTH</button>
            </div>
            <Link href="/class/create" className="h-8 sm:h-9 px-3 sm:px-4 bg-blue-600 text-white text-[10px] sm:text-xs font-black rounded-lg flex items-center shadow-md">+ NEW</Link>
          </div>
        </nav>

        <main className="flex-1 p-1 sm:p-2 overflow-auto">
          <FullCalendar
            ref={calendarRef} 
            plugins={[dayGridPlugin, interactionPlugin]} 
            initialView="rollingFourDay"
            views={{ rollingFourDay: { type: 'dayGrid', duration: { days: 4 } } }}
            editable={true} 
            eventDrop={handleEventDrop}
            headerToolbar={false} 
            locale="ko" 
            events={filteredEvents} 
            eventClick={handleEventClick} 
            height="auto"
            eventContent={(info) => {
              const { teacher, themeColor, status, isAdmin, roundInfo } = info.event.extendedProps;
              const dateObj = new Date(info.event.start || '');
              const time24 = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
              const isPostponed = status === 'postponed', isCancelled = status === 'cancelled';
              const isFinished = (info.event.end || info.event.start || new Date()) < new Date();
              let bgColor = isAdmin ? '#FEFCE8' : '#FFFFFF', borderColor = themeColor;
              if (isCancelled) { bgColor = '#FEF2F2'; borderColor = '#EF4444'; }
              if (isPostponed) { bgColor = '#F5F3FF'; borderColor = '#8B5CF6'; }
              if (isFinished && !isCancelled && !isPostponed) { bgColor = '#F8FAFC'; borderColor = '#CBD5E1'; }

              if (currentView === 'dayGridMonth') {
                return (
                  <div className="month-event-card" style={{ borderLeftColor: borderColor, backgroundColor: bgColor }}>
                    <div className="flex justify-between items-center pb-0.5 border-b border-slate-50 mb-0.5">
                      <span className="month-event-time">{time24}</span>
                      {roundInfo && <span className="text-[8px] font-bold text-slate-300">{roundInfo}</span>}
                    </div>
                    <div className={`month-event-teacher ${isAdmin ? 'text-amber-600' : 'text-blue-600'}`}>{teacher}T</div>
                    <div className={`month-event-title ${isFinished || isPostponed || isCancelled ? 'line-through text-slate-400' : ''}`}>{info.event.title}</div>
                  </div>
                );
              }

              return (
                <div className="w-full flex flex-col p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border-l-[3px] sm:border-l-[4px] shadow-sm" style={{ borderLeftColor: borderColor, backgroundColor: bgColor }}>
                  <div className="flex justify-between items-start">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 tabular-nums">{time24}</div>
                    {(isPostponed || isCancelled) && <span className={`text-white text-[6px] sm:text-[7px] px-1 sm:px-1.5 py-0.5 rounded-full font-black ${isPostponed ? 'bg-purple-500' : 'bg-red-500'}`}>{isPostponed ? '?곌린?? : '痍⑥냼??}</span>}
                  </div>
                  <div className="flex justify-between items-end mt-0.5 sm:mt-1">
                    <div className={`text-[10px] sm:text-[11px] font-black ${isAdmin ? 'text-amber-700' : 'text-blue-600'}`}>{teacher}T</div>
                    {roundInfo && <span className="text-[8px] font-black text-slate-300">{roundInfo}</span>}
                  </div>
                  <div className={`four-day-title ${isFinished || isPostponed || isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{info.event.title}</div>
                </div>
              );
            }}
          />
        </main>
      </div>

      <SessionEditModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        selectedEvent={selectedEvent} 
        editFields={editFields} 
        setEditFields={setEditFields}
        teacherList={teacherList} 
        onUpdate={handleUpdate} 
        onUpdateStatus={updateStatus}
        onPostpone={handlePostponeCascade} 
        onUndoPostpone={handleUndoPostpone}
        onAddTeacher={handleAddTeacher}
        onRemoveTeacher={handleRemoveTeacher}
      />
    </div>
  );
}
