import Link from 'next/link';
import { btnPrimary, btnPrimaryOnDark, btnSecondary, btnSecondaryOnDark } from '../lib/ui-classes';
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
  const secondaryClass = variant === 'dark' ? btnSecondaryOnDark : btnSecondary;

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
        <div className="flex flex-wrap gap-2.5">
          {secondary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track={item.track ?? inferTrackFromHref(item.href)}
              data-track-label={item.trackLabel ?? item.label}
              className={`${secondaryClass} !w-full sm:!w-auto`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
