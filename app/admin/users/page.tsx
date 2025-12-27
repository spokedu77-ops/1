'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. 환경 변수 뒤에 느낌표(!) 추가 (에러 방지)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UserAccordionPage() {
  // 2. useState에 any[] 추가 (데이터 형식 에러 방지)
  const [users, setUsers] = useState<any[]>([]);
  const [openCategory, setOpenCategory] = useState('관리자');

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase.from('users').select('*').order('name', { ascending: true });
      if (data) setUsers(data);
    }
    fetchUsers();
  }, []);

  const categories = [
    { title: '관리자', roleKey: 'admin', icon: '👑', color: 'text-red-600', bg: 'bg-red-50' },
    { title: '선생님', roleKey: 'teacher', icon: '🎒', color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: '학부모(학생)', roleKey: 'parent', icon: '🏠', color: 'text-gray-600', bg: 'bg-gray-100' }
  ];

  // 3. 매개변수 cat에 : any 추가
  const renderAccordion = (cat: any) => {
    const isOpen = openCategory === cat.title;
    // 4. u에 : any 추가
    const filtered = users.filter((u: any) => {
      if (cat.roleKey === 'admin') return u.role === 'admin' || u.role === 'master';
      if (cat.roleKey === 'teacher') return u.role === 'teacher';
      return u.role === 'parent' || u.role === 'student' || !u.role;
    });

    return (
      <div key={cat.title} className="mb-4 overflow-hidden rounded-[30px] border border-gray-100 bg-white shadow-sm transition-all">
        <button 
          onClick={() => setOpenCategory(isOpen ? '' : cat.title)}
          className={`w-full flex items-center justify-between p-8 transition-colors ${isOpen ? cat.bg : 'hover:bg-gray-50'}`}
        >
          <div className="flex items-center gap-4">
            <span className="text-2xl">{cat.icon}</span>
            <div className="text-left">
              <h2 className={`text-xl font-black italic uppercase tracking-tighter ${cat.color}`}>{cat.title}</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filtered.length} 명 등록됨</p>
            </div>
          </div>
          <span className={`text-xl transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {isOpen && (
          <div className="p-4 animate-fadeIn">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">이름</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">소속</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">이메일(ID)</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">연락처</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 5. user에 : any 추가 */}
                  {filtered.length > 0 ? filtered.map((user: any) => (
                    <tr key={user.id} className="border-b border-gray-50 last:border-none hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-black text-gray-900 text-sm italic">{user.name}</td>
                      <td className="p-4 font-bold text-blue-600 text-xs italic">
                        {user.organization || '스포키듀'}
                      </td>
                      <td className="p-4 font-bold text-gray-400 text-xs font-mono">{user.email}</td>
                      <td className="p-4 font-bold text-gray-500 text-xs font-mono">{user.phone || '미등록'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-xs font-bold text-gray-300 uppercase italic">데이터가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 p-10 bg-gray-50 min-h-screen">
      <header className="mb-12">
        <h1 className="text-4xl font-black italic text-blue-900 uppercase tracking-tighter">User Database</h1>
        <p className="text-[10px] font-black text-gray-300 mt-2 uppercase tracking-[0.4em] italic leading-none">Spokedu Operations Management</p>
      </header>

      <div className="max-w-5xl mx-auto">
        {categories.map(cat => renderAccordion(cat))}
      </div>
    </div>
  );
}