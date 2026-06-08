import { unstable_cache } from 'next/cache';

const NAVER_BLOG_HOSTS = ['blog.naver.com', 'm.blog.naver.com'] as const;

export type NaverBlogThumbnailOptions = {
  /** 대표·안내 그래픽 제외 후 현장 사진 순서 — 0이 첫 활동 사진 */
  imageIndex?: number;
};

type BlogContentImage = {
  src: string;
  fileSize: number;
  width: number;
  height: number;
};

export function isNaverBlogPostUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return NAVER_BLOG_HOSTS.includes(url.hostname as (typeof NAVER_BLOG_HOSTS)[number]) && /\/\d+/.test(url.pathname);
  } catch {
    return false;
  }
}

function toMobileBlogUrl(href: string): string {
  const url = new URL(href);
  const match = url.pathname.match(/\/([^/]+)\/(\d+)/);
  if (!match) return href;
  const [, blogId, logNo] = match;
  return `https://m.blog.naver.com/${blogId}/${logNo}`;
}

function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match?.[1]?.trim() ?? null;
}

/** blogthumb / mblogthumb 도메인이 달라도 같은 파일인지 비교 */
function naverImagePathKey(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 2) return pathname;
    return `${parts[0]}/${parts[1]}`;
  } catch {
    return null;
  }
}

function toDisplayImageUrl(url: string): string {
  const base = url.split('?')[0];
  return `${base}?type=w800`;
}

function isGenericCoverFilename(url: string): boolean {
  return /\/image\.png$/i.test(url.split('?')[0]);
}

/** 본문 data-linkdata 순서대로 이미지 메타 추출 */
function extractContentImages(html: string): BlogContentImage[] {
  const images: BlogContentImage[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/data-linkdata='(\{[^']+\})'/g)) {
    try {
      const data = JSON.parse(match[1].replace(/&quot;/g, '"')) as {
        src?: string;
        fileSize?: string | number;
        originalWidth?: string | number;
        originalHeight?: string | number;
      };
      if (!data.src) continue;

      const src = toDisplayImageUrl(data.src);
      const key = naverImagePathKey(src);
      if (!key || seen.has(key)) continue;
      seen.add(key);

      images.push({
        src,
        fileSize: Number(data.fileSize ?? 0),
        width: Number(data.originalWidth ?? 0),
        height: Number(data.originalHeight ?? 0),
      });
    } catch {
      // ignore malformed JSON
    }
  }

  if (images.length > 0) return images;

  for (const match of html.matchAll(/data-lazy-src="([^"]+)"/g)) {
    const src = toDisplayImageUrl(match[1]);
    const key = naverImagePathKey(src);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    images.push({ src, fileSize: 0, width: 0, height: 0 });
  }

  return images;
}

/** 대표·로고·안내 그래픽 — 현장 활동 사진이 아닌 것 */
function isLikelyPromoGraphic(img: BlogContentImage, ogKey: string | null): boolean {
  const key = naverImagePathKey(img.src);
  if (ogKey && key === ogKey) return true;

  if (img.fileSize > 0 && img.fileSize < 90_000) return true;

  if (isGenericCoverFilename(img.src) && img.fileSize >= 300_000) return true;

  if (
    isGenericCoverFilename(img.src) &&
    img.width > 0 &&
    img.height > 0 &&
    Math.abs(img.width - img.height) < 80 &&
    img.width >= 450
  ) {
    return true;
  }

  return false;
}

function pickActivityImage(
  contentImages: BlogContentImage[],
  ogImage: string | null,
  imageIndex: number,
): string | null {
  const ogKey = ogImage ? naverImagePathKey(ogImage) : null;

  const withoutPromo = contentImages.filter((img) => !isLikelyPromoGraphic(img, ogKey));

  const pool =
    withoutPromo.length > 0
      ? withoutPromo
      : contentImages.filter((img) => {
          const key = naverImagePathKey(img.src);
          return !ogKey || key !== ogKey;
        });

  const picked = pool[imageIndex] ?? pool[0];
  if (picked) return picked.src;

  return ogImage ? toDisplayImageUrl(ogImage) : null;
}

function extractRssImages(xml: string, logNo: string): string[] {
  const itemPattern = new RegExp(
    `<item>[\\s\\S]*?<guid>[^<]*${logNo}[^<]*</guid>[\\s\\S]*?</item>`,
    'i',
  );
  const item = xml.match(itemPattern)?.[0];
  if (!item) return [];

  const images: string[] = [];
  const seen = new Set<string>();
  for (const match of item.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const src = toDisplayImageUrl(match[1]);
    const key = naverImagePathKey(src);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    images.push(src);
  }
  return images;
}

async function fetchNaverBlogThumbnailUncached(
  blogPostUrl: string,
  imageIndex: number,
): Promise<string | null> {
  if (!isNaverBlogPostUrl(blogPostUrl)) return null;

  const mobileUrl = toMobileBlogUrl(blogPostUrl);
  const logNo = mobileUrl.split('/').pop() ?? '';

  try {
    const pageRes = await fetch(mobileUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SpokeduBot/1.0)' },
      cache: 'no-store',
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const og = extractOgImage(html);
      const contentImages = extractContentImages(html);
      const picked = pickActivityImage(contentImages, og, imageIndex);
      if (picked) return picked;
    }
  } catch {
    // RSS fallback below
  }

  try {
    const url = new URL(blogPostUrl);
    const blogId = url.pathname.split('/').filter(Boolean)[0];
    if (!blogId || !logNo) return null;

    const rssRes = await fetch(`https://rss.blog.naver.com/${blogId}.xml`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SpokeduBot/1.0)' },
      cache: 'no-store',
    });
    if (!rssRes.ok) return null;
    const xml = await rssRes.text();
    const rssImages = extractRssImages(xml, logNo).map((src) => ({
      src,
      fileSize: 0,
      width: 0,
      height: 0,
    }));
    return pickActivityImage(rssImages, null, imageIndex);
  } catch {
    return null;
  }
}

export async function fetchNaverBlogThumbnail(
  blogPostUrl: string,
  options: NaverBlogThumbnailOptions = {},
): Promise<string | null> {
  const imageIndex = options.imageIndex ?? 0;
  const logNo = toMobileBlogUrl(blogPostUrl).split('/').pop() ?? blogPostUrl;
  const cached = unstable_cache(
    () => fetchNaverBlogThumbnailUncached(blogPostUrl, imageIndex),
    ['naver-blog-activity-image-v3', logNo, String(imageIndex)],
    { revalidate: 86400 },
  );
  return cached();
}
