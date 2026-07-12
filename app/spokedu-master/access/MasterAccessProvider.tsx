'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { MasterAccessSnapshot } from '../lib/masterAccessModel';
import {
  canBuySpomatFromSnapshot,
  hasMasterEntitlement,
  hasPremiumEntitlement,
} from '../lib/masterAccessModel';

type MasterAccessContextValue = {
  snapshot: MasterAccessSnapshot;
  spomatShopAvailable: boolean;
};

const MasterAccessContext = createContext<MasterAccessContextValue | null>(null);

export function MasterAccessProvider({
  snapshot,
  spomatShopAvailable = false,
  children,
}: {
  snapshot: MasterAccessSnapshot;
  spomatShopAvailable?: boolean;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ snapshot, spomatShopAvailable }),
    [snapshot, spomatShopAvailable],
  );
  return <MasterAccessContext.Provider value={value}>{children}</MasterAccessContext.Provider>;
}

export function useMasterAccessContext() {
  const context = useContext(MasterAccessContext);
  if (!context) {
    throw new Error('useMasterAccessContext must be used inside MasterAccessProvider');
  }
  return context;
}

export function useOptionalMasterAccessContext() {
  return useContext(MasterAccessContext);
}

export function useMasterAccessSnapshot(): MasterAccessSnapshot {
  return useMasterAccessContext().snapshot;
}

export function useHasMasterEntitlement(): boolean {
  const context = useOptionalMasterAccessContext();
  return hasMasterEntitlement(context?.snapshot);
}

export function useHasPremiumEntitlement(): boolean {
  const context = useOptionalMasterAccessContext();
  return hasPremiumEntitlement(context?.snapshot);
}

export function useMasterCanUseRecords(): boolean {
  const context = useOptionalMasterAccessContext();
  return context?.snapshot.canUseRecords ?? false;
}

export function useMasterCanUseSpomove(): boolean {
  const context = useOptionalMasterAccessContext();
  return context?.snapshot.canUseSpomove ?? false;
}

export function useMasterCanUseLibrary(): boolean {
  const context = useOptionalMasterAccessContext();
  return context?.snapshot.canUseLibrary ?? false;
}

export function useMasterCanBuySpomat(): boolean {
  const context = useOptionalMasterAccessContext();
  return canBuySpomatFromSnapshot(context?.snapshot);
}

export function useSpomatShopAvailable(): boolean {
  return useOptionalMasterAccessContext()?.spomatShopAvailable ?? false;
}
