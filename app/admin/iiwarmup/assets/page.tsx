'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Boxes, GraduationCap, Menu, SlidersHorizontal, Zap } from 'lucide-react';
import { AssetHubTabs, type AssetHubTabId } from '@/app/components/admin/assets/AssetHubTabs';
import { AssetHubBgmPanel } from '@/app/components/admin/assets/AssetHubBgmPanel';
import { SpomoveColorPerceptionPanel } from '@/app/components/admin/assets/SpomoveColorPerceptionPanel';
import { SpomoveDiveEnvironmentPanel } from '@/app/components/admin/assets/SpomoveDiveEnvironmentPanel';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import styles from '@/app/components/admin/assets/AssetHubUi.module.css';

export default function AssetHubPage() {
  const [activeTab, setActiveTabState] = useState<AssetHubTabId>('spomove');

  const setActiveTab = (tab: AssetHubTabId) => setActiveTabState(tab);
  const { toggleMobile, isMobileOpen } = useAppSidebar();

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <Link href="/admin/spomove/training" className={styles.brand} aria-label="SPOKEDU Training">
              <span>SPOK<em>EDU</em></span>
              <span className={styles.dots} aria-hidden="true"><i /><i /><i /><i /></span>
            </Link>
            <span className={styles.status}>SPOMOVE COGNITIVE ENGINE v2.4</span>
          </div>
          <nav className={styles.nav} aria-label="SPOMOVE 내비게이션">
            <Link href="/admin/spomove/training"><Zap size={13} />1. Training</Link>
            <Link href="/teacher/spomove"><GraduationCap size={13} />2. Teacher</Link>
            <Link href="/admin/spomove/training?tab=app" aria-current="page"><SlidersHorizontal size={13} />3. 앱 관리</Link>
          </nav>
          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="알림" title="알림 기능 미제공" disabled><Bell size={15} /></button>
            <button type="button" className={styles.iconButton} aria-label="관리자 메뉴" aria-expanded={isMobileOpen} aria-controls="app-navigation" onClick={toggleMobile}><Menu size={16} /></button>
          </div>
        </div>
      </header>
      <main className={styles.content}>
      <section className={styles.intro}>
        <Link href="/admin/spomove/training?tab=app" className={styles.breadcrumb}><ArrowLeft size={13} />앱 관리</Link>
        <div className={styles.eyebrow}><span className={styles.dots} aria-hidden="true"><i /><i /><i /><i /></span>SPOMOVE ASSET LIBRARY</div>
        <div className={styles.titleRow}>
          <span className={styles.titleIcon}><Boxes size={24} /></span>
          <div><h1>AssetHub</h1><p>SPOMOVE 트레이닝 자산 관리</p></div>
        </div>
        <p className={styles.introCopy}>
          SPOMOVE 색지각 자산 — <strong>BGM</strong> 탭은 SPOMOVE 트레이닝용 배경음
          풀만 관리합니다(시작 시 목록 중 무작위 재생). 색지각 탭은 <strong>7개 섹션</strong>(1 테마·2~7
          자산)으로 나뉩니다. (챌린지 그리드·템플릿은 Challenge 스튜디오에서 수정)
        </p>
      </section>

      <AssetHubTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className={styles.panelContent} role="tabpanel" id={`asset-panel-${activeTab}`} aria-labelledby={`asset-tab-${activeTab}`}>
      {activeTab === 'bgm' && <AssetHubBgmPanel />}
      {activeTab === 'spomove' && <SpomoveColorPerceptionPanel />}
      {activeTab === 'dive' && <SpomoveDiveEnvironmentPanel />}
      </div>
      </main>
    </div>
  );
}
