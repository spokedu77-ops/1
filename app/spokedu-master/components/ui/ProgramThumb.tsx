import { Activity, Scale, Star, Target, Timer, Users, Zap } from 'lucide-react';
import Image from 'next/image';
import { resolveProgramHero } from '../../lib/program-media';
import type { Program } from '../../types';

export function CategoryIcon({
  category,
  size,
  color = 'rgba(255,255,255,0.85)',
  strokeWidth = 1.8,
}: {
  category: string;
  size: number;
  color?: string;
  strokeWidth?: number;
}) {
  const text = category.toLowerCase();

  if (/spomove|반응|민첩|속도|순발/.test(text)) return <Zap size={size} color={color} strokeWidth={strokeWidth} />;
  if (/협동|팀|릴레이|관계/.test(text)) return <Users size={size} color={color} strokeWidth={strokeWidth} />;
  if (/목표|공간|조준|정확/.test(text)) return <Target size={size} color={color} strokeWidth={strokeWidth} />;
  if (/균형|자세|밸런스|정적/.test(text)) return <Scale size={size} color={color} strokeWidth={strokeWidth} />;
  if (/표현|리듬|창의|놀이/.test(text)) return <Star size={size} color={color} strokeWidth={strokeWidth} />;
  if (/집중|신호|타이밍/.test(text)) return <Timer size={size} color={color} strokeWidth={strokeWidth} />;

  return <Activity size={size} color={color} strokeWidth={strokeWidth} />;
}

export function ProgramThumb({ program, size = 72 }: { program: Program; size?: number }) {
  const imageUrl = resolveProgramHero(program)
    ?.replace('/mqdefault.jpg', '/hqdefault.jpg')
    .replace('/default.jpg', '/hqdefault.jpg');

  if (imageUrl) {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-[12px]" style={{ width: size, height: size }} aria-hidden>
        {/^https?:\/\//.test(imageUrl) ? (
          // YouTube thumbnails are external and may not be in next/image remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Image src={imageUrl} alt="" fill sizes={`${size}px`} className="object-cover" quality={88} />
        )}
      </div>
    );
  }

  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-[12px]"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${program.colors[0]}, ${program.colors[1]})` }}
      aria-hidden
    >
      <CategoryIcon category={program.category} size={Math.round(size * 0.38)} />
    </div>
  );
}
