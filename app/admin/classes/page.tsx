'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// --- 아이콘 컴포넌트들 ---
const ClockIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const UserIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ClassManagementPage() {
  const [selectedIds, setSelectedIds] = useState([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterTeacher, setFilterTeacher] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [teacherList, setTeacherList] = useState<any[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentMemo, setStudentMemo] = useState('');
  
  // 수정용 상태값들
  const [editTime, setEditTime] = useState(''); 
  const [editTitle, setEditTitle] = useState('');
  const [editTeacherId, setEditTeacherId] = useState('');

  // --- 데이터 불러오기 ---
  const fetchSessions = async () => {
    setLoading(true);
    // group_id 등 필요한 컬럼을 확실하게 조회합니다.
    const { data } = await supabase.from('sessions').select('*, users(id, name)');

    if (data) {
      // spokedu fix
      const uniqueTeachers: { id: string; name: string }[] = [];
      const map = new Map();
      data.forEach(item => {
        if(item.users?.id && !map.has(item.users.id)){
          map.set(item.users.id, true);
          uniqueTeachers.push({ id: item.users.id, name: item.users.name });
        }
      });
      setTeacherList(uniqueTeachers);

      // 캘린더 이벤트 매핑
      const calendarEvents = data.map((session) => {
        let bgColor = '#3B82F6'; 
        let borderColor = '#2563EB';
        let textColor = '#FFFFFF'; 

        if (session.session_type === 'regular_center') {
          bgColor = '#8B5CF6'; 
          borderColor = '#7C3AED';
        } else if (session.session_type === 'oneday') {
          bgColor = '#10B981'; 
          borderColor = '#059669';
        }

        // 상태별 스타일 적용
        if (session.status === 'finished') {
          bgColor = bgColor + 'CC'; // 투명도 추가
          borderColor = 'transparent';
        } else if (session.status === 'cancelled') {
          bgColor = '#FEE2E2'; 
          borderColor = '#FECACA';
          textColor = '#EF4444'; 
        } else if (session.status === 'postponed') {
          bgColor = '#FEF3C7'; // 연기됨: 노란색 계열
          borderColor = '#F59E0B';
          textColor = '#92400E';
        }

        return {
          id: session.id,
          title: session.title,
          start: session.start_at,
          end: session.end_at,
          backgroundColor: bgColor,
          borderColor: borderColor,
          textColor: textColor,
          extendedProps: {
            teacher: session.users?.name || '미정',
            teacherId: session.users?.id,
            type: session.session_type,
            status: session.status,
            groupId: session.group_id, // ★ 연기 로직을 위해 필수
            price: session.price,
            studentsText: session.students_text
          }
        };
      });
      setAllEvents(calendarEvents);
      setFilteredEvents(calendarEvents);
    }
    setLoading(false);
  };

  useEffect(() => { 
    fetchSessions(); 
  }, []);

  // --- 필터링 로직 ---
  useEffect(() => {
    let result = allEvents;
    if (filterTeacher !== 'ALL') result = result.filter(e => e.extendedProps.teacherId === filterTeacher);
    if (filterType !== 'ALL') result = result.filter(e => e.extendedProps.type === filterType);
    setFilteredEvents(result);
  }, [filterTeacher, filterType, allEvents]);

  // --- 일괄 삭제 로직 ---
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`${selectedIds.length}개 수업을 일괄 삭제할까요?`)) return;

    const { error } = await supabase.from('sessions').delete().in('id', selectedIds);
    if (!error) {
      alert('삭제 완료');
      setSelectedIds([]); 
      fetchSessions(); 
    } else {
      alert('삭제 실패: ' + error.message);
    }
  };

  // --- 이벤트 클릭 시 모달 오픈 ---
  const handleEventClick = (info: any) => {
    const sEvent = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      ...info.event.extendedProps
    };
    setSelectedEvent(sEvent);
    setStudentMemo(sEvent.studentsText || '');
    
    // 수정 모드 초기값 세팅
    setEditTitle(sEvent.title);
    setEditTeacherId(sEvent.teacherId || '');
    const timeStr = info.event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setEditTime(timeStr);
    
    setIsModalOpen(true);
  };

  // --- 드래그 앤 드롭 (시간 이동) ---
  const handleEventDrop = async (info: any) => {
    if (!confirm(`${info.event.title} 수업 시간을 이동하시겠습니까?`)) {
      info.revert();
      return;
    }
    try {
      const duration = info.oldEvent.end.getTime() - info.oldEvent.start.getTime();
      const newEnd = new Date(info.event.start.getTime() + duration);

      const { error } = await supabase.from('sessions').update({
        start_at: info.event.start.toISOString(),
        end_at: newEnd.toISOString()
      }).eq('id', info.event.id);

      if (error) throw error;
    } catch (e) {
      alert('이동 실패: ' + (e as any).message);
      info.revert();
    }
  };

  // --- 데이터 업데이트 함수들 ---

  const saveStudentMemo = async () => {
    if (!selectedEvent) return;
    let query = supabase.from('sessions').update({ students_text: studentMemo });
    
    // 정규 과정이면 일괄 저장 여부 묻기
    if (selectedEvent.type === 'regular' && selectedEvent.groupId) {
       if(confirm('정규 과정입니다.\n이 그룹의 다른 모든 회차에도 동일한 명단을 저장하시겠습니까?')) {
         query = query.eq('group_id', selectedEvent.groupId);
       } else {
         query = query.eq('id', selectedEvent.id);
       }
    } else {
       query = query.eq('id', selectedEvent.id);
    }
    
    const { error } = await query;
    if (error) alert('저장 실패');
    else alert('명단이 저장되었습니다.');
    fetchSessions();
  };

  const updateTitle = async () => {
    if (!selectedEvent || !editTitle) return;
    const { error } = await supabase.from('sessions')
      .update({ title: editTitle })
      .eq('id', selectedEvent.id);
      
    if (error) alert('제목 수정 실패');
    else {
      alert('수업명이 변경되었습니다.');
      setIsModalOpen(false); 
      fetchSessions();
    }
  };

  const updateTeacher = async () => {
    if (!selectedEvent || !editTeacherId) return;
    const { error } = await supabase.from('sessions')
      .update({ created_by: editTeacherId }) 
      .eq('id', selectedEvent.id);

    if (error) alert('강사 변경 실패');
    else {
      alert('담당 강사가 변경되었습니다.');
      setIsModalOpen(false);
      fetchSessions();
    }
  };

  const updateSessionTime = async () => {
    if (!selectedEvent || !editTime) return;
    const [hours, minutes] = editTime.split(':').map(Number);
    const newStart = new Date(selectedEvent.start);
    newStart.setHours(hours, minutes);
    const duration = selectedEvent.end.getTime() - selectedEvent.start.getTime();
    const newEnd = new Date(newStart.getTime() + duration);
    const { error } = await supabase.from('sessions').update({
      start_at: newStart.toISOString(),
      end_at: newEnd.toISOString()
    }).eq('id', selectedEvent.id);
    if (error) alert('시간 변경 실패');
    else {
      alert('시간이 변경되었습니다.');
      setIsModalOpen(false);
      fetchSessions();
    }
  };

  // --- ★ 핵심 기능: 1주일 연쇄 연기 로직 ---
  const handlePostponeOneWeek = async () => {
    if (!selectedEvent) return;
    
    const currentId = selectedEvent.id;
    const currentStart = new Date(selectedEvent.start);
    const groupId = selectedEvent.groupId;

    // 안내 메시지
    if (!confirm(`이 수업을 1주일 연기하시겠습니까?${groupId ? '\n(같은 그룹의 이후 수업들도 자동으로 1주일씩 밀립니다)' : ''}`)) return;

    try {
      setLoading(true);

      // 1. 단건 수업인 경우
      if (!groupId) {
        const newStart = new Date(currentStart.getTime() + (7 * 24 * 60 * 60 * 1000));
        const newEnd = new Date(selectedEvent.end.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        const { error } = await supabase.from('sessions').update({ 
            start_at: newStart.toISOString(), 
            end_at: newEnd.toISOString(),
            status: 'postponed' // 상태 변경 (선택사항)
          }).eq('id', currentId);
          
        if (error) throw error;
      } 
      // 2. 정규 과정인 경우 (그룹 전체 연기)
      else {
        // 현재 수업 이후(포함)의 같은 그룹 수업 조회
        const { data: targetSessions, error: fetchError } = await supabase
          .from('sessions')
          .select('id, start_at, end_at')
          .eq('group_id', groupId)
          .gte('start_at', selectedEvent.start.toISOString());

        if (fetchError) throw fetchError;

        // 하나씩 업데이트
        for (const session of targetSessions) {
          const sStart = new Date(session.start_at);
          const sEnd = new Date(session.end_at);
          
          const nextStart = new Date(sStart.getTime() + (7 * 24 * 60 * 60 * 1000));
          const nextEnd = new Date(sEnd.getTime() + (7 * 24 * 60 * 60 * 1000));

          const { error: updateError } = await supabase
            .from('sessions')
            .update({ 
              start_at: nextStart.toISOString(), 
              end_at: nextEnd.toISOString()
            })
            .eq('id', session.id);

          if (updateError) throw updateError;
        }
        
        // 현재 선택한 수업은 명시적으로 'postponed' 상태로 변경해줄 수도 있음 (옵션)
        // await supabase.from('sessions').update({ status: 'postponed' }).eq('id', currentId);
      }

      alert('수업 일정이 1주일 연기되었습니다.');
      setIsModalOpen(false);
      fetchSessions(); 

    } catch (e) {
      console.error("연기 오류:", e);
      alert('오류 발생: ' + (e as any).message);
    } finally {
      setLoading(false);
    }
  };

  // --- 상태 업데이트 (완료/취소/삭제 등) ---
  const updateStatus = async (newStatus: any) => {
    if (!selectedEvent) return;
    if (newStatus === 'deleted') {
      if (!confirm('정말 영구 삭제하시겠습니까? 복구할 수 없습니다.')) return;
      await supabase.from('sessions').delete().eq('id', selectedEvent.id);
    } else {
      await supabase.from('sessions').update({ status: newStatus }).eq('id', selectedEvent.id);
    }
    setIsModalOpen(false);
    fetchSessions();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* 캘린더 커스텀 스타일 */}
      <style>{`
        .fc-event, .fc-button, button, select, a, input[type="time"] { cursor: pointer !important; }
        .fc-event:hover { opacity: 0.95; transform: scale(1.01); transition: all 0.2s; }
        .fc-daygrid-event { min-height: 55px !important; }
        .fc-v-event { min-height: 60px !important; }
        .fc-event-title { 
          white-space: normal !important; 
          overflow: visible !important;
          word-break: break-all !important;
        }
      `}</style>

      {/* 헤더 및 필터 영역 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">📅 수업 캘린더</h1>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select onChange={(e) => setFilterTeacher(e.target.value)} className="flex-1 md:flex-none p-2.5 rounded-xl border-gray-200 bg-white text-gray-700 font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-100">
            <option value="ALL">강사 전체</option>
            {teacherList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select onChange={(e) => setFilterType(e.target.value)} className="flex-1 md:flex-none p-2.5 rounded-xl border-gray-200 bg-white text-gray-700 font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-100">
            <option value="ALL">수업 형태 전체</option>
            <option value="regular">정규 과정</option>
            <option value="center">센터 고정</option>
            <option value="oneday">원데이</option>
          </select>
          <Link href="/class/create" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center">+ 수업 개설</Link>
        </div>
      </div>

      {/* 캘린더 영역 */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-gray-100">
        {loading && <div className="text-center py-10 font-bold text-gray-400 animate-pulse">데이터를 불러오는 중입니다...</div>}
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridWeek" 
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,timeGridDay' }}
          buttonText={{ month: '월간', week: '주간', day: '일간', today: '오늘' }}
          locale="ko"
          events={filteredEvents}
          eventClick={handleEventClick}
          editable={true}
          eventDrop={handleEventDrop}
          height="auto"
          dayCellClassNames="transition-colors hover:bg-gray-50" 
          eventDisplay="block" 
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false, hour12: false }}
          eventContent={(info) => (
            <div className="flex flex-col p-1 h-full overflow-hidden leading-tight justify-start relative">
              <div className="flex items-center gap-1 mb-0.5 pb-0.5 border-b border-white/20">
                <span className="text-[10px] font-bold tabular-nums">{info.timeText}</span>
                <span className="text-[10px] font-black bg-black/10 px-1 rounded">
                  {info.event.extendedProps.teacher}T
                </span>
              </div>
              <div className={`text-[11px] font-bold break-words whitespace-normal leading-snug flex items-start gap-1 ${info.event.extendedProps.status === 'finished' ? 'opacity-80' : ''}`}>
                {info.event.extendedProps.status === 'finished' && (
                  <span className="shrink-0 text-[10px]">✅</span>
                )}
                {info.event.extendedProps.status === 'postponed' && (
                  <span className="shrink-0 text-[10px]">📅</span>
                )}
                <span>{info.event.title}</span>
              </div>
            </div>
          )}
        />
      </div>

      {/* 하단 일괄 삭제 관리 영역 */}
      <div className="mt-10 space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900">수업 일괄 관리</h2>
            <p className="text-xs text-gray-400 font-bold mt-1">지우고 싶은 수업을 선택한 후 삭제 버튼을 누르세요.</p>
          </div>
          
          {selectedIds.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-red-700 active:scale-95 transition-all animate-in fade-in zoom-in"
            >
              🔥 {selectedIds.length}개 수업 삭제하기
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
         {filteredEvents.map((event) => (
            <div 
              key={event.id}
              onClick={() => {
                setSelectedIds(prev => 
                  prev.includes(event.id) ? prev.filter(id => id !== event.id) : [...prev, event.id]
                );
              }}
              className={`flex items-center p-5 rounded-[24px] border-2 transition-all cursor-pointer ${
                selectedIds.includes(event.id) 
                  ? 'border-blue-600 bg-blue-50' 
                  : event.extendedProps.status === 'finished'
                    ? 'border-gray-100 bg-gray-50/50' 
                    : 'border-white bg-white shadow-sm hover:border-gray-200'
              }`}
            >
              <input 
                type="checkbox" 
                checked={selectedIds.includes(event.id)}
                onChange={() => {}} 
                className="w-6 h-6 rounded-full border-gray-300 text-blue-600 mr-5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">
                    {new Date(event.start).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] font-black text-blue-600">
                    {event.extendedProps.teacher}T
                  </span>
                  {event.extendedProps.status === 'finished' && (
                    <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                      완료됨
                    </span>
                  )}
                  {event.extendedProps.status === 'postponed' && (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                      연기됨
                    </span>
                  )}
                </div>
                <h4 className={`font-black ${event.extendedProps.status === 'finished' ? 'text-gray-400' : 'text-gray-800'}`}>
                  {event.extendedProps.status === 'finished' && '✓ '}
                  {event.title}
                </h4>
              </div>
              <div className="text-right font-black text-gray-400 text-sm">
                {event.extendedProps.price?.toLocaleString()}원
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- 모달 (수정/관리) --- */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden ring-1 ring-gray-900/5 transition-all transform scale-100" onClick={(e) => e.stopPropagation()}>
            
            {/* 1. 모달 헤더 (제목/상태) */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-white sticky top-0 z-10">
              <div className="w-full mr-8">
                <div className="flex items-center gap-2 mb-2">
                    {selectedEvent.status === 'opened' && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">수업 예정</span>}
                    {selectedEvent.status === 'finished' && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">수업 완료</span>}
                    {selectedEvent.status === 'postponed' && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">연기됨</span>}
                    {selectedEvent.status === 'cancelled' && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">취소됨</span>}
                </div>
                {/* 제목 수정 Input */}
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-2xl font-black text-gray-900 leading-tight bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 outline-none w-full placeholder-gray-300"
                    placeholder="수업명 입력"
                  />
                  <button onClick={updateTitle} className="bg-gray-100 text-gray-500 p-2 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors" title="제목 저장">
                    <EditIcon />
                  </button>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-50 hover:bg-gray-100 p-2 rounded-full text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                ✕
              </button>
            </div>

            {/* 2. 모달 바디 */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              
              {/* 강사 및 시간 수정 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                    <UserIcon /> 담당 강사 변경
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <select 
                      value={editTeacherId}
                      onChange={(e) => setEditTeacherId(e.target.value)}
                      className="bg-transparent border-none p-0 text-sm font-bold text-gray-800 w-full focus:ring-0 cursor-pointer outline-none appearance-none"
                    >
                      <option value="" disabled>강사 선택</option>
                      {teacherList.map(t => <option key={t.id} value={t.id}>{t.name} T</option>)}
                    </select>
                    <button onClick={updateTeacher} className="ml-2 bg-white border border-gray-200 text-gray-600 text-[10px] px-2.5 py-1.5 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors whitespace-nowrap">
                      변경
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                    <ClockIcon /> 시간 변경
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <input 
                      type="time" 
                      value={editTime} 
                      onChange={(e) => setEditTime(e.target.value)}
                      className="bg-transparent border-none p-0 text-lg font-bold text-blue-600 w-full focus:ring-0 cursor-pointer"
                    />
                    <button onClick={updateSessionTime} className="ml-2 bg-white border border-gray-200 text-gray-600 text-[10px] px-2.5 py-1.5 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors whitespace-nowrap">
                      변경
                    </button>
                  </div>
                </div>
              </div>

              {/* 학생 명단 메모 */}
              <div>
                <label className="flex items-center justify-between text-sm font-bold text-gray-700 mb-2">
                  <span>학생 명단 / 메모</span>
                  <span className="text-[10px] text-gray-400 font-normal">자동 저장되지 않습니다</span>
                </label>
                <div className="relative">
                  <textarea 
                    className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none shadow-sm transition-all"
                    rows={4}
                    placeholder="여기에 학생 이름이나 특이사항을 적어주세요."
                    value={studentMemo}
                    onChange={(e) => setStudentMemo(e.target.value)}
                  />
                  <button 
                    onClick={saveStudentMemo} 
                    className="absolute bottom-3 right-3 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-black transition-colors shadow-sm"
                  >
                    명단 저장
                  </button>
                </div>
              </div>

              {/* ★ 핵심 UI: 버튼 배치 최적화 ★ */}
              <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
                
                {/* 메인 액션 2개 (완료 / 연기) - 가장 크게 배치 */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => updateStatus('finished')} 
                    className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-100 transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                     ✅ 수업 완료
                  </button>
                  
                  <button 
                    onClick={handlePostponeOneWeek} 
                    className="bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200 py-3.5 rounded-xl font-bold text-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    📅 1주 연기
                  </button>
                </div>

                {/* 상태 초기화 (완료/취소/연기 상태일 때만 노출하여 실수 방지) */}
                {selectedEvent.status !== 'opened' && (
                  <button 
                    onClick={() => updateStatus('opened')} 
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    ↺ 상태 초기화 (수업 예정으로 변경)
                  </button>
                )}

                {/* 하단 위험 구역 (취소 / 삭제) - 작고 덜 눈에 띄게 배치 */}
                <div className="flex justify-between items-center pt-2 px-1">
                   <button 
                     onClick={() => updateStatus('cancelled')} 
                     className="text-gray-400 hover:text-red-500 text-xs font-medium underline decoration-gray-300 hover:decoration-red-500 transition-colors"
                   >
                     수업 취소 처리
                   </button>
                   
                   <button 
                     onClick={() => updateStatus('deleted')} 
                     className="flex items-center gap-1.5 text-red-300 hover:text-red-600 text-xs font-medium transition-colors group p-2 rounded hover:bg-red-50"
                   >
                     <TrashIcon /> 
                     <span className="group-hover:underline">영구 삭제</span>
                   </button>
                </div>

              </div>
              {/* --- 버튼 UI 끝 --- */}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
