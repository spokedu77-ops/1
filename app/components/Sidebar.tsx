'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, 
  Calendar, 
  CheckCircle, 
  BookOpen, 
  Box, 
  ClipboardList, 
  Users, 
  CreditCard, 
  LogOut, 
  Menu, 
  X,
  User,
  Wallet,
  Medal, 
  MessageCircle,
  CalendarCheck
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    setIsOpen(false);
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || '');
    };
    getUser();
  }, [pathname]);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } 
    catch (error) { console.error('Logout error:', error); } 
    finally { window.location.href = '/login'; }
  };

  const adminMenuItems = [
    {
      group: "운영 관리",
      items: [
        { name: "대시보드", href: "/admin", icon: LayoutDashboard },
        { name: "수업 관리", href: "/admin/classes", icon: Calendar },
        { name: "피드백 검수", href: "/admin/teachers-classes", icon: CheckCircle },
        { name: "공지사항", href: "/admin/notice", icon: ClipboardList },
      ]
    },
    {
      group: "강사 및 기타 관리",
      items: [
        { name: "강사 소통 채팅", href: "/admin/chat", icon: MessageCircle },
        { name: "연간 커리큘럼", href: "/admin/curriculum", icon: BookOpen },
        { name: "교구/재고 관리", href: "/admin/inventory", icon: Box },
        { name: "강사 정보 관리", href: "/admin/users", icon: Users },
        { name: "강사 마일리지", href: "/admin/mileage", icon: Medal },
      ]
    },
    {
      group: "시스템 관리",
      items: [
        ...(userEmail === 'choijihoon@spokedu.com' 
          ? [
              { name: "정산 리포트", href: "/admin/master/reports", icon: CreditCard },
            ] 
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

  const isAdmin = 
  pathname.startsWith('/admin') || 
  pathname.startsWith('/master') || 
  pathname.startsWith('/class');
  const groups = isAdmin ? adminMenuItems : teacherMenuItems;

  return (
    <>
      <div className="fixed top-0 left-0 z-[60] flex h-16 w-full items-center justify-between bg-[#1e293b] px-6 md:hidden shadow-lg">
        <h1 className="text-lg font-bold text-blue-400 tracking-tighter uppercase italic">SPOKEDU</h1>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg bg-slate-800 p-2 text-white outline-none cursor-pointer hover:bg-slate-700 transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed left-0 top-0 z-[59] flex h-screen w-64 flex-col bg-[#1e293b] text-white transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:flex md:shrink-0
      `}>
        <div className="p-6 border-b border-slate-700 hidden md:block text-left">
          <h1 className="text-xl font-bold text-blue-400 tracking-tighter uppercase italic">SPOKEDU</h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">
            {isAdmin ? 'Admin Portal' : 'Teacher Portal'}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto pt-20 md:pt-4 text-left">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2 text-left">
              <h3 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                {group.group}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href} 
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all group cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg' 
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

        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <div className="flex items-center gap-3 px-2 py-3 mb-2 border-b border-slate-800">
            <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
              <User size={16} />
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight text-left">Account</p>
              <p className="text-[11px] text-slate-200 font-bold truncate text-left">{userEmail || 'Admin'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-2 text-slate-500 hover:text-rose-400 transition-colors group cursor-pointer"
          >
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-bold">로그아웃</span>
          </button>
        </div>
      </aside>
    </>
  );
}