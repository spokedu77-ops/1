import { SpokeduLabLandingPage } from '../subscription/SpokeduLabLanding';

export { metadata } from '../subscription/page';

export default function SpokeduLabPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <SpokeduLabLandingPage
      autoBypassAuthenticatedVisitors
      searchParams={searchParams}
    />
  );
}
