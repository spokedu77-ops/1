import { redirect } from "next/navigation";

export default function LegacyClassesCreateRedirectPage() {
  redirect("/admin/classes/list?create=1");
}
