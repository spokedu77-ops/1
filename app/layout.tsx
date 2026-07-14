'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import Sidebar from './components/Sidebar';
import { installChunkLoadRecovery } from '@/app/lib/client/chunkLoadRecovery';
import {
  enforceSessionOnlyPolicy,
  registerEphemeralBrowserSession,
} from '@/app/lib/auth/sessionPersistence';
import { rememberLastUsedAppFromPath } from '@/app/lib/auth/lastUsedApp';
import { reportLoginUxEvent } from '@/app/lib/auth/loginUxTelemetry';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { isFullscreenPath } from '@/app/lib/constants/fullscreen-paths';
import { AppSidebarProvider, useAppSidebar } from './providers/AppSidebarProvider';
import { QueryProvider } from './providers/QueryProvider';
import { I18nProvider } from './providers/I18nProvider';
import './globals.css';

const fontVariables = {
  '--font-sans':
    '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  '--font-geist-sans':
    '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  '--font-geist-mono':
    '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  '--font-plus-jakarta':
    '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  '--font-space-grotesk':
    '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as CSSProperties;

const naverSiteVerification = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION?.trim();

function RootLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = isFullscreenPath(pathname ?? '');
  const { isDesktopOpen, toggleDesktop } = useAppSidebar();
  const fullscreenWrapStyle = hideSidebar
    ? { minHeight: 'var(--viewport-height-px, 100dvh)', height: 'var(--viewport-height-px, 100dvh)', width: '100vw', maxWidth: '100%' }
    : undefined;
  const mainFullscreenStyle = hideSidebar ? { height: 'var(--viewport-height-px, 100dvh)' } : undefined;

  useEffect(() => installChunkLoadRecovery(), []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void enforceSessionOnlyPolicy(() => supabase.auth.signOut()).then((signedOut) => {
      if (signedOut) reportLoginUxEvent('ephemeral_session_cleared');
    });
    return registerEphemeralBrowserSession();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    rememberLastUsedAppFromPath(pathname);
  }, [pathname]);

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
    <html lang="ko" className="font-sans" style={fontVariables}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#185FA5" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {naverSiteVerification ? <meta name="naver-site-verification" content={naverSiteVerification} /> : null}
      </head>
      <body className="bg-gray-50 font-sans text-slate-900 antialiased">
        <QueryProvider>
          <I18nProvider>
            <Toaster position="top-center" richColors closeButton />
            <div className={`flex ${hideSidebar ? 'w-full overflow-x-hidden' : 'min-h-screen'}`} style={fullscreenWrapStyle}>
              {!hideSidebar && (
                <Sidebar
                  isDesktopOpen={isDesktopOpen}
                  onToggleDesktop={toggleDesktop}
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <AppSidebarProvider>
      <RootLayoutShell>{children}</RootLayoutShell>
    </AppSidebarProvider>
  );
}
