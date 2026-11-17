import { isFieldRecordSameOrigin } from '@/app/lib/field-records/request-origin';

/** Note writes still require Origin; compare it with the incoming Host, not Next's bind URL. */
export function isNoteV2SameOrigin(request: Request): boolean {
  return Boolean(request.headers.get('origin')) && isFieldRecordSameOrigin(request);
}
