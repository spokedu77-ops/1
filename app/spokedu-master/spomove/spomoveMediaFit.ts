/**
 * SPOMOVE Hub/Card/Media — image vs video fit SSOT.
 *
 * IMAGE thumbnails: Home and Hub use a square frame.
 * Both discovery surfaces use clean object-cover presentation without blur layers.
 * VIDEO poster/preview (Guideline Sheet): full frame — object-contain / aspect-video.
 * Never apply video contain rules to Hub image thumbs.
 */

export const SPOMOVE_IMAGE_THUMB_OBJECT_FIT = 'cover' as const;
export const SPOMOVE_IMAGE_THUMB_ASPECT_CLASS = 'aspect-square' as const;

/** Letterbox/pillarbox allowed; never crop the source frame to fill. */
export const SPOMOVE_VIDEO_POSTER_OBJECT_FIT = 'contain' as const;
export const SPOMOVE_VIDEO_FRAME_ASPECT_CLASS = 'aspect-video' as const;
