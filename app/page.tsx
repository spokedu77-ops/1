'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, School, ShieldCheck, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { isRefreshTokenError } from '@/app/lib/supabase/auth';
import { resolvePostLoginRedirect } from '@/app/lib/auth/postLoginRedirect';

const roles = [
  {
    id: 'parent',
    title: '학부모',
    description: '우리 아이의 즐거운 성장 기록 확인하기',
    icon: User,
    color: 'from-orange-400 to-red-500',
    bgColor: 'bg-orange-50',
    status: 'coming_soon',
  },
  {
    id: 'teacher',
    title: '선생님',
    description: '수업 커리큘럼 관리와 성장 비전 확인하기',
    icon: BookOpen,
    color: 'from-blue-400 to-indigo-500',
    bgColor: 'bg-blue-50',
    status: 'active',
  },
  {
    id: 'center',
    title: '기관 담당자',
    description: '체계적인 프로그램 및 강사 관리 시스템',
    icon: School,
    color: 'from-emerald-400 to-teal-500',
    bgColor: 'bg-teal-50',
    status: 'coming_soon',
  },
  {
    id: 'admin',
    title: '관리자',
    description: 'SPOKEDU 통합 운영 및 데이터 관리',
    icon: ShieldCheck,
    color: 'from-slate-700 to-slate-900',
    bgColor: 'bg-gray-100',
    status: 'active',
  },
] as const;

export default function SpokeduGatePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [checkDone, setCheckDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    let cancelled = false;

    const run = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error && isRefreshTokenError(error)) {
          await supabase.auth.signOut();
          if (!cancelled) setCheckDone(true);
          return;
        }

        if (error || !session?.user) {
          if (!cancelled) setCheckDone(true);
          return;
        }

        const redirectPath = await resolvePostLoginRedirect(null, supabase, session.user);
        if (!cancelled) router.replace(redirectPath);
        return;
      } catch {
        // Show the role chooser if the auth check cannot complete.
      }

      if (!cancelled) setCheckDone(true);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isMounted, router]);

  const handleRoleClick = (role: (typeof roles)[number]) => {
    if (role.status === 'coming_soon') {
      toast.error('SPOKEDU 서비스 준비 중입니다. 곧 만나볼 수 있습니다!');
      return;
    }

    router.push(`/login?type=${role.id}`);
  };

  if (!isMounted || !checkDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-pulse text-sm font-black uppercase tracking-widest text-slate-300">SPOKEDU</div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-4 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] sm:p-6">
      <div className="z-10 w-full max-w-6xl">
        <div className="mb-10 space-y-4 text-center sm:mb-16">
          <h2 className="text-xs font-bold tracking-[0.2em] text-blue-600 sm:text-sm">PLAY · THINK · GROW</h2>
          <h1 className="text-4xl font-black text-gray-900 sm:text-5xl">SPOKEDU</h1>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {roles.map((role, idx) => {
            const Icon = role.icon;

            return (
              <motion.div
                key={role.id}
                onClick={() => handleRoleClick(role)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                whileHover={{ y: -8 }}
                className="group relative flex min-h-[180px] cursor-pointer touch-manipulation flex-col justify-between rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl active:scale-[0.98] sm:h-80 sm:p-8"
              >
                <div>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-gray-700 sm:mb-6 sm:h-14 sm:w-14 ${role.bgColor}`}>
                    <Icon size={32} />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900 sm:mb-3 sm:text-2xl">{role.title}</h3>
                  <p className="break-keep text-xs leading-relaxed text-gray-500 sm:text-sm">{role.description}</p>
                </div>

                <div className="flex min-h-[44px] items-center text-xs font-semibold text-gray-400 group-hover:text-gray-900 sm:text-sm">
                  {role.status === 'coming_soon' ? '준비 중' : '시작하기'}
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                </div>

                <motion.div
                  className={`absolute bottom-0 left-0 h-1.5 rounded-b-3xl bg-gradient-to-r ${role.color}`}
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
