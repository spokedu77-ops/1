import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(
  "app/spokedu-master/dashboard/DashboardView.tsx",
  "utf8",
);
const weeklyCard = readFileSync(
  "app/spokedu-master/components/lesson/WeeklyEditorialCard.tsx",
  "utf8",
);
const thumb = readFileSync(
  "app/spokedu-master/components/media/InstructionalThumb.tsx",
  "utf8",
);
const shelf = readFileSync(
  "app/spokedu-master/dashboard/homeSpomoveShelf.ts",
  "utf8",
);
const followUp = readFileSync(
  "app/spokedu-master/components/information/SystemDecisionBanner.tsx",
  "utf8",
);
const programsGateway = readFileSync(
  "app/spokedu-master/programs/page.tsx",
  "utf8",
);
const homeMedia = readFileSync(
  "app/spokedu-master/lib/homeMediaAssets.ts",
  "utf8",
);
const homeMediaAdmin = readFileSync(
  "app/admin/spokedu-master/programs/HomeMediaManager.tsx",
  "utf8",
);
const continueCard = readFileSync(
  "app/spokedu-master/dashboard/HomeContinueCard.tsx",
  "utf8",
);
const homeUiClasses = readFileSync(
  "app/spokedu-master/lib/masterUiClasses.ts",
  "utf8",
);
const commercialAccess = readFileSync(
  "app/spokedu-master/lib/commercialProgramAccess.ts",
  "utf8",
);
const skeleton = readFileSync(
  "app/spokedu-master/components/ui/Skeleton.tsx",
  "utf8",
);

describe("MASTER Home content card system", () => {
  it("keeps Home weekly as four editorial cards, not Library catalog grammar", () => {
    expect(commercialAccess).toContain(
      "WEEKLY_PROGRAM_IDS = ['68', '201', '204', '61']",
    );
    expect(dashboard).toContain("WeeklyEditorialCard");
    expect(dashboard).toContain("selectWeeklyProgramsById(programs)");
    expect(dashboard).not.toContain('variant="home"');
    expect(weeklyCard).toContain("InstructionalThumb");
    expect(weeklyCard).toContain(
      "const isHomeFamily = presentation === 'home' || presentation === 'library-featured'",
    );
    expect(weeklyCard).toContain(
      "presentation={isHomeFamily ? 'home-cover-4-3'",
    );
    expect(weeklyCard).toContain("border border-slate-200/80 bg-white");
    expect(weeklyCard).toContain("MV_HOME_CARD_TITLE");
    expect(weeklyCard).toContain("<Heart className={`h-4 w-4");
    expect(thumb).toContain("object-contain object-center");
    expect(thumb).toContain("aspect-[4/3] w-full");
    expect(thumb).toContain("object-cover object-center blur-xl");
  });

  it("shows Korean Weekly titles without English display or row reserve", () => {
    expect(dashboard).toContain("splitLessonTitle");
    expect(dashboard).toContain("titles.koreanTitle");
    expect(weeklyCard).not.toContain("englishTitle");
    expect(weeklyCard).not.toContain("grid-rows-");
    expect(dashboard).not.toContain("MV_HOME_WEEKLY_COPY");
    expect(dashboard).toContain("buildHomeWeeklySupportMeta");
    expect(weeklyCard).toContain("LessonNewMark");
    expect(dashboard).toContain("isNew={program.isNew}");
  });

  it("normalizes Home SPOMOVE shelf into core, difficulty, title, and variant slots", () => {
    expect(shelf).toContain("card.publicMeta.core");
    expect(shelf).toContain("card.publicMeta.difficulty");
    expect(shelf).toContain("card.meta.trainingFocus");
    expect(shelf).toContain("resolveSpomovePublicCardSupport");
    expect(shelf).not.toContain("programLabel");
    expect(dashboard).toContain("getHomeSpomoveShelfCopy");
    expect(dashboard).not.toContain("MV_HOME_SPOMOVE_COPY");
  });

  it("presents four Weekly and SPOMOVE discovery entries without Dashboard rails", () => {
    expect(dashboard).not.toContain("snap-mandatory");
    expect(dashboard).not.toContain("overflow-x-auto");
    expect(dashboard).toContain('data-dashboard-section="spomove-extension"');
    expect(dashboard).toContain("featuredSpomove.slice(0, 4)");
    expect(dashboard).toContain('data-spm-spomove-card-action="start"');
    expect(dashboard).toContain('presentation="home-cover-4-3"');
    expect(dashboard).toContain('<Play className="h-3.5 w-3.5 fill-current"');
    expect(dashboard).toContain("<Heart className={`h-4 w-4");
  });

  it("uses one compact presentation for recent, next, and recent class tools without a Home navy band", () => {
    expect(dashboard).toContain("HomeContinueCard");
    expect(dashboard).toContain("RecentLessonReuseCard");
    expect(dashboard).toContain('kicker="내 다음 수업"');
    expect(dashboard).toContain('kicker="최근 수업도구"');
    expect(dashboard).toContain("buildClassToolHref(recentClassTool.id)");
    expect(dashboard).toContain(
      "media={<HomeScheduleThumb startAt={nextSession.startAt} />}",
    );
    expect(dashboard).not.toContain('mediaSize="compact"');
    expect(continueCard).toContain(
      "mediaSize === 'compact' ? 'h-16 w-16' : 'h-[72px] w-[72px] min-[768px]:h-20 min-[768px]:w-20'",
    );
    expect(dashboard).not.toContain("nextSessionProgram");
    expect(dashboard).toContain(
      "[...validLessonActivities, ...validSpomoveActivities]",
    );
    expect(dashboard).toContain(
      "latestRecentActivity?.action === 'spomove_started'",
    );
    expect(dashboard).not.toContain("SPM_SECONDARY_BTN");
    expect(dashboard).not.toContain("bg-[var(--spm-spomove-surface)]");
    expect(dashboard).toContain("놀이체육을 디지털 자극 활동으로 확장합니다.");
    expect(dashboard).toContain('title="SPOMOVE 추천"');
    expect(continueCard).toContain("w-full");
    expect(dashboard).toContain("min-[768px]:grid-cols-3");
    expect(dashboard).toContain('title="다음 일정 없음"');
    expect(dashboard).toContain('title="최근 본 수업이 없습니다"');
    expect(dashboard).toContain("HomeEmptyScheduleThumb");
    expect(dashboard.indexOf('data-dashboard-chapter="opening"')).toBeLessThan(
      dashboard.indexOf('data-dashboard-chapter="continuity"'),
    );
    expect(
      dashboard.indexOf('data-dashboard-chapter="continuity"'),
    ).toBeLessThan(dashboard.indexOf('data-dashboard-section="weekly"'));
    expect(dashboard.indexOf('data-dashboard-section="weekly"')).toBeLessThan(
      dashboard.indexOf('data-dashboard-section="spomove-extension"'),
    );
    expect(homeUiClasses).toContain(
      "MV_HOME_FEATURE_WIDTH = 'mx-auto w-full max-w-[1184px]'",
    );
    expect(dashboard).toContain("MV_HOME_FEATURE_WIDTH");
  });

  it("uses count-aware grids at every Dashboard breakpoint", () => {
    expect(dashboard).not.toContain('data-dashboard-rail=');
    expect(dashboard).toContain('data-dashboard-grid="operational"');
    expect(dashboard).toContain('grid grid-cols-1 items-stretch gap-3 min-[768px]:grid-cols-3');
    expect(dashboard.match(/grid grid-cols-2 items-stretch gap-3 min-\[768px\]:gap-5 min-\[1200px\]:grid-cols-4/g)).toHaveLength(2);
    expect(dashboard).not.toContain('auto-fit');
    expect(dashboard).not.toContain('auto-fill');
    expect(continueCard).toContain('line-clamp-2');
    expect(continueCard).toContain('data-dashboard-operational-meta="true"');
    expect(continueCard).toContain('whitespace-nowrap');
  });

  it("keeps compact media dense without changing mobile or desktop composition", () => {
    const compactMediaRule = "min-[768px]:max-[1199.98px]:!h-[clamp(176px,23vw,220px)]";
    expect(dashboard).toContain("compactMedia");
    expect(weeklyCard).toContain(compactMediaRule);
    expect(dashboard).toContain(compactMediaRule);
    expect(skeleton).toContain(compactMediaRule);
    expect(skeleton).toContain("section === 'weekly' ? 'aspect-[4/3]' : 'aspect-[3/2]'");
    expect(dashboard.match(/min-\[1200px\]:grid-cols-4/g)).toHaveLength(2);
  });

  it("uses a stable SPOMOVE heading row and delegates mobile tab clearance to AppShell", () => {
    expect(dashboard).toContain("<h2 id={titleId} className={MV_HOME_SECTION_TITLE}>{title}</h2>");
    expect(dashboard).toContain("description ? <p className={MV_HOME_SECTION_COPY}>{description}</p>");
    expect(dashboard).not.toContain("!mt-0 hidden sm:block");
    expect(dashboard).not.toContain("pb-28 min-[768px]:pb-12");
    expect(dashboard).toContain("w-full px-4 pb-6 pt-12");
    expect(skeleton).toContain('export function DashboardSkeleton()');
    expect(skeleton).toContain('<div className="h-full overflow-y-auto"');
  });

  it("keeps mobile operational summaries to kicker, title, optional compact meta, and CTA", () => {
    expect(continueCard).toContain("meta?: string");
    expect(continueCard).toContain('data-dashboard-operational-meta="true"');
    expect(continueCard).toContain('data-dashboard-operational-cta="true"');
    expect(continueCard).toContain("meta ? <p");
    expect(continueCard).toContain("whitespace-nowrap");
    expect(continueCard).not.toContain("min-h-[132px]");
    expect(continueCard).not.toContain("min-h-[156px]");
    expect(dashboard).not.toContain("놀이체육이나 SPOMOVE를 열면 여기에 이어집니다");
    expect(dashboard).not.toContain("수업 일정을 만들면 여기에 이어집니다");
    expect(dashboard).toContain("meta={compactMeta}");
    expect(dashboard).toContain("meta={recentClassTool.compactDescription}");
    expect(dashboard).toContain("놀이체육 · 준비");
    expect(dashboard).toContain("놀이체육 · 영상");
  });

  it("uses one CTA system for all operational states", () => {
    expect(dashboard.match(/actionLabel=/g)).toHaveLength(6);
    expect(continueCard.match(/data-dashboard-operational-cta=/g)).toHaveLength(1);
    expect(continueCard).toContain("MV_HOME_CARD_ACTION");
    expect(continueCard).toContain("<ArrowRight size={15}");
    expect(homeUiClasses).toContain("MV_HOME_CARD_ACTION = 'text-[13px] font-bold");
  });

  it("gives mobile Hero actions an explicit one-plus-two hierarchy", () => {
    const heroActionsIndex = dashboard.indexOf('data-dashboard-hero-actions="true"');
    const scheduleActionIndex = dashboard.indexOf('수업 일정 보기', heroActionsIndex);
    const classToolsActionIndex = dashboard.indexOf('수업 도구 열기', heroActionsIndex);

    expect(dashboard).toContain('data-dashboard-hero-actions="true"');
    expect(dashboard).toContain('data-dashboard-primary-cta="true"');
    expect(scheduleActionIndex).toBeLessThan(classToolsActionIndex);
    expect(dashboard).toContain('grid grid-cols-2');
    expect(dashboard).toContain('spm-btn-primary col-span-2');
    expect(dashboard).toContain("matchMedia('(max-width: 767px)')");
    expect(dashboard).not.toContain('min-h-[288px]');
    expect(dashboard).not.toContain('sm:min-h-[312px]');
  });

  it("overlays Weekly play affordance inside the media stage", () => {
    expect(weeklyCard).toContain("absolute left-3 top-3");
    expect(weeklyCard).toContain("relative block w-full");
  });

  it("aligns SPOMOVE card actions to one compact bottom row", () => {
    expect(dashboard).toContain('className="px-3.5 pb-3.5 pr-14 pt-2.5"');
    expect(dashboard).toContain('className="absolute bottom-1 right-1 z-10 inline-flex h-11 w-11');
  });

  it("keeps urgent follow-up compact with a touch-safe action instead of rendering a Home hero", () => {
    expect(followUp).toContain("px-3 py-2.5");
    expect(followUp).toContain("min-h-11");
    expect(followUp).not.toContain("sm:p-5");
  });

  it("reports recoverable Weekly slot diagnostics as warnings instead of runtime errors", () => {
    expect(commercialAccess).toContain("selectWeeklyProgramsById");
    expect(commercialAccess).not.toContain("console.error");
  });

  it("never flashes legacy SPOMOVE artwork or the four-pad fallback while remote media is loading", () => {
    expect(programsGateway).toContain("gatewayMediaLoaded");
    expect(programsGateway).toMatch(
      /const lessonHeroSrc = !gatewayMediaLoaded\s+\? null/,
    );
    expect(programsGateway).toMatch(
      /const spomoveHeroSrc = !gatewayMediaLoaded\s+\? null/,
    );
    expect(programsGateway).toContain("animate-pulse bg-gradient-to-br");
    expect(dashboard).toContain("SpomoveThumbnailPlaceholder");
    expect(dashboard).not.toContain("SPOMOVE_PAD_GRID_HEX");
  });

  it("applies thumbnail, content, and featured SPOMOVE packs independently", () => {
    expect(dashboard).toContain(
      ".then((thumbnailResult: SpomoveThumbnailPackQueryResult)",
    );
    expect(dashboard).toContain(
      ".then((contentResult: SpomoveContentPackQueryResult)",
    );
    expect(dashboard).toContain(
      ".then((featuredResult: SpomoveFeaturedPackQueryResult)",
    );
    expect(dashboard).not.toContain(
      ".then(([thumbnailResult, contentResult, featuredResult])",
    );
  });

  it("keeps the Home hero replaceable without taking ownership of content thumbnails", () => {
    expect(dashboard).toContain("HOME_MEDIA_PACK_ID");
    expect(dashboard).toContain("HOME_MEDIA_FALLBACK.heroImage");
    expect(homeMedia).toContain(
      "heroImage: '/images/spokedu/home/field-editorial/home-hero-running.webp'",
    );
    expect(homeMedia).toContain("spokedu-master/home-media/heroImage.");
    expect(homeMediaAdmin).toContain("optimizeToWebP(file, OPTIMIZE)");
    expect(homeMediaAdmin).toContain("홈 대표 이미지");
    expect(homeMediaAdmin).toContain("기본값으로 복원");
    expect(homeMediaAdmin).toContain('href="/spokedu-master/dashboard"');
    expect(homeMediaAdmin).not.toContain("SPOMOVE_THUMBNAIL_PACK_ID");
    expect(dashboard).toContain("object-[58%_40%] sm:object-[center_40%]");
    expect(dashboard).toContain("HomeScheduleThumb");
    expect(dashboard).toContain("!aspect-[3/2]");
  });
});
