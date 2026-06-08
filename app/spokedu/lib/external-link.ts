export function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

export const externalLinkProps = {
  target: '_blank',
  rel: 'noreferrer',
} as const;
