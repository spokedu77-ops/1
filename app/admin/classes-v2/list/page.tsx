import { redirect } from "next/navigation";

/** 구 URL 호환 — query(create 등) 유지 */
export default async function LegacyClassesV2ListRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") q.set(k, v);
    else if (Array.isArray(v)) for (const item of v) q.append(k, item);
  }
  const qs = q.toString();
  redirect(qs ? `/admin/classes/list?${qs}` : "/admin/classes/list");
}
