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
  const isAuthPage = pathname === '/login' || pathname === '/';

  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50">
        <div className="flex min-h-screen">
          {/* 사이드바 영역 */}
          {!isAuthPage && <Sidebar />}

          {/* 본문 영역: md:ml-64를 통해 사이드바 공간을 확실히 비워줍니다 */}
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