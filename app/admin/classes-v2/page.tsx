import { redirect } from "next/navigation";

/** 구 URL 호환: /admin/classes-v2 → /admin/classes/calendar */
export default function LegacyClassesV2IndexRedirect() {
  redirect("/admin/classes/calendar");
}
