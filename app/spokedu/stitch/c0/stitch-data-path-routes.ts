import { SPOKEDU_PATHS } from '../../data/public-routes';

/** Stitch `data-path` → clean public href (visual DOM unchanged; href wired at runtime). */
export const STITCH_DATA_PATH_HREF: Record<string, string> = {
  home: SPOKEDU_PATHS.home,
  'education-program': SPOKEDU_PATHS.education,
  'private-lesson': SPOKEDU_PATHS.private,
  'spomove-system': SPOKEDU_PATHS.spomove,
  'field-records': SPOKEDU_PATHS.records,
  'spokedu-lab': SPOKEDU_PATHS.subscription,
  about: SPOKEDU_PATHS.about,
  inquiry: SPOKEDU_PATHS.contact,
};
