import { Activity, Scale, Star, Target, Timer, Users, Zap } from 'lucide-react';

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
