'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getAuthUserOrRedirect } from '@/app/lib/supabase/auth';
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
  Medal, 
  MessageCircle,
  Building2,
  CalendarDays,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    setIsOpen(false);
    const loadUser = async () => {
      const supabase = getSupabaseBrowserClient();
      const user = await getAuthUserOrRedirect(supabase);
      if (user) setUserEmail(user.email || '');
    };
    loadUser();
  }, [pathname]);

  const handleLogout = async () => {
    try { await getSupabaseBrowserClient().auth.signOut(); } 
    catch (error) { console.error('Logout error:', error); } 
    finally { window.location.href = '/login'; }
  };

  const adminMenuItems = [
    {
      group: "운영 관리",
      items: [
        { name: "대시보드", href: "/admin", icon: LayoutDashboard },
        { name: "일정", href: "/admin/schedules", icon: CalendarDays },
        { name: "센터 관리", href: "/admin/centers", icon: Building2 },
        { name: "수업 관리", href: "/admin/classes", icon: Calendar },
        { name: "수업 관련 검수", href: "/admin/teachers-classes", icon: CheckCircle },
        { name: "공지사항", href: "/admin/notice", icon: ClipboardList },
      ]
    },
    {
      group: "수업 자료 관리",
      items: [
        { name: "연간 커리큘럼", href: "/admin/curriculum", icon: BookOpen },
        { name: "iiwarmup", href: "/admin/iiwarmup", icon: Medal }, // iiwarmup 페이지 링크 추가
      ]
    },
    {
      group: "강사 관리",
      items: [
        { name: "강사 소통 채팅", href: "/admin/chat", icon: MessageCircle },
        { name: "교구/재고 관리", href: "/admin/inventory", icon: Box },
        { name: "강사 정보 관리", href: "/admin/users", icon: Users },
        { name: "강사 카운팅 관리", href: "/admin/mileage", icon: Medal },
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

  const subscriberMenuItems = [
    {
      group: "계정 관리",
      items: [
        { name: "결제 정보", href: "/billing", icon: CreditCard },
      ]
    }
  ];

  const isAdmin = 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/master') || 
    pathname.startsWith('/class');
  
  const isSubscriber = pathname.startsWith('/billing');
  
  // 관리자도 아니고 구독자 페이지도 아니면 사이드바 숨김
  if (!isAdmin && !isSubscriber) return null;
  
  // 구독자 페이지에서는 구독자 메뉴 사용
  const groups = isSubscriber ? subscriberMenuItems : adminMenuItems;

  return (
    <>
      <div className="fixed top-0 left-0 z-[60] flex h-16 w-full items-center justify-between bg-[#1e293b] px-6 pt-[env(safe-area-inset-top)] md:pt-0 md:hidden shadow-lg">
        <h1 className="text-lg font-bold text-blue-400 tracking-tighter uppercase italic">SPOKEDU</h1>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-800 p-2 text-white outline-none cursor-pointer hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation flex items-center justify-center"
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
            {isAdmin ? 'Admin Portal' : isSubscriber ? 'Warm-up Portal' : 'Teacher Portal'}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto pt-[calc(4rem+env(safe-area-inset-top,0px))] md:pt-4 text-left">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2 text-left">
              <h3 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                {group.group}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  // 해시 링크도 활성화 상태로 인식
                  const isActive = pathname === item.href || (item.href.includes('#') && pathname.startsWith(item.href.split('#')[0]));
                  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (item.href.includes('#')) {
                      e.preventDefault();
                      const [path, hash] = item.href.split('#');
                      if (pathname !== path) {
                        window.location.href = item.href;
                      } else {
                        const element = document.getElementById(hash);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }
                  };
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href} 
                      onClick={handleClick}
                      className={`flex items-center gap-3 min-h-[48px] p-3 rounded-xl transition-all group cursor-pointer touch-manipulation ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white active:bg-slate-700'
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