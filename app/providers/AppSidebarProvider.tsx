'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type AppSidebarContextValue = {
  isDesktopOpen: boolean;
  isMobileOpen: boolean;
  setDesktopOpen: (open: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  toggleDesktop: () => void;
  toggleMobile: () => void;
  closeAll: () => void;
};

const AppSidebarContext = createContext<AppSidebarContextValue | null>(null);

export function AppSidebarProvider({ children }: { children: ReactNode }) {
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const setDesktopOpen = useCallback((open: boolean) => {
    setIsDesktopOpen(open);
  }, []);
  const setMobileOpen = useCallback((open: boolean) => {
    setIsMobileOpen(open);
  }, []);
  const toggleDesktop = useCallback(() => {
    setIsDesktopOpen((value) => !value);
  }, []);
  const toggleMobile = useCallback(() => {
    setIsMobileOpen((value) => !value);
  }, []);
  const closeAll = useCallback(() => {
    setIsDesktopOpen(false);
    setIsMobileOpen(false);
  }, []);
  const value = useMemo(
    () => ({
      isDesktopOpen,
      isMobileOpen,
      setDesktopOpen,
      setMobileOpen,
      toggleDesktop,
      toggleMobile,
      closeAll,
    }),
    [
      isDesktopOpen,
      isMobileOpen,
      setDesktopOpen,
      setMobileOpen,
      toggleDesktop,
      toggleMobile,
      closeAll,
    ],
  );

  return (
    <AppSidebarContext.Provider value={value}>
      {children}
    </AppSidebarContext.Provider>
  );
}

export function useAppSidebar() {
  const context = useContext(AppSidebarContext);
  if (!context) {
    throw new Error('useAppSidebar must be used within AppSidebarProvider');
  }
  return context;
}
