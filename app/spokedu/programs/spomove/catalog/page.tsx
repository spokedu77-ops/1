import type { Metadata } from 'next';
import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../../data/site';
import { dispatchInquiryHref } from '../../../data/commercial-routes';
import { buildSpokeduPageMetadata } from '../../../data/seo';

const catalogMetadata: Metadata = {
  title: 'SPOMOVE 전체 프로그램 카탈로그 | SPOKEDU',
  description:
    'SPOMOVE 프로그램 구성과 반응 시리즈를 확인하세요. 카탈로그가 준비되지 않은 경우에도 소개 랜딩과 이용 경로로 이어집니다.',
};

export const metadata: Metadata = {
  ...catalogMetadata,
  ...buildSpokeduPageMetadata({
    title: 'SPOMOVE 전체 프로그램 카탈로그 | SPOKEDU',
    description: 'SPOMOVE 프로그램 구성과 활동 시리즈를 확인하고 기관 도입 및 구독 서비스 경로를 안내합니다.',
    canonical: '/spomove/catalog',
    keywords: ['SPOMOVE', '스포무브', '체육교육 프로그램', '프로그램 카탈로그'],
    pageKey: 'programs',
  }),
};

const ENV_NAME = 'SPOMOVE_NOTION_CATALOG_URL';
const SPOMOVE_HREF = SPOKEDU_PATHS.spomove;
const CURRICULUM_HREF = SPOKEDU_PATHS.subscription;
const DISPATCH_HREF = dispatchInquiryHref({ program: 'spomove' });

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

function CatalogFallback() {
  return (
    <section className="overflow-x-clip px-5 pb-16 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:px-8 sm:pt-[calc(5rem+env(safe-area-inset-top,0px))]">
      <div className="mx-auto w-full max-w-xl rounded-[1.5rem] border border-[#DCE3EE] bg-white px-5 py-8 text-center shadow-sm sm:px-7 sm:py-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#245DFF]">SPOMOVE CATALOG</p>
        <h1 className="mt-3 text-2xl font-black leading-tight text-[#0B1F46] sm:text-3xl">
          전체 카탈로그를 아직 표시할 수 없습니다
        </h1>
        <p className="mt-4 text-sm leading-[1.75] text-[#536279]">
          외부 카탈로그 주소가 설정되지 않았거나 연결되지 않았습니다. SPOMOVE 소개와 이용 경로는 메인 페이지에서 확인할 수
          있습니다.
        </p>
        <code className="mt-5 block overflow-x-auto rounded-lg bg-[#F5F7FB] px-4 py-3 text-left text-sm font-bold text-[#0B1F46]">
          {ENV_NAME}
        </code>
        <div className="mt-7 flex flex-col gap-3 sm:items-center">
          <Link
            href={SPOMOVE_HREF}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#245DFF] px-6 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]"
          >
            SPOMOVE 소개로 돌아가기
          </Link>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-semibold text-[#536279]">
            <Link href={DISPATCH_HREF} className="underline-offset-4 hover:underline">
              기관 도입 문의
            </Link>
            <Link href={CURRICULUM_HREF} className="underline-offset-4 hover:underline">
              구독시스템 알아보기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SpomoveCatalogPage() {
  const catalogUrl = getCatalogUrl();

  if (!catalogUrl) {
    return <CatalogFallback />;
  }

  return (
    <section className="relative h-[100dvh] overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(3.75rem+env(safe-area-inset-top,0px))]">
      <div className="flex min-h-16 items-center justify-between gap-4 border-b border-[#DCE3EE] bg-white px-5 py-3 sm:px-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#245DFF]">SPOMOVE CATALOG</p>
          <h1 className="text-lg font-black leading-tight text-[#0B1F46] sm:text-xl">SPOMOVE 전체 프로그램 카탈로그</h1>
          <p className="mt-1 text-xs leading-relaxed text-[#536279] sm:text-sm">
            화면의 정보를 움직임으로 연결하는 체육교육 활동과 프로그램 구성을 확인하세요.
          </p>
        </div>
        <Link href={DISPATCH_HREF} className="shrink-0 text-sm font-bold text-[#245DFF] underline-offset-4 hover:underline">
          기관 도입 문의
        </Link>
      </div>
      <iframe
        src={catalogUrl}
        title="SPOMOVE 전체 프로그램 카탈로그"
        className="block h-[calc(100dvh-8.5rem)] w-full border-0 sm:h-[calc(100dvh-8.75rem)]"
      />
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 sm:bottom-4 sm:left-4 sm:right-4">
        <Link
          href={SPOMOVE_HREF}
          className="inline-flex min-h-9 items-center justify-center bg-[#0B1F46]/85 px-3 text-xs font-bold text-white shadow-sm backdrop-blur transition hover:bg-[#0B1F46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]"
        >
          SPOMOVE 소개
        </Link>
        <a
          href={catalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center justify-center bg-[#0B1F46]/85 px-3 text-xs font-bold text-white shadow-sm backdrop-blur transition hover:bg-[#0B1F46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]"
        >
          새 창에서 보기
        </a>
      </div>
    </section>
  );
}
