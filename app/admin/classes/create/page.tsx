'use client';

import { toast } from 'sonner';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { EditableSession } from '../types';

type DayOption = { label: string; value: number };
const DAYS: DayOption[] = [
  { label: '일', value: 0 },
  { label: '월', value: 1 },
  { label: '화', value: 2 },
  { label: '수', value: 3 },
  { label: '목', value: 4 },
  { label: '금', value: 5 },
  { label: '토', value: 6 },
];

export default function CreateClassPage() {
  const router = useRouter();
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  const [form, setForm] = useState({
    title: '',
    type: 'regular_private',
    oneDayPlacement: 'private' as 'center' | 'private',
    teacherId: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    durationMinutes: '60',
    price: 30000,
    weeklyFrequency: 1,
    daysOfWeek: [new Date().getDay()],
    sessionCount: 4,
    roundWeight: 1, // 1=기본, 1.5=90분 회차 표시용
  });

  const [editableSessions, setEditableSessions] = useState<EditableSession[]>([]);

  useEffect(() => {
    if (!supabase) return;
    const fetchTeachers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (data) setTeachers(data);
    };
    fetchTeachers();
  }, [supabase]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setForm(prev => {
      if (field === 'type' && value === 'one_day') {
        return {
          ...prev,
          type: value,
          // 원데이는 기본적으로 레거시(개인)와 동일한 동작을 하도록 private 기본값
          oneDayPlacement: 'private',
          weeklyFrequency: 1,
          sessionCount: 1,
          roundWeight: 1,
          daysOfWeek: [new Date(`${prev.startDate}T${prev.startTime}`).getDay()],
        };
      }
      // startDate 변경 시: 첫 수업 요일(index 0)을 새 날짜의 요일로 갱신
      if (field === 'startDate') {
        const newBaseDay = new Date(`${value}T${prev.startTime}`).getDay();
        const extras = prev.daysOfWeek.filter(d => d !== new Date(`${prev.startDate}T${prev.startTime}`).getDay());
        const nextDays = [newBaseDay, ...extras.filter(d => d !== newBaseDay)].sort((a, b) => a - b);
        return { ...prev, startDate: String(value), daysOfWeek: nextDays };
      }
      // 주당 횟수 변경 시: 초과 요일 제거
      if (field === 'weeklyFrequency') {
        const baseDay = new Date(`${prev.startDate}T${prev.startTime}`).getDay();
        const extras = prev.daysOfWeek.filter(d => d !== baseDay);
        const needed = Number(value) - 1;
        const nextDays = [baseDay, ...extras.slice(0, needed)].sort((a, b) => a - b);
        return { ...prev, weeklyFrequency: Number(value), daysOfWeek: nextDays };
      }
      return { ...prev, [field]: value };
    });
  };

  // 첫 수업 요일(startDate 기준)은 고정, 추가 요일만 토글
  const toggleDay = (dayValue: number) => {
    setForm(prev => {
      const baseDay = new Date(`${prev.startDate}T${prev.startTime}`).getDay();
      if (dayValue === baseDay) return prev; // 기준일은 고정
      const exists = prev.daysOfWeek.includes(dayValue);
      const nextDays = exists
        ? prev.daysOfWeek.filter(d => d !== dayValue)
        : [...prev.daysOfWeek, dayValue].sort((a, b) => a - b);
      return { ...prev, daysOfWeek: nextDays };
    });
  };

  const buildDates = () => {
    const sessions: Date[] = [];
    const start = new Date(`${form.startDate}T${form.startTime}`);
    if (form.type === 'one_day') return [start];
    const selectedDays = form.daysOfWeek.length ? form.daysOfWeek : [start.getDay()];
    const cursor = new Date(start);

    while (sessions.length < form.sessionCount) {
      const weekStart = new Date(cursor);
      weekStart.setDate(cursor.getDate() - cursor.getDay());

      for (const d of selectedDays) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + d);
        dayDate.setHours(start.getHours(), start.getMinutes(), 0, 0);

        if (dayDate >= start && sessions.length < form.sessionCount) {
          sessions.push(new Date(dayDate));
        }
      }
      cursor.setDate(cursor.getDate() + 7);
    }
    return sessions;
  };

  const initializeEditableSessions = () => {
    const dates = buildDates();
    const totalRounds = dates.length;
    const next: EditableSession[] = dates.map((startDateTime, index) => {
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + Number(form.durationMinutes));
      return {
        roundIndex: index + 1,
        startAt: startDateTime,
        endAt: endDateTime,
        teacherId: form.teacherId,
        price: Number(form.price) || 0,
      };
    });
    setEditableSessions(next);
  };

  const goToStep2 = () => {
    if (!form.title || !form.teacherId) return toast.error('수업명과 강사를 확인해주세요!');
    if (form.type !== 'one_day' && form.weeklyFrequency > 1 && form.daysOfWeek.length < form.weeklyFrequency) {
      return toast.error('주간 횟수만큼 요일을 선택해주세요.');
    }
    initializeEditableSessions();
    setStep(2);
  };

  const applyFirstRowToAll = () => {
    if (!editableSessions.length) return;
    const first = editableSessions[0];
    const updated = editableSessions.map((s, idx) => {
      if (idx === 0) return s;
      const start = new Date(s.startAt);
      start.setHours(first.startAt.getHours(), first.startAt.getMinutes(), 0, 0);
      const end = new Date(start);
      const diffMinutes = (first.endAt.getTime() - first.startAt.getTime()) / (1000 * 60);
      end.setMinutes(end.getMinutes() + diffMinutes);
      return {
        ...s,
        teacherId: first.teacherId,
        price: first.price,
        startAt: start,
        endAt: end,
      };
    });
    setEditableSessions(updated);
  };

  const handleFinalSubmit = async () => {
    if (!supabase) return;
    if (!editableSessions.length) return toast.error('회차가 없습니다. 회차를 먼저 생성해주세요.');

    setLoading(true);
    try {
      const commonGroupId = crypto.randomUUID();
      const sorted = [...editableSessions].sort((a, b) => a.roundIndex - b.roundIndex);
      const totalRounds = sorted.length;
      const sessionsToInsert: Record<string, unknown>[] = [];

      sorted.forEach((session, idx) => {
        const roundIndex = idx + 1;
        const isOneDay = form.type === 'one_day';
        const sessionType = isOneDay
          ? form.oneDayPlacement === 'center'
            ? 'one_day_center'
            : 'one_day_private'
          : form.type;
        const roundDisplay = isOneDay
          ? '1/1'
          : form.roundWeight === 1
          ? `${roundIndex}/${totalRounds}`
          : `${(roundIndex * form.roundWeight).toFixed(1)}/${(totalRounds * form.roundWeight).toFixed(1)}`;

        sessionsToInsert.push({
          title: form.title,
          session_type: sessionType,
          start_at: session.startAt.toISOString(),
          end_at: session.endAt.toISOString(),
          status: 'opened',
          group_id: commonGroupId,
          sequence_number: roundIndex,
          round_index: roundIndex,
          round_total: totalRounds,
          round_display: roundDisplay,
          price: Number(session.price) || 0,
          created_by: session.teacherId || form.teacherId,
        });
      });

      const { error } = await supabase.from('sessions').insert(sessionsToInsert);
      if (error) throw error;

      toast.success('수업이 성공적으로 등록되었습니다!');
      router.push('/admin/classes');
    } catch (err: unknown) {
      devLogger.error(err);
      toast.error('등록 중 에러가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-slate-900">
      <div className="flex-1 overflow-auto flex justify-center py-12 px-4">
        <style jsx global>{`
          button, select, input, .cursor-pointer { cursor: pointer !important; }
          input:focus, select:focus { outline: none; border-color: #3b82f6 !important; ring: 2px solid #3b82f6; }
        `}</style>

        <div className="max-w-2xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col h-fit">
          <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center bg-white sticky top-0 z-20">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">✨ 수업 커리큘럼 등록</h1>
              <p className="text-gray-400 text-sm font-bold mt-1">스포키듀의 새로운 에너지를 만들어주세요</p>
            </div>
            <button 
              type="button"
              onClick={() => router.back()} 
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all font-bold text-sm"
            >
              ✕ 취소
            </button>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="p-10 space-y-8">
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'regular_private', label: '과외 수업', icon: '🏠' },
                { id: 'regular_center', label: '센터 수업', icon: '🏢' },
                { id: 'one_day', label: '원데이', icon: '🎉' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleChange('type', t.id)}
                  className={`p-6 rounded-[24px] border-2 flex flex-col items-center gap-2 transition-all ${
                    form.type === t.id ? 'border-blue-600 bg-blue-50 text-blue-700 ring-4 ring-blue-100' : 'border-gray-50 bg-white text-gray-400'
                  }`}
                >
                  <span className="text-3xl">{t.icon}</span>
                  <span className="text-base font-black">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="수업 명칭을 입력하세요"
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-lg font-bold placeholder:text-gray-300 shadow-inner text-black"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />

              {form.type === 'one_day' && (
                <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl space-y-4 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-black italic tracking-widest uppercase text-xs">One-day type</span>
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                      총 1회
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleChange('oneDayPlacement', 'center')}
                      className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                        form.oneDayPlacement === 'center'
                          ? 'bg-blue-600 text-white border-blue-500 ring-4 ring-blue-100/50'
                          : 'bg-slate-800 text-white/70 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      센터
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('oneDayPlacement', 'private')}
                      className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                        form.oneDayPlacement === 'private'
                          ? 'bg-emerald-600 text-white border-emerald-500 ring-4 ring-emerald-100/50'
                          : 'bg-slate-800 text-white/70 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      개인
                    </button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 shadow-inner">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">담당 강사</label>
                  <select 
                    className="w-full bg-transparent border-none font-bold text-gray-800 outline-none"
                    value={form.teacherId}
                    onChange={(e) => handleChange('teacherId', e.target.value)}
                  >
                    <option value="">강사를 선택하세요</option>
                    {teachers.map((t: { id: string; name: string }) => <option key={t.id} value={t.id}>{t.name} T</option>)}
                  </select>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 shadow-inner">
                  <div className="flex justify-between items-center px-2 mb-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase block">수업 단가 (1회 기준)</label>
                      <span className="text-[10px] font-bold text-blue-600">현재: {form.price}원</span>
                  </div>
                  <input 
                    type="number" 
                    className="w-full bg-transparent border-none font-bold text-gray-800 outline-none px-2"
                    value={form.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <label className="text-[10px] font-black text-blue-400 uppercase mb-1 block">첫 수업 시작일</label>
                <input type="date" className="w-full bg-transparent border-none font-bold text-blue-700" value={form.startDate} onChange={(e) => handleChange('startDate', e.target.value)} />
              </div>
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <label className="text-[10px] font-black text-blue-400 uppercase mb-1 block">시작 시간</label>
                <input type="time" className="w-full bg-transparent border-none font-bold text-blue-700" value={form.startTime} onChange={(e) => handleChange('startTime', e.target.value)} />
              </div>
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <label className="text-[10px] font-black text-blue-400 uppercase mb-1 block">수업 시간</label>
                <select 
                  className="w-full bg-transparent border-none font-bold text-blue-700 outline-none"
                  value={form.durationMinutes}
                  onChange={(e) => handleChange('durationMinutes', e.target.value)}
                >
                  {[40, 50, 60, 80, 90, 120].map(time => (
                    <option key={time} value={time}>{time}분</option>
                  ))}
                </select>
              </div>
            </div>

            {form.type !== 'one_day' && (
              <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-black italic tracking-widest uppercase text-xs">Schedule</span>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">총 {form.sessionCount}회</span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-white text-xs font-black">주당 횟수</label>
                  <select
                    value={form.weeklyFrequency}
                    onChange={(e) => handleChange('weeklyFrequency', Number(e.target.value))}
                    className="bg-slate-800 text-white rounded-lg px-3 py-2 text-xs font-bold"
                  >
                    {[1, 2, 3].map(n => <option key={n} value={n}>{n}회</option>)}
                  </select>
                  <label className="text-white text-xs font-black">총 회차</label>
                  <input
                    type="number"
                    className="w-20 bg-slate-800 text-white rounded-lg px-2 py-2 text-xs font-bold"
                    value={form.sessionCount}
                    onChange={(e) => handleChange('sessionCount', Number(e.target.value))}
                  />
                  <label className="text-white text-xs font-black">회차 표시</label>
                  <select
                    value={form.roundWeight}
                    onChange={(e) => handleChange('roundWeight', Number(e.target.value))}
                    className="bg-slate-800 text-white rounded-lg px-3 py-2 text-xs font-bold"
                  >
                    <option value={1}>기본</option>
                    <option value={1.5}>90분(1.5회)</option>
                  </select>
                </div>

                {/* 주 1회: 요일 선택 불필요 (startDate 요일로 자동) */}
                {form.weeklyFrequency === 1 ? (
                  <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-2">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">수업 요일</span>
                    <span className="text-white text-xs font-black ml-2">
                      {DAYS.find(d => d.value === new Date(`${form.startDate}T${form.startTime}`).getDay())?.label}요일
                    </span>
                    <span className="text-slate-500 text-[10px] ml-1">(첫 수업일 기준 자동)</span>
                  </div>
                ) : (
                  /* 주 2회+: 첫 수업 요일 고정 + 추가 요일 선택 */
                  <div className="space-y-2">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">
                      추가 요일 선택 <span className="text-blue-400">({form.weeklyFrequency - 1}개 더 선택)</span>
                    </p>
                    <div className="flex gap-2">
                      {DAYS.map((d) => {
                        const baseDay = new Date(`${form.startDate}T${form.startTime}`).getDay();
                        const isBase = d.value === baseDay;
                        const isSelected = form.daysOfWeek.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => toggleDay(d.value)}
                            disabled={isBase}
                            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                              isBase
                                ? 'bg-blue-500 text-white cursor-not-allowed'
                                : isSelected
                                  ? 'bg-white text-slate-900'
                                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                            }`}
                            title={isBase ? '첫 수업일 기준 고정' : ''}
                          >
                            {d.label}
                            {isBase && <span className="block text-[8px] opacity-70">고정</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <button
                type="button"
                disabled={loading}
                onClick={goToStep2}
                className={`w-full py-6 rounded-[32px] text-xl font-black transition-all shadow-lg ${
                  loading ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                }`}
              >
                {loading ? '계산 중...' : '➡ 회차 설정으로'}
              </button>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-black text-slate-900">회차별 설정</h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-full text-xs font-bold bg-gray-100 text-gray-600"
                      onClick={() => {
                        setStep(1);
                      }}
                    >
                      ◀ 기본 설정 수정
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-full text-xs font-bold bg-blue-50 text-blue-600"
                      onClick={applyFirstRowToAll}
                      disabled={!editableSessions.length}
                    >
                      전체 동일하게 적용
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">회차</th>
                        <th className="px-3 py-2 text-left">날짜</th>
                        <th className="px-3 py-2 text-left">시간</th>
                        <th className="px-3 py-2 text-left">선생님</th>
                        <th className="px-3 py-2 text-right">금액</th>
                        <th className="px-3 py-2 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableSessions.map((s, idx) => {
                        const startDateStr = s.startAt.toISOString().split('T')[0];
                        const timeStr = s.startAt.toTimeString().slice(0, 5);
                        return (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-bold text-slate-700">
                              {s.roundIndex}/{editableSessions.length}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                className="bg-transparent border rounded-lg px-2 py-1 text-xs"
                                value={startDateStr}
                                onChange={(e) => {
                                  const next = [...editableSessions];
                                  const d = new Date(next[idx].startAt);
                                  const [y, m, dStr] = e.target.value.split('-').map(Number);
                                  d.setFullYear(y, m - 1, dStr);
                                  const duration =
                                    (next[idx].endAt.getTime() - next[idx].startAt.getTime()) /
                                    (1000 * 60);
                                  const end = new Date(d);
                                  end.setMinutes(end.getMinutes() + duration);
                                  next[idx] = { ...next[idx], startAt: d, endAt: end };
                                  setEditableSessions(next);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="time"
                                className="bg-transparent border rounded-lg px-2 py-1 text-xs"
                                value={timeStr}
                                onChange={(e) => {
                                  const next = [...editableSessions];
                                  const [hh, mm] = e.target.value.split(':').map(Number);
                                  const d = new Date(next[idx].startAt);
                                  d.setHours(hh, mm, 0, 0);
                                  const duration =
                                    (next[idx].endAt.getTime() - next[idx].startAt.getTime()) /
                                    (1000 * 60);
                                  const end = new Date(d);
                                  end.setMinutes(end.getMinutes() + duration);
                                  next[idx] = { ...next[idx], startAt: d, endAt: end };
                                  setEditableSessions(next);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                className="bg-transparent border rounded-lg px-2 py-1 text-xs"
                                value={s.teacherId}
                                onChange={(e) => {
                                  const next = [...editableSessions];
                                  next[idx] = { ...next[idx], teacherId: e.target.value };
                                  setEditableSessions(next);
                                }}
                              >
                                <option value="">기본 강사</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} T
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                className="w-24 bg-transparent border rounded-lg px-2 py-1 text-xs text-right"
                                value={s.price}
                                onChange={(e) => {
                                  const next = [...editableSessions];
                                  next[idx] = {
                                    ...next[idx],
                                    price: Number(e.target.value) || 0,
                                  };
                                  setEditableSessions(next);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                className="text-xs text-red-500"
                                onClick={() => {
                                  const next = editableSessions.filter((_, i) => i !== idx);
                                  const reindexed = next.map((item, i2) => ({
                                    ...item,
                                    roundIndex: i2 + 1,
                                  }));
                                  setEditableSessions(reindexed);
                                }}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    className="px-4 py-3 rounded-full text-sm font-bold bg-gray-100 text-gray-700"
                    onClick={() => {
                      const nextIndex = editableSessions.length + 1;
                      const last =
                        editableSessions[editableSessions.length - 1] ??
                        ({
                          roundIndex: 0,
                          startAt: new Date(`${form.startDate}T${form.startTime}`),
                          endAt: new Date(`${form.startDate}T${form.startTime}`),
                          teacherId: form.teacherId,
                          price: Number(form.price) || 0,
                        } as EditableSession);
                      const start = new Date(last.startAt);
                      start.setDate(start.getDate() + 7);
                      const duration =
                        (last.endAt.getTime() - last.startAt.getTime()) / (1000 * 60);
                      const end = new Date(start);
                      end.setMinutes(end.getMinutes() + duration);
                      setEditableSessions([
                        ...editableSessions,
                        {
                          roundIndex: nextIndex,
                          startAt: start,
                          endAt: end,
                          teacherId: last.teacherId,
                          price: last.price,
                        },
                      ]);
                    }}
                  >
                    + 회차 추가
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleFinalSubmit}
                    className={`px-6 py-3 rounded-full text-sm font-black transition-all shadow-lg ${
                      loading
                        ? 'bg-gray-200 text-gray-400'
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                    }`}
                  >
                    {loading ? '등록 중...' : '🚀 수업 개설'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
