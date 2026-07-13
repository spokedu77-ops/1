'use client';

import { ShieldOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Props = {
  title?: string;
  description?: string;
};

export default function TeacherMaterialsDenied({
  title = '접근 권한이 없습니다',
  description = '종료 처리된 강사 계정은 공지사항·커리큘럼·SPOMOVE 자료를 열람할 수 없습니다. 일정·정산 등 운영 메뉴는 계속 이용할 수 있습니다.',
}: Props) {
  const router = useRouter();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <ShieldOff size={28} />
      </div>
      <h2 className="mb-3 text-lg font-black text-slate-900">{title}</h2>
      <p className="mb-8 max-w-sm text-sm font-medium leading-relaxed text-slate-500">{description}</p>
      <button
        type="button"
        onClick={() => router.push('/teacher/my-classes')}
        className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-indigo-500"
      >
        주간 일정으로 이동
      </button>
    </div>
  );
}
