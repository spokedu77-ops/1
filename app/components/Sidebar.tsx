'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  Calendar, 
  BookOpen, 
  Users, 
  LogOut, 
  LayoutDashboard,
  ClipboardList,
  Box,      
  CheckCircle,
  CreditCard,
  Menu, // 추가
  X     // 추가
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Sidebar() {
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith('/admin');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false); // 상태 추가

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email);
    };
    getUser();
  }, []);

  // 페이지 이동 시 자동 닫힘
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      window.location.href = '/login';
    }
  };

  const adminMenuItems = [
    {
      group: "운영 관리",
      items: [
        { name: "대시보드", href: "/admin", icon: LayoutDashboard },
        { name: "수업 스케줄", href: "/admin/classes", icon: Calendar },
        { name: "피드백 검수", href: "/admin/teachers-classes", icon: CheckCircle },
      ]
    },
    {
      group: "자산 및 공지",
      items: [
        { name: "연간 커리큘럼", href: "/admin/curriculum", icon: BookOpen },
        { name: "교구/재고 관리", href: "/admin/inventory", icon: Box },
        { name: "공지사항", href: "/admin/notice", icon: ClipboardList },
      ]
    },
    {
      group: "시스템 관리",
      items: [
        { name: "사용자 관리", href: "/admin/users", icon: Users },
        ...(userEmail === 'choijihoon@spokedu.com' 
          ? [{ name: "정산 리포트", href: "/admin/master/reports", icon: CreditCard }] 
          : [])
      ]
    }
  ];

  const teacherMenuItems = [
    {
      group: "내 활동",
      items: [
        { name: "내 수업 일정", href: "/teacher/my-classes", icon: Calendar },
      ]
    },
    {
      group: "수업 자료",
      items: [
        { name: "커리큘럼 보관함", href: "/teacher/curriculum", icon: BookOpen },
        { name: "교구 현황 체크", href: "/teacher/inventory", icon: Box },
      ]
    },
    {
      group: "정보 안내",
      items: [
        { name: "공지 및 가이드", href: "/teacher/notice", icon: ClipboardList },
      ]
    }
  ];

  const menuItems = isAdminPath ? adminMenuItems : teacherMenuItems;

  return (
    <>
      {/* 1. 모바일 상단 네비바 (짤림 방지를 위해 h-16 고정 및 커서 추가) */}
      <div className="fixed top-0 left-0 z-[60] flex h-16 w-full items-center justify-between bg-[#1e293b] px-6 md:hidden shadow-lg">
        <h1 className="text-lg font-bold text-blue-400 tracking-tighter uppercase italic">SPOKEDU</h1>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg bg-slate-800 p-2 text-white outline-none cursor-pointer hover:bg-slate-700 transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 2. 배경 오버레이 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. 사이드바 본체 (기존 스타일 및 로직 그대로 유지) */}
      <aside className={`
        fixed left-0 top-0 z-[59] flex h-screen w-64 flex-col bg-[#1e293b] text-white transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:flex md:shrink-0
      `}>
        {/* 로고 영역 */}
        <div className="p-6 border-b border-slate-700 hidden md:block">
          <h1 className="text-xl font-bold text-blue-400 tracking-tighter uppercase italic">SPOKEDU</h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium tracking-tight">
            {isAdminPath ? '통합 운영 시스템' : '강사 전용 시스템'}
          </p>
        </div>

        {/* 모바일용 여백 */}
        <div className="h-16 md:hidden flex items-center px-6 border-b border-slate-700">
           <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Navigation</span>
        </div>
        
        {/* 메뉴 리스트 - 기존 코드 그대로 복원 */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-7 no-scrollbar">
          {menuItems.map((group, idx) => (
            <div key={idx}>
              <p className="ml-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.href}
                      href={item.href} 
                      className={`group flex items-center gap-3 rounded-xl p-3 transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon size={17} className={isActive ? 'text-white' : 'group-hover:text-blue-400'} />
                      <span className="text-[10px] font-semibold">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* 하단 섹션 - 기존 코드 유지 */}
        <div className="border-t border-slate-700 bg-slate-900/50 p-4">
          <div className="mb-4 rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-3">
            <p className="text-[10px] font-medium leading-relaxed text-slate-400">
              <span className="mb-1 block font-bold text-blue-400 uppercase">
                {isAdminPath ? 'ADMIN' : 'TEACHER'}
              </span>
              {isAdminPath ? '운영진 전용 접속' : '아동청소년 체육교육 전문단체'}
            </p>
          </div>
          
          <button 
            onClick={handleLogout}
            className="group flex w-full cursor-pointer items-center gap-3 p-2 text-slate-500 transition-colors hover:text-rose-400"
          >
            <LogOut size={17} className="transition-transform group-hover:rotate-12" />
            <span className="text-[13px] font-bold">로그아웃</span>
          </button>
        </div>
      </aside>
    </>
  );
}