"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';
import { useClassManagement } from './hooks/useClassManagement';
import SessionEditModal from './components/SessionEditModal';
import { SessionEvent, TeacherInput } from './types';
import { extractMileageAction, parseExtraTeachers, buildMemoWithExtras, getMileageTotal } from './lib/sessionUtils';
import { MILEAGE_ACTIONS } from './constants/mileage';

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  regular_private: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
  regular_center: { bg: '#EFF6FF', border: '#2563EB', text: '#1E3A8A' },
  one_day: { bg: '#FFF7ED', border: '#FB923C', text: '#9A3412' },
};

export default function ClassManagementPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const { filteredEvents, teacherList, fetchSessions, supabase, currentView, setCurrentView, filterTeacher, setFilterTeacher } = useClassManagement();
  
  const getYesterday = (base: Date = new Date()) => {
    const d = new Date(base);
    d.setDate(d.getDate() - 1);
    return d;
  };
  const initialDateStr = getYesterday().toISOString().split('T')[0];

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

  // ✅ 뷰 전환 시 오늘 날짜로 즉시 이동하는 헬퍼
  const handleViewChange = (viewName: string) => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.changeView(viewName);
    // 4-day는 항상 "어제-오늘-내일-모레"로 고정
    if (viewName === 'rollingFourDay') api.gotoDate(getYesterday());
    else api.gotoDate(new Date());
    setCurrentView(viewName);
  };

  const handleToday = () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    // 4-day에서는 TODAY를 눌러도 "어제 시작"이 유지되어야 함
    if (currentView === 'rollingFourDay') api.gotoDate(getYesterday());
    else api.today();
  };

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

  const handleEventClick = (info: EventClickArg) => {
    const p = info.event.extendedProps;
    const startObj = info.event.start; 
    const endObj = info.event.end;
    if (!startObj || !endObj) return;
    
    const { cleanMemo, mileageAction } = extractMileageAction(p.studentsText || '', p.mileageAction || p.mileage_option);
    const { extraTeachers, cleanMemo: memoWithoutExtras } = parseExtraTeachers(cleanMemo);
    const finalMemo = memoWithoutExtras;

    const eventData: SessionEvent = { 
      id: info.event.id, 
      title: info.event.title, 
      start: startObj, 
      end: endObj, 
      teacher: p.teacher || '',
      teacherId: p.teacherId || '',
      type: p.type || '',
      status: p.status || null,
      groupId: info.event.groupId || p.groupId, 
      price: p.price || 0,
      studentsText: p.studentsText || '',
      themeColor: p.themeColor || '',
      isAdmin: !!p.isAdmin,
      roundInfo: p.roundInfo,
      mileageAction: mileageAction,
      session_type: p.session_type,
      mileage_option: mileageAction,
      roundIndex: p.roundIndex,
      roundTotal: p.roundTotal
    };

    setSelectedEvent(eventData);
    
    let loadedTeachers: TeacherInput[] = [{ id: p.teacherId || '', price: p.price || 0 }];
    if (extraTeachers && Array.isArray(extraTeachers) && extraTeachers.length > 0) {
      loadedTeachers = [{ id: p.teacherId || '', price: p.price || 0 }, ...extraTeachers];
    }

    setEditFields({ 
      title: p.roundInfo ? `${p.roundInfo} ${info.event.title}` : info.event.title, 
      teachers: loadedTeachers, 
      date: startObj.toLocaleDateString('en-CA'), 
      start: startObj.toTimeString().slice(0, 5), 
      end: endObj.toTimeString().slice(0, 5), 
      memo: finalMemo,
      mileageAction: mileageAction
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
    if (!mainT?.id) { alert('강사를 선택해주세요.'); return; }
    
    try {
      const [y, m, d] = editFields.date.split('-').map(Number);
      const [hh, mm] = editFields.start.split(':').map(Number);
      const newStart = new Date(y, m - 1, d, hh, mm);
      const duration = new Date(selectedEvent.end).getTime() - new Date(selectedEvent.start).getTime();
      const newEnd = new Date(newStart.getTime() + (isNaN(duration) ? 3600000 : duration));

      const oldTotal = getMileageTotal(selectedEvent.mileageAction || '', MILEAGE_ACTIONS);
      const newTotal = getMileageTotal(editFields.mileageAction || '', MILEAGE_ACTIONS);
      const diff = newTotal - oldTotal; 

      const extras = editFields.teachers.slice(1).filter(t => t.id);
      const finalMemo = buildMemoWithExtras(editFields.memo, extras);
      
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
            reason: `[수업연동] ${diff > 0 ? '원복' : '차감'}: ${editFields.mileageAction || '해제'}`,
            session_title: editFields.title
          }]);
        } catch (e) { console.warn(e); }
      }

      setIsModalOpen(false); 
      fetchSessions();
    } catch (error: any) {
      alert('저장 실패: ' + (error.message || 'Error'));
    }
  };

  const updateStatus = async (status: string | null) => {
    if (!selectedEvent) return;
    try {
      if (status === 'deleted') {
        if (!confirm('영구 삭제하시겠습니까?')) return;
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
    if (!targetId || !confirm('1주일씩 미루시겠습니까?')) return;
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
    if (!targetId || !confirm('복구하시겠습니까?')) return;
    try {
      const { data: curr } = await supabase.from('sessions').select('*').eq('id', targetId).single();
      if (!curr?.group_id) return;
      const { data: future = [] } = await supabase.from('sessions').select('*').eq('group_id', curr.group_id).gt('start_at', curr.start_at);
      if (future && future.length > 0) {
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

  const handleDeleteGroup = async () => {
    if (!selectedEvent?.groupId) return alert('그룹 정보가 없습니다.');
    if (!confirm('해당 그룹 전체를 삭제하시겠습니까?')) return;
    await supabase.from('sessions').delete().eq('group_id', selectedEvent.groupId);
    setIsModalOpen(false);
    fetchSessions();
  };

  const handleExtendGroup = async () => {
    if (!selectedEvent?.groupId) return alert('그룹 정보가 없습니다.');
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('group_id', selectedEvent.groupId)
      .order('start_at', { ascending: true });

    if (!sessions || sessions.length === 0) return;

    const last = sessions[sessions.length - 1];
    const newTotal = sessions.length + 1;

    const newStart = new Date(last.start_at);
    newStart.setDate(newStart.getDate() + 7);
    const newEnd = new Date(last.end_at);
    newEnd.setDate(newEnd.getDate() + 7);

    const { id, created_at, ...insertData } = last;
    await supabase.from('sessions').insert([{
      ...insertData,
      start_at: newStart.toISOString(),
      end_at: newEnd.toISOString(),
      round_index: newTotal,
      round_total: newTotal,
      round_display: `${newTotal}/${newTotal}`,
      status: 'opened'
    }]);

    await supabase.from('sessions').update({ round_total: newTotal }).eq('group_id', selectedEvent.groupId);
    
    for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        const currentIndex = i + 1;
        await supabase.from('sessions').update({
            round_index: currentIndex,
            round_total: newTotal,
            round_display: `${currentIndex}/${newTotal}`
        }).eq('id', s.id);
    }
    fetchSessions();
  };

  const handleShrinkGroup = async () => {
    if (!selectedEvent?.groupId || !selectedEvent?.roundIndex) return alert('그룹 정보 또는 회차 정보가 없습니다.');
    
    if (!confirm(`현재 회차(${selectedEvent.roundIndex}회)를 마지막으로 설정하고 이후 회차를 모두 삭제하시겠습니까?`)) return;

    const targetDate = typeof selectedEvent.start === 'string' ? selectedEvent.start : selectedEvent.start.toISOString();

    await supabase.from('sessions')
      .delete()
      .eq('group_id', selectedEvent.groupId)
      .gt('start_at', targetDate);

    const newTotal = selectedEvent.roundIndex;
    await supabase.from('sessions').update({ round_total: newTotal }).eq('group_id', selectedEvent.groupId);

    const { data: remains } = await supabase.from('sessions').select('id, round_index').eq('group_id', selectedEvent.groupId);
    if (remains) {
        for (const r of remains) {
            await supabase.from('sessions').update({ round_display: `${r.round_index}/${newTotal}` }).eq('id', r.id);
        }
    }

    setIsModalOpen(false);
    fetchSessions();
  };

  const handleAddTeacher = () => setEditFields({ ...editFields, teachers: [...editFields.teachers, { id: '', price: 0 }] });
  const handleRemoveTeacher = (i: number) => setEditFields({ ...editFields, teachers: editFields.teachers.filter((_, idx) => idx !== i) });

  const goRollingFourDay = () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    api.changeView('rollingFourDay');
    api.gotoDate(yesterday);
    setCurrentView('rollingFourDay');
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-900 w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <style>{`
          .fc-event, .fc-daygrid-event, .fc-daygrid-day-top, button, select, a, [role="button"], .cursor-pointer { cursor: pointer !important; }
          .fc-daygrid-day-number { font-size: 1rem; font-weight: 900; color: #1E293B; }
          .fc-day-today { background-color: #E0F2FE !important; }
          .fc-daygrid-event { white-space: normal !important; }
          .event-title { overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
        `}</style>

        <nav className="border-b px-2 sm:px-4 py-2 sm:py-3 bg-white flex justify-between items-center z-50">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-base sm:text-lg font-black italic uppercase text-slate-950 flex items-center gap-2">
              <CalendarIcon size={18} className="text-blue-600" /> SPOKEDU
            </h1>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => calendarRef.current?.getApi().prev()} className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"><ChevronLeft size={14}/></button>
              <button onClick={handleToday} className="px-2 sm:px-3 text-[9px] sm:text-[10px] font-black uppercase">TODAY</button>
              <button onClick={() => calendarRef.current?.getApi().next()} className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"><ChevronRight size={14}/></button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <select
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="hidden sm:block h-8 sm:h-9 px-2 sm:px-3 bg-slate-100 rounded-lg text-[10px] sm:text-xs font-bold text-slate-700 border border-slate-200"
            >
              <option value="ALL">전체 강사</option>
              {teacherList.map(t => (
                <option key={t.id} value={t.id}>{t.name} T</option>
              ))}
            </select>
            <div className="h-8 sm:h-9 p-0.5 bg-slate-100 rounded-lg flex items-center">
              <button onClick={() => handleViewChange('rollingFourDay')} className={`px-2.5 sm:px-4 text-[9px] sm:text-[10px] font-black ${currentView === 'rollingFourDay' ? 'bg-white rounded-md shadow-sm text-blue-600' : 'text-slate-400'}`}>4-DAY</button>
              <button onClick={() => handleViewChange('dayGridMonth')} className={`px-2.5 sm:px-4 text-[9px] sm:text-[10px] font-black ${currentView === 'dayGridMonth' ? 'bg-white rounded-md shadow-sm text-blue-600' : 'text-slate-400'}`}>MONTH</button>
            </div>
            <Link href="/class/create" className="h-8 sm:h-9 px-3 sm:px-4 bg-blue-600 text-white text-[10px] sm:text-xs font-black rounded-lg flex items-center shadow-md">+ NEW</Link>
          </div>
        </nav>

        <main className="flex-1 p-1 sm:p-2 overflow-auto">
          <FullCalendar
            ref={calendarRef} 
            plugins={[dayGridPlugin, interactionPlugin]} 
            initialView="rollingFourDay"
            initialDate={initialDateStr} 
            views={{ rollingFourDay: { type: 'dayGrid', duration: { days: 4 } } }}
            editable={true} 
            eventDrop={handleEventDrop}
            headerToolbar={false} 
            locale="ko" 
            dayMaxEvents={currentView === 'dayGridMonth' ? 3 : false}
            events={filteredEvents} 
            eventClick={handleEventClick} 
            height="auto"
            eventContent={(info) => {
              const { teacher, status, isAdmin, roundInfo, type, roundIndex, roundTotal } = info.event.extendedProps;
              const isMonthView = info.view.type === 'dayGridMonth';
              const dateObj = new Date(info.event.start || '');
              const time24 = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
              const start = info.event.start ? new Date(info.event.start) : null;
              const end = info.event.end ? new Date(info.event.end) : null;
              const durationMin = start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) : null;
              
              const isPostponed = status === 'postponed', isCancelled = status === 'cancelled';
              const isFinished = (info.event.end || info.event.start || new Date()) < new Date();
              const isLastRound = roundIndex && roundTotal && roundIndex === roundTotal;

              let bgColor = '#FFFFFF';
              let borderColor = '#CBD5E1';
              let textColor = '#1E293B';

              if (type && TYPE_COLORS[type]) {
                bgColor = TYPE_COLORS[type].bg;
                borderColor = TYPE_COLORS[type].border;
                textColor = TYPE_COLORS[type].text;
              }
              
              if (isFinished) { bgColor = '#F1F5F9'; borderColor = '#94A3B8'; textColor = '#64748B'; }
              if (isPostponed) { bgColor = '#FAF5FF'; borderColor = '#A855F7'; textColor = '#7E22CE'; }
              if (isCancelled) { bgColor = '#FFF1F2'; borderColor = '#F43F5E'; textColor = '#BE123C'; }

              if (isMonthView) {
                return (
                  <div className="month-event-card" style={{ borderLeftColor: borderColor, backgroundColor: bgColor }}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="month-event-time flex items-center gap-1">
                        {time24}
                        {durationMin !== null && (
                          <span className="text-[7px] px-1 rounded bg-slate-900/10 text-slate-600 font-bold">
                            {durationMin}
                          </span>
                        )}
                      </span>
                      {roundInfo && (
                        <span className={`text-[7px] px-1 rounded font-medium ${isLastRound ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          {roundInfo}
                        </span>
                      )}
                    </div>
                    <div className="month-event-teacher" style={{ color: textColor }}>{teacher}T</div>
                    <div className={`month-event-title ${isFinished || isPostponed || isCancelled ? 'opacity-60 line-through' : ''}`} style={{ color: textColor }}>
                      {info.event.title}
                    </div>
                  </div>
                );
              }

              return (
                <div className="w-full flex flex-col p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border-l-[3px] sm:border-l-[4px] shadow-sm min-w-0" style={{ borderLeftColor: borderColor, backgroundColor: bgColor }}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 tabular-nums flex items-center gap-1">
                      {time24}
                      {durationMin !== null && (
                        <span className="text-[8px] px-1 rounded bg-slate-900/10 text-slate-600 font-black">
                          {durationMin}
                        </span>
                      )}
                    </div>
                    {isLastRound && <span className="bg-red-600 text-white text-[8px] px-1.5 rounded font-black">FINAL</span>}
                  </div>
                  <div className="flex justify-between items-end min-w-0">
                    <div className={`text-[10px] sm:text-[11px] font-black ${isAdmin ? 'text-amber-700' : 'text-blue-600'} truncate`}>{teacher}T</div>
                    {roundInfo && <span className="text-[8px] font-black text-slate-500">{roundInfo}</span>}
                  </div>
                  <div className={`event-title text-[10px] sm:text-[11px] font-black ${isFinished || isPostponed || isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {info.event.title}
                  </div>
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
        onDeleteGroup={handleDeleteGroup}
        onExtendGroup={handleExtendGroup}
        onShrinkGroup={handleShrinkGroup}
      />
    </div>
  );
}