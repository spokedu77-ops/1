'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, School, BookOpen, ShieldCheck, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { isRefreshTokenError } from '@/app/lib/supabase/auth';

export default function SpokeduGatePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [checkDone, setCheckDone] = useState(false);
  const router = useRouter();

  // 마운트 시 클라이언트에서만 세션 확인
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 이미 로그인된 사용자는 역할(profile.role)에 따라 바로 대시로. 선생님이 '관리자'를 눌러도 이동은 role로만 결정됨.
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    const run = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error && isRefreshTokenError(error)) {
          await supabase.auth.signOut();
          setCheckDone(true);
          return;
        }
        if (error || !user) {
          setCheckDone(true);
          return;
        }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const role = profile?.role;
        if (role === 'admin' || role === 'master') {
          router.replace('/admin');
          return;
        }
        if (role === 'teacher' || role != null) {
          router.replace('/teacher/my-classes');
          return;
        }
      } catch {
        // 에러 시 역할 선택 화면 유지
      }
      setCheckDone(true);
    };
    run();
  }, [isMounted, router]);

  const roles = [
    {
      id: 'parent',
      title: '학부모',
      description: '우리 아이의 즐거운 성장 기록 확인하기',
      icon: <User size={32} />,
      color: 'from-orange-400 to-red-500',
      bgColor: 'bg-orange-50',
      status: 'coming_soon' // 준비 중 상태 추가
    },
    {
      id: 'teacher',
      title: '선생님',
      description: '수업 커리큘럼 관리 및 성장 비전',
      icon: <BookOpen size={32} />,
      color: 'from-blue-400 to-indigo-500',
      bgColor: 'bg-blue-50',
      status: 'active'
    },
    {
      id: 'center',
      title: '기관 담당자',
      description: '체계적인 프로그램 및 강사 관리 시스템',
      icon: <School size={32} />,
      color: 'from-emerald-400 to-teal-500',
      bgColor: 'bg-teal-50',
      status: 'coming_soon'
    },
    {
      id: 'admin',
      title: '관리자',
      description: 'SPOKEDU 통합 운영 및 데이터 관리',
      icon: <ShieldCheck size={32} />,
      color: 'from-slate-700 to-slate-900',
      bgColor: 'bg-gray-100',
      status: 'active'
    }
  ];

  // 클릭 핸들러: 상태에 따라 다른 액션 수행
  const handleRoleClick = (role: any) => {
    if (role.status === 'coming_soon') {
      alert('스포키듀 서비스 준비 중입니다. 곧 만나보실 수 있습니다!');
      return;
    }
    
    // 선생님과 관리자 모두 공통 로그인 페이지로 이동
    // 쿼리 스트링(?type=teacher)을 붙여주면 로그인 페이지에서 어떤 UI를 보여줄지 결정하기 편합니다.
    router.push(`/login?type=${role.id}`);
  };

  // 세션 확인 전이거나 리다이렉트 대기 중에는 로딩만 표시. 확인 완료 후(로그인 없음) 역할 선택 노출.
  if (!isMounted || !checkDone) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-pulse text-slate-300 font-black uppercase tracking-widest text-sm">SPOKEDU</div></div>;

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] relative overflow-hidden">
      <div className="z-10 w-full max-w-6xl">
        <div className="text-center mb-10 sm:mb-16 space-y-4">
          <h2 className="text-blue-600 font-bold tracking-[0.2em] text-xs sm:text-sm">PLAY · THINK · GROW</h2>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900">SPOKEDU</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {roles.map((role, idx) => (
            <motion.div
              key={role.id}
              onClick={() => handleRoleClick(role)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              whileHover={{ y: -8 }}
              className="group relative bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl active:scale-[0.98] transition-all duration-300 flex flex-col min-h-[180px] sm:h-80 justify-between cursor-pointer touch-manipulation"
            >
              <div>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${role.bgColor} flex items-center justify-center mb-4 sm:mb-6 text-gray-700`}>
                  {role.icon}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">{role.title}</h3>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed break-keep">{role.description}</p>
              </div>

              <div className="flex items-center text-xs sm:text-sm font-semibold text-gray-400 group-hover:text-gray-900 min-h-[44px]">
                {role.status === 'coming_soon' ? '준비 중' : '시작하기'}
                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>

              <motion.div 
                className={`absolute bottom-0 left-0 h-1.5 bg-gradient-to-r ${role.color} rounded-b-3xl`}
                initial={{ width: 0 }}
                whileHover={{ width: '100%' }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}