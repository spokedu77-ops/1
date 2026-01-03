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
        if (s.students_text?.includes('EXTRA_TEACHERS:')) {
          try {
            const extras = JSON.parse(s.students_text.split('EXTRA_TEACHERS:')[1]);
            const extraNames = extras.map((ex: any) => tList.find(t => t.id === ex.id)?.name).filter(Boolean);
            if (extraNames.length > 0) displayTeacher += `, ${extraNames.join(', ')}`;
          } catch (e) {}
        }

        return {
          id: s.id, title: s.title.replace(/(\d+\/\d+)\s?/, '').trim(),
          start: s.start_at, end: s.end_at, teacher: displayTeacher, teacherId: s.users?.id || '', 
          type: s.session_type, status: s.status, groupId: s.group_id, price: s.price || 0,
          studentsText: s.students_text || '', isAdmin: ADMIN_NAMES.some(admin => displayTeacher.includes(admin)), 
          roundInfo: roundStr, themeColor: (s.session_type === 'regular_center' ? '#2563EB' : '#10B981'),
        };
      });
      setAllEvents(events);
      setFilteredEvents(events);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  return { filteredEvents, teacherList, filterTeacher, setFilterTeacher, currentView, setCurrentView, fetchSessions, supabase };
}