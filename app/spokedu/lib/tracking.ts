export type SpokeduTrackValue =
  | 'cta-private'
  | 'cta-dispatch'
  | 'cta-curriculum'
  | 'cta-contact'
  | 'cta-private-hero'
  | 'cta-dispatch-hero'
  | 'cta-curriculum-hero'
  | 'cta-private-contact'
  | 'cta-dispatch-contact'
  | 'cta-curriculum-contact'
  | 'cta-phone'
  | 'cta-email'
  | 'cta-program-spomove'
  | 'cta-program-paps'
  | 'cta-program-camp'
  | 'cta-records'
  | 'phone-click'
  | 'email-click'
  | 'contact-private'
  | 'contact-dispatch'
  | 'contact-curriculum'
  | 'cta-generic';

export function inferTrackFromHref(href: string): SpokeduTrackValue {
  if (href.startsWith('tel:')) return 'phone-click';
  if (href.startsWith('mailto:')) return 'email-click';
  if (href.includes('type=private')) return 'cta-private';
  if (href.includes('type=dispatch')) return 'cta-dispatch';
  if (href.includes('type=curriculum')) return 'cta-curriculum';
  if (href === '/private' || href.includes('/spokedu/private')) return 'cta-private';
  if (href === '/dispatch' || href.includes('/spokedu/dispatch')) return 'cta-dispatch';
  if (href === '/curriculum' || href.includes('/spokedu/curriculum')) return 'cta-curriculum';
  if (href.includes('/contact')) return 'cta-contact';
  return 'cta-generic';
}
