import { redirect } from 'next/navigation';

export default function ClassCreateRedirect() {
  redirect('/admin/classes-v2/list');
}
