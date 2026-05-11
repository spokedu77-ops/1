import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatReactionTime(value: number | null | undefined) {
  if (!value) return '-';
  return `${value}ms`;
}
