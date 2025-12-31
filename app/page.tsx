'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, School, BookOpen, ShieldCheck, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SpokeduGatePage() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  if (!isMounted) return <div className="min-h-screen bg-white" />;

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="z-10 w-full max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-blue-600 font-bold tracking-[0.2em] text-sm">PLAY · THINK · GROW</h2>
          <h1 className="text-5xl font-black text-gray-900">SPOKEDU</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role, idx) => (
            <motion.div
              key={role.id}
              onClick={() => handleRoleClick(role)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              whileHover={{ y: -8 }}
              className="group relative bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-80 justify-between cursor-pointer"
            >
              <div>
                <div className={`w-14 h-14 rounded-2xl ${role.bgColor} flex items-center justify-center mb-6 text-gray-700`}>
                  {role.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{role.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed break-keep">{role.description}</p>
              </div>

              <div className="flex items-center text-sm font-semibold text-gray-400 group-hover:text-gray-900">
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