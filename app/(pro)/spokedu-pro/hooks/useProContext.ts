'use client';

/**
 * 스포키듀 구독 컨텍스트 훅.
 * GET /api/spokedu-pro/context → plan, entitlement, center 정보 캐싱.
 * dbReady=false 시 무료 플랜으로 fallback.
 */
import { useState, useEffect, useCallback } from 'react';

export type Plan = 'free' | 'basic' | 'pro';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
export type CenterRole = 'owner' | 'admin' | 'coach';

export type Entitlement = {
  plan: Plan;
  status: SubscriptionStatus;
  isPro: boolean;
};

export type ProContext = {
  activeCenterId: string | null;
  centers: Array<{ id: string; name: string; role: CenterRole }>;
  role: CenterRole | null;
  entitlement: Entitlement;
  billing: {
    priceKrw: number;
    promoPriceKrw: number | null;
    promoEndAt: string | null;
    currentPeriodEndAt: string | null;
  };
  dbReady: boolean;
};

const FREE_CONTEXT: ProContext = {
  activeCenterId: null,
  centers: [],
  role: null,
  entitlement: { plan: 'free', status: 'active', isPro: false },
  billing: { priceKrw: 79900, promoPriceKrw: null, promoEndAt: null, currentPeriodEndAt: null },
  dbReady: false,
};

// 클라이언트 사이드 캐시 (SPA 리렌더 시 재요청 방지)
let _cache: ProContext | null = null;
let _fetching = false;
let _listeners: Array<() => void> = [];

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

async function fetchContext(): Promise<ProContext> {
  if (_cache) return _cache;
  if (_fetching) {
    return new Promise((resolve) => {
      const check = () => {
        if (_cache) { resolve(_cache); }
        else { setTimeout(check, 50); }
      };
      check();
    });
  }

  _fetching = true;
  try {
    const res = await fetch('/api/spokedu-pro/context', { credentials: 'include' });
    if (!res.ok) {
      _cache = FREE_CONTEXT;
    } else {
      const data = await res.json();
      _cache = data as ProContext;
    }
  } catch {
    _cache = FREE_CONTEXT;
  } finally {
    _fetching = false;
    notifyListeners();
  }
  return _cache!;
}

export function useProContext() {
  const [ctx, setCtx] = useState<ProContext>(_cache ?? FREE_CONTEXT);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) {
      setCtx(_cache);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchContext().then((c) => {
      setCtx(c);
      setLoading(false);
    });

    // 다른 컴포넌트가 캐시를 갱신할 때 재렌더
    const fn = () => { if (_cache) setCtx(_cache); };
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter((l) => l !== fn); };
  }, []);

  /** 구독 정보 갱신 (bootstrap 후 호출) */
  const refresh = useCallback(async () => {
    _cache = null;
    setLoading(true);
    const c = await fetchContext();
    setCtx(c);
    setLoading(false);
  }, []);

  return { ctx, loading, refresh };
}
