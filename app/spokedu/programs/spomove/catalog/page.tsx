import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SPOMOVE 전체 프로그램 카탈로그 | SPOKEDU',
  description: 'SPOMOVE의 프로그램 구성, 반응 시리즈, 실제 수업 활용과 구독 플랜을 확인하세요.',
};

const ENV_NAME = 'SPOMOVE_NOTION_CATALOG_URL';

function getCatalogUrl(): string | null {
  const value = process.env.SPOMOVE_NOTION_CATALOG_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function CatalogSetupNotice() {
  return (
    <section className="flex h-[100dvh] items-center justify-center overflow-hidden px-5 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(3.75rem+env(safe-area-inset-top,0px))]">
      <div className="w-full max-w-xl border border-[#DCE3EE] bg-white px-5 py-6 text-center shadow-sm sm:px-7 sm:py-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#245DFF]">SPOMOVE CATALOG</p>
        <h1 className="mt-3 text-2xl font-black leading-tight text-[#0B1F46] sm:text-3xl">
          SPOMOVE 카탈로그 공개 주소가 아직 설정되지 않았습니다.
        </h1>
        <p className="mt-4 text-sm leading-[1.75] text-[#536279]">
          Notion에서 게시한 공개 URL을 Vercel 환경변수에 등록하면 이 페이지에 전체 카탈로그가 표시됩니다.
        </p>
        <code className="mt-5 block overflow-x-auto bg-[#F5F7FB] px-4 py-3 text-sm font-bold text-[#0B1F46]">
          {ENV_NAME}
        </code>
      </div>
    </section>
  );
}

export default function SpomoveCatalogPage() {
  const catalogUrl = getCatalogUrl();

  if (!catalogUrl) {
    return <CatalogSetupNotice />;
  }

  return (
    <section className="relative h-[100dvh] overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(3.75rem+env(safe-area-inset-top,0px))]">
      <iframe
        src={catalogUrl}
        title="SPOMOVE 전체 프로그램 카탈로그"
        className="block h-[calc(100dvh-3.5rem)] w-full border-0 sm:h-[calc(100dvh-3.75rem)]"
      />
      <a
        href={catalogUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 z-10 inline-flex min-h-9 items-center justify-center bg-[#0B1F46]/85 px-3 text-xs font-bold text-white shadow-sm backdrop-blur transition hover:bg-[#0B1F46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF] sm:bottom-4 sm:right-4"
      >
        새 창에서 보기
      </a>
    </section>
  );
}
