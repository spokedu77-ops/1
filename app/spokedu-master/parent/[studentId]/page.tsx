import { ShieldAlert } from 'lucide-react';

export default function ParentStudentViewPage() {
  return (
    <main
      className="flex min-h-dvh items-center justify-center px-6 text-center"
      style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)' }}
    >
      <section
        className="max-w-[420px] rounded-[20px] p-6"
        style={{
          background: 'var(--spm-s2)',
          border: '1px solid var(--spm-br2)',
        }}
      >
        <ShieldAlert
          className="mx-auto mb-4 h-10 w-10"
          color="var(--spm-acc)"
        />
        <h1
          className="text-[22px] font-black"
          style={{ fontFamily: 'var(--spm-font-display)' }}
        >
          현재 공유 링크는 사용할 수 없습니다.
        </h1>
        <p
          className="mt-2 text-[13px] leading-6"
          style={{ color: 'var(--spm-t2)' }}
        >
          학생 정보 보호를 위해 안전한 공유 기능을 준비하고 있습니다.
        </p>
      </section>
    </main>
  );
}
