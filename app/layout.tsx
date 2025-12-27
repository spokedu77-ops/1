'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // 사이드바를 숨겨야 하는 페이지들
  const isAuthPage = pathname === '/login' || pathname === '/';
  // /report로 시작하는 모든 경로는 부모님용이므로 사이드바 제외
  const isReportPage = pathname.startsWith('/report');
  
  // 사이드바와 왼쪽 여백을 숨길지 결정하는 플래그
  const hideSidebar = isAuthPage || isReportPage;

  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50">
        <div className="flex min-h-screen">
          {/* 사이드바 영역: 숨김 처리가 안 된 경우에만 렌더링 */}
          {!hideSidebar && <Sidebar />}

          {/* 본문 영역: 사이드바가 없을 때는 여백(ml-64)을 제거 */}
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