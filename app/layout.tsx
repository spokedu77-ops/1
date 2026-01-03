'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar'; // 이 파일이 관리자용인지 확인 필수!
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // 사이드바를 숨길 페이지들
  const isAuthPage = pathname === '/login' || pathname === '/';
  const isReportPage = pathname.startsWith('/report');
  
  // 1. 강사 페이지(/teacher)는 강사 전용 사이드바를 쓰거나 아예 숨겨야 함
  const isTeacherPage = pathname.startsWith('/teacher'); 
  
  // 2. 수업 등록 페이지(/class/create)는 사이드바가 나와야 하는 페이지임
  // 현재 로직대로라면 !hideSidebar 조건에 의해 사이드바가 나옵니다.
  const hideSidebar = isAuthPage || isReportPage || isTeacherPage;

  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-slate-900">
        <div className="flex min-h-screen">
          {/* 사이드바 조건부 렌더링 */}
          {!hideSidebar && <Sidebar />}

          <main 
            className={`flex-1 w-full transition-all duration-300 ${
              !hideSidebar ? 'md:ml-64' : ''
            }`}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}