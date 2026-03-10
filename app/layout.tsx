'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import Sidebar from './components/Sidebar';
import { isFullscreenPath } from '@/app/lib/constants/fullscreen-paths';
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
  const hideSidebar = isFullscreenPath(pathname);
  const fullscreenWrapStyle = hideSidebar
    ? { minHeight: 'var(--viewport-height-px, 100vh)', height: 'var(--viewport-height-px, 100vh)', width: '100vw', maxWidth: '100%' }
    : undefined;

  // viewport-height-px는 hydration 이후에만 설정해 서버/클라이언트 HTML 불일치(hydration error) 방지
  useEffect(() => {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty('--viewport-height-px', `${window.innerHeight}px`);
    };
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    return () => window.removeEventListener('resize', setViewportHeight);
  }, []);

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
          <div
            className={`flex min-h-screen ${hideSidebar ? 'w-full overflow-x-hidden' : ''}`}
            style={fullscreenWrapStyle}
          >
            {/* 사이드바 조건부 렌더링 */}
            {!hideSidebar && <Sidebar />}

            <main 
              className={`flex-1 w-full min-w-0 transition-all duration-300 ${
                hideSidebar
                  ? 'flex flex-col min-h-0 pr-0 mr-0 overflow-x-hidden'
                  : 'pt-[calc(3rem+env(safe-area-inset-top,0px))] md:pt-0 md:ml-64'
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