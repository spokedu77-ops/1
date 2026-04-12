import Link from 'next/link';

export default function TeacherAppOverviewPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-extrabold">선생님 APP</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Asset Hub와 SPOMOVE에서 수업용 도구를 관리합니다.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/iiwarmup/assets"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">Asset Hub</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Think / Flow 에셋 업로드·관리 (챌린지는 스튜디오에서 직접)
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">진입 →</span>
        </Link>

        <Link
          href="/admin/iiwarmup/spomove"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">SPOMOVE</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Think · Challenge · Flow · 카메라 · 반응 훈련 등 도구 모음
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">진입 →</span>
        </Link>
      </section>
    </div>
  );
}
