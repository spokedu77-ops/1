'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// 1. 환경 변수 뒤에 느낌표(!) 추가
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CreateClassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // 2. useState에 any[] 추가
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    title: '',
    type: 'regular_private', 
    teacherId: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    durationMinutes: '60',
    durationWeeks: 4, 
    price: 30000 
  });

  useEffect(() => {
    const fetchTeachers = async () => {
      const { data } = await supabase.from('users').select('id, name').order('name');
      if (data) setTeachers(data);
    };
    fetchTeachers();
  }, []);

  // 3. 매개변수에 타입/any 추가
  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const formatNumber = (num: number | string) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.teacherId) return alert('수업명과 강사를 확인해주세요!');
    
    setLoading(true);
    try {
      const loopCount = form.durationWeeks;
      const sessionsToInsert = [];
      const commonGroupId = crypto.randomUUID();

      for (let i = 0; i < loopCount; i++) {
        const startDateTime = new Date(`${form.startDate}T${form.startTime}`);
        startDateTime.setDate(startDateTime.getDate() + (i * 7));

        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + Number(form.durationMinutes));

        sessionsToInsert.push({
          title: `${form.title} ${i + 1}/${loopCount}`,
          session_type: form.type,
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          status: 'opened',
          group_id: commonGroupId,
          sequence_number: i + 1,
          price: parseInt(form.price as any) || 0,
          created_by: form.teacherId,
        });
      }

      const { error } = await supabase.from('sessions').insert(sessionsToInsert);
      if (error) throw error;

      alert('수업이 성공적으로 등록되었습니다!');
      router.push('/admin/classes');
    } catch (err: any) {
      console.error(err);
      alert('등록 중 에러가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-12 px-4">
      {/* 4. JSX 스타일 태그 에러 방지는 그대로 유지 */}
      <style jsx global>{`
        button, select, input, .cursor-pointer { cursor: pointer !important; }
        input:focus, select:focus { outline: none; border-color: #3b82f6 !important; ring: 2px solid #3b82f6; }
      `}</style>

      <div className="max-w-2xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
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

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'regular_private', label: '과외 수업', icon: '🏠' },
              { id: 'regular_center', label: '센터 수업', icon: '🏢' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleChange('type', t.id)}
                className={`p-8 rounded-[32px] border-2 flex flex-col items-center gap-3 transition-all ${
                  form.type === t.id ? 'border-blue-600 bg-blue-50 text-blue-700 ring-4 ring-blue-100' : 'border-gray-50 bg-white text-gray-400'
                }`}
              >
                <span className="text-4xl">{t.icon}</span>
                <span className="text-lg font-black">{t.label}</span>
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4 shadow-inner">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">담당 강사</label>
                <select 
                  className="w-full bg-transparent border-none font-bold text-gray-800 outline-none"
                  value={form.teacherId}
                  onChange={(e) => handleChange('teacherId', e.target.value)}
                >
                  <option value="">강사를 선택하세요</option>
                  {/* 5. t: any 추가 */}
                  {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name} T</option>)}
                </select>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 shadow-inner">
                <div className="flex justify-between items-center px-2 mb-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase block">수업 단가 (1회 기준)</label>
                    <span className="text-[10px] font-bold text-blue-600">현재: {formatNumber(form.price)}원</span>
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
              <label className="text-[10px] font-black text-blue-400 uppercase mb-1 block">수업 시간 선택</label>
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

          <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <span className="text-white font-black italic tracking-widest uppercase text-xs">Session Count</span>
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">총 {form.durationWeeks}주 연속 등록</span>
            </div>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleChange('durationWeeks', num)}
                  className={`flex-1 aspect-square rounded-2xl text-lg font-black transition-all ${
                    form.durationWeeks === num ? 'bg-white text-slate-900 scale-110 shadow-xl' : 'bg-slate-800 text-slate-500 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-6 rounded-[32px] text-xl font-black transition-all shadow-lg ${
              loading ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {loading ? '등록 중...' : '🚀 수업 등록하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
