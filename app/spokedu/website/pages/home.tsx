import Image from 'next/image';
import Link from 'next/link';
import { getFieldRecordCatalogItem } from '../../data/field-records-catalog';
import { HomeStructuredData } from '../../components/home-structured-data';
import { PUBLIC_LEADERSHIP_INTRO } from '../../data/public-brand-copy';
import { SPOKEDU_PATHS as paths } from '../../data/public-routes';
import { CaseCard } from '../components/shared';
import { OperatingMetrics, PageCTA } from '../components/content-sections';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { homeRefinement } from '../data/home';

export default function HomePage() {
  const stories = (['maedong-sports-stepup', 'dongjak-spomove', 'donghaeng-special-pe'] as const).map(slug => {
    const record = getFieldRecordCatalogItem(slug);
    return { ...record, trackLabel: record.recordsTrackLabel };
  });
  return <main id="main-content" className="website-page web-stitch web-home w-full bg-surface">
    <HomeStructuredData heroSrc={homeRefinement.hero.src} />
    <div className="flex flex-col w-full">
      <section id="brand" className="w-full bg-surface-container-lowest py-20 lg:py-32 flex flex-col items-center justify-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full text-center flex flex-col items-center">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low text-primary font-label-md text-label-md mb-8"><span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />{PUBLIC_LEADERSHIP_INTRO}</p>
          <h1 className="font-display-hero text-headline-lg lg:text-display-hero text-on-surface font-extrabold tracking-tight max-w-4xl mx-auto leading-tight mb-8">아이와 현장의 조건에 맞춰<br /><span className="text-primary-container">움직이고 싶게 만드는</span> 체육수업을 설계합니다.</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">{homeRefinement.lead}</p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 lg:mb-20">
            <Link className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-[0_8px_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2" href={paths.contact}>수업 상담하기<WebsiteIcon name="arrow_forward" /></Link>
            <Link className="w-full sm:w-auto px-8 py-4 rounded-full bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-variant transition-all flex items-center justify-center" href={paths.education}>수업 유형 살펴보기</Link>
          </div>
          <figure className="w-full max-w-5xl rounded-3xl bg-surface-container-lowest shadow-[0_20px_50px_rgba(19,27,46,0.06)] overflow-hidden">
            <div className="relative w-full aspect-[16/9] lg:aspect-[21/10] overflow-hidden bg-surface-container-low">
              <Image unoptimized loading="eager" className="w-full h-full object-cover" src={homeRefinement.hero.src} alt={homeRefinement.hero.alt} width={2400} height={1800} fetchPriority="high" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 via-transparent to-transparent pointer-events-none" />
              <figcaption className="absolute bottom-6 left-6 right-6 lg:bottom-10 lg:left-12 lg:right-12 text-on-surface font-body-sm text-body-sm font-medium">학교·기관에서 직접 운영하는 SPOKEDU 체육수업</figcaption>
            </div>
          </figure>
        </div>
      </section>
      <section id="showcase" className="w-full bg-surface-container-low py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-24 lg:space-y-32">
          {homeRefinement.showcases.map((item, i) => <article className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center" key={item.number}>
            <div className={`lg:col-span-5 relative${i === 1 ? ' lg:order-2' : ''}`}>
              <span className="font-watermark-number text-watermark-number text-primary-fixed font-black select-none block -mb-8" aria-hidden="true">{item.number}</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{item.title[0]}<br /><span className="text-primary-container">{item.title[1]}</span></h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-6 leading-relaxed">{item.body}</p>
              <div className="flex flex-wrap gap-2 mt-8">{item.tags.map(tag => <span key={tag} className="px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">{tag}</span>)}</div>
              <div className="mt-8"><Link className="inline-flex items-center gap-2 text-primary-container font-label-md text-label-md hover:underline" href={item.href}>{item.action}<WebsiteIcon name="arrow_forward" /></Link></div>
            </div>
            <figure className={`lg:col-span-7${i === 1 ? ' lg:order-1' : ''}`}>
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-surface-container-lowest shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)]">
                <Image unoptimized className={`w-full h-full ${i === 2 ? 'object-contain' : 'object-cover'}`} src={item.photo.src} alt={item.photo.alt} loading="lazy" width={900} height={1200} />
              </div>
            </figure>
          </article>)}
        </div>
      </section>
      <section id="operating-metrics" className="w-full bg-surface-container-lowest py-20 lg:py-28"><div className="max-w-7xl mx-auto px-6 lg:px-12"><OperatingMetrics /></div></section>
      <section id="field-stories" className="w-full bg-surface py-20 lg:py-28 web-home-proof">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 web-home-cases">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div><p className="font-label-sm text-label-sm text-primary font-bold mb-2">FIELD HIGHLIGHTS &amp; STORIES</p><h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">현장에서 운영한 수업 사례</h2></div>
            <Link className="text-primary-container font-label-md text-label-md" href={paths.records}>수업 사례 전체 보기 →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{stories.map(record => <CaseCard key={record.slug} record={record} />)}</div>
        </div>
      </section>
      <PageCTA page="home" />
    </div>
  </main>;
}
