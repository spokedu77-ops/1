import { permanentRedirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function queryString(searchParams: SearchParams): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
    for (const value of values) {
      if (value) params.append(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Historical QR / info URL — permanent redirect to canonical `/education`. */
export default async function DispatchInfoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  permanentRedirect(`/education${queryString(params)}`);
}
