import styles from './BlogDrafts.module.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ContentAreaTabs } from '../content/ContentAreaTabs';

export const metadata: Metadata = { title: '블로그 원고 | SPOKEDU', robots: { index: false, follow: false } };

export default function BlogDraftLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.canvas} style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
      <div className={styles.container}>
        <div className={styles.tabs}><ContentAreaTabs /></div>
        {children}
      </div>
    </div>
  );
}
