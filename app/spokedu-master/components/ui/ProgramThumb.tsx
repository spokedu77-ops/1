import { Activity, Scale, Star, Target, Timer, Users, Zap } from 'lucide-react';
import type { Program } from '../../types';

export function CategoryIcon({ category, size, color = 'rgba(255,255,255,0.85)', strokeWidth = 1.5 }: { category: string; size: number; color?: string; strokeWidth?: number }) {
  if (/민첩|속도|순발|스피드/.test(category)) return <Zap size={size} color={color} strokeWidth={strokeWidth} />;
  if (/협동|팀|릴레이/.test(category)) return <Users size={size} color={color} strokeWidth={strokeWidth} />;
  if (/협응|목표|타깃|공간/.test(category)) return <Target size={size} color={color} strokeWidth={strokeWidth} />;
  if (/균형|자세|밸런스/.test(category)) return <Scale size={size} color={color} strokeWidth={strokeWidth} />;
  if (/표현|리듬|창의/.test(category)) return <Star size={size} color={color} strokeWidth={strokeWidth} />;
  if (/반응|신호|집중/.test(category)) return <Timer size={size} color={color} strokeWidth={strokeWidth} />;
  return <Activity size={size} color={color} strokeWidth={strokeWidth} />;
}

export function ProgramThumb({ program, size = 72 }: { program: Program; size?: number }) {
  const imageUrl = program.lessonDetail?.heroImageUrl || program.thumbnailUrl;

  if (imageUrl) {
    return (
      <div className="shrink-0 overflow-hidden rounded-[12px]" style={{ width: size, height: size }} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" width={size} height={size} className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div className="grid shrink-0 place-items-center overflow-hidden rounded-[12px]" style={{ width: size, height: size, background: `linear-gradient(135deg, ${program.colors[0]}, ${program.colors[1]})` }} aria-hidden>
      <CategoryIcon category={program.category} size={Math.round(size * 0.38)} />
    </div>
  );
}
