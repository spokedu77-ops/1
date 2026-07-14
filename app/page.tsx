'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { isRefreshTokenError } from '@/app/lib/supabase/auth';
import { resolvePostLoginRedirect } from '@/app/lib/auth/postLoginRedirect';

const services = [
  {
    id: 'master',
    title: 'SPOKEDU MASTER',
    description: '수업 자료·SPOMOVE·수업 도구. 신규 가입은 이메일 인증으로 시작합니다.',
    icon: Sparkles,
    color: 'from-indigo-500 to-violet-600',
    bgColor: 'bg-indigo-50',
    cta: '시작하기',
    href: '/login?next=/spokedu-master/onboarding',
  },
  {
    id: 'teacher',
    title: '강사 운영 앱',
    description: '수업 일정·정산·교구 관리 등 기존 강사용 운영 화면입니다.',
    icon: BookOpen,
    color: 'from-blue-400 to-indigo-500',
    bgColor: 'bg-blue-50',
    cta: '로그인',
    href: '/login?type=teacher',
  },
  {
    id: 'admin',
    title: '관리자',
    description: 'SPOKEDU 통합 운영 및 데이터 관리',
    icon: ShieldCheck,
    color: 'from-slate-700 to-slate-900',
    bgColor: 'bg-gray-100',
    cta: '관리자 로그인',
    href: '/login?type=admin',
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
        // Show the service chooser if the auth check cannot complete.
      }

      if (!cancelled) setCheckDone(true);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isMounted, router]);

  if (!isMounted || !checkDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-pulse text-sm font-black uppercase tracking-widest text-slate-300">SPOKEDU</div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-4 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] sm:p-6">
      <div className="z-10 w-full max-w-5xl">
        <div className="mb-8 space-y-3 text-center sm:mb-12">
          <h2 className="text-xs font-bold tracking-[0.2em] text-blue-600 sm:text-sm">PLAY · THINK · GROW</h2>
          <h1 className="text-4xl font-black text-gray-900 sm:text-5xl">SPOKEDU</h1>
          <p className="text-sm font-medium text-gray-500">어떤 서비스를 이용하시나요?</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {services.map((service, idx) => {
            const Icon = service.icon;

            return (
              <motion.button
                key={service.id}
                type="button"
                onClick={() => router.push(service.href)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                whileHover={{ y: -8 }}
                className="group relative flex min-h-[200px] cursor-pointer touch-manipulation flex-col justify-between rounded-3xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:shadow-xl active:scale-[0.98] sm:min-h-[240px] sm:p-8"
              >
                <div>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-gray-700 sm:mb-6 sm:h-14 sm:w-14 ${service.bgColor}`}>
                    <Icon size={32} />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">{service.title}</h3>
                  <p className="break-keep text-xs leading-relaxed text-gray-500 sm:text-sm">{service.description}</p>
                </div>

                <div className="flex min-h-[44px] items-center text-xs font-semibold text-gray-400 group-hover:text-gray-900 sm:text-sm">
                  {service.cta}
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                </div>

                <motion.div
                  className={`absolute bottom-0 left-0 h-1.5 rounded-b-3xl bg-gradient-to-r ${service.color}`}
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                />
              </motion.button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs font-medium leading-relaxed text-gray-400">
          학부모 · 기관 담당자 전용 서비스는 준비 중입니다.
        </p>
      </div>
    </main>
  );
}
