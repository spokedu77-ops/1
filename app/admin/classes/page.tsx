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
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneMode, setCloneMode] = useState<'fixed' | 'manual'>('fixed');
  const [cloneRounds, setCloneRounds] = useState(6);
  const [cloneInterval, setCloneInterval] = useState(7);
  const [cloneDates, setCloneDates] = useState<string[]>([]);
  const [cloneTimes, setCloneTimes] = useState<string[]>([]);
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
    
    // 뷰 변경 전에 날짜 설정
    if (viewName === 'rollingFourDay') {
      api.gotoDate(getYesterday());
    } else {
      api.gotoDate(new Date());
    }
    
    api.changeView(viewName);
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
        .select('id, created_by')
        .lt('end_at', now)
        .in('status', ['opened', null])
        .not('status', 'in', '("cancelled","postponed","deleted")');
      
      if (endedSessions && endedSessions.length > 0) {
        // 1. 세션 상태를 finished로 변경
        await supabase.from('sessions').update({ status: 'finished' }).in('id', endedSessions.map(s => s.id));
        
        // 2. 각 강사의 session_count 증가
        const teacherCounts = endedSessions.reduce((acc, s) => {
          acc[s.created_by] = (acc[s.created_by] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        for (const [teacherId, count] of Object.entries(teacherCounts)) {
          const { data: user } = await supabase
            .from('users')
            .select('session_count')
            .eq('id', teacherId)
            .single();
          
          await supabase
            .from('users')
            .update({ session_count: (user?.session_count || 0) + count })
            .eq('id', teacherId);
        }
        
        fetchSessions();
      }
    } catch (error) {
      console.error('Auto-finish error:', error);
    }
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
    if (!info.event.start || !info.event.end) { 
      info.revert(); 
      return; 
    }
    try {
      const { error } = await supabase.from('sessions').update({
        start_at: info.event.start.toISOString(),
        end_at: info.event.end.toISOString()
      }).eq('id', eventId);
      
      if (error) throw error;
      
      fetchSessions();
    } catch (err: any) {
      console.error('일정 변경 에러:', err);
      alert('일정 변경에 실패했습니다.');
      info.revert();
    }
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
          const { error: logError } = await supabase.from('mileage_logs').insert([{
            teacher_id: mainT.id,
            amount: diff,
            reason: `[수업연동] ${diff > 0 ? '원복' : '차감'}: ${editFields.mileageAction || '해제'}`,
            session_title: editFields.title
          }]);
          if (logError) {
            console.error('마일리지 로그 저장 에러:', logError);
            alert('경고: 마일리지는 반영되었지만 로그 저장에 실패했습니다.');
          }
        } catch (e) { 
          console.error('마일리지 로그 에러:', e); 
          alert('경고: 마일리지는 반영되었지만 로그 저장에 실패했습니다.');
        }
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
        const prevStatus = selectedEvent.status;
        await supabase.from('sessions').update({ status }).eq('id', selectedEvent.id);
        
        // finished로 변경되는 경우에만 session_count 증가
        if (status === 'finished' && prevStatus !== 'finished') {
          const { data: user } = await supabase
            .from('users')
            .select('session_count')
            .eq('id', selectedEvent.teacherId)
            .single();
          
          await supabase
            .from('users')
            .update({ session_count: (user?.session_count || 0) + 1 })
            .eq('id', selectedEvent.teacherId);
        }
      }
      setIsModalOpen(false); 
      fetchSessions();
    } catch (error) {
      console.error('Status update error:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handlePostponeCascade = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const targetId = selectedEvent?.id;
    if (!targetId || !confirm('1주일씩 미루시겠습니까?')) return;
    try {
      const { data: curr, error: fetchError } = await supabase.from('sessions').select('*').eq('id', targetId).single();
      if (fetchError) throw fetchError;
      if (!curr?.group_id) {
        alert('그룹 정보가 없습니다.');
        return;
      }
      
      const { data: future, error: futureError } = await supabase.from('sessions').select('*').eq('group_id', curr.group_id).gte('start_at', curr.start_at);
      if (futureError) throw futureError;
      
      if (future) {
        await Promise.all(future.map(async (s) => {
          const ns = new Date(new Date(s.start_at).getTime() + 7*24*60*60*1000).toISOString();
          const ne = new Date(new Date(s.end_at).getTime() + 7*24*60*60*1000).toISOString();
          return supabase.from('sessions').update({ start_at: ns, end_at: ne }).eq('id', s.id);
        }));
      }
      
      const { id, created_at, ...copyData } = curr;
      const { error: insertError } = await supabase.from('sessions').insert([{ ...copyData, start_at: curr.start_at, status: 'postponed' }]);
      if (insertError) throw insertError;
      
      alert('일정이 성공적으로 연기되었습니다.');
      setIsModalOpen(false); 
      fetchSessions();
    } catch (error: any) {
      console.error('연기 에러:', error);
      alert('일정 연기에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };

  const handleUndoPostpone = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const targetId = selectedEvent?.id;
    if (!targetId || !confirm('복구하시겠습니까?')) return;
    try {
      const { data: curr, error: fetchError } = await supabase.from('sessions').select('*').eq('id', targetId).single();
      if (fetchError) throw fetchError;
      if (!curr?.group_id) {
        alert('그룹 정보가 없습니다.');
        return;
      }
      
      const { data: future = [], error: futureError } = await supabase.from('sessions').select('*').eq('group_id', curr.group_id).gt('start_at', curr.start_at);
      if (futureError) throw futureError;
      
      if (future && future.length > 0) {
        await Promise.all(future.map(async (s) => {
          const ns = new Date(new Date(s.start_at).getTime() - 7*24*60*60*1000).toISOString();
          const ne = new Date(new Date(s.end_at).getTime() - 7*24*60*60*1000).toISOString();
          return supabase.from('sessions').update({ start_at: ns, end_at: ne }).eq('id', s.id);
        }));
      }
      
      const { error: deleteError } = await supabase.from('sessions').delete().eq('id', targetId);
      if (deleteError) throw deleteError;
      
      alert('일정이 성공적으로 복구되었습니다.');
      setIsModalOpen(false); 
      fetchSessions();
    } catch (error: any) {
      console.error('복구 에러:', error);
      alert('일정 복구에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };

  const handleShrinkGroup = async () => {
    if (!selectedEvent?.groupId || !selectedEvent?.roundIndex) {
      alert('그룹 정보 또는 회차 정보가 없습니다.');
      return;
    }
    
    if (!confirm(`현재 회차(${selectedEvent.roundIndex}회)를 마지막으로 설정하고 이후 회차를 모두 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const targetDate = typeof selectedEvent.start === 'string' 
        ? selectedEvent.start 
        : selectedEvent.start.toISOString();

      // 1. 이후 회차 삭제
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('group_id', selectedEvent.groupId)
        .gt('start_at', targetDate);

      if (deleteError) throw deleteError;

      const newTotal = selectedEvent.roundIndex;

      // 2. 남은 세션들 조회
      const { data: remains, error: fetchError } = await supabase
        .from('sessions')
        .select('id, round_index')
        .eq('group_id', selectedEvent.groupId);

      if (fetchError) throw fetchError;

      // 3. Promise.all로 병렬 업데이트
      if (remains && remains.length > 0) {
        await Promise.all(
          remains.map(r => 
            supabase.from('sessions').update({
              round_total: newTotal,
              round_display: `${r.round_index}/${newTotal}`
            }).eq('id', r.id)
          )
        );
      }

      alert('회차가 성공적으로 축소되었습니다.');
      setIsModalOpen(false);
      fetchSessions();
    } catch (error: any) {
      console.error('회차 축소 에러:', error);
      alert('회차 축소에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };

  const handleAddTeacher = () => setEditFields({ ...editFields, teachers: [...editFields.teachers, { id: '', price: 0 }] });
  const handleRemoveTeacher = (i: number) => setEditFields({ ...editFields, teachers: editFields.teachers.filter((_, idx) => idx !== i) });

  const handleOpenCloneModal = () => {
    setCloneMode('fixed');
    setCloneRounds(4);
    setCloneInterval(7);
    setCloneDates([]);
    setCloneTimes([]);
    setIsCloneModalOpen(true);
  };

  const handleCloneGroup = async () => {
    if (!selectedEvent) return;
    
    try {
      const baseSession = selectedEvent;
      const sessionsToCopy: any[] = [];
      
      if (cloneMode === 'fixed') {
        // 고정 간격 복제
        const baseDate = new Date(baseSession.start);
        const baseDuration = new Date(baseSession.end).getTime() - new Date(baseSession.start).getTime();
        
        for (let i = 1; i <= cloneRounds; i++) {
          const newStart = new Date(baseDate);
          newStart.setDate(baseDate.getDate() + (cloneInterval * i));
          const newEnd = new Date(newStart.getTime() + baseDuration);
          
          sessionsToCopy.push({
            title: baseSession.title,
            created_by: baseSession.teacherId,
            price: baseSession.price,
            start_at: newStart.toISOString(),
            end_at: newEnd.toISOString(),
            students_text: baseSession.studentsText,
            session_type: baseSession.type,
            status: 'opened',
            mileage_option: baseSession.mileageAction,
            group_id: baseSession.groupId || null,
            round_index: (baseSession.roundIndex || 0) + i,
            round_total: (baseSession.roundTotal || 0) + cloneRounds,
            round_display: `${(baseSession.roundIndex || 0) + i}/${(baseSession.roundTotal || 0) + cloneRounds}`
          });
        }
      } else {
        // 수동 날짜 복제
        const baseDuration = new Date(baseSession.end).getTime() - new Date(baseSession.start).getTime();
        const baseTime = new Date(baseSession.start);
        
        cloneDates.forEach((dateStr, i) => {
          if (!dateStr) return;
          const newStart = new Date(dateStr);
          
          // 시간이 입력되었으면 사용, 아니면 기존 시간 사용
          if (cloneTimes[i]) {
            const [hours, minutes] = cloneTimes[i].split(':').map(Number);
            newStart.setHours(hours, minutes);
          } else {
            newStart.setHours(baseTime.getHours(), baseTime.getMinutes());
          }
          
          const newEnd = new Date(newStart.getTime() + baseDuration);
          
          sessionsToCopy.push({
            title: baseSession.title,
            created_by: baseSession.teacherId,
            price: baseSession.price,
            start_at: newStart.toISOString(),
            end_at: newEnd.toISOString(),
            students_text: baseSession.studentsText,
            session_type: baseSession.type,
            status: 'opened',
            mileage_option: baseSession.mileageAction,
            group_id: baseSession.groupId || null,
            round_index: (baseSession.roundIndex || 0) + i + 1,
            round_total: (baseSession.roundTotal || 0) + cloneDates.filter(d => d).length,
            round_display: `${(baseSession.roundIndex || 0) + i + 1}/${(baseSession.roundTotal || 0) + cloneDates.filter(d => d).length}`
          });
        });
      }
      
      if (sessionsToCopy.length === 0) {
        alert('복제할 세션이 없습니다.');
        return;
      }
      
      const { error } = await supabase.from('sessions').insert(sessionsToCopy);
      if (error) throw error;
      
      // 기존 세션들의 round_total 업데이트
      if (baseSession.groupId) {
        const newTotal = (baseSession.roundTotal || 0) + sessionsToCopy.length;
        await supabase
          .from('sessions')
          .update({ round_total: newTotal })
          .eq('group_id', baseSession.groupId)
          .lte('round_index', baseSession.roundIndex || 0);
      }
      
      alert(`${sessionsToCopy.length}개의 수업이 복제되었습니다.`);
      setIsCloneModalOpen(false);
      setIsModalOpen(false);
      fetchSessions();
    } catch (error: any) {
      console.error('복제 에러:', error);
      alert('복제에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };

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
              className="h-8 sm:h-9 px-2 sm:px-3 bg-slate-100 rounded-lg text-[10px] sm:text-xs font-bold text-slate-700 border border-slate-200"
            >
              <option value="ALL">전체 강사</option>
              {teacherList.map(t => (
                <option key={t.id} value={t.id}>{t.name} T</option>
              ))}
            </select>
            <div className="h-8 sm:h-9 p-0.5 bg-slate-100 rounded-lg flex items-center">
              <button onClick={() => handleViewChange('rollingFourDay')} className={`px-2.5 sm:px-4 text-[9px] sm:text-[10px] font-black ${currentView === 'rollingFourDay' ? 'bg-white rounded-md shadow-sm text-blue-600' : 'text-slate-400'}`}>4-DAY</button>
              <button onClick={() => handleViewChange('twoMonthGrid')} className={`px-2.5 sm:px-4 text-[9px] sm:text-[10px] font-black ${currentView === 'twoMonthGrid' ? 'bg-white rounded-md shadow-sm text-blue-600' : 'text-slate-400'}`}>MONTH</button>
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
            views={{ 
              rollingFourDay: { type: 'dayGrid', duration: { days: 4 } },
              twoMonthGrid: { type: 'dayGrid', duration: { months: 2 } }
            }}
            editable={true} 
            eventDrop={handleEventDrop}
            headerToolbar={false} 
            locale="ko" 
            dayMaxEvents={currentView === 'dayGridMonth' || currentView === 'twoMonthGrid' ? 3 : false}
            events={filteredEvents} 
            eventClick={handleEventClick} 
            height="auto"
            eventContent={(info) => {
              const { teacher, status, isAdmin, roundInfo, type, roundIndex, roundTotal } = info.event.extendedProps;
              const isMonthView = info.view.type === 'dayGridMonth' || info.view.type === 'twoMonthGrid';
              const dateObj = new Date(info.event.start || '');
              const time24 = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
              const start = info.event.start ? new Date(info.event.start) : null;
              const end = info.event.end ? new Date(info.event.end) : null;
              const durationMin = start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) : null;
              
              const isPostponed = status === 'postponed', isCancelled = status === 'cancelled';
              const isFinished = (info.event.end || info.event.start || new Date()) < new Date();
              const isLastRound = roundIndex && roundTotal && roundIndex === roundTotal;
              const isUrgent = teacher === '미정';

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
              if (isUrgent) { bgColor = '#FEF2F2'; borderColor = '#EF4444'; textColor = '#991B1B'; }

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
                        <span className={`text-[7px] px-1.5 py-0.5 rounded font-black ${isLastRound ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
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
                      {isPostponed && (
                        <span className="bg-purple-600 text-white text-[8px] px-1.5 rounded font-black">
                          연기
                        </span>
                      )}
                    </div>
                    {isLastRound && <span className="bg-red-600 text-white text-[8px] px-1.5 rounded font-black">FIN</span>}
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
        onShrinkGroup={handleShrinkGroup}
        onCloneGroup={handleOpenCloneModal}
      />
      
      {/* 복제 모달 */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setIsCloneModalOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-slate-900 mb-6">수업 복제</h3>
            
            <div className="space-y-4">
              {/* 복제 방식 선택 */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">복제 방식</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCloneMode('fixed')}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                      cloneMode === 'fixed' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    고정 간격
                  </button>
                  <button 
                    onClick={() => {
                      setCloneMode('manual');
                      setCloneDates(Array(cloneRounds).fill(''));
                      setCloneTimes(Array(cloneRounds).fill(''));
                    }}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                      cloneMode === 'manual' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    수동 입력
                  </button>
                </div>
              </div>
              
              {cloneMode === 'fixed' ? (
                <>
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">간격 (일)</h4>
                    <input 
                      type="number" 
                      value={cloneInterval} 
                      onChange={(e) => setCloneInterval(Number(e.target.value))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">회차 수</h4>
                    <input 
                      type="number" 
                      value={cloneRounds} 
                      onChange={(e) => setCloneRounds(Number(e.target.value))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600"
                      min="1"
                      max="20"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">회차 수</h4>
                      <button 
                        onClick={() => {
                          const newRounds = cloneRounds + 1;
                          setCloneRounds(newRounds);
                          setCloneDates([...cloneDates, '']);
                        }}
                        className="text-xs font-black text-blue-600 hover:text-blue-700"
                      >
                        + 추가
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {Array.from({length: cloneRounds}).map((_, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <span className="text-xs font-black text-slate-400 w-8">{i+1}회</span>
                          <input 
                            type="date" 
                            value={cloneDates[i] || ''} 
                            onChange={(e) => {
                              const newDates = [...cloneDates];
                              newDates[i] = e.target.value;
                              setCloneDates(newDates);
                            }}
                            className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-600"
                          />
                          <input 
                            type="time" 
                            value={cloneTimes[i] || ''} 
                            onChange={(e) => {
                              const newTimes = [...cloneTimes];
                              newTimes[i] = e.target.value;
                              setCloneTimes(newTimes);
                            }}
                            className="w-24 bg-slate-50 border-2 border-slate-100 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:border-blue-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex gap-2 pt-4">
                <button 
                  onClick={() => setIsCloneModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handleCloneGroup}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg"
                >
                  복제 시작
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}