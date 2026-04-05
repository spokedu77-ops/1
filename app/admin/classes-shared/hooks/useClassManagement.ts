import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { SessionEvent } from '../types';
import { parseExtraTeachers } from '../lib/sessionUtils';
import { ADMIN_NAMES } from '../constants/admins';
import { buildGroupPlannedTotals } from '../lib/plannedRoundTotal';
import { themeColorHexForSessionType } from '@/app/admin/classes-v2/lib/sessionTypeCategory';

export function useClassManagement() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [allEvents, setAllEvents] = useState<SessionEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SessionEvent[]>([]);
  const [teacherList, setTeacherList] = useState<{id: string; name: string}[]>([]);
  const [filterTeacher, setFilterTeacher] = useState('ALL');
  const [currentView, setCurrentView] = useState('rollingFourDay');

  const fetchSessions = useCallback(async () => {
    if (!supabase) return;
    // V2 번들 매칭·과거 월 조회: ±6개월은 누락이 잦아 관리 캘린더는 넓게 잡음
    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 24);
    const rangeEnd = new Date();
    rangeEnd.setMonth(rangeEnd.getMonth() + 24);

    const [usersRes, sessionsRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('sessions')
        .select('*, users:created_by(id, name)')
        .gte('start_at', rangeStart.toISOString())
        .lte('start_at', rangeEnd.toISOString())
        .order('start_at', { ascending: true })
    ]);

    const tList = usersRes.data || [];
    setTeacherList(tList);

    const { data, error } = sessionsRes;
    if (!error && data) {
      const groupTotals = buildGroupPlannedTotals(
        data as {
          group_id?: string | null;
          status?: string | null;
          round_total?: number | null;
          round_index?: number | null;
        }[]
      );
      const groupCurrentRounds: Record<string, number> = {};

      type SessionRow = {
        id?: string; title?: string; start_at?: string; end_at?: string; session_type?: string;
        group_id?: string; users?: { name?: string; id?: string }; students_text?: string; memo?: string;
        round_display?: string; status?: string; price?: number; mileage_option?: string;
        round_index?: number; round_total?: number;
      };
      const events: SessionEvent[] = data.map((s: SessionRow) => {
        const title = s.title ?? '';
        const gid = s.group_id;
        const total = gid ? groupTotals[gid] : undefined;
        // 1.5(가중치) 제거: 화면 표시 분모/표시는 round_index/round_total(=정수) 기준으로만 만듭니다.
        // round_display가 있어도 그대로 쓰지 않습니다.
        const roundIndex = typeof s.round_index === 'number' ? s.round_index : undefined;
        let roundStr: string | undefined =
          typeof roundIndex === 'number' && typeof total === 'number' && Number.isFinite(roundIndex) && Number.isFinite(total) && total > 0
            ? `${roundIndex}/${total}`
            : undefined;

        // round_index가 비어있는 데이터만 최소 fallback(정수 패턴만) 처리
        if (!roundStr) {
          const roundMatch = title.match(/(\d+)\/(\d+)/);
          if (roundMatch) roundStr = `${Number(roundMatch[1])}/${Number(roundMatch[2])}`;
          else if (gid) {
            const st = String(s.status ?? '');
            if (st !== 'postponed' && st !== 'cancelled' && st !== 'deleted') {
              groupCurrentRounds[gid] = (groupCurrentRounds[gid] || 0) + 1;
              const t = groupTotals[gid] ?? 0;
              if (t > 0) roundStr = `${groupCurrentRounds[gid]}/${t}`;
            }
          }
        }

        let displayTeacher = s.users?.name || '미정';
        const { extraTeachers } = parseExtraTeachers(s.memo || '');
        const extraNames = extraTeachers
          .map((ex: { id?: string }) => tList.find((t: { id?: string; name?: string }) => t.id === ex.id)?.name)
          .filter(Boolean) as string[];
        if (extraNames.length > 0) displayTeacher += `, ${extraNames.join(', ')}`;

        const custom = {
          teacher: displayTeacher,
          teacherId: s.users?.id || '',
          type: s.session_type,
          status: s.status,
          groupId: s.group_id ?? undefined,
          price: s.price ?? 0,
          studentsText: s.students_text || '',
          memo: s.memo || '',
          isAdmin: ADMIN_NAMES.some(admin => displayTeacher.includes(admin)),
          roundInfo: roundStr,
          themeColor: themeColorHexForSessionType(s.session_type),
          mileageAction: s.mileage_option || '',
          roundIndex: s.round_index ?? undefined,
          roundTotal: s.round_total ?? undefined,
          roundDisplay: roundStr,
          session_type: s.session_type,
          mileage_option: s.mileage_option || ''
        };
        return {
          id: s.id,
          title: title.replace(/(\d+(?:\.\d+)?\/\d+(?:\.\d+)?)\s?/, '').trim(),
          start: s.start_at,
          end: s.end_at,
          ...custom,
          extendedProps: custom
        } as SessionEvent;
      });
      
      setAllEvents(events);
      setFilteredEvents(events);
    }
  }, [supabase]);

  useEffect(() => {
    if (filterTeacher === 'ALL') {
      setFilteredEvents(allEvents);
    } else {
      setFilteredEvents(allEvents.filter(ev => ev.teacherId === filterTeacher));
    }
  }, [filterTeacher, allEvents]);

  const updateMileageOnly = async (sessionId: string, mileageOption: string) => {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ mileage_option: mileageOption })
        .eq('id', sessionId);
      
      if (error) throw error;
      await fetchSessions();
      return true;
    } catch (err) {
      devLogger.error('Mileage Update Error:', err);
      return false;
    }
  };

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  return { 
    allEvents,
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
