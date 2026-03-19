import Link from 'next/link';

export default function ScreenPlayAdminOverviewPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-extrabold">스크린 플레이</h2>
        <p className="mt-1 text-sm text-neutral-400">
          띵크 → 챌린지 → 플로우 3단계 + 메모리 게임 · 카메라 앱 + 에셋
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/program/iiwarmup"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">구독자 미리보기</h3>
          <p className="mt-2 text-sm text-neutral-400">
            실제 구독자가 보는 화면 (이번 주 프로그램)
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            새 창에서 열기 →
          </span>
        </a>

        <Link
          href="/admin/iiwarmup/think"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">Think Studio</h3>
          <p className="mt-2 text-sm text-neutral-400">
            150초 SPOKEDU Think · 인지 단계 제작·미리보기
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>

        <Link
          href="/admin/iiwarmup/challenge"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">Challenge Studio</h3>
          <p className="mt-2 text-sm text-neutral-400">
            리듬 게임 BPM·그리드·단계별 저장 (주차별)
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>

        <Link
          href="/admin/iiwarmup/flow"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">Flow Studio</h3>
          <p className="mt-2 text-sm text-neutral-400">
            3D 몰입 환경 · 공간 왜곡·속도 제어
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>

        <Link
          href="/admin/iiwarmup/assets"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">AssetHub</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Think / Flow 에셋 업로드·관리 (챌린지는 스튜디오에서 직접)
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>

        <Link
          href="/admin/memory-game"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">메모리 게임</h3>
          <p className="mt-2 text-sm text-neutral-400">
            N-back·시그널 훈련 · 수업용 메모리 게임
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>

        <Link
          href="/admin/camera"
          className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800 transition hover:ring-neutral-600 cursor-pointer"
        >
          <h3 className="text-base font-extrabold">카메라 앱</h3>
          <p className="mt-2 text-sm text-neutral-400">
            밸런스·미러 포즈 · 수업용 카메라 앱
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-400">
            진입 →
          </span>
        </Link>
      </section>
    </div>
  );
}
