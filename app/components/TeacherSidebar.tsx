'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  Calendar, 
  BookOpen, 
  LogOut, 
  ClipboardList,
  Box 
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TeacherSidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      window.location.href = '/login';
    }
  };

  const menuItems = [
    {
      group: "My Activity",
      items: [{ name: "내 수업 스케줄", href: "/teacher/my-classes", icon: Calendar }]
    },
    {
      group: "Operations",
      items: [
        { name: "커리큘럼 보관함", href: "/teacher/curriculum", icon: BookOpen },
        { name: "교구 현황 체크", href: "/teacher/inventory", icon: Box },
      ]
    },
    {
      group: "Information",
      items: [{ name: "공지 및 센터 가이드", href: "/teacher/notice", icon: ClipboardList }]
    }
  ];

  return (
    <aside className="w-full bg-[#1e293b] h-full flex flex-col text-white">
      {/* 로고 영역 */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-blue-400 tracking-tighter uppercase italic">SPOKEDU</h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">강사 전용 시스템</p>
      </div>
      
      {/* 메뉴 리스트 */}
      <nav className="flex-1 p-4 space-y-8 overflow-y-auto no-scrollbar">
        {menuItems.map((group, idx) => (
          <div key={idx}>
            <p className="text-[10px] font-semibold text-slate-500 mb-4 ml-3 uppercase tracking-widest">{group.group}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all group cursor-pointer ${
                      isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : 'group-hover:text-blue-400'} />
                    <span className="text-sm font-semibold">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 하단 정보 */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <button onClick={handleLogout} className="flex items-center gap-3 w-full p-2 text-slate-500 hover:text-rose-400 transition-colors group cursor-pointer">
          <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-bold">로그아웃</span>
        </button>
      </div>
    </aside>
  );
}