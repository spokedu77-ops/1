import { permanentRedirectToEducation } from '../lib/permanentRedirectToEducation';

/** Legacy institution URL — permanent redirect to canonical `/education`. */
export default async function SpokeduDispatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirectToEducation(await searchParams);
}
