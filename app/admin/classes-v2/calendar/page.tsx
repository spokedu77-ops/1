import { redirect } from "next/navigation";

/** 구 URL 호환 */
export default function LegacyClassesV2CalendarRedirect() {
  redirect("/admin/classes/calendar");
}
