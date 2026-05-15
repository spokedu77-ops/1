'use client';

import dynamic from 'next/dynamic';

const ProfilePage = dynamic(
  () => import('@/app/spokedu-master/profile/page'),
  { ssr: false }
);

export default function AdminSpokeduMasterProfilePage() {
  return <ProfilePage />;
}
