import TeacherSidebar from '../components/TeacherSidebar'; 

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex bg-gray-50 z-[100]">
      {/* lg(1024px) 미만에서는 사이드바를 숨기고 싶다면 TeacherSidebar 내부에 클래스가 있거나 여기서 감싸야 합니다. */}
      <div className="hidden md:block shrink-0">
        <TeacherSidebar />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 모바일에서만 보일 헤더 (선택사항: 햄버거 버튼 등을 위해) */}
        <header className="h-16 bg-white border-b flex items-center px-6 shrink-0">
          <h2 className="text-lg font-semibold text-gray-700">스포키듀 강사 대시보드</h2>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* max-w를 제거하거나 넓게 설정하여 본문이 꽉 차게 합니다. */}
          <div className="w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}