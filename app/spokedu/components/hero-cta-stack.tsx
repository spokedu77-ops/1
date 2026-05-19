import Link from 'next/link';
import { btnPrimary, btnPrimaryOnDark, btnSecondary, btnSecondaryOnDark, linkMuted } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

export type HeroCtaLink = {
  href: string;
  label: string;
  track?: string;
  trackLabel?: string;
};

type HeroCtaStackProps = {
  primary: HeroCtaLink;
  secondary?: HeroCtaLink[];
  variant?: 'light' | 'dark';
};

export function HeroCtaStack({ primary, secondary = [], variant = 'light' }: HeroCtaStackProps) {
  const primaryClass = variant === 'dark' ? btnPrimaryOnDark : btnPrimary;

  return (
    <div className="space-y-2.5">
      <Link
        href={primary.href}
        data-track={primary.track ?? inferTrackFromHref(primary.href)}
        data-track-label={primary.trackLabel ?? primary.label}
        className={primaryClass}
      >
        {primary.label}
      </Link>
      {secondary.length > 0 ? (
        <>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 sm:hidden">
            {secondary.map((item, index) => (
              <span key={item.href} className="inline-flex items-center gap-3">
                {index > 0 ? <span className="text-slate-300" aria-hidden>·</span> : null}
                <Link
                  href={item.href}
                  data-track={item.track ?? inferTrackFromHref(item.href)}
                  data-track-label={item.trackLabel ?? item.label}
                  className={variant === 'dark' ? 'font-semibold text-slate-200 underline-offset-2 hover:underline' : linkMuted}
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </p>
          <div className="hidden flex-wrap gap-2.5 sm:flex">
            {secondary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-track={item.track ?? inferTrackFromHref(item.href)}
                data-track-label={item.trackLabel ?? item.label}
                className={variant === 'dark' ? btnSecondaryOnDark : btnSecondary}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
