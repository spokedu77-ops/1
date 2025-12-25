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
  CreditCard
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Sidebar() {
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith('/admin');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      window.location.href = '/login';
    }
  };

  // 관리자 메뉴 (한글화 및 마스터 권한 체크)
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
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col bg-[#1e293b] text-white shrink-0 md:flex">
      {/* 로고 영역 (기존 스타일 유지) */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-blue-400 tracking-tighter uppercase italic">SPOKEDU</h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium tracking-tight">
          {isAdminPath ? '통합 운영 시스템' : '강사 전용 시스템'}
        </p>
      </div>
      
      {/* 메뉴 리스트 (글씨 크기 조절 및 간격 유지) */}
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
                    className={`group flex items-center gap-3 rounded-xl p-3 transition-all ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon size={17} className={isActive ? 'text-white' : 'group-hover:text-blue-400'} />
                    {/* 글씨 크기를 text-sm에서 13px 정도로 살짝 축소 */}
                    <span className="text-[10px] font-semibold">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 하단 정보 섹션 (기존 스타일 유지) */}
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
  );
}