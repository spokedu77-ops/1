import { permanentRedirectToEducation } from '../../spokedu/lib/permanentRedirectToEducation';

/** Historical QR URL — do not render legacy HTML. Redirect to `/education`. */
export default async function DispatchInfoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirectToEducation(await searchParams);
}
