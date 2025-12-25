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

  // 로그인 페이지('/')와 로그인 전용 페이지('/login')에서는 사이드바와 여백을 제거합니다.
  const isAuthPage = pathname === '/login' || pathname === '/';

  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50">
        <div className="flex min-h-screen">
          {/* 1. 사이드바: 로그인 페이지가 아닐 때만 렌더링 */}
          {!isAuthPage && <Sidebar />}

          {/* 2. 본문 영역: 
              - isAuthPage가 아닐 때만 md:ml-64를 적용하여 PC에서 사이드바 공간 확보
              - 모바일에서는 ml-0이 되어 화면을 꽉 채움
          */}
          <main 
            className={`flex-1 w-full transition-all duration-300 ${
              !isAuthPage ? 'md:ml-64' : ''
            }`}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}