'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { Geist, Noto_Sans_KR, Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import Sidebar from './components/Sidebar';
import { isFullscreenPath } from '@/app/lib/constants/fullscreen-paths';
import { QueryProvider } from './providers/QueryProvider';
import { I18nProvider } from './providers/I18nProvider';
import './globals.css';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = isFullscreenPath(pathname);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const fullscreenWrapStyle = hideSidebar
    ? { minHeight: 'var(--viewport-height-px, 100dvh)', height: 'var(--viewport-height-px, 100dvh)', width: '100vw', maxWidth: '100%' }
    : undefined;
  const mainFullscreenStyle = hideSidebar ? { height: 'var(--viewport-height-px, 100dvh)' } : undefined;

  useEffect(() => {
    const setViewportHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--viewport-height-px', `${height}px`);
    };
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.visualViewport?.addEventListener('resize', setViewportHeight);
    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.visualViewport?.removeEventListener('resize', setViewportHeight);
    };
  }, []);

  return (
    <html lang="ko" className={cn(notoSansKR.variable, geist.variable, plusJakarta.variable, spaceGrotesk.variable, 'font-sans')}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#185FA5" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="bg-gray-50 font-sans text-slate-900 antialiased">
        <QueryProvider>
          <I18nProvider>
            <Toaster position="top-center" richColors closeButton />
            <div className={`flex ${hideSidebar ? 'w-full overflow-x-hidden' : 'min-h-screen'}`} style={fullscreenWrapStyle}>
              {!hideSidebar && (
                <Sidebar
                  isDesktopOpen={isDesktopOpen}
                  onToggleDesktop={() => setIsDesktopOpen((value) => !value)}
                />
              )}

              <main
                style={mainFullscreenStyle}
                className={`flex-1 w-full min-w-0 transition-all duration-300 ${
                  hideSidebar
                    ? 'flex flex-col min-h-0 pr-0 mr-0 overflow-x-hidden'
                    : `pt-[calc(3rem+env(safe-area-inset-top,0px))] md:pt-0${isDesktopOpen ? ' md:ml-64' : ' md:ml-0'}`
                }`}
              >
                {children}
              </main>
            </div>
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
