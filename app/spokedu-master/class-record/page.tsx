import { redirect } from 'next/navigation';

/** Legacy entry point retained only so old bookmarks never open the removed duplicate workflow. */
export default function LegacyClassRecordRedirect() {
  redirect('/spokedu-master/activity');
}
