import { Activity, Scale, Star, Target, Timer, Users, Zap } from 'lucide-react';
import type { Program } from '../../types';

export function CategoryIcon({ category, size, color = 'rgba(255,255,255,0.85)', strokeWidth = 1.5 }: { category: string; size: number; color?: string; strokeWidth?: number }) {
  if (category.includes('민첩') || category.includes('속도')) return <Zap size={size} color={color} strokeWidth={strokeWidth} />;
  if (category.includes('협동')) return <Users size={size} color={color} strokeWidth={strokeWidth} />;
  if (category.includes('협응')) return <Target size={size} color={color} strokeWidth={strokeWidth} />;
  if (category.includes('균형') || category.includes('자세')) return <Scale size={size} color={color} strokeWidth={strokeWidth} />;
  if (category.includes('표현')) return <Star size={size} color={color} strokeWidth={strokeWidth} />;
  if (category.includes('반응')) return <Timer size={size} color={color} strokeWidth={strokeWidth} />;
  return <Activity size={size} color={color} strokeWidth={strokeWidth} />;
}

export function ProgramThumb({ program, size = 72 }: { program: Program; size?: number }) {
  return (
    <div
      className="shrink-0 grid place-items-center overflow-hidden rounded-[12px]"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${program.colors[0]}, ${program.colors[1]})` }}
      aria-hidden
    >
      <CategoryIcon category={program.category} size={Math.round(size * 0.38)} />
    </div>
  );
}
