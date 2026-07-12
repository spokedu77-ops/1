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
          보호자 공개 링크는 현재 제공하지 않습니다.
        </h1>
        <p
          className="mt-2 text-[13px] leading-6"
          style={{ color: 'var(--spm-t2)' }}
        >
          학생 정보 보호를 위해 자동 공유 링크 기능은 아직 운영하지 않습니다. 안내문은 강사가 직접 복사해 전달해 주세요.
        </p>
      </section>
    </main>
  );
}
