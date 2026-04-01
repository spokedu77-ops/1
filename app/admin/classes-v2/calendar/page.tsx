"use client";

import { toast } from 'sonner';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { CalendarApi, EventClickArg, EventDropArg } from '@fullcalendar/core';

const FullCalendar = dynamic(
  () => import('@fullcalendar/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    ),
  }
);

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import Sidebar from '@/app/components/Sidebar';
import { useClassManagement } from '../../classes/hooks/useClassManagement';
import type { SessionEvent } from '../../classes/types';

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  regular_private: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
  regular_center: { bg: '#EFF6FF', border: '#2563EB', text: '#1E3A8A' },
  one_day_center: { bg: '#EFF6FF', border: '#2563EB', text: '#1E3A8A' },
  one_day: { bg: '#FFF7ED', border: '#FB923C', text: '#9A3412' },
  one_day_private: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
};

const STATUS_COLORS = {
  finished: { bg: '#F1F5F9', border: '#94A3B8', text: '#64748B' },
  postponed: { bg: '#FAF5FF', border: '#A855F7', text: '#7E22CE' },
  cancelled: { bg: '#FFF1F2', border: '#F43F5E', text: '#BE123C' },
  urgent: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },
};

export default function ClassManagementCalendarV2() {
  const router = useRouter();
  const [calendarApi, setCalendarApi] = useState<CalendarApi | null>(null);
  const {
    filteredEvents,
    teacherList,
    fetchSessions,
    supabase,
    currentView,
    setCurrentView,
    filterTeacher,
    setFilterTeacher,
  } = useClassManagement();

  const getYesterday = (base: Date = new Date()) => {
    const d = new Date(base);
    d.setDate(d.getDate() - 1);
    return d;
  };
  const initialDateStr = getYesterday().toISOString().split('T')[0];

  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  void teacherList;
  void fetchSessions;
  void supabase;

  const handleViewChange = (viewName: string) => {
    if (!calendarApi) return;
    if (viewName === 'rollingFourDay') {
      calendarApi.gotoDate(getYesterday());
    } else if (viewName === 'twoMonthGrid') {
      const today = new Date();
      calendarApi.gotoDate(today);
      setTimeout(() => {
        const todayEl = document.querySelector('.fc-day-today');
        todayEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      calendarApi.gotoDate(new Date());
    }

    calendarApi.changeView(viewName);
    setCurrentView(viewName);
  };

  const handleToday = () => {
    if (!calendarApi) return;
    if (currentView === 'rollingFourDay') calendarApi.gotoDate(getYesterday());
    else calendarApi.today();
  };

  const handleEventClick = (arg: EventClickArg) => {
    const ev = arg.event;
    const found = filteredEvents.find((e) => String(e.id) === String(ev.id)) || null;
    if (!found) return;
    setSelectedEvent(found);
    // V2 캘린더는 읽기 전용: 편집 모달 대신 리스트로 이동
    router.push('/admin/classes-v2/list');
  };

  const handleEventDrop = async (_arg: EventDropArg) => {
    toast.error('V2 캘린더는 읽기 전용입니다. 변경은 리스트에서 진행해주세요.');
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
              <CalendarIcon size={18} className="text-blue-600" /> SPOKEDU (V2)
            </h1>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => calendarApi?.prev()}
                className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={handleToday}
                className="px-2 sm:px-3 py-1 text-xs font-black rounded-md hover:bg-white transition-all"
              >
                TODAY
              </button>
              <button
                onClick={() => calendarApi?.next()}
                className="p-1 sm:p-1.5 hover:bg-white rounded-md transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/classes-v2/list"
              className="px-4 py-2 rounded-full text-xs font-black bg-slate-900 text-white hover:bg-slate-800"
            >
              리스트로 이동 (V2)
            </Link>
          </div>
        </nav>

        <div className="flex-1 min-h-0">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={initialDateStr}
            events={filteredEvents.map((e) => ({
              id: e.id,
              title: e.title,
              start: e.start,
              end: e.end,
            }))}
            eventClick={handleEventClick}
            editable={false}
            droppable={false}
            eventDrop={handleEventDrop}
            height="100%"
            headerToolbar={false}
          />
        </div>
      </div>
    </div>
  );
}

