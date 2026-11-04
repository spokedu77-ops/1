'use client';

import { usePathname } from 'next/navigation';

export default function TeacherAppIiwarmupLayout({ children }: { children: React.ReactNode }) {
  const assetHub = usePathname() === '/admin/iiwarmup/assets';
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className={assetHub ? 'w-full' : 'mx-auto max-w-7xl px-0 py-0'}>
        <main>{children}</main>
      </div>
    </div>
  );
}
