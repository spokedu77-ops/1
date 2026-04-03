import { redirect } from 'next/navigation';

export default function LegacyClassesCreateRedirectPage() {
  redirect('/admin/classes-v2/list?create=1');
}
