import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SessionEvent } from '../types';
import { parseExtraTeachers } from '../lib/sessionUtils';
import { ADMIN_NAMES } from '../constants/admins';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export function useClassManagement() {
  const [allEvents, setAllEvents] = useState<SessionEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SessionEvent[]>([]);
  const [teacherList, setTeacherList] = useState<{id: string; name: string}[]>([]);
  const [filterTeacher, setFilterTeacher] = useState('ALL');
  const [currentView, setCurrentView] = useState('rollingFourDay');

  const fetchSessions = useCallback(async () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const [usersRes, sessionsRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('sessions')
        .select('*, users:created_by(id, name)')
        .gte('start_at', sixMonthsAgo.toISOString())
        .lte('start_at', sixMonthsLater.toISOString())
        .order('start_at', { ascending: true })
    ]);

    const tList = usersRes.data || [];
    setTeacherList(tList);

    const { data, error } = sessionsRes;
    if (!error && data) {
      const groupTotals: Record<string, number> = {};
      data.forEach(s => { if(s.group_id) groupTotals[s.group_id] = (groupTotals[s.group_id] || 0) + 1; });
      const groupCurrentRounds: Record<string, number> = {};

      const events: SessionEvent[] = data.map(s => {
        let roundStr = s.round_display || '';
        if (!roundStr) {
          const roundMatch = s.title.match(/(\d+\/\d+)/);
          if (roundMatch) roundStr = roundMatch[1];
          else if (s.group_id) {
            groupCurrentRounds[s.group_id] = (groupCurrentRounds[s.group_id] || 0) + 1;
            roundStr = `${groupCurrentRounds[s.group_id]}/${groupTotals[s.group_id]}`;
          }
        }

        let displayTeacher = s.users?.name || '미정';
        const { extraTeachers } = parseExtraTeachers(s.students_text || '');
        const extraNames = extraTeachers
          .map((ex: any) => tList.find(t => t.id === ex.id)?.name)
          .filter(Boolean) as string[];
        if (extraNames.length > 0) displayTeacher += `, ${extraNames.join(', ')}`;

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
          mileageAction: s.mileage_option || '', 
          roundIndex: s.round_index,
          roundTotal: s.round_total,
          roundDisplay: s.round_display
        };
      });
      
      setAllEvents(events);
      setFilteredEvents(events);
    }
  }, []);

  useEffect(() => {
    if (filterTeacher === 'ALL') {
      setFilteredEvents(allEvents);
    } else {
      setFilteredEvents(allEvents.filter(ev => ev.teacherId === filterTeacher));
    }
  }, [filterTeacher, allEvents]);

  const updateMileageOnly = async (sessionId: string, mileageOption: any) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ mileage_option: mileageOption })
        .eq('id', sessionId);
      
      if (error) throw error;
      await fetchSessions();
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
    updateMileageOnly,
    supabase 
  };
}
