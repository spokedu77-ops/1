/**
 * SPOMOVE Hub/Card/Media — image vs video fit SSOT.
 *
 * IMAGE thumbnails (Hub cards): FROZEN P1 crop — object-cover / aspect-[6/5].
 * VIDEO poster/preview (Guideline Sheet): full frame — object-contain / aspect-video.
 * Never apply video contain rules to Hub image thumbs.
 */

export const SPOMOVE_IMAGE_THUMB_OBJECT_FIT = 'cover' as const;
export const SPOMOVE_IMAGE_THUMB_ASPECT_CLASS = 'aspect-[6/5]' as const;

/** Letterbox/pillarbox allowed; never crop the source frame to fill. */
export const SPOMOVE_VIDEO_POSTER_OBJECT_FIT = 'contain' as const;
export const SPOMOVE_VIDEO_FRAME_ASPECT_CLASS = 'aspect-video' as const;
