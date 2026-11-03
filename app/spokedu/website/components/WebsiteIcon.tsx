import { ArrowRight, Check, CheckCircle2, ChevronDown, Activity, Users, ShieldCheck, Brain, Target, CalendarDays, Heart, MapPin, Play, ClipboardList, Sparkles, type LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  arrow_forward: ArrowRight, arrow_outward: ArrowRight, chevron_right: ArrowRight, east: ArrowRight,
  check: Check, done: Check, check_circle: CheckCircle2, verified: ShieldCheck,
  expand_more: ChevronDown, groups: Users, group: Users, psychology: Brain,
  target: Target, schedule: CalendarDays, calendar_month: CalendarDays,
  favorite: Heart, location_on: MapPin, play_arrow: Play,
  assignment: ClipboardList, insights: Activity, troubleshoot: Target,
};

export function WebsiteIcon({ name, className = '' }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Sparkles;
  return <Icon className={`website-icon ${className}`} aria-hidden="true" strokeWidth={1.8} />;
}
