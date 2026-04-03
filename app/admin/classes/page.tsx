import { redirect } from 'next/navigation';

export default function LegacyClassesRedirectPage() {
  redirect('/admin/classes-v2/calendar');
}
