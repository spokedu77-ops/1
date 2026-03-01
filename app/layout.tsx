'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import Sidebar from './components/Sidebar';
import { QueryProvider } from './providers/QueryProvider';
import { Plus_Jakarta_Sans, Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans-jakarta', display: 'swap' });
const notoSansKR = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-kr', display: 'swap' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // 사이드바를 숨길 페이지들
  const isAuthPage = pathname === '/login' || pathname === '/';
  const isReportPage = pathname.startsWith('/report');
  const isIIWarmupSubscriber = pathname.startsWith('/iiwarmup');
  const isFlowPhase = pathname.startsWith('/flow-phase');
  const isProgram = pathname.startsWith('/program');
  const isInfo = pathname.startsWith('/info');

  // 1. 강사 페이지(/teacher)는 강사 전용 사이드바를 쓰거나 아예 숨겨야 함
  const isTeacherPage = pathname.startsWith('/teacher');

  const hideSidebar = isAuthPage || isReportPage || isTeacherPage || isIIWarmupSubscriber || isFlowPhase || isProgram || isInfo;

  return (
    <html lang="ko" className={`${plusJakarta.variable} ${notoSansKR.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="antialiased bg-gray-50 text-slate-900 font-sans">
        <QueryProvider>
          <Toaster position="top-center" richColors closeButton />
          <div className="flex min-h-screen">
            {/* 사이드바 조건부 렌더링 */}
            {!hideSidebar && <Sidebar />}

            <main 
              className={`flex-1 w-full min-w-0 transition-all duration-300 ${
                !hideSidebar ? 'pt-[calc(3rem+env(safe-area-inset-top,0px))] md:pt-0 md:ml-64' : ''
              }`}
            >
              {children}
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}