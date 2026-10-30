import { useEffect, useLayoutEffect } from 'react';

type Release = () => void;
type OverflowStyle = { element: HTMLElement; declarations: Array<[string, string, string]> };
const owners = new Set<Release>();
let savedStyles: OverflowStyle[] | null = null;
const properties = ['overflow', 'overflow-x', 'overflow-y'];

function restoreWhenUnowned(): void {
  // Layout-effect handoffs and StrictMode may reacquire in this same commit.
  queueMicrotask(() => {
    if (owners.size !== 0 || !savedStyles) return;
    for (const { element, declarations } of savedStyles) {
      properties.forEach(property => element.style.removeProperty(property));
      declarations.forEach(([property, value, priority]) => element.style.setProperty(property, value, priority));
    }
    savedStyles = null;
  });
}

/** Each acquisition owns an idempotent release; it cannot release another owner. */
export function lockViewportScroll(): Release {
  if (!savedStyles) {
    savedStyles = [document.documentElement, document.body].map(element => ({
      element,
      declarations: Array.from(element.style)
        .filter(property => properties.includes(property))
        .map(property => [property, element.style.getPropertyValue(property), element.style.getPropertyPriority(property)]),
    }));
    savedStyles.forEach(({ element }) => element.style.setProperty('overflow', 'hidden', 'important'));
  }
  const release = () => {
    if (!owners.delete(release)) return;
    if (owners.size === 0) restoreWhenUnowned();
  };
  owners.add(release);
  return release;
}

/** Compatibility for legacy paired callers. New callers keep their own release. */
export function unlockViewportScroll(): void {
  Array.from(owners).at(-1)?.();
}

/** @deprecated Never clear live owners belonging to another portal or overlay. */
export function forceUnlockViewportScroll(): void {
  if (owners.size === 0) restoreWhenUnowned();
}

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
export function useViewportScrollLock(active: boolean): void {
  useBrowserLayoutEffect(() => {
    if (!active) return;
    return lockViewportScroll();
  }, [active]);
}
