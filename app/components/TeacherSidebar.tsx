'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js'; // Supabase 클라이언트 추가
import { 
  Calendar, 
  BookOpen, 
  MessageSquare, 
  CreditCard, 
  LogOut, 
  LayoutDashboard,
  ClipboardList,
  Box,      
  FileText, 
  Lightbulb
} from 'lucide-react';

// Supabase 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TeacherSidebar() {
  const pathname = usePathname();

  // 로그아웃 핸들러 (핵심 로직)
  const handleLogout = async () => {
    try {
      // 1. Supabase 서버 측 세션 종료
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 2. 브라우저 측 세션 및 캐시를 완전히 비우기 위해 강제 이동 (새로고침 효과)
      // router.push 대신 window.location.href를 사용해야 잔여 세션 문제가 해결됩니다.
      window.location.href = '/login';
    }
  };

  const menuItems = [
    {
      group: "My Activity",
      items: [
        { name: "내 수업 스케줄", href: "/teacher/my-classes", icon: Calendar },
      ]
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
      items: [
        { name: "공지 및 센터 가이드", href: "/teacher/notice", icon: ClipboardList },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#1e293b] h-full flex flex-col text-white shrink-0 relative z-50">
      {/* 로고 영역 */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-blue-400 tracking-tighter">SPOKEDU</h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">강사 전용 시스템</p>
      </div>
      
      {/* 메뉴 리스트 */}
      <nav className="flex-1 p-4 space-y-8 overflow-y-auto no-scrollbar">
        {menuItems.map((group, idx) => (
          <div key={idx}>
            <p className="text-[10px] font-semibold text-slate-500 mb-4 ml-3 uppercase tracking-widest">
              {group.group}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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

      {/* 하단 정보 섹션 (스포키듀 정보 반영) */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <div className="mb-4 px-3 py-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
            <span className="text-blue-400 font-bold block mb-1">SPOKEDU</span>
            아동청소년 체육교육 전문단체<br/>
            Play to Think, Think to Grow
          </p>
        </div>
        
        {/* 로그아웃 버튼 (onClick 이벤트 연결됨) */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-2 text-slate-500 hover:text-rose-400 transition-colors group cursor-pointer"
        >
          <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-bold">로그아웃</span>
        </button>
      </div>
    </aside>
  );
}