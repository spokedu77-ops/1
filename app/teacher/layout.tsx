'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js'; // Supabase 추가
import { Home, BookOpen, Calendar, Package, MessageCircle, MoreHorizontal, Receipt, X, LogOut, FileText } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  // 로그아웃 핸들러
  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('로그아웃 중 오류가 발생했습니다.');
    } else {
      router.replace('/admin'); // 로그아웃 후 로그인(관리자) 페이지로 이동
    }
  };

  const moreMenus = [
    { id: '/teacher/lesson-plans', label: '수업안 관리', icon: FileText },
    { id: '/teacher/inventory', label: '교구목록', icon: Package },
    { id: '/teacher/report', label: '정산 확인', icon: Receipt },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F9FBFF] block relative overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/50 pt-[env(safe-area-inset-top)] flex justify-center">
        <div className="max-w-2xl w-full h-16 px-6 flex items-center justify-between font-sans">
          <button onClick={() => router.push('/teacher')} className="flex items-center gap-3 cursor-pointer outline-none group text-left">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">S</div>
            <div className="flex flex-col">
              <h1 className="text-[15px] font-black text-slate-900 uppercase leading-none tracking-tight text-indigo-600">SPOKEDU</h1>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1">강사 대시보드</span>
            </div>
          </button>
          <div className="w-8 h-8 bg-slate-100 rounded-full border border-slate-200/50 flex items-center justify-center text-[10px] font-black text-slate-400 italic uppercase">Teacher</div>
        </div>
      </header>

      <div className="w-full flex justify-center">
        <main className="w-full max-w-2xl px-6 pt-8 pb-40 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>

      {isMoreOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsMoreOpen(false)}>
          <div 
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-white rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom-5 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-tighter italic">More Service</h3>
              <button onClick={() => setIsMoreOpen(false)} className="p-2 bg-slate-100 rounded-full cursor-pointer hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {moreMenus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => { router.push(menu.id); setIsMoreOpen(false); }}
                  className="flex flex-col items-start p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 transition-all text-left cursor-pointer group"
                >
                  <menu.icon className="text-slate-400 group-hover:text-indigo-600 mb-3 transition-colors" size={24} />
                  <span className="text-[13px] font-black text-slate-800 tracking-tight">{menu.label}</span>
                </button>
              ))}
              {/* 로그아웃 버튼: handleLogout 연결 */}
              <button 
                onClick={handleLogout}
                className="flex flex-col items-start p-5 bg-red-50 rounded-2xl border border-red-100 text-left col-span-2 cursor-pointer hover:bg-red-100 transition-all group"
              >
                <LogOut className="text-red-400 group-hover:text-red-600 mb-3 transition-colors" size={24} />
                <span className="text-[13px] font-black text-red-800 tracking-tight">로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-white/95 backdrop-blur-xl border-t border-slate-100 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
        <div className="max-w-2xl w-full h-20 px-4 flex justify-around items-center">
          {[
            { id: '/teacher', label: '메인', icon: Home },
            { id: '/teacher/curriculum', label: '프로그램', icon: BookOpen },
            { id: '/teacher/chat', label: '채팅', icon: MessageCircle },
            { id: '/teacher/my-classes', label: '일정', icon: Calendar },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => router.push(item.id)} 
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${isActive(item.id) ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
            >
              <div className={`p-2 rounded-xl transition-colors ${isActive(item.id) ? 'bg-indigo-50' : ''}`}>
                <item.icon size={22} strokeWidth={isActive(item.id) ? 2.5 : 2} />
              </div>
              <span className="text-[9px] font-black tracking-tighter uppercase leading-none">{item.label}</span>
            </button>
          ))}
          
          <button 
            onClick={() => setIsMoreOpen(true)} 
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${isMoreOpen ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
          >
            <div className={`p-2 rounded-xl ${isMoreOpen ? 'bg-indigo-50' : ''}`}>
              <MoreHorizontal size={22} strokeWidth={isMoreOpen ? 2.5 : 2} />
            </div>
            <span className="text-[9px] font-black tracking-tighter uppercase leading-none">더보기</span>
          </button>
        </div>
      </nav>
    </div>
  );
}