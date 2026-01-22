export default function ProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-screen h-screen overflow-hidden">
      {/* 사이드바, 헤더 없음 - 완전한 전체화면 */}
      {children}
    </div>
  );
}
