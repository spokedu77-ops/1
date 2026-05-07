export default function TeacherAppIiwarmupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-0 py-0">
        <main>{children}</main>
      </div>
    </div>
  );
}
