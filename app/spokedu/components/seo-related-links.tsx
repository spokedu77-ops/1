import Link from 'next/link';
import { seoRelatedLinks, type SpokeduSeoPageKey } from '../data/seo';
import { inferTrackFromHref } from '../lib/tracking';

type SpokeduRelatedLinksProps = {
  page: SpokeduSeoPageKey;
};

export function SpokeduRelatedLinks({ page }: SpokeduRelatedLinksProps) {
  if (page === 'home') {
    return null;
  }

  const links = seoRelatedLinks[page];

  return (
    <nav aria-label="관련 페이지" className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">함께 보면 좋은 페이지</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              data-track={inferTrackFromHref(link.href)}
              data-track-label={`seo-related-${page}-${link.label}`}
              className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition active:bg-white [@media(hover:hover)_and_(pointer:fine)]:hover:border-indigo-200 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-white"
            >
              <span className="text-sm font-semibold text-slate-900">{link.label}</span>
              <span className="mt-0.5 block text-xs text-slate-600">{link.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
