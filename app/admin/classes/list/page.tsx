import { redirect } from 'next/navigation';

export default function LegacyClassesListRedirectPage() {
  redirect('/admin/classes-v2/list');
}
