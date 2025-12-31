'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  ChevronLeft, ChevronRight, Plus, MapPin, 
  Clock, User, Calendar as CalendarIcon, Filter, MoreHorizontal
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 예시 데이터 (실제로는 DB에서 가져옴)
const DUMMY_SCHEDULES = [
  {
    id: '1',
    title: '연세 신체활동 프로그램',
    instructor_name: '김구민',
    start_time: '10:00',
    end_time: '12:00',
    location: '연세대학교 체육관',
    category: '느린학습자',
    status: 'confirmed'
  },
  {
    id: '2',
    title: '실버 건강 체육',
    instructor_name: '김윤기',
    start_time: '13:30',
    end_time: '15:00',
    location: '서대문구 복지관',
    category: '시니어',
    status: 'confirmed'
  },
  {
    id: '3',
    title: '키즈 이머시브 웜업',
    instructor_name: '최지훈',
    start_time: '15:30',
    end_time: '17:00',
    location: '마포 초등학교',
    category: '유아체육',
    status: 'pending'
  }
];

export default function AdminSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState(DUMMY_SCHEDULES);

  // 1주일 날짜 생성 로직
  const getWeekDays = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // 월요일 기준

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays(selectedDate);
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 md:p-10 font-sans tracking-tight text-slate-900">
      <header className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black italic text-blue-950 leading-none tracking-tighter">
              SPOKEDU <span className="text-blue-600 NOT-italic uppercase">Timeline</span>
            </h1>
            <p className="text-xs font-black text-slate-400 mt-3 tracking-[0.2em] uppercase opacity-80">Class Operation Management</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
              <Filter className="w-5 h-5 text-slate-500" />
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all">
              <Plus className="w-5 h-5" /> NEW CLASS
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* 주간 날짜 선택기 (가로 타임라인 핵심) */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black italic ml-2">
              {selectedDate.getFullYear()}. {selectedDate.getMonth() + 1}
            </h2>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <button className="px-4 py-2 text-xs font-black bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">TODAY</button>
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {weekDays.map((date, i) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              return (
                <button 
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center py-4 rounded-[24px] transition-all ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105' 
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <span className={`text-[10px] font-black mb-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    {dayNames[i]}
                  </span>
                  <span className="text-lg font-black italic leading-none">{date.getDate()}</span>
                  {i === 1 && !isSelected && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2" />} {/* 일정이 있는 날 표시 */}
                </button>
              );
            })}
          </div>
        </section>

        {/* 수직 타임라인 리스트 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* 시간 표시 컬럼 (PC에서만) */}
          <div className="hidden lg:block lg:col-span-1 py-10 space-y-20">
            {['10:00', '12:00', '14:00', '16:00', '18:00'].map(time => (
              <div key={time} className="text-xs font-black text-slate-300 italic text-right">{time}</div>
            ))}
          </div>

          {/* 스케줄 카드 영역 */}
          <div className="lg:col-span-11 space-y-6 relative">
            {/* 현재 시간 표시선 (가상) */}
            <div className="absolute left-0 top-1/4 w-full border-t-2 border-dashed border-blue-200 z-0 hidden lg:block" />

            {schedules.map((item) => (
              <div 
                key={item.id} 
                className="group bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center"
              >
                {/* 시간 정보 */}
                <div className="flex flex-col min-w-[120px]">
                  <span className="text-xs font-black text-blue-600 mb-1 flex items-center gap-1 uppercase tracking-tighter">
                    <Clock className="w-3 h-3" /> {item.start_time} - {item.end_time}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">90 Minutes Class</span>
                </div>

                {/* 메인 정보 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                      item.category === '느린학습자' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {item.category}
                    </span>
                    <span className="text-[9px] font-black text-slate-300 uppercase italic">ID: #{item.id}</span>
                  </div>
                  <h3 className="text-xl font-black italic text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center text-xs font-bold text-slate-500 tracking-tight">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-300" /> {item.location}
                    </div>
                    <div className="flex items-center text-xs font-bold text-slate-500 tracking-tight">
                      <User className="w-3.5 h-3.5 mr-1.5 text-slate-300" /> {item.instructor_name} 강사
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                  <button className="flex-1 md:flex-none px-5 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black transition-all">
                    EDIT
                  </button>
                  <button className="p-3 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-2xl transition-all">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}

            {/* 비어있는 시간대 시각화 */}
            <div className="py-10 border-2 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center opacity-40 grayscale">
              <CalendarIcon className="w-8 h-8 text-slate-300 mb-2" />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No more classes scheduled for today</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}