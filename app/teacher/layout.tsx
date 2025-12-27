'use client';

import { useState } from 'react';
import TeacherSidebar from '../components/TeacherSidebar'; 
import { Menu, X } from 'lucide-react';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="fixed inset-0 flex bg-gray-50 z-[100]">
      {/* 사이드바 본체: 여기에는 이제 버튼이 없습니다 */}
      <div className={`
        fixed inset-y-0 left-0 z-[110] w-64 transform bg-[#1e293b] transition-transform duration-300 md:relative md:translate-x-0 md:block shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <TeacherSidebar />
      </div>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-[105] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 헤더: justify-between으로 제목은 왼쪽, 버튼은 오른쪽 배치 */}
        <header className="h-16 bg-white border-b flex items-center px-6 shrink-0 justify-between">
          <h2 className="text-lg font-semibold text-gray-700">스포키듀 강사 대시보드</h2>
          
          {/* 모바일 우측 상단 햄버거 버튼 */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 md:hidden cursor-pointer hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}