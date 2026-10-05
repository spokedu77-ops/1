import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { SessionEvent } from '../types';
import { parseExtraTeachers } from '../lib/sessionUtils';
import { ADMIN_NAMES } from '../constants/admins';
import { buildGroupPlannedTotals } from '../lib/plannedRoundTotal';
import { clampRoundIndex } from '../lib/roundFields';
import { themeColorHexForSessionType } from '@/app/admin/classes/lib/sessionTypeCategory';

function assertUpdatedRow(data: { id?: string } | null, error: unknown, fallback: string) {
  if (error) throw error;
  if (!data?.id) throw new Error(fallback);
}

type SessionRow = {
  id?: string; title?: string; start_at?: string; end_at?: string; session_type?: string;
  group_id?: string; users?: { name?: string; id?: string }; students_text?: string; memo?: string;
  round_display?: string; status?: string; price?: number; mileage_option?: string;
  round_index?: number; round_total?: number;
};

type TeacherRow = { id: string; name: string };

function buildSessionEvents(data: SessionRow[], teachers: TeacherRow[]): SessionEvent[] {
  const groupTotals = buildGroupPlannedTotals(data as {
    group_id?: string | null;
    status?: string | null;
    round_total?: number | null;
    round_index?: number | null;
  }[]);
  const groupCurrentRounds: Record<string, number> = {};

  return data.map((session) => {
    const title = session.title ?? '';
    const groupId = session.group_id;
    const total = groupId ? groupTotals[groupId] : undefined;
    const roundIndex = typeof session.round_index === 'number' ? session.round_index : undefined;
    let roundDisplay =
      typeof roundIndex === 'number' && typeof total === 'number' && Number.isFinite(roundIndex) && Number.isFinite(total) && total > 0
        ? `${clampRoundIndex(roundIndex, total)}/${total}`
        : undefined;

    if (!roundDisplay) {
      const roundMatch = title.match(/(\d+)\/(\d+)/);
      if (roundMatch) roundDisplay = `${Number(roundMatch[1])}/${Number(roundMatch[2])}`;
      else if (groupId) {
        const status = String(session.status ?? '');
        if (status !== 'postponed' && status !== 'cancelled' && status !== 'deleted') {
          groupCurrentRounds[groupId] = (groupCurrentRounds[groupId] || 0) + 1;
          const plannedTotal = groupTotals[groupId] ?? 0;
          if (plannedTotal > 0) roundDisplay = `${groupCurrentRounds[groupId]}/${plannedTotal}`;
        }
      }
    }

    let displayTeacher = session.users?.name || '담당자 없음';
    const { extraTeachers } = parseExtraTeachers(session.memo || '');
    const extraTeacherIds = extraTeachers
      .map((teacher: { id?: string }) => (teacher.id ? String(teacher.id).trim() : ''))
      .filter(Boolean);
    const extraNames = extraTeacherIds
      .map((id) => teachers.find((teacher) => teacher.id === id)?.name)
      .filter(Boolean) as string[];
    if (extraNames.length > 0) displayTeacher += `, ${extraNames.join(', ')}`;

    const custom = {
      teacher: displayTeacher,
      teacherId: session.users?.id || '',
      extraTeacherIds,
      type: session.session_type,
      status: session.status,
      groupId: session.group_id ?? undefined,
      price: session.price ?? 0,
      studentsText: session.students_text || '',
      memo: session.memo || '',
      isAdmin: ADMIN_NAMES.some((admin) => displayTeacher.includes(admin)),
      roundInfo: roundDisplay,
      themeColor: themeColorHexForSessionType(session.session_type),
      mileageAction: session.mileage_option || '',
      roundIndex: session.round_index ?? undefined,
      roundTotal: session.round_total ?? undefined,
      roundDisplay,
      session_type: session.session_type,
      mileage_option: session.mileage_option || '',
    };

    return {
      id: session.id,
      title: title.replace(/(\d+(?:\.\d+)?\/\d+(?:\.\d+)?)\s?/, '').trim(),
      start: session.start_at,
      end: session.end_at,
      ...custom,
      extendedProps: custom,
    } as SessionEvent;
  });
}

export function useClassManagement() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [allEvents, setAllEvents] = useState<SessionEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SessionEvent[]>([]);
  const [teacherList, setTeacherList] = useState<{id: string; name: string}[]>([]);
  const [filterTeacher, setFilterTeacher] = useState('ALL');
  /** 성공 경로에서는 null. 달력이 비어 보이는 것과 조회 실패를 구분한다. */
  const [sessionsFetchNotice, setSessionsFetchNotice] = useState<
    null | { type: 'error' } | { type: 'truncated' }
  >(null);

  const fetchSessions = useCallback(async () => {
    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 24);
    const rangeEnd = new Date();
    rangeEnd.setMonth(rangeEnd.getMonth() + 24);
    const rangeStartIso = rangeStart.toISOString();
    const rangeEndIso = rangeEnd.toISOString();
    const PAGE = 1000;

    const fetchSessionPage = async (offset: number, start = rangeStartIso, end = rangeEndIso) => {
      const params = new URLSearchParams({
        start,
        end,
        offset: String(offset),
        limit: String(PAGE),
      });
      const res = await fetch(`/api/admin/classes/sessions?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = (await res.json().catch(() => ({}))) as { sessions?: SessionRow[]; error?: string };
      if (!res.ok) throw new Error(payload.error || 'sessions_fetch_failed');
      return payload.sessions ?? [];
    };

    const quickStart = new Date();
    quickStart.setDate(1);
    quickStart.setMonth(quickStart.getMonth() - 1);
    quickStart.setHours(0, 0, 0, 0);
    const quickEnd = new Date(quickStart);
    quickEnd.setMonth(quickEnd.getMonth() + 3);

    let usersRes: { data: TeacherRow[] | null; error: unknown };
    let data: SessionRow[];
    try {
      const usersPromise = supabase
        ? supabase.from('users').select('id, name').eq('is_active', true).order('name', { ascending: true })
        : Promise.resolve({ data: [] as TeacherRow[], error: null });
      const [resolvedUsers, quickData] = await Promise.all([
        usersPromise,
        fetchSessionPage(0, quickStart.toISOString(), quickEnd.toISOString()),
      ]);
      usersRes = resolvedUsers;
      const quickTeachers = usersRes.data || [];
      setTeacherList(quickTeachers);
      const quickEvents = buildSessionEvents(quickData, quickTeachers);
      setAllEvents(quickEvents);
      setFilteredEvents(quickEvents);

      data = await fetchSessionPage(0);
    } catch (caught) {
      devLogger.error('fetchSessions network error:', caught);
      setSessionsFetchNotice({ type: 'error' });
      return;
    }

    if (usersRes.error) {
      devLogger.error('fetchSessions users error:', usersRes.error);
    }

    const tList = usersRes.data || [];
    setTeacherList(tList);

    let truncated = false;

    if (data.length === PAGE) {
      let offset = PAGE;
      const accumulated = [...data];
      for (;;) {
        try {
          const nextPage = await fetchSessionPage(offset);
          if (nextPage.length === 0) break;
          accumulated.push(...nextPage);
          if (nextPage.length < PAGE) break;
          offset += PAGE;
        } catch (caught) {
          devLogger.error('fetchSessions sessions pagination error:', caught);
          truncated = true;
          break;
        }
      }
      data = accumulated;
    }

    setSessionsFetchNotice(truncated ? { type: 'truncated' } : null);

    {
      const groupTotals = buildGroupPlannedTotals(
        data as {
          group_id?: string | null;
          status?: string | null;
          round_total?: number | null;
          round_index?: number | null;
        }[]
      );
      const groupCurrentRounds: Record<string, number> = {};

      const events: SessionEvent[] = data.map((s: SessionRow) => {
        const title = s.title ?? '';
        const gid = s.group_id;
        const total = gid ? groupTotals[gid] : undefined;
        // 1.5(ê°ì¤ì¹) ì ê±°: íë©´ íì ë¶ëª¨/íìë round_index/round_total(=ì ì) ê¸°ì¤ì¼ë¡ë§ ë§ë­ëë¤.
        // round_displayê° ìì´ë ê·¸ëë¡ ì°ì§ ììµëë¤.
        const roundIndex = typeof s.round_index === 'number' ? s.round_index : undefined;
        let roundStr: string | undefined =
          typeof roundIndex === 'number' && typeof total === 'number' && Number.isFinite(roundIndex) && Number.isFinite(total) && total > 0
            ? `${clampRoundIndex(roundIndex, total)}/${total}`
            : undefined;

        // round_indexê° ë¹ì´ìë ë°ì´í°ë§ ìµì fallback(ì ì í¨í´ë§) ì²ë¦¬
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

        let displayTeacher = s.users?.name || 'ë¯¸ì ';
        const { extraTeachers } = parseExtraTeachers(s.memo || '');
        const extraTeacherIds = extraTeachers
          .map((ex: { id?: string }) => (ex.id ? String(ex.id).trim() : ''))
          .filter(Boolean);
        const extraNames = extraTeacherIds
          .map((id) => tList.find((t: { id?: string; name?: string }) => t.id === id)?.name)
          .filter(Boolean) as string[];
        if (extraNames.length > 0) displayTeacher += `, ${extraNames.join(', ')}`;

        const custom = {
          teacher: displayTeacher,
          teacherId: s.users?.id || '',
          extraTeacherIds,
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
      setFilteredEvents(
        allEvents.filter(
          (ev) =>
            ev.teacherId === filterTeacher ||
            (ev.extraTeacherIds ?? []).includes(filterTeacher)
        )
      );
    }
  }, [filterTeacher, allEvents]);

  const updateMileageOnly = async (sessionId: string, mileageOption: string) => {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({ mileage_option: mileageOption })
        .eq('id', sessionId)
        .select('id')
        .maybeSingle();
      
      assertUpdatedRow(data, error, 'MILEAGE_SESSION_NOT_UPDATED');
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
    fetchSessions,
    sessionsFetchNotice,
    updateMileageOnly,
    supabase,
  };
}
