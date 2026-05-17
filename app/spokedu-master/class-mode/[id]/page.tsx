'use client';

import ClassModeView from '../../components/ui/ClassModeView';
import { use } from 'react';

export default function ClassModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ClassModeView programId={id} />;
}
