import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SessionEvent } from '../types';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const ADMIN_NAMES = ['최지훈', '김구민', '김윤기'];

export function useClassManagement() {
  const [allEvents, setAllEvents] = useState<SessionEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SessionEvent[]>([]);
  const [teacherList, setTeacherList] = useState<{id: string; name: string}[]>([]);
  const [filterTeacher, setFilterTeacher] = useState('ALL');
  const [currentView, setCurrentView] = useState('rollingFourDay');

  const fetchSessions = useCallback(async () => {
    const { data: usersData } = await supabase.from('users').select('id, name');
    const tList = usersData || [];
    setTeacherList(tList);

    const { data, error } = await supabase.from('sessions').select('*, users(id, name)').order('start_at', { ascending: true });
    
    if (!error && data) {
      const groupTotals: Record<string, number> = {};
      data.forEach(s => { if(s.group_id) groupTotals[s.group_id] = (groupTotals[s.group_id] || 0) + 1; });
      const groupCurrentRounds: Record<string, number> = {};

      const events: SessionEvent[] = data.map(s => {
        let roundStr = "";
        const roundMatch = s.title.match(/(\d+\/\d+)/);
        if (roundMatch) roundStr = roundMatch[1];
        else if (s.group_id) {
          groupCurrentRounds[s.group_id] = (groupCurrentRounds[s.group_id] || 0) + 1;
          roundStr = `${groupCurrentRounds[s.group_id]}/${groupTotals[s.group_id]}`;
        }

        let displayTeacher = s.users?.name || '미정';
        // [주의] students_text 내부의 EXTRA_TEACHERS 데이터를 읽기만 해야 합니다.
        if (s.students_text?.includes('EXTRA_TEACHERS:')) {
          try {
            const extras = JSON.parse(s.students_text.split('EXTRA_TEACHERS:')[1]);
            const extraNames = extras.map((ex: any) => tList.find(t => t.id === ex.id)?.name).filter(Boolean);
            if (extraNames.length > 0) displayTeacher += `, ${extraNames.join(', ')}`;
          } catch (e) {}
        }

        return {
          id: s.id, 
          title: s.title.replace(/(\d+\/\d+)\s?/, '').trim(),
          start: s.start_at, 
          end: s.end_at, 
          teacher: displayTeacher, 
          teacherId: s.users?.id || '', 
          type: s.session_type, 
          status: s.status, 
          groupId: s.group_id, 
          price: s.price || 0,
          studentsText: s.students_text || '', 
          isAdmin: ADMIN_NAMES.some(admin => displayTeacher.includes(admin)), 
          roundInfo: roundStr, 
          themeColor: (s.session_type === 'regular_center' ? '#2563EB' : '#10B981'),
          // 마일리지 옵션이 있다면 여기 추가되어야 합니다.
          mileageOption: s.mileage_option || null, 
        };
      });
      setAllEvents(events);
      setFilteredEvents(events);
    }
  }, []);

  // [핵심 추가] 마일리지 전용 업데이트 함수
  // 이 함수는 오직 마일리지 필드만 건드리므로 피드백 양식을 지우지 않습니다.
  const updateMileageOnly = async (sessionId: string, mileageOption: any) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          mileage_option: mileageOption,
          // 여기서 status나 students_text를 명시하지 않음으로써 기존 데이터를 보호합니다.
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      await fetchSessions(); // 변경 후 목록 새로고침
      return true;
    } catch (err) {
      console.error("Mileage Update Error:", err);
      return false;
    }
  };

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  return { 
    filteredEvents, 
    teacherList, 
    filterTeacher, 
    setFilterTeacher, 
    currentView, 
    setCurrentView, 
    fetchSessions, 
    updateMileageOnly, // 새로 만든 안전한 함수를 내보냅니다.
    supabase 
  };
}